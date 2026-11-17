import type { Bridge, CourseDefinition, Vec2 } from '../types/course';
import {
  CUP_CAPTURE_SPEED,
  CUP_RADIUS,
  MAX_SHOT_SPEED,
  MAX_STROKES,
} from '../constants/game';
import { isPointInPolygon } from './geometry';

/**
 * Pure rule checks. The client runs them every physics step; the server can
 * run the same functions when validating a submitted round.
 */

export const isBallInCup = (
  position: Vec2,
  horizontalSpeed: number,
  course: CourseDefinition
): boolean =>
  Math.hypot(position.x - course.cup.x, position.z - course.cup.z) <
    CUP_RADIUS && horizontalSpeed < CUP_CAPTURE_SPEED;

export const isOnBridge = (position: Vec2, bridge: Bridge): boolean => {
  const dx = bridge.to.x - bridge.from.x;
  const dz = bridge.to.z - bridge.from.z;
  const length = Math.hypot(dx, dz);
  if (length === 0) return false;
  const ux = dx / length;
  const uz = dz / length;
  const px = position.x - bridge.from.x;
  const pz = position.z - bridge.from.z;
  const along = px * ux + pz * uz;
  const across = Math.abs(px * -uz + pz * ux);
  return along >= 0 && along <= length && across <= bridge.width / 2;
};

/** Ball centre over a pond and not on a bridge. */
export const isBallInWater = (
  position: Vec2,
  course: CourseDefinition
): boolean =>
  course.water.some((pond) => isPointInPolygon(position, pond.outline)) &&
  !course.bridges.some((bridge) => isOnBridge(position, bridge));

export const isBallOutOfBounds = (
  position: Vec2 & { y: number },
  course: CourseDefinition
): boolean => position.y < -1 || !isPointInPolygon(position, course.outline);

/** Map shot power (0..1) to launch speed. Slight curve gives finer short putts. */
export const shotSpeedForPower = (power: number): number =>
  MAX_SHOT_SPEED * Math.pow(Math.min(Math.max(power, 0), 1), 1.2);

export const hasReachedStrokeLimit = (strokes: number): boolean =>
  strokes >= MAX_STROKES;

/** Classic golf names for a score relative to par. */
export const scoreLabel = (strokes: number, par: number): string => {
  if (strokes === 1) return 'Hole in one!';
  const diff = strokes - par;
  switch (diff) {
    case -3:
      return 'Albatross!';
    case -2:
      return 'Eagle!';
    case -1:
      return 'Birdie!';
    case 0:
      return 'Par';
    case 1:
      return 'Bogey';
    case 2:
      return 'Double bogey';
    case 3:
      return 'Triple bogey';
    default:
      return diff < 0 ? `${diff} under par` : `+${diff}`;
  }
};
