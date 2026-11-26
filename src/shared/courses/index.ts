import type { CourseDefinition } from '../types/course';
import {
  BUMPER_LANE,
  GRAND_TOUR,
  PLANK_CROSSING,
  RAMP_RALLY,
  SANDY_SHORE,
  SPEEDWAY,
  SPIN_CYCLE,
  TUNNEL_RUN,
  WARP_GARDEN,
  WINDMILL_WAY,
} from './designs';
import { BRIDGE_BAY } from './retired/bridgeBay';
import { MEADOW_MILL } from './retired/meadowMill';
import { SLIDER_ALLEY } from './retired/sliderAlley';
import { TUNNEL_TWIST } from './retired/tunnelTwist';

/** Built-in holes, in daily-rotation order. Shown in the practice menu. */
export const COURSE_CATALOG: readonly CourseDefinition[] = [
  BUMPER_LANE,
  SANDY_SHORE,
  PLANK_CROSSING,
  SPEEDWAY,
  RAMP_RALLY,
  TUNNEL_RUN,
  SPIN_CYCLE,
  WARP_GARDEN,
  WINDMILL_WAY,
  GRAND_TOUR,
];

/**
 * Old holes, out of rotation and off the menu. Kept only so posts already
 * created on them still open the hole their scores were set on.
 */
export const RETIRED_COURSES: readonly CourseDefinition[] = [
  MEADOW_MILL,
  BRIDGE_BAY,
  SLIDER_ALLEY,
  TUNNEL_TWIST,
];

/** Played by posts created before daily challenges existed. */
export const DEFAULT_COURSE = MEADOW_MILL;

export const getCourseById = (id: string): CourseDefinition | undefined =>
  COURSE_CATALOG.find((course) => course.id === id) ??
  RETIRED_COURSES.find((course) => course.id === id);
