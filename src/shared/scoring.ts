/**
 * Leaderboard ordering: fewer strokes wins, ties broken by faster time.
 * Both are packed into one sorted-set score (lower = better). Times are capped
 * well below the stroke multiplier so packing is lossless.
 */
const STROKE_MULTIPLIER = 100_000_000; // ~27.7 hours of milliseconds
export const MAX_RECORDED_TIME_MS = STROKE_MULTIPLIER - 1;

export const packScore = (strokes: number, timeMs: number): number =>
  strokes * STROKE_MULTIPLIER +
  Math.min(Math.max(Math.round(timeMs), 0), MAX_RECORDED_TIME_MS);

export const unpackScore = (
  score: number
): { strokes: number; timeMs: number } => ({
  strokes: Math.floor(score / STROKE_MULTIPLIER),
  timeMs: score % STROKE_MULTIPLIER,
});

/** "0:07.4", "1:23.0" */
export const formatDuration = (ms: number): string => {
  const tenths = Math.floor(Math.max(ms, 0) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths % 10}`;
};
