import { BoxGeometry, Group, Mesh } from 'three';
import type { Bridge } from '../../../shared/types/course';
import type { Materials } from './materials';

const PLANK_GAP = 0.04;
const PLANK_DEPTH = 0.22;
const PLANK_THICKNESS = 0.05;

/**
 * Plank bridge. Visual only: the physics ground is flat, and the water rule
 * treats the bridge's rectangle as dry. No rails, so drifting off = splash.
 */
export const createBridges = (
  bridges: Bridge[],
  materials: Materials
): Group => {
  const group = new Group();
  group.name = 'bridges';
  const plankGeometry = new BoxGeometry(1, PLANK_THICKNESS, PLANK_DEPTH);
  const beamGeometry = new BoxGeometry(1, PLANK_THICKNESS * 1.6, 0.08);

  for (const bridge of bridges) {
    const dx = bridge.to.x - bridge.from.x;
    const dz = bridge.to.z - bridge.from.z;
    const length = Math.hypot(dx, dz);
    const span = new Group();
    span.name = bridge.id;
    span.position.set(
      (bridge.from.x + bridge.to.x) / 2,
      PLANK_THICKNESS / 2 - 0.02,
      (bridge.from.z + bridge.to.z) / 2
    );
    // Local X runs across the bridge, local Z along it.
    span.rotation.y = Math.atan2(dx, dz);

    const count = Math.floor(length / (PLANK_DEPTH + PLANK_GAP));
    const start = -((count - 1) * (PLANK_DEPTH + PLANK_GAP)) / 2;
    for (let i = 0; i < count; i++) {
      const plank = new Mesh(plankGeometry, materials.plank);
      plank.scale.x = bridge.width;
      plank.position.z = start + i * (PLANK_DEPTH + PLANK_GAP);
      plank.castShadow = true;
      plank.receiveShadow = true;
      span.add(plank);
    }
    for (const side of [-1, 1]) {
      const beam = new Mesh(beamGeometry, materials.woodDark);
      beam.scale.x = length;
      beam.rotation.y = Math.PI / 2;
      beam.position.set((side * bridge.width) / 2, -0.01, 0);
      beam.castShadow = true;
      span.add(beam);
    }
    group.add(span);
  }
  return group;
};
