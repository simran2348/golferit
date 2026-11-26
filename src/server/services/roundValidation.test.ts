import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ShotRecord, SubmitRoundRequest } from '../../shared/api.ts';
import {
  MAX_STROKES,
  MIN_ROUND_MS,
  ROUND_TTL_SECONDS,
} from '../../shared/constants/game.ts';
import { MEADOW_MILL } from '../../shared/courses/meadowMill.ts';
import { parseSubmitRequest, validateRound } from './roundValidation.ts';

const course = MEADOW_MILL;
const fromTee: ShotRecord = {
  t: 1,
  x: course.tee.x,
  z: course.tee.z,
  dx: 1,
  dz: 0,
  power: 0.6,
};
/** Second putt from further along the fairway (inside the outline). */
const approach: ShotRecord = {
  ...fromTee,
  t: 4,
  x: 4.2,
  z: -2.5,
  dx: 0,
  dz: -1,
  power: 0.3,
};
const round = (shots: ShotRecord[], penalties = 0): SubmitRoundRequest => ({
  roundId: 'round-1',
  shots,
  penalties,
});

describe('parseSubmitRequest', () => {
  test('accepts a well-formed body', () => {
    const body = round([fromTee, approach], 1);
    assert.deepEqual(
      parseSubmitRequest(JSON.parse(JSON.stringify(body))),
      body
    );
  });

  test('rejects junk', () => {
    const junk: unknown[] = [
      null,
      undefined,
      'round',
      42,
      [],
      {},
      { roundId: 1, shots: [], penalties: 0 },
      { roundId: 'r', shots: 'none', penalties: 0 },
      { roundId: 'r', shots: [], penalties: 0.5 },
      { roundId: 'r', shots: [] },
      { roundId: 'r', shots: [null], penalties: 0 },
      { roundId: 'r', shots: [{ ...fromTee, power: '1' }], penalties: 0 },
      { roundId: 'r', shots: [{ ...fromTee, x: Number.NaN }], penalties: 0 },
      { roundId: 'r', shots: [{ ...fromTee, z: Infinity }], penalties: 0 },
      {
        roundId: 'r',
        shots: [{ t: 1, x: 0, z: 0, dx: 1, dz: 0 }],
        penalties: 0,
      },
    ];
    for (const value of junk) assert.equal(parseSubmitRequest(value), null);
  });
});

describe('validateRound', () => {
  test('accepts a sensible round; strokes come from the shot log', () => {
    assert.deepEqual(validateRound(round([fromTee, approach]), course, 8_000), {
      strokes: 2,
      timeMs: 8_000,
    });
    assert.deepEqual(
      validateRound(round([fromTee, approach], 1), course, 8_000),
      {
        strokes: 3,
        timeMs: 8_000,
      }
    );
  });

  test('rejects a first shot that is not from the tee', () => {
    const moved: ShotRecord = { ...fromTee, x: course.tee.x + 0.5 };
    assert.equal(
      validateRound(round([moved]), course, 5_000),
      'First shot must be from the tee'
    );
  });

  test('rejects a shot taken off the course', () => {
    const offCourse: ShotRecord = { ...approach, x: 0, z: -3 };
    assert.equal(
      validateRound(round([fromTee, offCourse]), course, 5_000),
      'Shot taken off the course'
    );
  });

  test('rejects power out of range', () => {
    for (const power of [0, 0.01, 1.01, 5]) {
      assert.equal(
        validateRound(round([{ ...fromTee, power }]), course, 5_000),
        'Invalid shot power'
      );
    }
  });

  test('rejects a direction that is not a unit vector', () => {
    assert.equal(
      validateRound(round([{ ...fromTee, dx: 2 }]), course, 5_000),
      'Invalid shot direction'
    );
  });

  test('rejects too many strokes, counting penalties', () => {
    const shots = (count: number): ShotRecord[] =>
      Array.from({ length: count }, (_, i) => ({ ...fromTee, t: i + 1 }));
    assert.equal(
      validateRound(round(shots(MAX_STROKES + 1)), course, 60_000),
      'Too many strokes'
    );
    assert.equal(
      validateRound(round(shots(MAX_STROKES - 1), 2), course, 60_000),
      'Too many strokes'
    );
    assert.deepEqual(validateRound(round(shots(MAX_STROKES)), course, 60_000), {
      strokes: MAX_STROKES,
      timeMs: 60_000,
    });
  });

  test('rejects a round finished faster than MIN_ROUND_MS', () => {
    const shots = [fromTee];
    assert.equal(
      validateRound(round(shots), course, MIN_ROUND_MS - 1),
      'Round finished impossibly fast'
    );
    assert.deepEqual(validateRound(round(shots), course, MIN_ROUND_MS), {
      strokes: 1,
      timeMs: MIN_ROUND_MS,
    });
  });

  test('rejects an expired round', () => {
    assert.equal(
      validateRound(round([fromTee]), course, ROUND_TTL_SECONDS * 1000 + 1),
      'Round expired'
    );
  });

  test('rejects an empty log, bad penalties and shots out of order', () => {
    assert.equal(
      validateRound(round([]), course, 5_000),
      'A round needs at least one shot'
    );
    assert.equal(
      validateRound(round([fromTee], -1), course, 5_000),
      'Invalid penalty count'
    );
    assert.equal(
      validateRound(round([fromTee], 1), course, 5_000),
      'More penalties than shots'
    );
    assert.equal(
      validateRound(
        round([
          { ...fromTee, t: 5 },
          { ...approach, t: 4 },
        ]),
        course,
        5_000
      ),
      'Shots out of order'
    );
  });
});
