import type { CourseDefinition } from '../../shared/types/course';
import { STARTER_COURSE } from '../../shared/constants/courses';

/**
 * Course played on a given post. Every post currently plays the starter hole;
 * when community courses arrive this becomes a Redis lookup by postId.
 */
export const getCourseForPost = (_postId: string): CourseDefinition =>
  STARTER_COURSE;
