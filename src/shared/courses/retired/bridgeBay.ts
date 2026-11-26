import type { CourseDefinition } from '../../types/course';

/**
 * A long lane split by a pond. The only dry crossing is a narrow plank set
 * off to one side, so the tee shot has to be angled.
 */
export const BRIDGE_BAY: CourseDefinition = {
  id: 'bridge-bay',
  name: 'Bridge Bay',
  par: 3,
  outline: [
    { x: -2.5, z: 6 },
    { x: 2.5, z: 6 },
    { x: 2.5, z: -7 },
    { x: 1.5, z: -8 },
    { x: -1.5, z: -8 },
    { x: -2.5, z: -7 },
  ],
  tee: { x: -1.2, z: 4.8 },
  cup: { x: -0.9, z: -6.4 },
  water: [
    {
      id: 'bay',
      // Reaches within 0.1 of both walls: no sneaking round the edge.
      outline: [
        { x: -2.4, z: 1.4 },
        { x: -1.2, z: 1.65 },
        { x: 0.3, z: 1.5 },
        { x: 1.6, z: 1.7 },
        { x: 2.4, z: 1.45 },
        { x: 2.4, z: -1.4 },
        { x: 1.3, z: -1.65 },
        { x: 0, z: -1.5 },
        { x: -1.4, z: -1.7 },
        { x: -2.4, z: -1.45 },
      ],
    },
  ],
  bridges: [
    {
      id: 'plank',
      from: { x: 1.2, z: 2.0 },
      to: { x: 1.2, z: -2.0 },
      width: 1.0,
    },
  ],
  obstacles: [
    {
      kind: 'bumper',
      id: 'bumper-mid',
      position: { x: -0.2, z: -3.6 },
      radius: 0.3,
    },
    {
      kind: 'bumper',
      id: 'bumper-far',
      position: { x: 1.4, z: -5.0 },
      radius: 0.28,
    },
  ],
  scenery: [
    { kind: 'tree', position: { x: -3.3, z: 4.0 }, scale: 1 },
    { kind: 'tree', position: { x: 3.4, z: 3.5 }, scale: 0.85 },
    { kind: 'tree', position: { x: 3.3, z: -2.8 }, scale: 1.1 },
    { kind: 'tree', position: { x: -3.3, z: -4.5 }, scale: 0.9 },
    { kind: 'rock', position: { x: 3.3, z: 0.5 }, scale: 0.7 },
    { kind: 'rock', position: { x: -3.4, z: 1.0 }, scale: 0.6 },
    { kind: 'rock', position: { x: 0.5, z: -8.7 }, scale: 0.6 },
  ],
  islets: [
    {
      id: 'islet-west',
      position: { x: -6.5, y: -1.5, z: -1 },
      radius: 1.8,
      scenery: [
        { kind: 'tree', position: { x: -0.4, z: 0.2 }, scale: 1 },
        { kind: 'rock', position: { x: 0.6, z: -0.5 }, scale: 0.6 },
      ],
    },
    {
      id: 'islet-east',
      position: { x: 6.5, y: -2, z: 2 },
      radius: 1.4,
      scenery: [{ kind: 'tree', position: { x: 0, z: 0 }, scale: 0.9 }],
    },
    {
      id: 'islet-north',
      position: { x: 5, y: -2.6, z: -8 },
      radius: 1.1,
      scenery: [],
    },
  ],
};
