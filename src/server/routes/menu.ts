import { Hono, type Context } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { COURSE_CATALOG } from '../../shared/courses';
import { utcDateKey } from '../../shared/daily';
import { ensureDailyPost, setDailyPaused } from '../services/posts';

export const menu = new Hono();

export const goToPost = (c: Context, postId: string, toast?: string) =>
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

menu.post('/daily-resume', async (c) => {
  try {
    const changed = await setDailyPaused(false);
    return c.json<UiResponse>(
      {
        showToast: changed
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
