import type { CourseDefinition } from '../../types/course';

/**
 * Two sliding blocks sweep across the main lane and a third guards the dogleg
 * to the cup. Timing matters more than power.
 */
export const SLIDER_ALLEY: CourseDefinition = {
  id: 'slider-alley',
  name: 'Slider Alley',
  par: 3,
  outline: [
    { x: -7, z: 1.8 },
    { x: 5.5, z: 1.8 },
    { x: 7, z: 0.3 },
    { x: 7, z: -5 },
    { x: 3.5, z: -5 },
    { x: 3.5, z: -1.8 },
    { x: -7, z: -1.8 },
  ],
  tee: { x: -6, z: 0 },
  cup: { x: 5.25, z: -4.0 },
  water: [],
  bridges: [],
  obstacles: [
    {
      kind: 'slider',
      id: 'slider-1',
      position: { x: -2.8, z: 0 },
      rotationY: Math.PI / 2,
      travel: 1.1,
      speed: 1.5,
      phase: 0,
      length: 1.2,
      width: 0.5,
    },
    {
      kind: 'slider',
      id: 'slider-2',
      position: { x: 0.8, z: 0 },
      rotationY: Math.PI / 2,
      travel: 1.1,
      speed: 2.1,
      phase: 1.6,
      length: 1.2,
      width: 0.5,
    },
    {
      kind: 'slider',
      id: 'slider-3',
      position: { x: 5.25, z: -2.6 },
      rotationY: 0,
      travel: 1.0,
      speed: 1.7,
      phase: 0.5,
      length: 1.2,
      width: 0.5,
    },
  ],
  scenery: [
    { kind: 'tree', position: { x: -7.8, z: 2.6 }, scale: 1 },
    { kind: 'tree', position: { x: -4.0, z: 2.7 }, scale: 0.85 },
    { kind: 'tree', position: { x: 2.0, z: 2.7 }, scale: 1.1 },
    { kind: 'tree', position: { x: 1.0, z: -2.6 }, scale: 0.9 },
    { kind: 'tree', position: { x: 2.6, z: -4.5 }, scale: 1 },
    { kind: 'tree', position: { x: 7.8, z: -3.0 }, scale: 0.9 },
    { kind: 'rock', position: { x: -7.8, z: -1.0 }, scale: 0.7 },
    { kind: 'rock', position: { x: -1.0, z: -2.6 }, scale: 0.6 },
    { kind: 'rock', position: { x: 7.7, z: -0.5 }, scale: 0.6 },
  ],
  islets: [
    {
      id: 'islet-west',
      position: { x: -3, y: -1.5, z: -5.5 },
      radius: 2,
      scenery: [
        { kind: 'tree', position: { x: -0.5, z: -0.3 }, scale: 1.1 },
        { kind: 'tree', position: { x: 0.7, z: 0.4 }, scale: 0.8 },
      ],
    },
    {
      id: 'islet-south',
      position: { x: 0, y: -2.2, z: 5.5 },
      radius: 1.5,
      scenery: [{ kind: 'rock', position: { x: 0.2, z: 0 }, scale: 0.7 }],
    },
    {
      id: 'islet-east',
      position: { x: 10, y: -2, z: -2 },
      radius: 1.2,
      scenery: [{ kind: 'tree', position: { x: 0, z: 0 }, scale: 0.8 }],
    },
  ],
};
