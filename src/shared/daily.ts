import type { CourseDefinition } from './types/course';
import { COURSE_CATALOG, DEFAULT_COURSE, getCourseById } from './courses';

/**
 * Stored on each post via `submitCustomPost({ postData })` (2 KB limit) and
 * readable synchronously from `context.postData` on client and server.
 */
export type DailyPostData = {
  kind: 'daily';
  courseId: string;
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  number: number;
};

export type PracticePostData = {
  kind: 'practice';
  courseId: string;
};

export type GolferitPostData = DailyPostData | PracticePostData;

/** Daily challenge #1. */
const DAILY_EPOCH = '2026-11-18';
const DAY_MS = 24 * 60 * 60 * 1000;

export const utcDateKey = (date: Date): string =>
  date.toISOString().slice(0, 10);

const dateKeyToMs = (key: string): number => Date.parse(`${key}T00:00:00Z`);

export const previousDateKey = (key: string): string =>
  utcDateKey(new Date(dateKeyToMs(key) - DAY_MS));

export const challengeNumber = (key: string): number =>
  Math.round((dateKeyToMs(key) - dateKeyToMs(DAILY_EPOCH)) / DAY_MS) + 1;

/** Deterministic rotation through the catalog. */
export const courseForDate = (key: string): CourseDefinition => {
  const count = COURSE_CATALOG.length;
  const index = (((challengeNumber(key) - 1) % count) + count) % count;
  return COURSE_CATALOG[index] ?? DEFAULT_COURSE;
};

export const dailyPostData = (key: string): DailyPostData => ({
  kind: 'daily',
  courseId: courseForDate(key).id,
  date: key,
  number: challengeNumber(key),
});

/** "Nov 18" */
export const formatChallengeDate = (key: string): string =>
  new Date(dateKeyToMs(key)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate post data from context. Posts created before daily challenges have
 * none and become practice posts on the default course.
 */
export const parsePostData = (value: unknown): GolferitPostData => {
  if (typeof value === 'object' && value !== null && 'courseId' in value) {
    const { courseId } = value;
    if (typeof courseId === 'string' && getCourseById(courseId)) {
      if (
        'kind' in value &&
        value.kind === 'daily' &&
        'date' in value &&
        typeof value.date === 'string' &&
        DATE_KEY.test(value.date) &&
        'number' in value &&
        typeof value.number === 'number'
      ) {
        return {
          kind: 'daily',
          courseId,
          date: value.date,
          number: value.number,
        };
      }
      return { kind: 'practice', courseId };
    }
  }
  return { kind: 'practice', courseId: DEFAULT_COURSE.id };
};

export const courseForPost = (postData: GolferitPostData): CourseDefinition =>
  getCourseById(postData.courseId) ?? DEFAULT_COURSE;

/** Short label for HUD/splash: "Daily #12 · Nov 29" or "Practice". */
export const postLabel = (postData: GolferitPostData): string =>
  postData.kind === 'daily'
    ? `Daily #${postData.number} · ${formatChallengeDate(postData.date)}`
    : 'Practice';
