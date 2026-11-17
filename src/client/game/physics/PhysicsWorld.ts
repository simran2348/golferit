import {
  CoefficientCombineRule,
  ColliderDesc,
  RigidBodyDesc,
  World,
  type RigidBody,
} from '@dimforge/rapier3d-compat';
import { Euler, Quaternion, Vector3 } from 'three';
import type {
  CourseDefinition,
  Vec2,
  WindmillObstacle,
} from '../../../shared/types/course';
import {
  buildCornerPosts,
  buildWallSegments,
  polygonBounds,
} from '../../../shared/course/geometry';
import { windmillBladeAngle } from '../../../shared/course/obstacles';
import {
  BALL_RADIUS,
  BUMPER_HEIGHT,
  PHYSICS_STEP,
  WALL_BASE_Y,
  WALL_POST_SIZE,
  WALL_THICKNESS,
  WINDMILL,
} from '../../../shared/constants/game';

/** Colliders are taller than the visual walls so fast balls can't hop them. */
const COLLIDER_WALL_HEIGHT = 1.2;

const yawQuaternion = (rotationY: number) => ({
  x: 0,
  y: Math.sin(rotationY / 2),
  z: 0,
  w: Math.cos(rotationY / 2),
});

type Windmill = {
  definition: WindmillObstacle;
  blades: RigidBody;
  yaw: Quaternion;
};

const scratchQuat = new Quaternion();
const scratchEuler = new Euler();

/**
 * Rapier world built purely from shared course data. Static geometry uses
 * boxes and cylinders only (cheap, stable contacts). The windmill blades are a
 * kinematic body posed from `windmillBladeAngle`, the same function that
 * drives the visuals.
 */
export class PhysicsWorld {
  private readonly world: World;
  private readonly ballBody: RigidBody;
  private readonly windmills: Windmill[] = [];
  /** Simulation clock, seconds. Starts at the engine's clock to stay in sync. */
  time: number;

  constructor(course: CourseDefinition, startTime: number) {
    this.time = startTime;
    this.world = new World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = PHYSICS_STEP;

    const statics = this.world.createRigidBody(RigidBodyDesc.fixed());
    this.createGround(course, statics);
    this.createWalls(course, statics);
    this.createObstacles(course, statics);

    this.ballBody = this.world.createRigidBody(
      RigidBodyDesc.dynamic()
        .setTranslation(course.tee.x, BALL_RADIUS + 0.005, course.tee.z)
        .setCcdEnabled(true)
        .setCanSleep(false)
        .setAngularDamping(0.8)
    );
    this.world.createCollider(
      ColliderDesc.ball(BALL_RADIUS)
        .setDensity(1)
        .setFriction(0.6)
        .setRestitution(0.3),
      this.ballBody
    );
  }

  /** Advance one fixed step, posing kinematic obstacles first. */
  step(): void {
    this.time += PHYSICS_STEP;
    for (const windmill of this.windmills) {
      scratchQuat
        .setFromEuler(
          scratchEuler.set(
            windmillBladeAngle(windmill.definition, this.time),
            0,
            0
          )
        )
        .premultiply(windmill.yaw);
      windmill.blades.setNextKinematicRotation(scratchQuat);
    }
    this.world.step();
  }

  getBallPosition(target: Vector3): Vector3 {
    const t = this.ballBody.translation();
    return target.set(t.x, t.y, t.z);
  }

  getBallVelocity(target: Vector3): Vector3 {
    const v = this.ballBody.linvel();
    return target.set(v.x, v.y, v.z);
  }

  setBallDamping(linearDamping: number): void {
    this.ballBody.setLinearDamping(linearDamping);
  }

  launchBall(velocity: Vec2): void {
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.ballBody.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
  }

  stopBall(): void {
    this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /** Remove the ball from simulation (e.g. while it sinks into the cup). */
  setBallEnabled(enabled: boolean): void {
    this.ballBody.setEnabled(enabled);
  }

  placeBall(position: Vec2): void {
    this.stopBall();
    this.ballBody.setTranslation(
      { x: position.x, y: BALL_RADIUS + 0.005, z: position.z },
      true
    );
    this.ballBody.setEnabled(true);
  }

  dispose(): void {
    this.world.free();
  }

  private createGround(course: CourseDefinition, body: RigidBody): void {
    // One slab under the whole course. Cup and water are handled by rules,
    // not holes in the collider: robust and keeps lip-outs predictable.
    const b = polygonBounds(course.outline);
    this.world.createCollider(
      ColliderDesc.cuboid(
        (b.maxX - b.minX) / 2 + 1,
        0.5,
        (b.maxZ - b.minZ) / 2 + 1
      )
        .setTranslation((b.minX + b.maxX) / 2, -0.5, (b.minZ + b.maxZ) / 2)
        .setFriction(0.8)
        .setRestitution(0)
        .setRestitutionCombineRule(CoefficientCombineRule.Min),
      body
    );
  }

  private createWalls(course: CourseDefinition, body: RigidBody): void {
    const halfHeight = (COLLIDER_WALL_HEIGHT - WALL_BASE_Y) / 2;
    const centerY = WALL_BASE_Y + halfHeight;
    const segments = buildWallSegments(course.outline, WALL_THICKNESS);

    for (const segment of segments) {
      this.world.createCollider(
        this.bouncy(
          ColliderDesc.cuboid(
            segment.length / 2,
            halfHeight,
            WALL_THICKNESS / 2
          )
        )
          .setTranslation(segment.center.x, centerY, segment.center.z)
          .setRotation(yawQuaternion(segment.rotationY)),
        body
      );
    }
    for (const post of buildCornerPosts(segments, WALL_THICKNESS)) {
      this.world.createCollider(
        this.bouncy(
          ColliderDesc.cuboid(
            WALL_POST_SIZE / 2,
            halfHeight,
            WALL_POST_SIZE / 2
          )
        )
          .setTranslation(post.center.x, centerY, post.center.z)
          .setRotation(yawQuaternion(post.rotationY)),
        body
      );
    }
  }

  private createObstacles(course: CourseDefinition, body: RigidBody): void {
    for (const obstacle of course.obstacles) {
      switch (obstacle.kind) {
        case 'bumper':
          this.world.createCollider(
            ColliderDesc.cylinder(BUMPER_HEIGHT / 2, obstacle.radius)
              .setTranslation(
                obstacle.position.x,
                BUMPER_HEIGHT / 2,
                obstacle.position.z
              )
              .setRestitution(0.9)
              .setRestitutionCombineRule(CoefficientCombineRule.Max),
            body
          );
          break;
        case 'windmill':
          this.createWindmill(obstacle, body);
          break;
      }
    }
  }

  private createWindmill(windmill: WindmillObstacle, statics: RigidBody): void {
    const yaw = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      windmill.rotationY
    );
    const origin = new Vector3(windmill.position.x, 0, windmill.position.z);
    const toWorld = (x: number, y: number, z: number) =>
      new Vector3(x, y, z).applyQuaternion(yaw).add(origin);

    // Two base blocks either side of the tunnel. The lintel and tower sit
    // above the ball's reach, so they need no colliders.
    const sideWidth = (WINDMILL.baseWidth - WINDMILL.tunnelWidth) / 2;
    for (const side of [-1, 1]) {
      const center = toWorld(
        0,
        WINDMILL.baseHeight / 2,
        (side * (WINDMILL.tunnelWidth + sideWidth)) / 2
      );
      this.world.createCollider(
        this.bouncy(
          ColliderDesc.cuboid(
            WINDMILL.baseDepth / 2,
            WINDMILL.baseHeight / 2,
            sideWidth / 2
          )
        )
          .setTranslation(center.x, center.y, center.z)
          .setRotation(yaw),
        statics
      );
    }

    const pivot = toWorld(WINDMILL.bladePivotX, WINDMILL.hubHeight, 0);
    const blades = this.world.createRigidBody(
      RigidBodyDesc.kinematicPositionBased()
        .setTranslation(pivot.x, pivot.y, pivot.z)
        .setRotation(yaw)
    );
    const bladeCenter = WINDMILL.bladeLength / 2 + WINDMILL.bladeOffset;
    for (let i = 0; i < WINDMILL.bladeCount; i++) {
      const angle = (i * Math.PI * 2) / WINDMILL.bladeCount;
      const offset = new Vector3(0, bladeCenter, 0).applyAxisAngle(
        new Vector3(1, 0, 0),
        angle
      );
      this.world.createCollider(
        // Slightly thicker than the visual blade for reliable contacts.
        ColliderDesc.cuboid(
          0.06,
          WINDMILL.bladeLength / 2,
          WINDMILL.bladeWidth / 2
        )
          .setTranslation(offset.x, offset.y, offset.z)
          .setRotation(
            new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle)
          )
          .setRestitution(0.5),
        blades
      );
    }
    this.windmills.push({ definition: windmill, blades, yaw });
  }

  private bouncy(desc: ColliderDesc): ColliderDesc {
    return desc
      .setFriction(0.1)
      .setRestitution(0.75)
      .setRestitutionCombineRule(CoefficientCombineRule.Max);
  }
}
