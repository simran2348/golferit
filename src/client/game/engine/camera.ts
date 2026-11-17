import { OrthographicCamera, Vector3 } from 'three';

/**
 * Fixed isometric-style viewing direction: from behind the tee (south-west),
 * elevated ~40°. An orthographic camera keeps proportions identical across the
 * course, which reads clearly on small screens and suits a low-poly style.
 */
const VIEW_DIRECTION = new Vector3(-1, 1.25, 1).normalize();
const CAMERA_DISTANCE = 40;

export const createIsometricCamera = (target: Vector3): OrthographicCamera => {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  camera.position.copy(target).addScaledVector(VIEW_DIRECTION, CAMERA_DISTANCE);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return camera;
};

const projected = new Vector3();

/**
 * Size the orthographic frustum so all `points` fill the viewport for the
 * given aspect ratio. Works for both portrait phones and landscape desktops:
 * the limiting axis is chosen automatically. Fitting real outline points
 * (rather than an axis-aligned box) avoids wasting space on empty corners of
 * non-rectangular courses seen at an angle.
 */
export const fitCameraToPoints = (
  camera: OrthographicCamera,
  points: readonly Vector3[],
  aspect: number,
  padding = 1.08
): void => {
  camera.updateMatrixWorld();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    projected.copy(point).applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, projected.x);
    maxX = Math.max(maxX, projected.x);
    minY = Math.min(minY, projected.y);
    maxY = Math.max(maxY, projected.y);
  }

  let width = (maxX - minX) * padding;
  let height = (maxY - minY) * padding;
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  camera.left = centerX - width / 2;
  camera.right = centerX + width / 2;
  camera.top = centerY + height / 2;
  camera.bottom = centerY - height / 2;
  camera.updateProjectionMatrix();
};
