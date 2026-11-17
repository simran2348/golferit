/**
 * Physical dimensions and gameplay rules shared by rendering, client physics
 * and (later) server-side score validation. Change them here only.
 */

export const BALL_RADIUS = 0.18;
export const CUP_RADIUS = 0.32;
export const CUP_DEPTH = 0.4;

export const WALL_HEIGHT = 0.42;
export const WALL_THICKNESS = 0.3;
/** Walls start at the island surface so there's no visible gap under them. */
export const WALL_BASE_Y = -0.06;
export const WALL_POST_SIZE = WALL_THICKNESS * 1.5;

export const BUMPER_HEIGHT = 0.36;

/** Width of the grassy rough between the wooden walls and the island edge. */
export const ISLAND_MARGIN = 1.4;

/** Windmill geometry. Local frame: tunnel runs along X, blades on the -X face. */
export const WINDMILL = {
  baseDepth: 1.6,
  baseWidth: 2.4,
  baseHeight: 1.0,
  tunnelWidth: 0.9,
  tunnelHeight: 0.6,
  towerHeight: 1.8,
  hubX: -0.86,
  hubHeight: 2.05,
  /** Blade pivot sits just in front of the hub. */
  bladePivotX: -0.98,
  bladeLength: 1.65,
  /** Gap between the pivot and the blade's inner end. */
  bladeOffset: 0.1,
  bladeWidth: 0.34,
  bladeThickness: 0.05,
  bladeCount: 4,
} as const;

/** Fixed simulation rate. Independent of display refresh rate. */
export const PHYSICS_STEP = 1 / 120;

/* ---- Rules ---- */

/** A hole ends after this many strokes (including penalties). */
export const MAX_STROKES = 10;
export const WATER_PENALTY_STROKES = 1;

/** Ball speed (units/s) at full power. */
export const MAX_SHOT_SPEED = 12;
/** Shots weaker than this fraction of full power are treated as cancelled. */
export const MIN_SHOT_POWER = 0.05;
/** Ball centre over the cup and slower than this = holed. Faster = lip out. */
export const CUP_CAPTURE_SPEED = 3.5;

/* ---- Rounds (server validation) ---- */

/** A started round must be submitted within this window. */
export const ROUND_TTL_SECONDS = 60 * 60;
/**
 * Fastest plausible completion: the ball has to physically roll to the cup.
 * Server rejects anything quicker as tampered.
 */
export const MIN_ROUND_MS = 1_000;
