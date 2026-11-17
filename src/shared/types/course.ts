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

export type Obstacle = WindmillObstacle | BumperObstacle;

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
  obstacles: Obstacle[];
  /** Decoration on the island rough around the course (not collidable). */
  scenery: SceneryItem[];
  /** Decorative floating islands surrounding the course. */
  islets: Islet[];
};
