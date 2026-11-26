import { Scene, Vector3, type Mesh, type WebGLRenderer } from 'three';
import type { CourseDefinition } from '../../../shared/types/course';
import { ShotControls, type Aim } from '../controls/ShotControls';
import type { GameSession } from '../logic/GameSession';
import { GameplaySystem } from '../logic/GameplaySystem';
import { createAimIndicator, type AimIndicator } from '../objects/aimIndicator';
import { createCourseScene } from '../objects/course';
import { createMaterials } from '../objects/materials';
import { createSplash, type SplashEffect } from '../objects/splash';
import {
  createTeleportFlash,
  type TeleportFlash,
} from '../objects/teleportFlash';
import { loadPhysics } from '../physics/loadPhysics';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { CameraRig } from './camera';
import { disposeObject3D, disposeRenderer } from './dispose';
import { createEnvironment } from './environment';
import { createLighting } from './lighting';
import { createRenderer, isCoarsePointer } from './renderer';
import type { Updatable } from './types';
import type { ZoomController } from './ZoomController';

/** Long frames (tab switch, debugger) must not teleport animations. */
const MAX_FRAME_DELTA = 0.1;

/** Created once Rapier's WASM has loaded. */
type Gameplay = {
  physics: PhysicsWorld;
  system: GameplaySystem;
  controls: ShotControls;
};

/**
 * Owns the Three.js renderer, scene, camera, physics and frame loop. Lives
 * entirely outside React: React mounts it into a container and calls
 * `dispose()` on unmount. It talks to the UI only through GameSession, whose
 * state changes on game events, never per frame.
 */
export class GameEngine {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly rig: CameraRig;
  private readonly framingPoints: Vector3[];
  private readonly updatables: Updatable[];
  private readonly resizeObserver: ResizeObserver;
  private readonly ball: Mesh;
  private readonly aimIndicator: AimIndicator;
  private readonly splash: SplashEffect;
  private readonly teleportFlash: TeleportFlash;
  private gameplay: Gameplay | null = null;
  private aim: Aim | null = null;
  private elapsed = 0;
  private lastTimestamp: number | null = null;
  private disposed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly course: CourseDefinition,
    private readonly session: GameSession,
    private readonly zoom: ZoomController
  ) {
    this.renderer = createRenderer();
    container.appendChild(this.renderer.domElement);

    const course3d = createCourseScene(course, createMaterials());
    const environment = createEnvironment(this.scene);
    this.ball = course3d.ball;
    this.framingPoints = course3d.framingPoints;
    this.splash = createSplash();
    this.teleportFlash = createTeleportFlash();
    this.updatables = [
      ...course3d.updatables,
      environment.updatable,
      this.splash.updatable,
      this.teleportFlash.updatable,
    ];
    this.aimIndicator = createAimIndicator();

    const shadowBounds = course3d.shadowBounds.clone();
    // Include the ocean directly below so island shadows land on the water.
    shadowBounds.expandByPoint(new Vector3(0, environment.ocean.position.y, 0));
    this.scene.add(
      course3d.root,
      environment.ocean,
      this.aimIndicator.group,
      this.splash.group,
      this.teleportFlash.group,
      createLighting(shadowBounds, isCoarsePointer() ? 1024 : 2048)
    );

    this.rig = new CameraRig(course3d.framingCenter);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    session.beginLoading();
    void this.initGameplay();
  }

  start(): void {
    if (this.disposed) return;
    this.renderer.setAnimationLoop((timestamp) => this.frame(timestamp));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    if (this.gameplay) {
      this.gameplay.controls.dispose();
      this.gameplay.system.dispose();
      this.gameplay.physics.dispose();
      this.gameplay = null;
    }
    disposeObject3D(this.scene);
    this.scene.clear();
    disposeRenderer(this.renderer);
  }

  private async initGameplay(): Promise<void> {
    let PhysicsWorldClass: typeof PhysicsWorld;
    try {
      PhysicsWorldClass = await loadPhysics();
    } catch (error) {
      console.error('Failed to initialise physics', error);
      if (!this.disposed) {
        this.session.markFailed(
          'The physics engine could not start on this device.'
        );
      }
      return;
    }
    // The component may have unmounted while WASM was loading.
    if (this.disposed) return;

    // Start the physics clock at the render clock so the windmill blades'
    // colliders line up with the blades you see.
    const physics = new PhysicsWorldClass(this.course, this.elapsed);
    const system = new GameplaySystem(
      this.course,
      physics,
      this.session,
      this.ball,
      {
        splash: (position) => this.splash.trigger(position),
        teleport: (from, to) => this.teleportFlash.trigger(from, to),
      }
    );
    const controls = new ShotControls({
      element: this.renderer.domElement,
      camera: this.rig.camera,
      canAim: () => this.session.canShoot(),
      getBallPosition: (target) => target.copy(this.ball.position),
      onAimChange: (aim) => {
        this.aim = aim;
      },
      onShoot: (aim) => system.shoot(aim),
    });
    this.gameplay = { physics, system, controls };
    this.session.markReady();
  }

  private frame(timestamp: number): void {
    const seconds = timestamp / 1000;
    const delta =
      this.lastTimestamp === null
        ? 0
        : Math.min(seconds - this.lastTimestamp, MAX_FRAME_DELTA);
    this.lastTimestamp = seconds;
    this.elapsed += delta;

    this.gameplay?.system.update(delta);
    this.rig.setZoom(this.zoom.getSnapshot().zoom);
    this.rig.update(delta, this.ball.position);
    for (const updatable of this.updatables) {
      updatable.update(this.elapsed, delta);
    }
    this.aimIndicator.update(
      this.ball.position,
      this.session.canShoot(),
      this.aim,
      this.elapsed
    );
    this.renderer.render(this.scene, this.rig.camera);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    // `false`: CSS already sizes the canvas to the container.
    this.renderer.setSize(width, height, false);
    this.rig.fit(this.framingPoints, width / height);
    // Render immediately so resizing never shows a stretched frame.
    this.renderer.render(this.scene, this.rig.camera);
  }
}
