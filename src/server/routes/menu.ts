import { Hono, type Context } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { COURSE_CATALOG } from '../../shared/courses';
import { utcDateKey } from '../../shared/daily';
import {
  ensureDailyPost,
  isDailyPaused,
  setDailyPaused,
  startDailyPosts,
} from '../services/posts';

export const menu = new Hono();

export const goToPost = (c: Context, postId: string, toast?: string) =>
  c.json<UiResponse>(
    {
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${postId}`,
      ...(toast ? { showToast: toast } : {}),
    },
    200
  );

/**
 * Posts today's challenge. The first use also starts daily challenges in
 * this subreddit (installing the app posts nothing). Afterwards it's a
 * fallback if the scheduled task hasn't run, or a one-off while paused.
 */
menu.post('/daily-post', async (c) => {
  try {
    const today = utcDateKey(new Date());
    // Before posting: the "started" check also looks at today's daily.
    const firstStart = await startDailyPosts(today);
    const [{ postId, created }, paused] = await Promise.all([
      ensureDailyPost(today),
      isDailyPaused(),
    ]);
    const toast = firstStart
      ? paused
        ? 'Posted. Automatic daily posts are paused; Resume to turn them on.'
        : 'Daily challenges started! A new one posts every day at 00:00 UTC.'
      : !created
        ? "Today's challenge already exists"
        : paused
          ? 'Posted. Automatic daily posts are still paused.'
          : undefined;
    return goToPost(c, postId, toast);
  } catch (error) {
    console.error(`Error creating daily post: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to create daily challenge' },
      400
    );
  }
});

/** Stop the 00:00 UTC daily post until resumed. Manual posting still works. */
menu.post('/daily-pause', async (c) => {
  try {
    const changed = await setDailyPaused(true);
    return c.json<UiResponse>(
      {
        showToast: changed
          ? 'Daily challenges paused. No new posts until you resume.'
          : 'Daily challenges are already paused.',
      },
      200
    );
  } catch (error) {
    console.error(`Error pausing daily posts: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to pause' }, 400);
  }
});

/** Also starts daily challenges if they never were (no post until 00:00). */
menu.post('/daily-resume', async (c) => {
  try {
    const unpaused = await setDailyPaused(false);
    const started = await startDailyPosts(utcDateKey(new Date()));
    return c.json<UiResponse>(
      {
        showToast: started
          ? 'Daily challenges started. First post at 00:00 UTC.'
          : unpaused
            ? 'Daily challenges resumed. Next post at 00:00 UTC.'
            : 'Daily challenges are already running.',
      },
      200
    );
  } catch (error) {
    console.error(`Error resuming daily posts: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to resume' }, 400);
  }
});

/** Opens a form listing every hole; the form handler creates the post. */
menu.post('/post-create', async (c) => {
  const first = COURSE_CATALOG[0];
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'practiceCourse',
        form: {
          title: 'Create a practice post',
          description: 'Pick the hole this post will play.',
          acceptLabel: 'Create post',
          fields: [
            {
              type: 'select',
              name: 'courseId',
              label: 'Hole',
              required: true,
              options: COURSE_CATALOG.map((course) => ({
                label: `${course.name} (par ${course.par})`,
                value: course.id,
              })),
              ...(first ? { defaultValue: [first.id] } : {}),
            },
          ],
        },
      },
    },
    200
  );
});
