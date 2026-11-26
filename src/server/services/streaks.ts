import { redis } from '@devvit/web/server';
import type { StreakInfo } from '../../shared/api';
import { extendsStreak, isStreakAlive } from '../../shared/daily';
import { getDailyHistory } from './posts';

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

const toInfo = async (
  stored: StoredStreak,
  todayKey: string
): Promise<StreakInfo> => {
  const history = await getDailyHistory(todayKey);
  const alive = isStreakAlive(
    stored.lastDate,
    todayKey,
    history.latest,
    history.previous
  );
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
 * same day doesn't add to the streak. Finishing the previous daily too adds
 * one; missing a daily resets it to 1. Paused days have no daily, so they
 * never break a streak.
 */
export const recordDailyCompletion = async (
  userId: string,
  todayKey: string
): Promise<StreakInfo> => {
  const stored = await load(userId);
  if (stored.lastDate !== todayKey) {
    const { previous } = await getDailyHistory(todayKey);
    stored.current = extendsStreak(stored.lastDate, todayKey, previous)
      ? stored.current + 1
      : 1;
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
