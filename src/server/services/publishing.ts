import { reddit, redis } from '@devvit/web/server';
import type { CommunityPostData } from '../../shared/daily';
import type { CourseDesign } from '../../shared/editor/design';
import { MAX_POST_DATA_BYTES } from './publishValidation';

/** One published course per user per window, to keep the feed from flooding. */
const COOLDOWN_MS = 5 * 60 * 1000;
const cooldownKey = (userId: string) => `publishCooldown:${userId}`;

/** Milliseconds until this user may publish again (0 = now). */
export const publishCooldownLeft = async (userId: string): Promise<number> => {
  const until = Number(await redis.get(cooldownKey(userId)));
  return Number.isFinite(until) ? Math.max(until - Date.now(), 0) : 0;
};

/**
 * Create the community post. Posted by the app account (no extra consent
 * prompt); the title credits the creator.
 */
export const publishCommunityCourse = async (
  userId: string,
  author: string,
  design: CourseDesign,
  creatorStrokes: number
): Promise<{ postId: string; url: string }> => {
  const postData: CommunityPostData = {
    kind: 'community',
    design,
    author,
    creatorStrokes,
  };
  if (
    new TextEncoder().encode(JSON.stringify(postData)).length >
    MAX_POST_DATA_BYTES
  ) {
    throw new Error('Course too large for a post');
  }
  const post = await reddit.submitCustomPost({
    title: `${design.name.trim()} by u/${author} · Par ${design.par}`,
    postData,
  });
  const until = Date.now() + COOLDOWN_MS;
  await redis.set(cooldownKey(userId), String(until), {
    expiration: new Date(until),
  });
  return { postId: post.id, url: post.url };
};
