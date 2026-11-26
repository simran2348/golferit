/**
 * Course data model shared by client (rendering, physics) and server
 * (validation, persistence). Courses are plain JSON-serialisable data so the
 * future course editor can produce them and Redis can store them.
 *
 * Coordinate system: Y is up. Courses are laid out on the XZ plane and the
 * putting surface sits at y = 0. One unit is roughly one "mini golf metre",
 * scaled up so the ball is readable on small screens.
 */

export type Vec2 = {
  x: number;
  z: number;
};

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type WaterHazard = {
  id: string;
  /** Simple (non self-intersecting) polygon fully inside the course outline. */
  outline: Vec2[];
};

export type WindmillObstacle = {
  kind: 'windmill';
  id: string;
  position: Vec2;
  /** Radians. At 0 the blades face -X and the tunnel runs along X. */
  rotationY: number;
  /** Blade angular speed in radians per second. */
  bladeSpeed: number;
};

export type BumperObstacle = {
  kind: 'bumper';
  id: string;
  position: Vec2;
  radius: number;
};

/** A block that slides back and forth: offset = sin(t * speed + phase) * travel. */
export type SliderObstacle = {
  kind: 'slider';
  id: string;
  /** Centre of travel. */
  position: Vec2;
  /** Radians. At 0 the block travels along X. */
  rotationY: number;
  /** Half the travel distance. */
  travel: number;
  /** Angular speed in radians per second. */
  speed: number;
  phase: number;
  /** Block footprint: `length` along the travel axis, `width` across it. */
  length: number;
  width: number;
};

/**
 * Arched tunnel. Local frame: passage runs along X. The two side blocks are
 * solid; the ball rolls through the `innerWidth` gap and hides under the roof.
 */
export type TunnelObstacle = {
  kind: 'tunnel';
  id: string;
  position: Vec2;
  rotationY: number;
  length: number;
  innerWidth: number;
  outerWidth: number;
};

/**
 * A hump the ball has to roll up and over: slope, flat top, slope. Local
 * frame: the ball travels along X; `width` spans Z. Too soft a putt rolls
 * back down.
 */
export type RampObstacle = {
  kind: 'ramp';
  id: string;
  position: Vec2;
  rotationY: number;
  /** Footprint along the travel axis, base to base. */
  length: number;
  width: number;
  height: number;
  /** Length of the flat top. */
  topLength: number;
};

/** Two-armed bar spinning flat on the ground around a centre post. */
export type SpinnerObstacle = {
  kind: 'spinner';
  id: string;
  position: Vec2;
  /** Centre to arm tip. */
  armLength: number;
  /** Radians per second; positive is counter-clockwise seen from above. */
  speed: number;
  phase: number;
};

/** Free-standing straight wall (e.g. a diagonal deflector) between two points. */
export type WallObstacle = {
  kind: 'wall';
  id: string;
  from: Vec2;
  to: Vec2;
};

/** Square bunker (rounded corners). Heavy drag: the ball bogs down in it. */
export type SandObstacle = {
  kind: 'sand';
  id: string;
  position: Vec2;
  /** Side length of the square. */
  size: number;
};

/**
 * Arrow pad. Each time the ball rolls onto it, it gets a push along the
 * arrow, to at least `speed` (see `boostVelocity`). Local frame: the arrow
 * points along +X.
 */
export type BoostObstacle = {
  kind: 'boost';
  id: string;
  position: Vec2;
  rotationY: number;
  /** Side length of the square pad. */
  size: number;
  speed: number;
};

/**
 * Two linked holes. Rolling into either one pops the ball out of the other,
 * keeping its velocity. The exit is ignored until the ball has left it.
 */
export type PortalObstacle = {
  kind: 'portal';
  id: string;
  a: Vec2;
  b: Vec2;
  radius: number;
};

export type Obstacle =
  | WindmillObstacle
  | BumperObstacle
  | SliderObstacle
  | TunnelObstacle
  | RampObstacle
  | SpinnerObstacle
  | WallObstacle
  | SandObstacle
  | BoostObstacle
  | PortalObstacle;

/** Wooden plank across water. On the plank you're safe; off it, splash. */
export type Bridge = {
  id: string;
  from: Vec2;
  to: Vec2;
  width: number;
};

export type SceneryItem = {
  kind: 'tree' | 'rock';
  position: Vec2;
  scale: number;
};

export type Islet = {
  id: string;
  /** Centre of the islet's grassy top surface. */
  position: Vec3;
  radius: number;
  scenery: SceneryItem[];
};

export type CourseDefinition = {
  id: string;
  name: string;
  par: number;
  /** Playable putting surface. Simple polygon; wooden walls follow its edges. */
  outline: Vec2[];
  tee: Vec2;
  cup: Vec2;
  water: WaterHazard[];
  bridges: Bridge[];
  obstacles: Obstacle[];
  /** Decoration on the island rough around the course (not collidable). */
  scenery: SceneryItem[];
  /** Decorative floating islands surrounding the course. */
  islets: Islet[];
};
