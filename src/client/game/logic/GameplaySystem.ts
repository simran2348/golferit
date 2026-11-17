import { Vector3, type Object3D } from 'three';
import type { CourseDefinition, Vec2 } from '../../../shared/types/course';
import {
  BALL_RADIUS,
  CUP_DEPTH,
  PHYSICS_STEP,
} from '../../../shared/constants/game';
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

/** Ball counts as stopped after staying below this speed for REST_TIME. */
const REST_SPEED = 0.06;
const REST_TIME = 0.2;
/** A resting ball moving faster than this was hit by an obstacle. */
const DISTURBED_SPEED = 0.3;

const SINK_DURATION = { cup: 0.35, water: 0.5 } as const;
const WATER_SINK_Y = -0.45;

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

  constructor(
    private readonly course: CourseDefinition,
    private readonly physics: PhysicsWorld,
    private readonly session: GameSession,
    private readonly ballMesh: Object3D
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

    this.physics.setBallDamping(
      speed < SLOW_SPEED ? SLOW_DAMPING : ROLL_DAMPING
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
    this.physics.getBallPosition(this.ballMesh.position);
  }
}
