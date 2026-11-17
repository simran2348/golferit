import { context } from '@devvit/web/server';
import type { CourseDefinition } from '../../shared/types/course';
import {
  courseForPost,
  parsePostData,
  type GolferitPostData,
} from '../../shared/daily';

/**
 * Post metadata set by this app at post creation (`postData`), read from the
 * trusted request context. Older posts without it play the default course.
 */
export const getPostData = (): GolferitPostData =>
  parsePostData(context.postData);

export const getCourseForCurrentPost = (): CourseDefinition =>
  courseForPost(getPostData());
