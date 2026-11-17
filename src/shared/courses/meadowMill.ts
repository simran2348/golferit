import type { CourseDefinition } from '../types/course';

/**
 * Hand-authored starter hole. An L-shaped fairway: tee on the west end, through
 * the windmill tunnel, bank off the chamfered corner, past the pond and
 * bumpers to the cup in the north-east.
 */
export const MEADOW_MILL: CourseDefinition = {
  id: 'starter-meadow-mill',
  name: 'Meadow Mill',
  par: 3,
  outline: [
    { x: -7, z: 1 },
    { x: 2.5, z: 1 },
    { x: 2.5, z: -6 },
    { x: 6, z: -6 },
    { x: 6, z: 3 },
    { x: 4.5, z: 4.5 },
    { x: -7, z: 4.5 },
  ],
  tee: { x: -5.6, z: 2.75 },
  cup: { x: 4.25, z: -4.6 },
  water: [
    {
      id: 'pond',
      outline: [
        { x: 3.3, z: -1.0 },
        { x: 3.6, z: -0.55 },
        { x: 4.3, z: -0.45 },
        { x: 4.95, z: -0.8 },
        { x: 5.1, z: -1.5 },
        { x: 4.7, z: -2.1 },
        { x: 4.0, z: -2.2 },
        { x: 3.4, z: -1.8 },
      ],
    },
  ],
  bridges: [],
  obstacles: [
    {
      kind: 'windmill',
      id: 'windmill',
      position: { x: -1.2, z: 2.75 },
      rotationY: 0,
      bladeSpeed: 1.1,
    },
    {
      kind: 'bumper',
      id: 'bumper-west',
      position: { x: 3.3, z: -3.3 },
      radius: 0.28,
    },
    {
      kind: 'bumper',
      id: 'bumper-east',
      position: { x: 5.2, z: -3.0 },
      radius: 0.28,
    },
  ],
  scenery: [
    { kind: 'tree', position: { x: -7.8, z: 0.2 }, scale: 1 },
    { kind: 'tree', position: { x: -7.7, z: 5.3 }, scale: 0.8 },
    { kind: 'tree', position: { x: 1.6, z: -0.1 }, scale: 0.9 },
    { kind: 'tree', position: { x: 1.7, z: -5.0 }, scale: 1.15 },
    { kind: 'tree', position: { x: 6.85, z: -0.8 }, scale: 0.85 },
    { kind: 'tree', position: { x: 6.8, z: -6.7 }, scale: 1 },
    { kind: 'rock', position: { x: -3.0, z: 5.35 }, scale: 0.9 },
    { kind: 'rock', position: { x: 1.7, z: -2.6 }, scale: 0.7 },
    { kind: 'rock', position: { x: 6.75, z: 1.5 }, scale: 0.6 },
    { kind: 'rock', position: { x: -4.0, z: 0.25 }, scale: 0.55 },
  ],
  islets: [
    {
      id: 'islet-west',
      position: { x: -3.6, y: -1.2, z: -3.2 },
      radius: 2.1,
      scenery: [
        { kind: 'tree', position: { x: -0.6, z: -0.4 }, scale: 1.1 },
        { kind: 'tree', position: { x: 0.7, z: 0.3 }, scale: 0.8 },
        { kind: 'rock', position: { x: 0.2, z: -0.9 }, scale: 0.6 },
      ],
    },
    {
      id: 'islet-east',
      position: { x: 10.2, y: -2.2, z: 1.0 },
      radius: 1.5,
      scenery: [{ kind: 'tree', position: { x: 0, z: 0 }, scale: 1 }],
    },
    {
      id: 'islet-north',
      position: { x: -1.5, y: -2.6, z: -9.5 },
      radius: 1.2,
      scenery: [{ kind: 'rock', position: { x: 0.2, z: 0.1 }, scale: 0.7 }],
    },
  ],
};
