import { Hono } from 'hono';
import type { TaskRequest } from '@devvit/web/server';
import { utcDateKey } from '../../shared/daily';
import { ensureDailyPost, isDailyPaused } from '../services/posts';

export const scheduler = new Hono();

/** Cron (devvit.json): 00:00 UTC daily. Idempotent if it fires twice. */
scheduler.post('/daily-challenge', async (c) => {
  const task = await c.req.json<TaskRequest>();
  const dateKey = utcDateKey(new Date());
  try {
    if (await isDailyPaused()) {
      console.log(`[${task.name}] daily ${dateKey}: skipped (paused)`);
      return c.json({}, 200);
    }
    const { postId, created } = await ensureDailyPost(dateKey);
    console.log(
      `[${task.name}] daily ${dateKey}: ${created ? 'created' : 'exists'} ${postId}`
    );
  } catch (error) {
    console.error(`[${task.name}] failed to create daily ${dateKey}:`, error);
  }
  return c.json({}, 200);
});
