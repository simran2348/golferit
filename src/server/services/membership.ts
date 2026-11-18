import { reddit, redis } from '@devvit/web/server';

/**
 * Reddit doesn't let apps read a user's subscriptions, so we remember who
 * joined through our button. Users who joined elsewhere still see the button;
 * pressing it again is a harmless no-op.
 */
const joinedKey = (userId: string) => `joined:${userId}`;

/**
 * Granting the "join as you" consent makes Reddit reload the post, which
 * discards the in-progress click. The intent outlives that reload so the
 * fresh page can finish the join.
 */
const intentKey = (userId: string) => `joinIntent:${userId}`;
const INTENT_TTL_MS = 10 * 60 * 1000;

export const hasJoined = async (userId: string): Promise<boolean> =>
  (await redis.get(joinedKey(userId))) !== undefined;

export const hasJoinIntent = async (userId: string): Promise<boolean> =>
  (await redis.get(intentKey(userId))) !== undefined;

export const markJoinIntent = async (userId: string): Promise<void> => {
  await redis.set(intentKey(userId), '1', {
    expiration: new Date(Date.now() + INTENT_TTL_MS),
  });
};

export const clearJoinIntent = async (userId: string): Promise<void> => {
  await redis.del(intentKey(userId));
};

/** Subscribes the current user (runs as the user; see devvit.json permissions). */
export const joinCurrentSubreddit = async (userId: string): Promise<void> => {
  await reddit.subscribeToCurrentSubreddit();
  await redis.set(joinedKey(userId), '1');
};
