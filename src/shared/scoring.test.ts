import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MAX_RECORDED_TIME_MS,
  formatDuration,
  packScore,
  unpackScore,
} from './scoring.ts';

describe('packScore / unpackScore', () => {
  test('round-trips strokes and time', () => {
    const cases: [number, number][] = [
      [1, 0],
      [2, 7_832],
      [3, 61_000],
      [10, MAX_RECORDED_TIME_MS],
    ];
    for (const [strokes, timeMs] of cases) {
      assert.deepEqual(unpackScore(packScore(strokes, timeMs)), {
        strokes,
        timeMs,
      });
    }
  });

  test('fewer strokes always ranks better than a faster time', () => {
    assert.ok(packScore(2, MAX_RECORDED_TIME_MS) < packScore(3, 0));
    assert.ok(packScore(1, 99_999) < packScore(2, 1));
  });

  test('same strokes: faster time ranks better', () => {
    assert.ok(packScore(3, 9_000) < packScore(3, 9_001));
  });

  test('clamps time to MAX_RECORDED_TIME_MS so strokes never change', () => {
    const packed = packScore(2, MAX_RECORDED_TIME_MS * 5);
    assert.equal(packed, packScore(2, MAX_RECORDED_TIME_MS));
    assert.deepEqual(unpackScore(packed), {
      strokes: 2,
      timeMs: MAX_RECORDED_TIME_MS,
    });
  });

  test('clamps negative time to 0 and rounds fractions', () => {
    assert.deepEqual(unpackScore(packScore(4, -500)), {
      strokes: 4,
      timeMs: 0,
    });
    assert.equal(unpackScore(packScore(4, 1234.6)).timeMs, 1235);
  });
});

describe('formatDuration', () => {
  test('formats minutes, seconds and tenths', () => {
    assert.equal(formatDuration(0), '0:00.0');
    assert.equal(formatDuration(7_400), '0:07.4');
    assert.equal(formatDuration(83_000), '1:23.0');
    assert.equal(formatDuration(600_000), '10:00.0');
  });

  test('truncates (never rounds up) to tenths', () => {
    assert.equal(formatDuration(7_499), '0:07.4');
    assert.equal(formatDuration(59_999), '0:59.9');
  });

  test('treats negative durations as zero', () => {
    assert.equal(formatDuration(-1_000), '0:00.0');
  });
});
