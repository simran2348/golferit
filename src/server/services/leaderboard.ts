import { redis } from '@devvit/web/server';
import type {
  LeaderboardResponse,
  ScoreEntry,
  ShotRecord,
} from '../../shared/api';
import { packScore, unpackScore } from '../../shared/scoring';

const LEADERBOARD_SIZE = 10;

/** Sorted set: member = userId, score = packed (strokes, time). Lower wins. */
const scoresKey = (postId: string) => `lb:${postId}`;
/** Hash: userId -> display name at time of their best. */
const namesKey = (postId: string) => `lb:${postId}:names`;
/** Hash: userId -> JSON shot log of their best round (for future replays). */
const shotsKey = (postId: string) => `lb:${postId}:shots`;

/** Record a round; keeps only the player's best. Returns true if improved. */
export const recordScore = async (
  postId: string,
  userId: string,
  username: string,
  strokes: number,
  timeMs: number,
  shots: ShotRecord[]
): Promise<boolean> => {
  const score = packScore(strokes, timeMs);
  const previous = await redis.zScore(scoresKey(postId), userId);
  if (previous !== undefined && previous <= score) return false;

  await Promise.all([
    redis.zAdd(scoresKey(postId), { member: userId, score }),
    redis.hSet(namesKey(postId), { [userId]: username }),
    redis.hSet(shotsKey(postId), { [userId]: JSON.stringify(shots) }),
  ]);
  return true;
};

const toEntry = (
  rank: number,
  username: string,
  score: number
): ScoreEntry => ({ rank, username, ...unpackScore(score) });

export const getLeaderboard = async (
  postId: string,
  userId: string | undefined
): Promise<LeaderboardResponse> => {
  const [top, totalPlayers, myRank, myScore] = await Promise.all([
    redis.zRange(scoresKey(postId), 0, LEADERBOARD_SIZE - 1, { by: 'rank' }),
    redis.zCard(scoresKey(postId)),
    userId ? redis.zRank(scoresKey(postId), userId) : undefined,
    userId ? redis.zScore(scoresKey(postId), userId) : undefined,
  ]);

  const memberIds = top.map((row) => row.member);
  if (userId) memberIds.push(userId);
  const names =
    memberIds.length > 0 ? await redis.hMGet(namesKey(postId), memberIds) : [];
  const nameAt = (i: number) => names[i] ?? 'unknown';

  return {
    type: 'leaderboard',
    entries: top.map((row, i) => toEntry(i + 1, nameAt(i), row.score)),
    me:
      userId && myRank !== undefined && myScore !== undefined
        ? toEntry(myRank + 1, nameAt(top.length), myScore)
        : null,
    totalPlayers,
  };
};

/** The viewer's best on a post without fetching the whole board. */
export const getPersonalBest = async (
  postId: string,
  userId: string
): Promise<ScoreEntry | null> => {
  const [rank, score, names] = await Promise.all([
    redis.zRank(scoresKey(postId), userId),
    redis.zScore(scoresKey(postId), userId),
    redis.hMGet(namesKey(postId), [userId]),
  ]);
  if (rank === undefined || score === undefined) return null;
  return toEntry(rank + 1, names[0] ?? 'unknown', score);
};
