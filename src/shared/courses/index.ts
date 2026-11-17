import type { CourseDefinition } from '../types/course';
import { BRIDGE_BAY } from './bridgeBay';
import { MEADOW_MILL } from './meadowMill';
import { SLIDER_ALLEY } from './sliderAlley';
import { TUNNEL_TWIST } from './tunnelTwist';

/** Built-in holes, in daily-rotation order. */
export const COURSE_CATALOG: readonly CourseDefinition[] = [
  MEADOW_MILL,
  BRIDGE_BAY,
  SLIDER_ALLEY,
  TUNNEL_TWIST,
];

/** Played by posts created before daily challenges existed. */
export const DEFAULT_COURSE = MEADOW_MILL;

export const getCourseById = (id: string): CourseDefinition | undefined =>
  COURSE_CATALOG.find((course) => course.id === id);
