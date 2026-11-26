import type {
  BoostObstacle,
  Obstacle,
  PortalObstacle,
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

/** Ball centre inside an axis-aligned square (sand traps, boost pads). */
const inSquare = (center: Vec2, size: number, point: Vec2): boolean =>
  Math.abs(point.x - center.x) <= size / 2 &&
  Math.abs(point.z - center.z) <= size / 2;

/** Is the ball centre in any sand trap? */
export const isInSand = (obstacles: Obstacle[], point: Vec2): boolean =>
  obstacles.some(
    (obstacle) =>
      obstacle.kind === 'sand' &&
      inSquare(obstacle.position, obstacle.size, point)
  );

/** Boost pads whose square contains the point. */
export const boostsAt = (obstacles: Obstacle[], point: Vec2): BoostObstacle[] =>
  obstacles.filter(
    (obstacle): obstacle is BoostObstacle =>
      obstacle.kind === 'boost' &&
      inSquare(obstacle.position, obstacle.size, point)
  );

/** Unit vector the pad's arrow points along (local +X in world space). */
export const boostDirection = (boost: BoostObstacle): Vec2 => ({
  x: Math.cos(boost.rotationY),
  z: -Math.sin(boost.rotationY),
});

/** Every pass over a pad adds at least this much speed along the arrow. */
export const BOOST_EXTRA_SPEED = 3;
/** ...but never pushes the ball faster than this. */
export const BOOST_MAX_SPEED = 14;

/**
 * Velocity after rolling onto a boost pad: the component along the arrow gets
 * a push of BOOST_EXTRA_SPEED and is at least the pad's speed (capped at
 * BOOST_MAX_SPEED); sideways drift is halved so the ball lines up with the
 * arrow.
 */
export const boostVelocity = (boost: BoostObstacle, velocity: Vec2): Vec2 => {
  const dir = boostDirection(boost);
  const along = velocity.x * dir.x + velocity.z * dir.z;
  const sideX = velocity.x - along * dir.x;
  const sideZ = velocity.z - along * dir.z;
  const boosted = Math.max(
    along,
    Math.min(Math.max(along + BOOST_EXTRA_SPEED, boost.speed), BOOST_MAX_SPEED)
  );
  return {
    x: dir.x * boosted + sideX * 0.5,
    z: dir.z * boosted + sideZ * 0.5,
  };
};

export type PortalEnd = 'a' | 'b';

/** Which end of a teleporter pair the point is in, if any. */
export const portalEndAt = (
  portal: PortalObstacle,
  point: Vec2
): PortalEnd | null => {
  const within = (end: Vec2) =>
    Math.hypot(point.x - end.x, point.z - end.z) <= portal.radius;
  return within(portal.a) ? 'a' : within(portal.b) ? 'b' : null;
};

export const otherPortalEnd = (end: PortalEnd): PortalEnd =>
  end === 'a' ? 'b' : 'a';
