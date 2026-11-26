import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type {
  BoostObstacle,
  PortalObstacle,
  RampObstacle,
  SandObstacle,
  SliderObstacle,
  SpinnerObstacle,
  WindmillObstacle,
} from '../types/course.ts';
import {
  BOOST_EXTRA_SPEED,
  BOOST_MAX_SPEED,
  boostDirection,
  boostVelocity,
  boostsAt,
  isInSand,
  otherPortalEnd,
  portalEndAt,
  rampHeightAt,
  sliderOffset,
  spinnerAngle,
  surfaceHeightAt,
  windmillBladeAngle,
} from './obstacles.ts';

const TAU = Math.PI * 2;
const TIMES = [0, 0.37, 1, 2.5, 13.1, 123.4];

/** Same angle modulo a full turn. */
const sameAngle = (a: number, b: number) =>
  assert.ok(
    Math.abs(Math.sin(a) - Math.sin(b)) < 1e-9 &&
      Math.abs(Math.cos(a) - Math.cos(b)) < 1e-9,
    `${a} ≡ ${b}`
  );

const windmill: WindmillObstacle = {
  kind: 'windmill',
  id: 'w',
  position: { x: 0, z: 0 },
  rotationY: 0,
  bladeSpeed: 1.1,
};
const slider: SliderObstacle = {
  kind: 'slider',
  id: 's',
  position: { x: 0, z: 0 },
  rotationY: 0,
  travel: 1.2,
  speed: 1.6,
  phase: 2,
  length: 0.9,
  width: 0.45,
};
const spinner: SpinnerObstacle = {
  kind: 'spinner',
  id: 'sp',
  position: { x: 0, z: 0 },
  armLength: 0.62,
  speed: -1.4,
  phase: 0.9,
};
/** Travels along X: base to base from x=-0.75 to 0.75, flat top |x| ≤ 0.125. */
const ramp: RampObstacle = {
  kind: 'ramp',
  id: 'r',
  position: { x: 0, z: 0 },
  rotationY: 0,
  length: 1.5,
  width: 1.5,
  height: 0.15,
  topLength: 0.25,
};

describe('windmillBladeAngle', () => {
  test('stays within one turn and repeats every 2π / speed', () => {
    const period = TAU / windmill.bladeSpeed;
    for (const t of TIMES) {
      const angle = windmillBladeAngle(windmill, t);
      assert.ok(angle >= 0 && angle < TAU);
      sameAngle(windmillBladeAngle(windmill, t + period), angle);
    }
  });
});

describe('sliderOffset', () => {
  test('stays within ±travel and repeats every 2π / speed', () => {
    const period = TAU / slider.speed;
    for (const t of TIMES) {
      const offset = sliderOffset(slider, t);
      assert.ok(Math.abs(offset) <= slider.travel);
      assert.ok(Math.abs(sliderOffset(slider, t + period) - offset) < 1e-9);
    }
  });

  test('reaches both ends of its travel', () => {
    const quarter = (Math.PI / 2 - slider.phase) / slider.speed;
    assert.ok(Math.abs(sliderOffset(slider, quarter) - slider.travel) < 1e-9);
    const opposite = quarter + Math.PI / slider.speed;
    assert.ok(Math.abs(sliderOffset(slider, opposite) + slider.travel) < 1e-9);
  });
});

describe('spinnerAngle', () => {
  test('stays within one turn and repeats every 2π / |speed|', () => {
    const period = TAU / Math.abs(spinner.speed);
    for (const t of TIMES) {
      const angle = spinnerAngle(spinner, t);
      assert.ok(Math.abs(angle) < TAU);
      sameAngle(spinnerAngle(spinner, t + period), angle);
    }
  });

  test('negative speed turns the other way', () => {
    const later = spinnerAngle(spinner, 0.1);
    sameAngle(later, spinner.phase - 0.14);
  });
});

describe('rampHeightAt', () => {
  test('0 outside the ramp footprint', () => {
    assert.equal(rampHeightAt(ramp, { x: 0.8, z: 0 }), 0);
    assert.equal(rampHeightAt(ramp, { x: -0.8, z: 0 }), 0);
    assert.equal(rampHeightAt(ramp, { x: 0, z: 0.8 }), 0);
    assert.equal(rampHeightAt(ramp, { x: 5, z: 5 }), 0);
  });

  test('full height on the flat top, linear on the slopes', () => {
    assert.equal(rampHeightAt(ramp, { x: 0, z: 0 }), ramp.height);
    assert.equal(rampHeightAt(ramp, { x: 0.1, z: 0.7 }), ramp.height);
    // Halfway up the slope: 0.3125 in from the base edge out of 0.625.
    const half = rampHeightAt(ramp, { x: -0.4375, z: 0 });
    assert.ok(Math.abs(half - ramp.height / 2) < 1e-9);
  });

  test('follows the ramp when it is turned a quarter', () => {
    const turned: RampObstacle = { ...ramp, rotationY: -Math.PI / 2 };
    assert.ok(
      Math.abs(rampHeightAt(turned, { x: 0, z: 0.4375 }) - ramp.height / 2) <
        1e-9
    );
    assert.equal(rampHeightAt(turned, { x: 0, z: 0.8 }), 0);
  });
});

describe('surfaceHeightAt', () => {
  test('is the ground (0) with no ramps under the point', () => {
    assert.equal(surfaceHeightAt([], { x: 0, z: 0 }), 0);
    assert.equal(surfaceHeightAt([spinner, slider], { x: 0, z: 0 }), 0);
  });

  test('is the ramp height on a ramp', () => {
    assert.equal(surfaceHeightAt([spinner, ramp], { x: 0, z: 0 }), ramp.height);
  });
});

describe('sand', () => {
  const obstacles: SandObstacle[] = [
    { kind: 'sand', id: 's', position: { x: 2, z: 0 }, size: 1 },
  ];

  test('covers its square and nothing else', () => {
    assert.equal(isInSand(obstacles, { x: 2, z: 0 }), true);
    assert.equal(isInSand(obstacles, { x: 2.49, z: -0.49 }), true);
    assert.equal(isInSand(obstacles, { x: 2.6, z: 0 }), false);
    assert.equal(isInSand([], { x: 2, z: 0 }), false);
  });
});

describe('boost pads', () => {
  const pad: BoostObstacle = {
    kind: 'boost',
    id: 'b',
    position: { x: 0, z: 0 },
    rotationY: 0,
    size: 1,
    speed: 9,
  };
  const speedAlong = (v: { x: number; z: number }) => v.x;

  test('point along local +X, turned by rotationY', () => {
    assert.deepEqual(boostDirection(pad), { x: 1, z: -0 });
    const down = boostDirection({ ...pad, rotationY: -Math.PI / 2 });
    assert.ok(Math.abs(down.x) < 1e-9 && Math.abs(down.z - 1) < 1e-9);
  });

  test('find the pads under a point', () => {
    assert.deepEqual(boostsAt([pad], { x: 0.4, z: 0.4 }), [pad]);
    assert.deepEqual(boostsAt([pad], { x: 0.6, z: 0 }), []);
  });

  test('bring a slow ball up to the pad speed', () => {
    assert.equal(speedAlong(boostVelocity(pad, { x: 1, z: 0 })), 9);
    // Even one rolling the wrong way.
    assert.equal(speedAlong(boostVelocity(pad, { x: -2, z: 0 })), 9);
  });

  test('push a fast ball a little more, up to the cap', () => {
    assert.equal(
      speedAlong(boostVelocity(pad, { x: 10, z: 0 })),
      10 + BOOST_EXTRA_SPEED
    );
    assert.equal(
      speedAlong(boostVelocity(pad, { x: BOOST_MAX_SPEED - 1, z: 0 })),
      BOOST_MAX_SPEED
    );
    // Never slows a ball that is already faster than the cap.
    assert.equal(speedAlong(boostVelocity(pad, { x: 20, z: 0 })), 20);
  });

  test('halve sideways drift', () => {
    assert.equal(boostVelocity(pad, { x: 5, z: 2 }).z, 1);
  });
});

describe('teleporters', () => {
  const portal: PortalObstacle = {
    kind: 'portal',
    id: 'p',
    a: { x: 0, z: 0 },
    b: { x: 5, z: 5 },
    radius: 0.3,
  };

  test('report which end a point is in', () => {
    assert.equal(portalEndAt(portal, { x: 0.2, z: 0 }), 'a');
    assert.equal(portalEndAt(portal, { x: 5, z: 4.8 }), 'b');
    assert.equal(portalEndAt(portal, { x: 1, z: 1 }), null);
  });

  test('lead to the other end', () => {
    assert.equal(otherPortalEnd('a'), 'b');
    assert.equal(otherPortalEnd('b'), 'a');
  });
});
