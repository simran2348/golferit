import {
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  RingGeometry,
  type Vector3,
} from 'three';
import type { Updatable } from '../engine/types';
import { PALETTE } from './materials';
import { WATER_LEVEL } from './terrain';

const DROPLETS = 26;
const GRAVITY = 9.8;
const RING_DURATION = 1.1;
/** Seconds between the two ripples. */
const RING_DELAY = 0.18;

type Droplet = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alive: boolean;
};

export type SplashEffect = {
  group: Group;
  updatable: Updatable;
  /** Burst at a point on the water (only x/z are used). */
  trigger: (position: Vector3) => void;
};

/**
 * Droplet burst plus two expanding ripples. One shared InstancedMesh draws
 * every droplet in a single call; nothing is allocated per splash.
 */
export const createSplash = (): SplashEffect => {
  const group = new Group();
  group.name = 'splash';

  const droplets = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshLambertMaterial({ color: PALETTE.splash, flatShading: true }),
    DROPLETS
  );
  droplets.frustumCulled = false;
  droplets.count = 0;
  const state: Droplet[] = Array.from({ length: DROPLETS }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    size: 0,
    alive: false,
  }));

  const ringGeometry = new RingGeometry(0.82, 1, 28);
  ringGeometry.rotateX(-Math.PI / 2);
  const rings = [0, 1].map(() => {
    const ring = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({
        color: PALETTE.splash,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    ring.visible = false;
    return ring;
  });
  group.add(droplets, ...rings);

  const dummy = new Object3D();
  let age = Infinity;

  const trigger = (position: Vector3) => {
    age = 0;
    for (const drop of state) {
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.6 + Math.random() * 1.3;
      drop.x = position.x;
      drop.y = WATER_LEVEL + 0.05;
      drop.z = position.z;
      drop.vx = Math.cos(angle) * spread;
      drop.vz = Math.sin(angle) * spread;
      drop.vy = 2.4 + Math.random() * 1.6;
      drop.size = 0.05 + Math.random() * 0.05;
      drop.alive = true;
    }
    for (const ring of rings) {
      ring.position.set(position.x, WATER_LEVEL + 0.01, position.z);
    }
  };

  const update = (_elapsed: number, delta: number) => {
    if (age === Infinity) return;
    age += delta;

    let visible = 0;
    for (const drop of state) {
      if (!drop.alive) continue;
      drop.vy -= GRAVITY * delta;
      drop.x += drop.vx * delta;
      drop.y += drop.vy * delta;
      drop.z += drop.vz * delta;
      if (drop.y < WATER_LEVEL && drop.vy < 0) {
        drop.alive = false;
        continue;
      }
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.scale.setScalar(drop.size);
      dummy.updateMatrix();
      droplets.setMatrixAt(visible++, dummy.matrix);
    }
    droplets.count = visible;
    droplets.instanceMatrix.needsUpdate = true;

    rings.forEach((ring, i) => {
      const t = (age - i * RING_DELAY) / RING_DURATION;
      ring.visible = t > 0 && t < 1;
      if (!ring.visible) return;
      // Ease-out growth, fading as it spreads.
      ring.scale.setScalar(0.2 + (1 - (1 - t) * (1 - t)) * 0.9);
      const material = ring.material;
      if (material instanceof MeshBasicMaterial) {
        material.opacity = 1 - t;
      }
    });

    if (visible === 0 && age > RING_DELAY + RING_DURATION) age = Infinity;
  };

  return { group, updatable: { update }, trigger };
};
