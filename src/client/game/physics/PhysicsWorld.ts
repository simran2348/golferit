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
  Obstacle,
  RampObstacle,
  SliderObstacle,
  SpinnerObstacle,
  TunnelObstacle,
  Vec2,
  WallObstacle,
  WindmillObstacle,
} from '../../../shared/types/course';
import {
  buildCornerPosts,
  buildWallSegments,
  polygonBounds,
} from '../../../shared/course/geometry';
import {
  rampProfile,
  sliderOffset,
  spinnerAngle,
  surfaceHeightAt,
  windmillBladeAngle,
} from '../../../shared/course/obstacles';
import {
  BALL_RADIUS,
  BUMPER_HEIGHT,
  PARTITION_THICKNESS,
  PHYSICS_STEP,
  SLIDER_HEIGHT,
  SPINNER_ARM_HEIGHT,
  SPINNER_ARM_THICKNESS,
  SPINNER_POST_RADIUS,
  TUNNEL_WALL_HEIGHT,
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

type Slider = {
  definition: SliderObstacle;
  body: RigidBody;
  /** Unit travel direction on the XZ plane. */
  axisX: number;
  axisZ: number;
};

type Spinner = {
  definition: SpinnerObstacle;
  body: RigidBody;
};

/** Spinner arms float just above the ground so they never scrape it. */
const SPINNER_ARM_LIFT = 0.02;

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
  private readonly sliders: Slider[] = [];
  private readonly spinners: Spinner[] = [];
  private readonly obstacles: Obstacle[];
  /** Simulation clock, seconds. Starts at the engine's clock to stay in sync. */
  time: number;

  constructor(course: CourseDefinition, startTime: number) {
    this.time = startTime;
    this.obstacles = course.obstacles;
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
    for (const slider of this.sliders) {
      const offset = sliderOffset(slider.definition, this.time);
      slider.body.setNextKinematicTranslation({
        x: slider.definition.position.x + slider.axisX * offset,
        y: SLIDER_HEIGHT / 2,
        z: slider.definition.position.z + slider.axisZ * offset,
      });
    }
    for (const spinner of this.spinners) {
      spinner.body.setNextKinematicRotation(
        yawQuaternion(spinnerAngle(spinner.definition, this.time))
      );
    }
    this.world.step();
  }

  getBallPosition(target: Vector3): Vector3 {
    const t = this.ballBody.translation();
    return target.set(t.x, t.y, t.z);
  }

  getBallRotation(target: Quaternion): Quaternion {
    const r = this.ballBody.rotation();
    return target.set(r.x, r.y, r.z, r.w);
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

  /** Put the ball at rest on the surface (the ground or a ramp top). */
  placeBall(position: Vec2): void {
    this.stopBall();
    const ground = surfaceHeightAt(this.obstacles, position);
    this.ballBody.setTranslation(
      // A little extra on slopes, where the contact point isn't straight down.
      {
        x: position.x,
        y: BALL_RADIUS + 0.005 + ground + (ground > 0 ? 0.02 : 0),
        z: position.z,
      },
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
        case 'slider':
          this.createSlider(obstacle);
          break;
        case 'tunnel':
          this.createTunnel(obstacle, body);
          break;
        case 'ramp':
          this.createRamp(obstacle, body);
          break;
        case 'spinner':
          this.createSpinner(obstacle);
          break;
        case 'wall':
          this.createPartition(obstacle, body);
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

  private createSlider(slider: SliderObstacle): void {
    const axisX = Math.cos(slider.rotationY);
    const axisZ = -Math.sin(slider.rotationY);
    const offset = sliderOffset(slider, this.time);
    const body = this.world.createRigidBody(
      RigidBodyDesc.kinematicPositionBased()
        .setTranslation(
          slider.position.x + axisX * offset,
          SLIDER_HEIGHT / 2,
          slider.position.z + axisZ * offset
        )
        .setRotation(yawQuaternion(slider.rotationY))
    );
    this.world.createCollider(
      this.bouncy(
        ColliderDesc.cuboid(
          slider.length / 2,
          SLIDER_HEIGHT / 2,
          slider.width / 2
        )
      ),
      body
    );
    this.sliders.push({ definition: slider, body, axisX, axisZ });
  }

  private createTunnel(tunnel: TunnelObstacle, statics: RigidBody): void {
    const sideWidth = (tunnel.outerWidth - tunnel.innerWidth) / 2;
    const yaw = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      tunnel.rotationY
    );
    for (const side of [-1, 1]) {
      const center = new Vector3(
        0,
        TUNNEL_WALL_HEIGHT / 2,
        (side * (tunnel.innerWidth + sideWidth)) / 2
      )
        .applyQuaternion(yaw)
        .add(new Vector3(tunnel.position.x, 0, tunnel.position.z));
      this.world.createCollider(
        this.bouncy(
          ColliderDesc.cuboid(
            tunnel.length / 2,
            TUNNEL_WALL_HEIGHT / 2,
            sideWidth / 2
          )
        )
          .setTranslation(center.x, center.y, center.z)
          .setRotation(yaw),
        statics
      );
    }
  }

  /** One convex hull (no seams for the ball to catch on), grassy friction. */
  private createRamp(ramp: RampObstacle, statics: RigidBody): void {
    const points: number[] = [];
    for (const [along, height] of rampProfile(ramp)) {
      for (const side of [-1, 1]) {
        points.push(along, height, (side * ramp.width) / 2);
      }
    }
    const hull = ColliderDesc.convexHull(new Float32Array(points));
    if (!hull) throw new Error(`Ramp ${ramp.id} has a degenerate shape`);
    this.world.createCollider(
      hull
        .setTranslation(ramp.position.x, 0, ramp.position.z)
        .setRotation(yawQuaternion(ramp.rotationY))
        .setFriction(0.8)
        .setRestitution(0)
        .setRestitutionCombineRule(CoefficientCombineRule.Min),
      statics
    );
  }

  /** Kinematic body spun about its post, posed from `spinnerAngle`. */
  private createSpinner(spinner: SpinnerObstacle): void {
    const body = this.world.createRigidBody(
      RigidBodyDesc.kinematicPositionBased()
        .setTranslation(spinner.position.x, 0, spinner.position.z)
        .setRotation(yawQuaternion(spinnerAngle(spinner, this.time)))
    );
    const halfArm = SPINNER_ARM_HEIGHT / 2;
    this.world.createCollider(
      this.bouncy(
        ColliderDesc.cuboid(
          spinner.armLength,
          halfArm,
          SPINNER_ARM_THICKNESS / 2
        )
      ).setTranslation(0, SPINNER_ARM_LIFT + halfArm, 0),
      body
    );
    this.world.createCollider(
      this.bouncy(
        ColliderDesc.cylinder(COLLIDER_WALL_HEIGHT / 2, SPINNER_POST_RADIUS)
      ).setTranslation(0, COLLIDER_WALL_HEIGHT / 2, 0),
      body
    );
    this.spinners.push({ definition: spinner, body });
  }

  private createPartition(wall: WallObstacle, statics: RigidBody): void {
    const dx = wall.to.x - wall.from.x;
    const dz = wall.to.z - wall.from.z;
    const length = Math.hypot(dx, dz);
    if (length === 0) return;
    const halfHeight = (COLLIDER_WALL_HEIGHT - WALL_BASE_Y) / 2;
    this.world.createCollider(
      this.bouncy(
        ColliderDesc.cuboid(length / 2, halfHeight, PARTITION_THICKNESS / 2)
      )
        .setTranslation(
          (wall.from.x + wall.to.x) / 2,
          WALL_BASE_Y + halfHeight,
          (wall.from.z + wall.to.z) / 2
        )
        .setRotation(yawQuaternion(Math.atan2(-dz, dx))),
      statics
    );
  }

  private bouncy(desc: ColliderDesc): ColliderDesc {
    return desc
      .setFriction(0.1)
      .setRestitution(0.75)
      .setRestitutionCombineRule(CoefficientCombineRule.Max);
  }
}
