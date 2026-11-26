import type { CourseDefinition } from './types/course';
import { MAX_STROKES } from './constants/game';
import { COURSE_CATALOG, DEFAULT_COURSE, getCourseById } from './courses';
import { buildCourseFromDesign } from './editor/buildCourse';
import { parseDesign, type CourseDesign } from './editor/design';

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

/**
 * A course built by a player in the editor. The whole design travels in the
 * post data (worst case ~1.2 KB of the 2 KB limit), so the course is frozen
 * at publish time and loads without any extra request.
 */
export type CommunityPostData = {
  kind: 'community';
  design: CourseDesign;
  /** Reddit username of the creator, without the u/ prefix. */
  author: string;
  /** Strokes the creator needed when they verified the course. */
  creatorStrokes: number;
};

export type GolferitPostData =
  DailyPostData | PracticePostData | CommunityPostData;

/** Shared id for community courses; leaderboards are per post anyway. */
export const COMMUNITY_COURSE_ID = 'community';
const AUTHOR_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** Daily challenge #1. */
const DAILY_EPOCH = '2026-11-18';
const DAY_MS = 24 * 60 * 60 * 1000;

export const utcDateKey = (date: Date): string =>
  date.toISOString().slice(0, 10);

const dateKeyToMs = (key: string): number => Date.parse(`${key}T00:00:00Z`);

export const previousDateKey = (key: string): string =>
  utcDateKey(new Date(dateKeyToMs(key) - DAY_MS));

/**
 * The number the old date-based scheme gave a day (days since the epoch, +1).
 * Only used to carry existing subreddits over to the posted-daily counter.
 */
export const legacyChallengeNumber = (key: string): number =>
  Math.round((dateKeyToMs(key) - dateKeyToMs(DAILY_EPOCH)) / DAY_MS) + 1;

/**
 * Daily challenge #n plays the nth hole of the rotation. Numbers count posted
 * dailies, so a pause doesn't skip any holes or numbers.
 */
export const courseForNumber = (number: number): CourseDefinition => {
  const count = COURSE_CATALOG.length;
  const index = (((number - 1) % count) + count) % count;
  return COURSE_CATALOG[index] ?? DEFAULT_COURSE;
};

export const dailyPostData = (key: string, number: number): DailyPostData => ({
  kind: 'daily',
  courseId: courseForNumber(number).id,
  date: key,
  number,
});

/**
 * Is a streak still alive today? `lastDate` is the player's last daily
 * played on its own day. The streak survives if that was today, or the most
 * recent daily before today's: days without a daily (paused) don't count.
 * `latestDaily` is the newest daily's date; `previousDaily` the one before
 * today's. Either can be null for dailies posted before this was tracked,
 * which falls back to calendar days.
 */
export const isStreakAlive = (
  lastDate: string | null,
  todayKey: string,
  latestDaily: string | null,
  previousDaily: string | null
): boolean => {
  if (lastDate === null) return false;
  if (lastDate === todayKey) return true;
  const latest = latestDaily ?? todayKey;
  const reference =
    latest === todayKey ? (previousDaily ?? previousDateKey(todayKey)) : latest;
  return lastDate === reference;
};

/**
 * Does finishing today's daily add to the streak (rather than restart it)?
 * Yes if the player finished the daily before it. `previousDaily` is '' for
 * the very first daily, and null when unknown (falls back to yesterday).
 */
export const extendsStreak = (
  lastDate: string | null,
  todayKey: string,
  previousDaily: string | null
): boolean =>
  lastDate !== null &&
  lastDate === (previousDaily ?? previousDateKey(todayKey));

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
  const community = parseCommunityPostData(value);
  if (community) return community;
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

/**
 * Community post data, fully re-validated: the design must still build into
 * a playable course. Anything off falls through to the default course.
 */
const parseCommunityPostData = (value: unknown): CommunityPostData | null => {
  if (typeof value !== 'object' || value === null) return null;
  if (!('kind' in value) || value.kind !== 'community') return null;
  if (!('author' in value) || typeof value.author !== 'string') return null;
  if (!AUTHOR_PATTERN.test(value.author)) return null;
  if (!('creatorStrokes' in value) || !Number.isInteger(value.creatorStrokes)) {
    return null;
  }
  const creatorStrokes = Number(value.creatorStrokes);
  if (creatorStrokes < 1 || creatorStrokes > MAX_STROKES) return null;
  const design = 'design' in value ? parseDesign(value.design) : null;
  if (!design || !buildCommunityCourse(design)) return null;
  return { kind: 'community', design, author: value.author, creatorStrokes };
};

/** Designs are immutable once published, so cache the built course. */
const builtCourses = new WeakMap<CourseDesign, CourseDefinition | null>();

const buildCommunityCourse = (
  design: CourseDesign
): CourseDefinition | null => {
  const cached = builtCourses.get(design);
  if (cached !== undefined) return cached;
  const result = buildCourseFromDesign(design, COMMUNITY_COURSE_ID);
  const course = result.ok ? result.course : null;
  builtCourses.set(design, course);
  return course;
};

export const courseForPost = (postData: GolferitPostData): CourseDefinition =>
  postData.kind === 'community'
    ? (buildCommunityCourse(postData.design) ?? DEFAULT_COURSE)
    : (getCourseById(postData.courseId) ?? DEFAULT_COURSE);

/** Short label for HUD/splash: "Daily #12 · Nov 29", "By u/name", "Practice". */
export const postLabel = (postData: GolferitPostData): string => {
  switch (postData.kind) {
    case 'daily':
      return `Daily #${postData.number} · ${formatChallengeDate(postData.date)}`;
    case 'community':
      return `By u/${postData.author}`;
    case 'practice':
      return 'Practice';
  }
};
