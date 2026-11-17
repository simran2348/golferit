import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import { MIN_SHOT_POWER } from '../../../shared/constants/game';

export type Aim = {
  /** Unit vector on the XZ plane: the direction the ball will travel. */
  direction: Vector3;
  /** 0..1 */
  power: number;
};

type ShotControlsOptions = {
  element: HTMLElement;
  camera: Camera;
  canAim: () => boolean;
  getBallPosition: (target: Vector3) => Vector3;
  onAimChange: (aim: Aim | null) => void;
  onShoot: (aim: Aim) => void;
};

/** Fraction of the shorter screen side that counts as a full-power drag. */
const FULL_POWER_DRAG = 0.4;

/**
 * Slingshot-style input: press anywhere, pull back, release. Direction comes
 * from the drag projected onto the ground plane (so it matches the 3D view);
 * power comes from drag length in screen pixels (so it feels the same on every
 * device). Works with mouse, touch and pen via Pointer Events.
 */
export class ShotControls {
  private readonly raycaster = new Raycaster();
  private readonly plane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly ndc = new Vector2();
  private readonly startWorld = new Vector3();
  private readonly currentWorld = new Vector3();
  private readonly ballPosition = new Vector3();
  private readonly startScreen = new Vector2();
  private pointerId: number | null = null;
  private aim: Aim | null = null;

  constructor(private readonly options: ShotControlsOptions) {
    const { element } = options;
    element.addEventListener('pointerdown', this.handleDown);
    element.addEventListener('pointermove', this.handleMove);
    element.addEventListener('pointerup', this.handleUp);
    element.addEventListener('pointercancel', this.handleCancel);
    element.addEventListener('lostpointercapture', this.handleCancel);
  }

  dispose(): void {
    const { element } = this.options;
    element.removeEventListener('pointerdown', this.handleDown);
    element.removeEventListener('pointermove', this.handleMove);
    element.removeEventListener('pointerup', this.handleUp);
    element.removeEventListener('pointercancel', this.handleCancel);
    element.removeEventListener('lostpointercapture', this.handleCancel);
  }

  private readonly handleDown = (event: PointerEvent): void => {
    if (this.pointerId !== null || !this.options.canAim()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!this.projectToGround(event, this.startWorld)) return;
    this.pointerId = event.pointerId;
    this.startScreen.set(event.clientX, event.clientY);
    this.options.element.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly handleMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    if (!this.options.canAim()) {
      this.reset();
      return;
    }
    this.updateAim(event);
  };

  private readonly handleUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.updateAim(event);
    const aim = this.aim;
    this.reset();
    if (aim && this.options.canAim()) this.options.onShoot(aim);
  };

  private readonly handleCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.reset();
  };

  private updateAim(event: PointerEvent): void {
    if (!this.projectToGround(event, this.currentWorld)) return;
    const rect = this.options.element.getBoundingClientRect();
    const fullDrag = Math.min(rect.width, rect.height) * FULL_POWER_DRAG;
    const dragPixels = Math.hypot(
      event.clientX - this.startScreen.x,
      event.clientY - this.startScreen.y
    );
    const power = Math.min(dragPixels / fullDrag, 1);

    // Pull back = shoot forward.
    const direction = this.startWorld.clone().sub(this.currentWorld);
    direction.y = 0;
    if (power < MIN_SHOT_POWER || direction.lengthSq() < 1e-6) {
      this.setAim(null);
      return;
    }
    this.setAim({ direction: direction.normalize(), power });
  }

  private projectToGround(event: PointerEvent, target: Vector3): boolean {
    const rect = this.options.element.getBoundingClientRect();
    this.ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    // Project onto a plane at ball height so the aim lines up with the ball.
    this.plane.constant = -this.options.getBallPosition(this.ballPosition).y;
    this.raycaster.setFromCamera(this.ndc, this.options.camera);
    return this.raycaster.ray.intersectPlane(this.plane, target) !== null;
  }

  private setAim(aim: Aim | null): void {
    this.aim = aim;
    this.options.onAimChange(aim);
  }

  private reset(): void {
    if (this.pointerId !== null) {
      const element = this.options.element;
      if (element.hasPointerCapture(this.pointerId)) {
        element.releasePointerCapture(this.pointerId);
      }
    }
    this.pointerId = null;
    this.setAim(null);
  }
}
