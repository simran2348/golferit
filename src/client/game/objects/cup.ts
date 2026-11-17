import {
  BufferAttribute,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  RingGeometry,
} from 'three';
import type { Vec2 } from '../../../shared/types/course';
import { CUP_DEPTH, CUP_RADIUS } from '../../../shared/constants/game';
import type { Updatable } from '../engine/types';
import type { Materials } from './materials';

const POLE_HEIGHT = 2.3;
const FLAG_WIDTH = 0.9;
const FLAG_HEIGHT = 0.55;

/** Cup liner, white rim, flag pole and a gently waving flag. */
export const createCup = (
  position: Vec2,
  materials: Materials
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = 'cup';
  group.position.set(position.x, 0, position.z);

  const liner = new Mesh(
    new CylinderGeometry(
      CUP_RADIUS * 0.98,
      CUP_RADIUS * 0.98,
      CUP_DEPTH,
      20,
      1,
      true
    ),
    materials.cup
  );
  liner.position.y = -CUP_DEPTH / 2;

  const bottom = new Mesh(new CircleGeometry(CUP_RADIUS, 20), materials.cup);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -CUP_DEPTH + 0.001;

  const rim = new Mesh(
    new RingGeometry(CUP_RADIUS, CUP_RADIUS + 0.05, 24),
    materials.white
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.004;

  const pole = new Mesh(
    new CylinderGeometry(0.035, 0.035, POLE_HEIGHT + CUP_DEPTH, 6),
    materials.white
  );
  pole.position.y = (POLE_HEIGHT - CUP_DEPTH) / 2;
  pole.castShadow = true;

  // Flag anchored on its left edge at the pole top.
  const flagGeometry = new PlaneGeometry(FLAG_WIDTH, FLAG_HEIGHT, 8, 1);
  flagGeometry.translate(FLAG_WIDTH / 2, 0, 0);
  const flag = new Mesh(flagGeometry, materials.flag);
  flag.position.set(0.03, POLE_HEIGHT - FLAG_HEIGHT / 2, 0);
  flag.castShadow = true;

  group.add(liner, bottom, rim, pole, flag);

  const position3 = flagGeometry.getAttribute('position');
  if (!(position3 instanceof BufferAttribute)) {
    throw new Error('Flag geometry is missing a position attribute');
  }

  const updatable: Updatable = {
    update: (elapsed) => {
      for (let i = 0; i < position3.count; i++) {
        const x = position3.getX(i);
        // Amplitude grows away from the pole so the attached edge stays put.
        const t = x / FLAG_WIDTH;
        position3.setZ(i, Math.sin(x * 6 - elapsed * 5) * 0.08 * t);
      }
      position3.needsUpdate = true;
    },
  };

  return { group, updatable };
};
