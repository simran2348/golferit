import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';

export const triggers = new Hono();

/**
 * Installing posts nothing: daily challenges start when a moderator uses
 * "Post today's daily challenge" (or "Resume daily challenges").
 */
triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  return c.json<TriggerResponse>(
    {
      status: 'success',
      message: `Installed in r/${context.subredditName} (trigger: ${input.type}). Waiting for a moderator to post the first daily challenge.`,
    },
    200
  );
});
