import type {
  Obstacle,
  RampObstacle,
  SliderObstacle,
  SpinnerObstacle,
  Vec2,
  WindmillObstacle,
} from '../types/course';

/**
 * Moving obstacles are pure functions of time. Rendering, physics (kinematic
 * bodies) and server-side replay validation can all evaluate the same pose for
 * any timestamp without sharing mutable state.
 */
export const windmillBladeAngle = (
  windmill: WindmillObstacle,
  timeSeconds: number
): number => (timeSeconds * windmill.bladeSpeed) % (Math.PI * 2);

/** Slider displacement along its travel axis at a given time. */
export const sliderOffset = (
  slider: SliderObstacle,
  timeSeconds: number
): number =>
  Math.sin(timeSeconds * slider.speed + slider.phase) * slider.travel;

/** Spinner yaw (radians, about +Y) at a given time. */
export const spinnerAngle = (
  spinner: SpinnerObstacle,
  timeSeconds: number
): number => (timeSeconds * spinner.speed + spinner.phase) % (Math.PI * 2);

/**
 * Ramp profile in its local frame: [along, height] corners from the
 * entry base, up the slope, across the top and down. Shared by the mesh and
 * the convex collider so they match exactly.
 */
export const rampProfile = (ramp: RampObstacle): [number, number][] => {
  const half = ramp.length / 2;
  const top = ramp.topLength / 2;
  return [
    [-half, 0],
    [-top, ramp.height],
    [top, ramp.height],
    [half, 0],
  ];
};

/** Height of the ramp's surface under a point (0 when off the ramp). */
export const rampHeightAt = (ramp: RampObstacle, point: Vec2): number => {
  const dx = point.x - ramp.position.x;
  const dz = point.z - ramp.position.z;
  const cos = Math.cos(ramp.rotationY);
  const sin = Math.sin(ramp.rotationY);
  // World → local (inverse yaw). Local +X maps to world (cos, -sin).
  const along = dx * cos - dz * sin;
  const across = dx * sin + dz * cos;
  if (Math.abs(across) > ramp.width / 2) return 0;
  const run = (ramp.length - ramp.topLength) / 2;
  const fromEdge = ramp.length / 2 - Math.abs(along);
  if (fromEdge <= 0) return 0;
  return run <= 0 ? ramp.height : ramp.height * Math.min(fromEdge / run, 1);
};

/** Height of the playing surface at a point: the ground or a ramp on it. */
export const surfaceHeightAt = (obstacles: Obstacle[], point: Vec2): number => {
  let height = 0;
  for (const obstacle of obstacles) {
    if (obstacle.kind === 'ramp') {
      height = Math.max(height, rampHeightAt(obstacle, point));
    }
  }
  return height;
};
