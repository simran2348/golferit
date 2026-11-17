import type { CourseDefinition } from '../../shared/types/course';
import type { ShotRecord, SubmitRoundRequest } from '../../shared/api';
import {
  MAX_STROKES,
  MIN_SHOT_POWER,
  ROUND_TTL_SECONDS,
  MIN_ROUND_MS,
} from '../../shared/constants/game';
import { isPointInPolygon } from '../../shared/course/geometry';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isShotRecord = (value: unknown): value is ShotRecord =>
  typeof value === 'object' &&
  value !== null &&
  't' in value &&
  isFiniteNumber(value.t) &&
  'x' in value &&
  isFiniteNumber(value.x) &&
  'z' in value &&
  isFiniteNumber(value.z) &&
  'dx' in value &&
  isFiniteNumber(value.dx) &&
  'dz' in value &&
  isFiniteNumber(value.dz) &&
  'power' in value &&
  isFiniteNumber(value.power);

/** Structural check of an untrusted request body. */
export const parseSubmitRequest = (
  body: unknown
): SubmitRoundRequest | null => {
  if (typeof body !== 'object' || body === null) return null;
  if (!('roundId' in body) || typeof body.roundId !== 'string') return null;
  if (!('penalties' in body) || !Number.isInteger(body.penalties)) return null;
  if (!('shots' in body) || !Array.isArray(body.shots)) return null;
  const shots: unknown[] = body.shots;
  if (!shots.every(isShotRecord)) return null;
  const penalties = Number(body.penalties);
  return { roundId: body.roundId, penalties, shots };
};

export type ValidatedRound = {
  strokes: number;
  timeMs: number;
};

/**
 * Plausibility checks on a submitted round. Strokes are derived from the
 * shot log (never trusted from the client) and time comes from the server's
 * own clock. Returns an error message or the official result.
 *
 * Not a full replay: a determined cheater could still fabricate a plausible
 * shot log. The log is stored so a deterministic server replay can be added.
 */
export const validateRound = (
  request: SubmitRoundRequest,
  course: CourseDefinition,
  serverElapsedMs: number
): ValidatedRound | string => {
  const { shots, penalties } = request;
  if (shots.length < 1) return 'A round needs at least one shot';
  if (penalties < 0) return 'Invalid penalty count';

  const strokes = shots.length + penalties;
  if (strokes > MAX_STROKES) return 'Too many strokes';

  // Penalties only come from shots ending in hazards, so each needs a shot.
  if (penalties >= shots.length) return 'More penalties than shots';

  let previousTime = -Infinity;
  for (const shot of shots) {
    if (shot.t < previousTime) return 'Shots out of order';
    previousTime = shot.t;
    if (shot.power < MIN_SHOT_POWER || shot.power > 1) {
      return 'Invalid shot power';
    }
    const length = Math.hypot(shot.dx, shot.dz);
    if (length < 0.98 || length > 1.02) return 'Invalid shot direction';
    if (!isPointInPolygon({ x: shot.x, z: shot.z }, course.outline)) {
      return 'Shot taken off the course';
    }
  }
  const first = shots[0];
  if (
    first &&
    Math.hypot(first.x - course.tee.x, first.z - course.tee.z) > 0.25
  ) {
    return 'First shot must be from the tee';
  }

  if (serverElapsedMs < MIN_ROUND_MS) return 'Round finished impossibly fast';
  if (serverElapsedMs > ROUND_TTL_SECONDS * 1000) return 'Round expired';

  return { strokes, timeMs: serverElapsedMs };
};
