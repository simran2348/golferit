import type { SliderObstacle, WindmillObstacle } from '../types/course';

/**
 * Moving obstacles are pure functions of time. Rendering, physics (kinematic
 * bodies) and server-side replay validation can all evaluate the same pose for
 * any timestamp without sharing mutable state.
 */
export const windmillBladeAngle = (
  windmill: WindmillObstacle,
  timeSeconds: number
): number => (timeSeconds * windmill.bladeSpeed) % (Math.PI * 2);

/** Slider displacement along its travel axis at a given time. */
export const sliderOffset = (
  slider: SliderObstacle,
  timeSeconds: number
): number =>
  Math.sin(timeSeconds * slider.speed + slider.phase) * slider.travel;
