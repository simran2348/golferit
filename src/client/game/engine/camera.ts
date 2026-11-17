import { OrthographicCamera, Vector2, Vector3 } from 'three';

/**
 * Fixed isometric-style viewing direction: from behind the tee (south-west),
 * elevated ~40°. An orthographic camera keeps proportions identical across the
 * course, which reads clearly on small screens and suits a low-poly style.
 */
const VIEW_DIRECTION = new Vector3(-1, 1.25, 1).normalize();
const CAMERA_DISTANCE = 40;
const FIT_PADDING = 1.08;
/** Exponential smoothing rates (per second) for zoom and follow. */
const ZOOM_SMOOTHING = 10;
const FOLLOW_SMOOTHING = 6;

const projected = new Vector3();
const toFocus = new Vector3();

/**
 * Owns the orthographic camera. At zoom 1 the whole island fits the screen.
 * Zooming in follows a focus point (the ball), clamped so the view never
 * leaves the zoom-1 framing; at zoom 1 that clamp is zero, so no special case.
 */
export class CameraRig {
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  /** World point the camera looks at when fully zoomed out. */
  private readonly fitTarget = new Vector3();
  private halfWidth = 1;
  private halfHeight = 1;
  private targetZoom = 1;
  private readonly offset = new Vector2();
  private readonly desiredOffset = new Vector2();

  constructor(center: Vector3) {
    this.fitTarget.copy(center);
    this.applyPosition();
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();
    // Orientation never changes, so the screen axes are fixed.
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
  }

  /** Size the zoom-1 view so all `points` fit the given aspect ratio. */
  fit(points: readonly Vector3[], aspect: number): void {
    // Measure from the un-followed position so repeated fits (resizes while
    // zoomed in) don't drift.
    const savedOffset = this.offset.clone();
    this.offset.set(0, 0);
    this.applyPosition();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      projected.copy(point).applyMatrix4(this.camera.matrixWorldInverse);
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
    }

    let width = (maxX - minX) * FIT_PADDING;
    let height = (maxY - minY) * FIT_PADDING;
    if (width / height < aspect) width = height * aspect;
    else height = width / aspect;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;

    // Re-centre the camera on the framed points so the frustum is symmetric.
    this.fitTarget
      .addScaledVector(this.right, (minX + maxX) / 2)
      .addScaledVector(this.up, (minY + maxY) / 2);

    const cam = this.camera;
    cam.left = -this.halfWidth;
    cam.right = this.halfWidth;
    cam.top = this.halfHeight;
    cam.bottom = -this.halfHeight;
    cam.updateProjectionMatrix();
    this.offset.copy(savedOffset);
    this.applyPosition();
  }

  setZoom(zoom: number): void {
    this.targetZoom = zoom;
  }

  /** Ease zoom and follow toward their targets. Call once per frame. */
  update(delta: number, focus: Vector3): void {
    const cam = this.camera;
    const zoomBlend = 1 - Math.exp(-ZOOM_SMOOTHING * delta);
    const nextZoom = cam.zoom + (this.targetZoom - cam.zoom) * zoomBlend;
    if (Math.abs(nextZoom - cam.zoom) > 1e-4) {
      cam.zoom = nextZoom;
      cam.updateProjectionMatrix();
    } else if (cam.zoom !== this.targetZoom) {
      cam.zoom = this.targetZoom;
      cam.updateProjectionMatrix();
    }

    // How far the view may slide before showing beyond the zoom-1 framing.
    const maxX = this.halfWidth - this.halfWidth / cam.zoom;
    const maxY = this.halfHeight - this.halfHeight / cam.zoom;
    toFocus.subVectors(focus, this.fitTarget);
    this.desiredOffset.set(
      Math.min(Math.max(toFocus.dot(this.right), -maxX), maxX),
      Math.min(Math.max(toFocus.dot(this.up), -maxY), maxY)
    );
    this.offset.lerp(
      this.desiredOffset,
      1 - Math.exp(-FOLLOW_SMOOTHING * delta)
    );
    this.applyPosition();
  }

  private applyPosition(): void {
    this.camera.position
      .copy(this.fitTarget)
      .addScaledVector(this.right, this.offset.x)
      .addScaledVector(this.up, this.offset.y)
      .addScaledVector(VIEW_DIRECTION, CAMERA_DISTANCE);
    this.camera.updateMatrixWorld();
  }
}
