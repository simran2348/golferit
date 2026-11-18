import { redis, reddit } from '@devvit/web/server';
import {
  COURSE_CATALOG,
  DEFAULT_COURSE,
  getCourseById,
} from '../../shared/courses';
import {
  courseForDate,
  dailyPostData,
  formatChallengeDate,
  type PracticePostData,
} from '../../shared/daily';

const dailyKey = (dateKey: string) => `daily:${dateKey}`;

/**
 * Create the daily challenge post for a UTC date, at most once. Safe to call
 * from the cron task, the install trigger and the moderator menu.
 */
export const ensureDailyPost = async (
  dateKey: string
): Promise<{ postId: string; created: boolean }> => {
  const existing = await redis.get(dailyKey(dateKey));
  if (existing) return { postId: existing, created: false };

  const postData = dailyPostData(dateKey);
  const course = courseForDate(dateKey);
  const post = await reddit.submitCustomPost({
    title: `Golferit Daily #${postData.number}: ${course.name} (${formatChallengeDate(dateKey)})`,
    postData,
  });
  await redis.set(dailyKey(dateKey), post.id);
  return { postId: post.id, created: true };
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
