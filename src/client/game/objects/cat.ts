import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import type { Vec2 } from '../../../shared/types/course';
import type { Updatable } from '../engine/types';

const COLORS: Readonly<
  Record<'fur' | 'stripe' | 'white' | 'dark' | 'nose' | 'yarn', string>
> = {
  fur: '#f0913f',
  stripe: '#c96a24',
  white: '#fff6ec',
  dark: '#2b2118',
  nose: '#ff8fa3',
  yarn: '#e8508a',
};

/** Angular trotting speed around the tree (radians per second). */
const TROT_SPEED = 0.85;
/** One play cycle: trot, crouch and wiggle, pounce, trot on. */
const CYCLE = 7;
const CROUCH_START = 4.6;
const POUNCE_START = 5.4;
const POUNCE_END = 6.0;
/** The yarn stays this far (radians) ahead of the cat on the circle. */
const YARN_LEAD = 0.55;
const YARN_RADIUS = 0.07;
/** Larger than life so it reads at the default (zoomed-out) game camera. */
export const CAT_SCALE = 1.5;

const part = (
  geometry: BufferGeometry,
  material: Material,
  x: number,
  y: number,
  z: number
): Mesh => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
};

/** Smooth 0→1→0 bump over [start, end]. */
const bump = (t: number, start: number, end: number): number =>
  t <= start || t >= end
    ? 0
    : Math.sin(((t - start) / (end - start)) * Math.PI);

/**
 * Low-poly ginger cat (about two golf balls long) built from primitives.
 * Local frame: faces +X, feet at y = 0.
 */
const buildCat = () => {
  const fur = new MeshLambertMaterial({ color: COLORS.fur, flatShading: true });
  const stripe = new MeshLambertMaterial({
    color: COLORS.stripe,
    flatShading: true,
  });
  const white = new MeshLambertMaterial({
    color: COLORS.white,
    flatShading: true,
  });
  const dark = new MeshLambertMaterial({ color: COLORS.dark });
  const nose = new MeshLambertMaterial({ color: COLORS.nose });

  const cat = new Group();
  cat.name = 'cat';

  // Body leans slightly; the pounce animation tilts this group.
  const body = new Group();
  body.position.y = 0.17;
  cat.add(body);

  const torsoGeometry = new CapsuleGeometry(0.085, 0.2, 4, 8);
  torsoGeometry.rotateZ(Math.PI / 2);
  body.add(part(torsoGeometry, fur, 0, 0, 0));
  // Tabby stripes across the back.
  const stripeGeometry = new CylinderGeometry(0.088, 0.088, 0.025, 8, 1, true);
  stripeGeometry.rotateZ(Math.PI / 2);
  for (const x of [-0.07, 0, 0.07]) {
    body.add(part(stripeGeometry, stripe, x, 0.004, 0));
  }
  body.add(part(new SphereGeometry(0.07, 8, 6), white, 0.1, -0.025, 0));

  const head = new Group();
  head.position.set(0.19, 0.08, 0);
  body.add(head);
  head.add(part(new IcosahedronGeometry(0.085, 1), fur, 0, 0, 0));
  head.add(part(new SphereGeometry(0.045, 8, 6), white, 0.06, -0.025, 0));
  const earGeometry = new ConeGeometry(0.035, 0.07, 4);
  for (const side of [-1, 1]) {
    const ear = part(earGeometry, fur, -0.01, 0.08, side * 0.045);
    ear.rotation.x = side * -0.25;
    head.add(ear);
  }
  const eyeGeometry = new SphereGeometry(0.014, 6, 4);
  for (const side of [-1, 1]) {
    head.add(part(eyeGeometry, dark, 0.072, 0.02, side * 0.035));
  }
  head.add(part(new SphereGeometry(0.012, 6, 4), nose, 0.104, -0.005, 0));

  // Legs swing from the hips.
  const legGeometry = new CylinderGeometry(0.024, 0.02, 0.13, 6);
  legGeometry.translate(0, -0.065, 0);
  const legs: Group[] = [];
  const hips: [number, number][] = [
    [0.1, 0.05],
    [0.1, -0.05],
    [-0.1, 0.05],
    [-0.1, -0.05],
  ];
  for (const [x, z] of hips) {
    const hip = new Group();
    hip.position.set(x, -0.03, z);
    // White front paws.
    hip.add(part(legGeometry, x > 0 ? white : fur, 0, 0, 0));
    body.add(hip);
    legs.push(hip);
  }

  // Two-segment tail so it can curl and swish.
  const tailGeometry = new CylinderGeometry(0.02, 0.026, 0.13, 6);
  tailGeometry.translate(0, 0.065, 0);
  const tailBase = new Group();
  tailBase.position.set(-0.17, 0.03, 0);
  tailBase.rotation.z = 0.7;
  tailBase.add(part(tailGeometry, fur, 0, 0, 0));
  const tailTip = new Group();
  tailTip.position.y = 0.13;
  tailTip.add(part(tailGeometry, stripe, 0, 0, 0));
  tailBase.add(tailTip);
  body.add(tailBase);

  return { cat, body, head, legs, tailBase, tailTip };
};

/**
 * A cat chasing a ball of yarn around a point (the tree on the first floating
 * islet). Every few seconds it crouches, wiggles and pounces. Pure function of
 * time, like the course obstacles.
 */
export const createCat = (
  center: Vec2,
  radius: number
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = 'cat-and-yarn';
  const { cat, body, head, legs, tailBase, tailTip } = buildCat();

  const yarn = part(
    new IcosahedronGeometry(YARN_RADIUS, 1),
    new MeshLambertMaterial({ color: COLORS.yarn, flatShading: true }),
    0,
    YARN_RADIUS,
    0
  );
  cat.scale.setScalar(CAT_SCALE);
  yarn.scale.setScalar(CAT_SCALE);
  yarn.position.y = YARN_RADIUS * CAT_SCALE;
  group.add(cat, yarn);

  const placeOnCircle = (object: Group | Mesh, angle: number) => {
    object.position.x = center.x + Math.cos(angle) * radius;
    object.position.z = center.z + Math.sin(angle) * radius;
  };

  const update = (elapsed: number) => {
    const t = elapsed % CYCLE;
    const crouch = bump(t, CROUCH_START, POUNCE_START + 0.1);
    const pounce = bump(t, POUNCE_START, POUNCE_END);
    const resting = t > CROUCH_START && t < POUNCE_START;

    // Angle around the tree: steady trot, a pause while crouching, then a
    // quick lunge. Integrated per cycle so the motion never jumps.
    const cycleAngle = (cycleTime: number) => {
      const trot = Math.min(cycleTime, CROUCH_START) * TROT_SPEED;
      const lunge =
        cycleTime > POUNCE_START
          ? Math.min(cycleTime - POUNCE_START, POUNCE_END - POUNCE_START) *
            TROT_SPEED *
            3
          : 0;
      const after =
        cycleTime > POUNCE_END ? (cycleTime - POUNCE_END) * TROT_SPEED : 0;
      return trot + lunge + after;
    };
    const angle =
      Math.floor(elapsed / CYCLE) * cycleAngle(CYCLE) + cycleAngle(t);

    placeOnCircle(cat, angle);
    cat.position.y = pounce * 0.16 * CAT_SCALE;
    // Face along the circle (counter-clockwise tangent).
    cat.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle));

    // Crouch low, then stretch out mid-air.
    body.position.y = 0.17 - crouch * 0.06;
    body.rotation.z = pounce * 0.35 - crouch * 0.1;
    head.rotation.z = crouch * 0.25;

    // Trotting legs; tucked while crouched, stretched in the pounce.
    const stride = resting ? 0 : Math.sin(elapsed * 12) * 0.6 * (1 - pounce);
    legs.forEach((leg, i) => {
      const front = i < 2;
      const phase = i === 0 || i === 3 ? 1 : -1;
      leg.rotation.z = stride * phase + pounce * (front ? -0.9 : 0.9);
    });

    // Tail: lazy swish when trotting, fast wiggle while crouched.
    const swish = resting
      ? Math.sin(elapsed * 18) * 0.5
      : Math.sin(elapsed * 3) * 0.35;
    tailBase.rotation.x = swish;
    tailTip.rotation.z = -0.6 + Math.sin(elapsed * 3 + 1) * 0.3;

    // The yarn rolls ahead; the pounce knocks it a little further.
    const yarnAngle = angle + YARN_LEAD + pounce * 0.25;
    placeOnCircle(yarn, yarnAngle);
    yarn.rotation.x = -yarnAngle * (radius / (YARN_RADIUS * CAT_SCALE));
  };

  update(0);
  return { group, updatable: { update } };
};
