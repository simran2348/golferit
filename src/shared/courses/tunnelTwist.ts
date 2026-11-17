import type { CourseDefinition } from '../types/course';

/**
 * A U-turn: through the tunnel, past a slider in the bend, then back across a
 * pond (bridge or hug a wall) to the cup.
 */
export const TUNNEL_TWIST: CourseDefinition = {
  id: 'tunnel-twist',
  name: 'Tunnel Twist',
  par: 4,
  outline: [
    { x: -6, z: 4 },
    { x: 3.8, z: 4 },
    { x: 5, z: 2.8 },
    { x: 5, z: -4.4 },
    { x: 3.8, z: -5.6 },
    { x: -6, z: -5.6 },
    { x: -6, z: -2.6 },
    { x: 2, z: -2.6 },
    { x: 2, z: 1 },
    { x: -6, z: 1 },
  ],
  tee: { x: -5, z: 2.5 },
  cup: { x: -4.8, z: -4.1 },
  water: [
    {
      id: 'pond',
      outline: [
        { x: -2.6, z: -3.1 },
        { x: -1.2, z: -2.8 },
        { x: -0.3, z: -3.4 },
        { x: -0.4, z: -4.8 },
        { x: -1.6, z: -5.3 },
        { x: -2.7, z: -4.7 },
      ],
    },
  ],
  bridges: [
    {
      id: 'plank',
      from: { x: 0.2, z: -4.1 },
      to: { x: -3.2, z: -4.1 },
      width: 0.9,
    },
  ],
  obstacles: [
    {
      kind: 'tunnel',
      id: 'tunnel',
      position: { x: -1.5, z: 2.5 },
      rotationY: 0,
      length: 2.2,
      innerWidth: 1.0,
      outerWidth: 3.0,
    },
    {
      kind: 'slider',
      id: 'slider-bend',
      position: { x: 3.5, z: -0.8 },
      rotationY: 0,
      travel: 0.8,
      speed: 1.8,
      phase: 0,
      length: 0.9,
      width: 0.5,
    },
  ],
  scenery: [
    { kind: 'tree', position: { x: -6.8, z: 4.6 }, scale: 1 },
    { kind: 'tree', position: { x: -2.0, z: -1.9 }, scale: 0.9 },
    { kind: 'tree', position: { x: -4.0, z: 0.3 }, scale: 0.85 },
    { kind: 'tree', position: { x: 5.8, z: -1.0 }, scale: 1.1 },
    { kind: 'tree', position: { x: -6.8, z: -4.0 }, scale: 0.95 },
    { kind: 'rock', position: { x: 0.0, z: 4.7 }, scale: 0.7 },
    { kind: 'rock', position: { x: 5.7, z: 2.0 }, scale: 0.6 },
    { kind: 'rock', position: { x: 1.0, z: -6.3 }, scale: 0.6 },
  ],
  islets: [
    {
      id: 'islet-west',
      position: { x: -9.5, y: -1.5, z: -0.8 },
      radius: 1.6,
      scenery: [{ kind: 'tree', position: { x: 0, z: 0 }, scale: 1 }],
    },
    {
      id: 'islet-east',
      position: { x: 8.5, y: -2.2, z: -1 },
      radius: 1.4,
      scenery: [{ kind: 'rock', position: { x: 0.2, z: 0 }, scale: 0.7 }],
    },
    {
      id: 'islet-north',
      position: { x: 0, y: -2.6, z: -9 },
      radius: 1.2,
      scenery: [],
    },
  ],
};
