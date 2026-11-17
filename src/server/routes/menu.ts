import { Hono, type Context } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { utcDateKey } from '../../shared/daily';
import { createPracticePost, ensureDailyPost } from '../services/posts';

export const menu = new Hono();

const goToPost = (c: Context, postId: string, toast?: string) =>
  c.json<UiResponse>(
    {
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${postId}`,
      ...(toast ? { showToast: toast } : {}),
    },
    200
  );

/** Moderator fallback if the scheduled task hasn't run yet today. */
menu.post('/daily-post', async (c) => {
  try {
    const { postId, created } = await ensureDailyPost(utcDateKey(new Date()));
    return goToPost(
      c,
      postId,
      created ? undefined : "Today's challenge already exists"
    );
  } catch (error) {
    console.error(`Error creating daily post: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to create daily challenge' },
      400
    );
  }
});

menu.post('/post-create', async (c) => {
  try {
    const { postId } = await createPracticePost();
    return goToPost(c, postId);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});
