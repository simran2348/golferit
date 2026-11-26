import { Vector3, type Object3D } from 'three';
import type { CourseDefinition, Vec2 } from '../../../shared/types/course';
import {
  BALL_RADIUS,
  CUP_DEPTH,
  PHYSICS_STEP,
} from '../../../shared/constants/game';
import {
  boostVelocity,
  boostsAt,
  isInSand,
  otherPortalEnd,
  portalEndAt,
  type PortalEnd,
} from '../../../shared/course/obstacles';
import {
  isBallInCup,
  isBallInWater,
  isBallOutOfBounds,
  shotSpeedForPower,
} from '../../../shared/course/rules';
import type { Aim } from '../controls/ShotControls';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { GameSession } from './GameSession';

/** Max physics steps per frame; beyond this we drop time rather than spiral. */
const MAX_STEPS_PER_FRAME = 8;

/** Rolling resistance model: light damping while fast, heavy when slow. */
const ROLL_DAMPING = 0.75;
const SLOW_DAMPING = 2.4;
const SLOW_SPEED = 0.7;
/** Sand bogs the ball down hard. */
const SAND_DAMPING = 3.5;

/** Ball counts as stopped after staying below this speed for REST_TIME. */
const REST_SPEED = 0.06;
const REST_TIME = 0.2;
/** A resting ball moving faster than this was hit by an obstacle. */
const DISTURBED_SPEED = 0.3;

const SINK_DURATION = { cup: 0.35, water: 0.5 } as const;
const WATER_SINK_Y = -0.45;

export type GameplayEffects = {
  /** The ball just hit the water at this point. */
  splash?: (position: Vector3) => void;
  /** The ball just went through a teleporter. */
  teleport?: (from: Vec2, to: Vec2) => void;
};

type Sink = {
  kind: 'cup' | 'water';
  from: Vector3;
  to: Vector3;
  progress: number;
};

/**
 * Runs the hole: fixed-step physics, rule checks after each step, rest
 * detection, penalties and the short "drop into cup / sink in water"
 * animations. Writes the ball mesh position; reports events to GameSession.
 */
export class GameplaySystem {
  private accumulator = 0;
  private restTimer = 0;
  private sink: Sink | null = null;
  /** Where the ball was before the current shot (penalty return point). */
  private lastRestPosition: Vec2;
  private readonly position = new Vector3();
  private readonly velocity = new Vector3();
  private readonly unsubscribeRestart: () => void;
  /** Boost pads the ball is on that have already kicked it. */
  private readonly usedBoosts = new Set<string>();
  /** Per teleporter: the end the ball arrived at and hasn't left yet. */
  private readonly portalLocks = new Map<string, PortalEnd>();

  constructor(
    private readonly course: CourseDefinition,
    private readonly physics: PhysicsWorld,
    private readonly session: GameSession,
    private readonly ballMesh: Object3D,
    private readonly effects: GameplayEffects = {}
  ) {
    this.lastRestPosition = { ...course.tee };
    this.unsubscribeRestart = session.onEvent((event) => {
      if (event.type === 'restarted') this.resetToTee();
    });
  }

  get ballPosition(): Vector3 {
    return this.ballMesh.position;
  }

  shoot(aim: Aim): void {
    if (!this.session.canShoot()) return;
    const speed = shotSpeedForPower(aim.power);
    this.physics.getBallPosition(this.position);
    this.lastRestPosition = { x: this.position.x, z: this.position.z };
    this.restTimer = 0;
    this.physics.setBallDamping(ROLL_DAMPING);
    this.physics.launchBall({
      x: aim.direction.x * speed,
      z: aim.direction.z * speed,
    });
    this.session.recordShot({
      t: this.physics.time,
      x: this.position.x,
      z: this.position.z,
      dx: aim.direction.x,
      dz: aim.direction.z,
      power: aim.power,
    });
  }

  update(delta: number): void {
    // Physics always steps so kinematic obstacles stay in sync with visuals,
    // even while the ball is mid-animation.
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= PHYSICS_STEP && steps < MAX_STEPS_PER_FRAME) {
      this.physics.step();
      this.accumulator -= PHYSICS_STEP;
      steps++;
      if (!this.sink) this.afterStep(PHYSICS_STEP);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;

    if (this.sink) {
      this.updateSink(delta);
    } else {
      this.physics.getBallPosition(this.ballMesh.position);
      // The physics ball really rolls (friction spins it), so show that.
      this.physics.getBallRotation(this.ballMesh.quaternion);
    }
  }

  dispose(): void {
    this.unsubscribeRestart();
  }

  private afterStep(dt: number): void {
    const phase = this.session.getSnapshot().phase;
    if (phase !== 'rolling' && phase !== 'aiming') return;

    const position = this.physics.getBallPosition(this.position);
    const velocity = this.physics.getBallVelocity(this.velocity);
    const speed = Math.hypot(velocity.x, velocity.z);

    if (phase === 'aiming') {
      // A resting ball can still be knocked by a moving obstacle.
      if (speed > DISTURBED_SPEED) this.session.ballDisturbed();
      else return;
    }

    if (isBallInCup(position, speed, this.course)) {
      this.startSink('cup', position);
      return;
    }
    if (isBallInWater(position, this.course)) {
      this.startSink('water', position);
      return;
    }
    if (isBallOutOfBounds(position, this.course)) {
      this.returnWithPenalty('Out of bounds! +1 stroke');
      return;
    }
    if (this.teleport(position)) return;
    this.applyBoosts(position, velocity);

    const point = { x: position.x, z: position.z };
    this.physics.setBallDamping(
      isInSand(this.course.obstacles, point)
        ? SAND_DAMPING
        : speed < SLOW_SPEED
          ? SLOW_DAMPING
          : ROLL_DAMPING
    );

    if (speed < REST_SPEED && Math.abs(velocity.y) < REST_SPEED) {
      this.restTimer += dt;
      if (this.restTimer >= REST_TIME) {
        this.physics.stopBall();
        this.restTimer = 0;
        this.session.ballStopped();
      }
    } else {
      this.restTimer = 0;
    }
  }

  /** Kick once per visit to each pad. */
  private applyBoosts(position: Vector3, velocity: Vector3): void {
    const pads = boostsAt(this.course.obstacles, {
      x: position.x,
      z: position.z,
    });
    for (const id of this.usedBoosts) {
      if (!pads.some((pad) => pad.id === id)) this.usedBoosts.delete(id);
    }
    for (const pad of pads) {
      if (this.usedBoosts.has(pad.id)) continue;
      this.usedBoosts.add(pad.id);
      this.physics.setBallHorizontalVelocity(
        boostVelocity(pad, { x: velocity.x, z: velocity.z })
      );
    }
  }

  /**
   * Into one end, out of the other with the same velocity. The exit stays
   * locked until the ball rolls clear of it, so it can't bounce straight back.
   */
  private teleport(position: Vector3): boolean {
    const point = { x: position.x, z: position.z };
    for (const obstacle of this.course.obstacles) {
      if (obstacle.kind !== 'portal') continue;
      const end = portalEndAt(obstacle, point);
      const locked = this.portalLocks.get(obstacle.id);
      if (end === null) {
        this.portalLocks.delete(obstacle.id);
        continue;
      }
      if (end === locked) continue;
      const exit = otherPortalEnd(end);
      const to = obstacle[exit];
      this.physics.moveBall(to);
      this.portalLocks.set(obstacle.id, exit);
      this.effects.teleport?.(point, to);
      return true;
    }
    return false;
  }

  /** After placing the ball, don't fire a teleporter or pad it rests on. */
  private resetObstacleState(at: Vec2): void {
    this.usedBoosts.clear();
    this.portalLocks.clear();
    for (const pad of boostsAt(this.course.obstacles, at)) {
      this.usedBoosts.add(pad.id);
    }
    for (const obstacle of this.course.obstacles) {
      if (obstacle.kind !== 'portal') continue;
      const end = portalEndAt(obstacle, at);
      if (end) this.portalLocks.set(obstacle.id, end);
    }
  }

  private startSink(kind: Sink['kind'], position: Vector3): void {
    this.physics.setBallEnabled(false);
    const to =
      kind === 'cup'
        ? new Vector3(
            this.course.cup.x,
            -CUP_DEPTH + BALL_RADIUS,
            this.course.cup.z
          )
        : new Vector3(position.x, WATER_SINK_Y, position.z);
    this.sink = { kind, from: position.clone(), to, progress: 0 };
    if (kind === 'water') this.effects.splash?.(position);
  }

  private updateSink(delta: number): void {
    const sink = this.sink;
    if (!sink) return;
    sink.progress = Math.min(
      sink.progress + delta / SINK_DURATION[sink.kind],
      1
    );
    // Ease-in: the ball accelerates as it drops.
    const t = sink.progress * sink.progress;
    this.ballMesh.position.lerpVectors(sink.from, sink.to, t);
    if (sink.progress < 1) return;

    this.sink = null;
    if (sink.kind === 'cup') {
      this.session.holed();
    } else {
      this.returnWithPenalty('Splash! +1 stroke');
    }
  }

  private returnWithPenalty(message: string): void {
    this.physics.placeBall(this.lastRestPosition);
    this.resetObstacleState(this.lastRestPosition);
    this.physics.getBallPosition(this.ballMesh.position);
    this.restTimer = 0;
    this.session.penalty(message);
  }

  private resetToTee(): void {
    this.sink = null;
    this.accumulator = 0;
    this.restTimer = 0;
    this.lastRestPosition = { ...this.course.tee };
    this.physics.placeBall(this.course.tee);
    this.resetObstacleState(this.course.tee);
    this.physics.getBallPosition(this.ballMesh.position);
  }
}
