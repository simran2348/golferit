import {
  AdditiveBlending,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import type { Vec2 } from '../../../shared/types/course';
import type { Updatable } from '../engine/types';
import { PALETTE } from './materials';

const DURATION = 0.45;

export type TeleportFlash = {
  group: Group;
  updatable: Updatable;
  trigger: (from: Vec2, to: Vec2) => void;
};

/** A ring of light that bursts outward at both ends of a teleporter. */
export const createTeleportFlash = (): TeleportFlash => {
  const group = new Group();
  group.name = 'teleport-flash';
  const geometry = new RingGeometry(0.25, 0.34, 28);
  geometry.rotateX(-Math.PI / 2);
  const rings = [0, 1].map(() => {
    const material = new MeshBasicMaterial({
      color: PALETTE.portalGlow,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const ring = new Mesh(geometry, material);
    ring.visible = false;
    group.add(ring);
    return { ring, material };
  });
  let age = DURATION;

  return {
    group,
    trigger: (from, to) => {
      age = 0;
      [from, to].forEach((point, i) => {
        const r = rings[i];
        if (!r) return;
        r.ring.position.set(point.x, 0.06, point.z);
        r.ring.visible = true;
      });
    },
    updatable: {
      update: (_elapsed, delta) => {
        if (age >= DURATION) return;
        age = Math.min(age + delta, DURATION);
        const t = age / DURATION;
        for (const { ring, material } of rings) {
          ring.scale.setScalar(1 + t * 1.8);
          material.opacity = (1 - t) * 0.9;
          ring.visible = t < 1;
        }
      },
    },
  };
};
