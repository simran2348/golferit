import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { getCourseById } from '../../shared/courses';
import { createPracticePost } from '../services/posts';
import { goToPost } from './menu';

export const forms = new Hono();

/** Select fields submit their value as a string array. */
const firstString = (value: unknown): string | null =>
  Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null;

forms.post('/practice-course', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json<UiResponse>({ showToast: 'Invalid form submission' }, 400);
  }
  const courseId =
    typeof body === 'object' && body !== null && 'courseId' in body
      ? firstString(body.courseId)
      : null;
  if (!courseId || !getCourseById(courseId)) {
    return c.json<UiResponse>({ showToast: 'Pick a hole first' }, 400);
  }
  try {
    const { postId } = await createPracticePost(courseId);
    return goToPost(c, postId);
  } catch (error) {
    console.error(`Error creating practice post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});
