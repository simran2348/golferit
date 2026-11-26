import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CUP_CAPTURE_SPEED,
  CUP_RADIUS,
  MAX_STROKES,
} from '../constants/game.ts';
import type { Bridge, CourseDefinition } from '../types/course.ts';
import {
  hasReachedStrokeLimit,
  isBallInCup,
  isBallInWater,
  isBallOutOfBounds,
  isOnBridge,
  scoreLabel,
} from './rules.ts';

/** 10×10 square, cup in the middle, a pond in one corner with a bridge. */
const bridge: Bridge = {
  id: 'bridge',
  from: { x: 1, z: 3 },
  to: { x: 5, z: 3 },
  width: 0.6,
};
const course: CourseDefinition = {
  id: 'test',
  name: 'Test',
  par: 3,
  outline: [
    { x: -5, z: -5 },
    { x: 5, z: -5 },
    { x: 5, z: 5 },
    { x: -5, z: 5 },
  ],
  tee: { x: -4, z: -4 },
  cup: { x: 0, z: 0 },
  water: [
    {
      id: 'pond',
      outline: [
        { x: 2, z: 2 },
        { x: 4, z: 2 },
        { x: 4, z: 4 },
        { x: 2, z: 4 },
      ],
    },
  ],
  bridges: [bridge],
  obstacles: [],
  scenery: [],
  islets: [],
};

describe('isBallInCup', () => {
  test('a slow ball over the cup drops', () => {
    assert.equal(isBallInCup({ x: 0, z: 0 }, 1, course), true);
    assert.equal(isBallInCup({ x: CUP_RADIUS - 0.01, z: 0 }, 1, course), true);
  });

  test('a fast ball skips over the cup (lip out)', () => {
    assert.equal(isBallInCup({ x: 0, z: 0 }, CUP_CAPTURE_SPEED, course), false);
    assert.equal(isBallInCup({ x: 0, z: 0 }, 10, course), false);
  });

  test('a ball beside the cup does not drop', () => {
    assert.equal(isBallInCup({ x: CUP_RADIUS + 0.01, z: 0 }, 0, course), false);
  });
});

describe('isOnBridge', () => {
  test('inside the plank', () => {
    assert.equal(isOnBridge({ x: 3, z: 3 }, bridge), true);
    assert.equal(isOnBridge({ x: 3, z: 3.29 }, bridge), true);
  });

  test('beside or beyond the plank', () => {
    assert.equal(isOnBridge({ x: 3, z: 3.31 }, bridge), false);
    assert.equal(isOnBridge({ x: 0.9, z: 3 }, bridge), false);
    assert.equal(isOnBridge({ x: 5.1, z: 3 }, bridge), false);
  });

  test('a zero-length bridge holds nothing', () => {
    const point: Bridge = { ...bridge, to: bridge.from };
    assert.equal(isOnBridge(bridge.from, point), false);
  });
});

describe('isBallInWater', () => {
  test('in the pond and off the bridge', () => {
    assert.equal(isBallInWater({ x: 3, z: 2.4 }, course), true);
  });

  test('not when on the bridge over the pond', () => {
    assert.equal(isBallInWater({ x: 3, z: 3 }, course), false);
  });

  test('not on dry fairway', () => {
    assert.equal(isBallInWater({ x: 0, z: 0 }, course), false);
  });
});

describe('isBallOutOfBounds', () => {
  test('on the fairway is in bounds', () => {
    assert.equal(isBallOutOfBounds({ x: 0, y: 0.18, z: 0 }, course), false);
  });

  test('outside the outline is out of bounds', () => {
    assert.equal(isBallOutOfBounds({ x: 6, y: 0.18, z: 0 }, course), true);
  });

  test('falling below the course is out of bounds', () => {
    assert.equal(isBallOutOfBounds({ x: 0, y: -1.5, z: 0 }, course), true);
  });
});

describe('hasReachedStrokeLimit', () => {
  test('triggers exactly at MAX_STROKES', () => {
    assert.equal(hasReachedStrokeLimit(MAX_STROKES - 1), false);
    assert.equal(hasReachedStrokeLimit(MAX_STROKES), true);
    assert.equal(hasReachedStrokeLimit(MAX_STROKES + 1), true);
  });
});

describe('scoreLabel', () => {
  test('uses golf names relative to par', () => {
    const cases: [number, number, string][] = [
      [2, 5, 'Albatross!'],
      [2, 4, 'Eagle!'],
      [2, 3, 'Birdie!'],
      [3, 3, 'Par'],
      [4, 3, 'Bogey'],
      [5, 3, 'Double bogey'],
      [6, 3, 'Triple bogey'],
      [10, 3, '+7'],
    ];
    for (const [strokes, par, label] of cases) {
      assert.equal(scoreLabel(strokes, par), label, `${strokes} on par ${par}`);
    }
  });

  test('a hole in one beats every other name, even on par 1 or 2', () => {
    assert.equal(scoreLabel(1, 3), 'Hole in one!');
    assert.equal(scoreLabel(1, 2), 'Hole in one!');
  });

  // Reachable in the editor (par up to 6): 2 strokes on par 6.
  test(
    'far under par reads naturally',
    { todo: 'bug: prints "-4 under par"' },
    () => {
      assert.equal(scoreLabel(2, 6), '4 under par');
    }
  );
});
