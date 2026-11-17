import { Hono, type Context } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ErrorCode,
  ErrorResponse,
  InitResponse,
  StartRoundResponse,
  SubmitRoundResponse,
} from '../../shared/api';
import { utcDateKey } from '../../shared/daily';
import { getCourseForCurrentPost, getPostData } from '../services/courses';
import {
  getLeaderboard,
  getPersonalBest,
  recordScore,
} from '../services/leaderboard';
import { getStreak, recordDailyCompletion } from '../services/streaks';
import { consumeRound, startRound } from '../services/rounds';
import { parseSubmitRequest, validateRound } from '../services/roundValidation';

export const api = new Hono();

const STATUS: Record<ErrorCode, 400 | 401 | 404 | 500> = {
  invalid: 400,
  unauthenticated: 401,
  not_found: 404,
  server: 500,
};

const fail = (c: Context, code: ErrorCode, message: string) =>
  c.json<ErrorResponse>({ status: 'error', code, message }, STATUS[code]);

const describe = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

/**
 * Identity always comes from the trusted Devvit request context, never from
 * the request body.
 */
api.get('/init', async (c) => {
  const { postId, userId } = context;
  if (!postId) return fail(c, 'invalid', 'postId missing from context');
  try {
    const today = utcDateKey(new Date());
    const [username, best, streak] = await Promise.all([
      reddit.getCurrentUsername(),
      userId ? getPersonalBest(postId, userId) : null,
      userId ? getStreak(userId, today) : null,
    ]);
    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? null,
      post: getPostData(),
      best,
      streak,
    });
  } catch (error) {
    console.error(`Init failed for post ${postId}:`, error);
    return fail(c, 'server', `Initialization failed: ${describe(error)}`);
  }
});

api.get('/leaderboard', async (c) => {
  const { postId, userId } = context;
  if (!postId) return fail(c, 'invalid', 'postId missing from context');
  try {
    return c.json(await getLeaderboard(postId, userId));
  } catch (error) {
    console.error(`Leaderboard failed for post ${postId}:`, error);
    return fail(c, 'server', 'Could not load leaderboard');
  }
});

/** Called on the first putt. Official timing starts when this arrives. */
api.post('/round/start', async (c) => {
  const { postId, userId } = context;
  if (!postId) return fail(c, 'invalid', 'postId missing from context');
  if (!userId) return fail(c, 'unauthenticated', 'Log in to save scores');
  try {
    const round = await startRound(postId, userId);
    return c.json<StartRoundResponse>({
      type: 'roundStarted',
      roundId: round.id,
    });
  } catch (error) {
    console.error(`Round start failed for post ${postId}:`, error);
    return fail(c, 'server', 'Could not start round');
  }
});

/** Called when the ball drops. Validates, then records the player's best. */
api.post('/round/submit', async (c) => {
  const receivedAt = Date.now();
  const { postId, userId } = context;
  if (!postId) return fail(c, 'invalid', 'postId missing from context');
  if (!userId) return fail(c, 'unauthenticated', 'Log in to save scores');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, 'invalid', 'Body must be JSON');
  }
  const request = parseSubmitRequest(body);
  if (!request) return fail(c, 'invalid', 'Malformed round submission');

  try {
    const round = await consumeRound(postId, userId, request.roundId);
    if (!round) return fail(c, 'not_found', 'Round not found or expired');

    const result = validateRound(
      request,
      getCourseForCurrentPost(),
      receivedAt - round.startedAt
    );
    if (typeof result === 'string') {
      console.warn(`Rejected round from ${userId} on ${postId}: ${result}`);
      return fail(c, 'invalid', result);
    }

    const username = (await reddit.getCurrentUsername()) ?? 'unknown';
    const isPersonalBest = await recordScore(
      postId,
      userId,
      username,
      result.strokes,
      result.timeMs,
      request.shots
    );

    // Streaks count only today's daily challenge, played today (UTC).
    const today = utcDateKey(new Date(receivedAt));
    const post = getPostData();
    const countedForStreak = post.kind === 'daily' && post.date === today;
    const [leaderboard, streak] = await Promise.all([
      getLeaderboard(postId, userId),
      countedForStreak
        ? recordDailyCompletion(userId, today)
        : getStreak(userId, today),
    ]);
    return c.json<SubmitRoundResponse>({
      type: 'roundSubmitted',
      strokes: result.strokes,
      timeMs: result.timeMs,
      isPersonalBest,
      leaderboard,
      streak,
      countedForStreak,
    });
  } catch (error) {
    console.error(`Round submit failed for post ${postId}:`, error);
    return fail(c, 'server', 'Could not save round');
  }
});
