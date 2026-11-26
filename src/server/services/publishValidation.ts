import type { CourseDefinition } from '../../shared/types/course';
import type { CourseDesign } from '../../shared/editor/design';
import { parseDesign } from '../../shared/editor/design';
import { buildCourseFromDesign } from '../../shared/editor/buildCourse';
import { parseShotLog, validateShotLog } from './roundValidation';

/** Reddit's limit for post data; community posts carry the whole design. */
export const MAX_POST_DATA_BYTES = 2000;

export type ValidPublish = {
  design: CourseDesign;
  course: CourseDefinition;
  /** Strokes of the creator's verifying run. */
  strokes: number;
};

/**
 * Check a publish request without touching Redis or Reddit: the design must
 * build into a playable course and come with a plausible winning run on
 * exactly that course. Returns the reason on failure.
 *
 * Like round submission this is not a full replay: it stops broken courses
 * and casual tampering, not a determined forger.
 */
export const validatePublish = (body: unknown): ValidPublish | string => {
  if (typeof body !== 'object' || body === null) return 'Malformed request';
  const design = 'design' in body ? parseDesign(body.design) : null;
  if (!design) return 'Malformed design';
  const built = buildCourseFromDesign(design, 'publish');
  if (!built.ok) return built.errors[0] ?? 'This course can’t be played';
  const log = parseShotLog(body);
  if (!log) return 'Sink the ball in a test run before publishing';
  const run = validateShotLog(log.shots, log.penalties, built.course);
  if (typeof run === 'string') return `Test run rejected: ${run}`;
  return { design, course: built.course, strokes: run.strokes };
};
