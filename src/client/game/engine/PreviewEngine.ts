import {
  Box3,
  Group,
  Light,
  MOUSE,
  OrthographicCamera,
  Scene,
  Sphere,
  TOUCH,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CourseDefinition } from '../../../shared/types/course';
import { createCourseScene } from '../objects/course';
import { createMaterials } from '../objects/materials';
import { disposeObject3D, disposeRenderer } from './dispose';
import { createEnvironment } from './environment';
import { createLighting } from './lighting';
import { createRenderer } from './renderer';
import type { Updatable } from './types';

const MAX_FRAME_DELTA = 0.1;
const SHADOW_MAP_SIZE = 1024;
/** Same starting angle as the game camera: from behind the tee, elevated. */
const START_DIRECTION = new Vector3(-1, 1.25, 1).normalize();
const CAMERA_DISTANCE = 40;
/**
 * The bounding sphere is conservative (it covers the hanging rocks and the
 * tallest props), so fill a bit tighter than it.
 */
const FIT_PADDING = 0.88;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 5;
/** Keep the camera above the island: never look from underneath. */
const MAX_POLAR_ANGLE = Math.PI * 0.45;

type Built = {
  root: Group;
  lighting: Group;
  updatables: Updatable[];
  /** Sphere around the playable island: frames the view at any angle. */
  bounds: Sphere;
};

/**
 * Free-look 3D view of a course for the editor: the game's meshes, no
 * physics. Drag to orbit 360°, pinch/scroll to zoom, two fingers or
 * right-drag to pan.
 */
export class PreviewEngine {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  private readonly controls: OrbitControls;
  private readonly oceanUpdatable: Updatable;
  private readonly resizeObserver: ResizeObserver;
  private built: Built | null = null;
  private elapsed = 0;
  private lastTimestamp: number | null = null;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = createRenderer();
    container.appendChild(this.renderer.domElement);
    const environment = createEnvironment(this.scene);
    // Tilting the view shows the horizon: stretch the ocean past it.
    environment.ocean.scale.set(4, 1, 4);
    this.scene.add(environment.ocean);
    this.oceanUpdatable = environment.updatable;

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minZoom = MIN_ZOOM;
    controls.maxZoom = MAX_ZOOM;
    controls.maxPolarAngle = MAX_POLAR_ANGLE;
    controls.zoomToCursor = true;
    controls.zoomSpeed = 1.6;
    controls.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    };
    controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    this.controls = controls;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.setAnimationLoop((timestamp) => this.frame(timestamp));
  }

  setCourse(course: CourseDefinition): void {
    if (this.disposed) return;
    const firstCourse = this.built === null;
    this.clearCourse();

    const course3d = createCourseScene(course, createMaterials());
    const lighting = createLighting(course3d.shadowBounds, SHADOW_MAP_SIZE);
    this.scene.add(course3d.root, lighting);
    this.built = {
      root: course3d.root,
      lighting,
      updatables: course3d.updatables,
      bounds: new Box3()
        .setFromPoints(course3d.framingPoints)
        .getBoundingSphere(new Sphere()),
    };
    if (firstCourse) this.resetView();
    else this.resize();
  }

  /** Multiply the zoom (buttons); pinch and scroll go through the controls. */
  zoomBy(factor: number): void {
    this.camera.zoom = Math.min(
      Math.max(this.camera.zoom * factor, MIN_ZOOM),
      MAX_ZOOM
    );
    this.camera.updateProjectionMatrix();
  }

  /** Back to the starting angle, whole course in view. */
  resetView(): void {
    const built = this.built;
    if (!built) return;
    const center = built.bounds.center;
    this.controls.target.copy(center);
    this.camera.position
      .copy(center)
      .addScaledVector(START_DIRECTION, CAMERA_DISTANCE);
    this.camera.zoom = 1;
    this.resize();
    this.controls.update();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.clearCourse();
    disposeObject3D(this.scene);
    this.scene.clear();
    disposeRenderer(this.renderer);
  }

  private clearCourse(): void {
    if (!this.built) return;
    const { root, lighting } = this.built;
    this.scene.remove(root, lighting);
    disposeObject3D(root);
    lighting.traverse((object) => {
      if (object instanceof Light) object.dispose();
    });
    this.built = null;
  }

  /** Size the frustum so the island's bounding sphere fits from any angle. */
  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    const radius = (this.built?.bounds.radius ?? 10) * FIT_PADDING;
    const aspect = width / height;
    const halfHeight = aspect >= 1 ? radius : radius / aspect;
    const camera = this.camera;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.updateProjectionMatrix();
    this.renderer.render(this.scene, camera);
  }

  private frame(timestamp: number): void {
    const seconds = timestamp / 1000;
    const delta =
      this.lastTimestamp === null
        ? 0
        : Math.min(seconds - this.lastTimestamp, MAX_FRAME_DELTA);
    this.lastTimestamp = seconds;
    this.elapsed += delta;

    const built = this.built;
    if (!built) return;
    // Don't let panning wander off the island.
    const { center, radius } = built.bounds;
    const target = this.controls.target;
    if (target.distanceTo(center) > radius * 0.8) {
      // Move camera and target together so the view doesn't jump.
      const clamped = target
        .clone()
        .sub(center)
        .setLength(radius * 0.8)
        .add(center);
      this.camera.position.add(clamped.sub(target));
      target.add(clamped);
    }
    this.controls.update(delta);

    this.oceanUpdatable.update(this.elapsed, delta);
    for (const updatable of built.updatables) {
      updatable.update(this.elapsed, delta);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
