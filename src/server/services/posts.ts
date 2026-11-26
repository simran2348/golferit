import { redis, reddit } from '@devvit/web/server';
import {
  COURSE_CATALOG,
  DEFAULT_COURSE,
  getCourseById,
} from '../../shared/courses';
import {
  courseForNumber,
  dailyPostData,
  formatChallengeDate,
  legacyChallengeNumber,
  previousDateKey,
  type PracticePostData,
} from '../../shared/daily';

const dailyKey = (dateKey: string) => `daily:${dateKey}`;
/** Number of the most recent daily posted in this subreddit. */
const DAILY_COUNT_KEY = 'dailyCount';
/** Date of the most recent daily posted in this subreddit. */
const LAST_DAILY_KEY = 'lastDailyDate';
/** Date of the daily posted before the one on this date ('' if none). */
const previousDailyKey = (dateKey: string) => `dailyPrev:${dateKey}`;
/** Set while a moderator has paused automatic daily posts. */
const DAILY_PAUSED_KEY = 'dailyPaused';

export const isDailyPaused = async (): Promise<boolean> =>
  (await redis.get(DAILY_PAUSED_KEY)) !== undefined;

/** Returns false if it was already in that state. */
export const setDailyPaused = async (paused: boolean): Promise<boolean> => {
  if ((await isDailyPaused()) === paused) return false;
  if (paused) await redis.set(DAILY_PAUSED_KEY, new Date().toISOString());
  else await redis.del(DAILY_PAUSED_KEY);
  return true;
};

/**
 * Where the daily sequence stands before posting `dateKey`'s challenge.
 * Subreddits from before the counter existed had one daily every day,
 * numbered by date, so they carry on from yesterday's number.
 */
const dailySequence = async (
  dateKey: string
): Promise<{ lastNumber: number; lastDate: string }> => {
  const [count, lastDate] = await Promise.all([
    redis.get(DAILY_COUNT_KEY),
    redis.get(LAST_DAILY_KEY),
  ]);
  if (count !== undefined) {
    return { lastNumber: Number(count) || 0, lastDate: lastDate ?? '' };
  }
  const yesterday = previousDateKey(dateKey);
  const hadYesterday = (await redis.get(dailyKey(yesterday))) !== undefined;
  return hadYesterday
    ? { lastNumber: legacyChallengeNumber(dateKey) - 1, lastDate: yesterday }
    : { lastNumber: 0, lastDate: '' };
};

/**
 * Create the daily challenge post for a UTC date, at most once. Safe to call
 * from the cron task, the install trigger and the moderator menu. Numbers
 * count posted dailies, so after a pause the next one is simply +1.
 */
export const ensureDailyPost = async (
  dateKey: string
): Promise<{ postId: string; created: boolean }> => {
  const existing = await redis.get(dailyKey(dateKey));
  if (existing) return { postId: existing, created: false };

  const { lastNumber, lastDate } = await dailySequence(dateKey);
  const number = lastNumber + 1;
  const postData = dailyPostData(dateKey, number);
  const course = courseForNumber(number);
  const post = await reddit.submitCustomPost({
    title: `Golferit Daily #${number}: ${course.name} (${formatChallengeDate(dateKey)})`,
    postData,
  });
  // Recorded only after the post exists, so a failed post skips no number.
  await Promise.all([
    redis.set(dailyKey(dateKey), post.id),
    redis.set(previousDailyKey(dateKey), lastDate),
    redis.set(LAST_DAILY_KEY, dateKey),
    redis.set(DAILY_COUNT_KEY, String(number)),
  ]);
  return { postId: post.id, created: true };
};

/**
 * The newest daily's date, and the date of the daily before `dateKey`'s.
 * Null where nothing was recorded (dailies from before tracking).
 */
export const getDailyHistory = async (
  dateKey: string
): Promise<{ latest: string | null; previous: string | null }> => {
  const [latest, previous] = await Promise.all([
    redis.get(LAST_DAILY_KEY),
    redis.get(previousDailyKey(dateKey)),
  ]);
  return { latest: latest ?? null, previous: previous ?? null };
};

/** Free-play post on a chosen (or random) hole. No streak; its own board. */
export const createPracticePost = async (
  courseId?: string
): Promise<{ postId: string }> => {
  const course =
    (courseId ? getCourseById(courseId) : undefined) ??
    COURSE_CATALOG[Math.floor(Math.random() * COURSE_CATALOG.length)] ??
    DEFAULT_COURSE;
  const postData: PracticePostData = { kind: 'practice', courseId: course.id };
  const post = await reddit.submitCustomPost({
    title: `Golferit Practice: ${course.name}`,
    postData,
  });
  return { postId: post.id };
};
