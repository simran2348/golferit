import { redis } from '@devvit/web/server';
import { parseDesign, type CourseDesign } from '../../shared/editor/design';

/** One working draft per user (per subreddit installation). */
const draftKey = (userId: string) => `draft:${userId}`;

export const loadDraft = async (
  userId: string
): Promise<CourseDesign | null> => {
  const raw = await redis.get(draftKey(userId));
  if (!raw) return null;
  try {
    return parseDesign(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const saveDraft = async (
  userId: string,
  design: CourseDesign
): Promise<void> => {
  await redis.set(draftKey(userId), JSON.stringify(design));
};
