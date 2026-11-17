import { redis } from '@devvit/web/server';
import type { StreakInfo } from '../../shared/api';
import { previousDateKey } from '../../shared/daily';

/** Hash per user: current, best, lastDate (UTC date of last daily completion). */
const streakKey = (userId: string) => `streak:${userId}`;

type StoredStreak = { current: number; best: number; lastDate: string | null };

const load = async (userId: string): Promise<StoredStreak> => {
  const raw = await redis.hGetAll(streakKey(userId));
  return {
    current: Number(raw.current ?? 0) || 0,
    best: Number(raw.best ?? 0) || 0,
    lastDate: raw.lastDate ?? null,
  };
};

const toInfo = (stored: StoredStreak, todayKey: string): StreakInfo => {
  const alive =
    stored.lastDate === todayKey ||
    stored.lastDate === previousDateKey(todayKey);
  return {
    current: alive ? stored.current : 0,
    best: stored.best,
    playedToday: stored.lastDate === todayKey,
  };
};

export const getStreak = async (
  userId: string,
  todayKey: string
): Promise<StreakInfo> => toInfo(await load(userId), todayKey);

/**
 * Count a completed daily challenge played on its own day. Playing again the
 * same day doesn't add to the streak; missing a day resets it to 1.
 */
export const recordDailyCompletion = async (
  userId: string,
  todayKey: string
): Promise<StreakInfo> => {
  const stored = await load(userId);
  if (stored.lastDate !== todayKey) {
    stored.current =
      stored.lastDate === previousDateKey(todayKey) ? stored.current + 1 : 1;
    stored.best = Math.max(stored.best, stored.current);
    stored.lastDate = todayKey;
    await redis.hSet(streakKey(userId), {
      current: String(stored.current),
      best: String(stored.best),
      lastDate: todayKey,
    });
  }
  return toInfo(stored, todayKey);
};
