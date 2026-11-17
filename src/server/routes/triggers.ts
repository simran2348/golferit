import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { utcDateKey } from '../../shared/daily';
import { ensureDailyPost } from '../services/posts';

export const triggers = new Hono();

/** On install, post today's challenge so the subreddit has one right away. */
triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    const { postId } = await ensureDailyPost(utcDateKey(new Date()));
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Daily post ${postId} ready in r/${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create post' },
      400
    );
  }
});
