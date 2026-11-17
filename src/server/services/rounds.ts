import { redis } from '@devvit/web/server';
import { ROUND_TTL_SECONDS } from '../../shared/constants/game';

type StoredRound = {
  id: string;
  /** Server clock (ms) when the round started: the start of official timing. */
  startedAt: number;
};

const roundKey = (postId: string, userId: string) =>
  `round:${postId}:${userId}`;

const isStoredRound = (value: unknown): value is StoredRound =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'startedAt' in value &&
  typeof value.startedAt === 'number';

/** One active round per user per post; starting again replaces the old one. */
export const startRound = async (
  postId: string,
  userId: string
): Promise<StoredRound> => {
  const round: StoredRound = { id: crypto.randomUUID(), startedAt: Date.now() };
  await redis.set(roundKey(postId, userId), JSON.stringify(round), {
    expiration: new Date(Date.now() + ROUND_TTL_SECONDS * 1000),
  });
  return round;
};

/**
 * Fetch and delete the active round so each round can be submitted once.
 * Returns null if there is no round or the id doesn't match.
 */
export const consumeRound = async (
  postId: string,
  userId: string,
  roundId: string
): Promise<StoredRound | null> => {
  const key = roundKey(postId, userId);
  const raw = await redis.get(key);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isStoredRound(parsed) || parsed.id !== roundId) return null;
  await redis.del(key);
  return parsed;
};
