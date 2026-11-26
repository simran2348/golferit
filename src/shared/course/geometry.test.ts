import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Vec2 } from '../types/course.ts';
import {
  buildWallSegments,
  isPointInPolygon,
  offsetPolygon,
  polygonBounds,
  polygonSignedArea,
} from './geometry.ts';

const square: Vec2[] = [
  { x: 0, z: 0 },
  { x: 2, z: 0 },
  { x: 2, z: 2 },
  { x: 0, z: 2 },
];
const reversed: Vec2[] = [...square].reverse();
/** L shape: the square [0,4]² minus the notch [2,4]×[2,4]. */
const lShape: Vec2[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 2 },
  { x: 2, z: 2 },
  { x: 2, z: 4 },
  { x: 0, z: 4 },
];

describe('polygonSignedArea', () => {
  test('magnitude is the area; sign flips with winding', () => {
    assert.equal(polygonSignedArea(square), 4);
    assert.equal(polygonSignedArea(reversed), -4);
    assert.equal(Math.abs(polygonSignedArea(lShape)), 12);
  });
});

describe('isPointInPolygon', () => {
  test('inside and outside a convex polygon', () => {
    assert.equal(isPointInPolygon({ x: 1, z: 1 }, square), true);
    assert.equal(isPointInPolygon({ x: 3, z: 1 }, square), false);
    assert.equal(isPointInPolygon({ x: -0.1, z: 1 }, square), false);
  });

  test('does not depend on winding', () => {
    assert.equal(isPointInPolygon({ x: 1, z: 1 }, reversed), true);
    assert.equal(isPointInPolygon({ x: 3, z: 1 }, reversed), false);
  });

  test('handles a concave polygon (the notch is outside)', () => {
    assert.equal(isPointInPolygon({ x: 1, z: 3 }, lShape), true);
    assert.equal(isPointInPolygon({ x: 3, z: 1 }, lShape), true);
    assert.equal(isPointInPolygon({ x: 3, z: 3 }, lShape), false);
  });
});

describe('polygonBounds', () => {
  test('returns the axis-aligned bounds', () => {
    assert.deepEqual(polygonBounds(lShape), {
      minX: 0,
      maxX: 4,
      minZ: 0,
      maxZ: 4,
    });
  });
});

describe('offsetPolygon', () => {
  const close = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

  test('a positive distance grows the polygon, for either winding', () => {
    for (const polygon of [square, reversed]) {
      const b = polygonBounds(offsetPolygon(polygon, 0.5));
      close(b.minX, -0.5);
      close(b.maxX, 2.5);
      close(b.minZ, -0.5);
      close(b.maxZ, 2.5);
    }
  });

  test('a negative distance shrinks the polygon, for either winding', () => {
    for (const polygon of [square, reversed]) {
      const b = polygonBounds(offsetPolygon(polygon, -0.25));
      close(b.minX, 0.25);
      close(b.maxX, 1.75);
      close(b.minZ, 0.25);
      close(b.maxZ, 1.75);
    }
  });

  test('keeps the vertex count and changes the area in the right direction', () => {
    const grown = offsetPolygon(lShape, 0.2);
    const shrunk = offsetPolygon(lShape, -0.2);
    assert.equal(grown.length, lShape.length);
    const area = Math.abs(polygonSignedArea(lShape));
    assert.ok(Math.abs(polygonSignedArea(grown)) > area);
    assert.ok(Math.abs(polygonSignedArea(shrunk)) < area);
  });
});

describe('buildWallSegments', () => {
  test('one wall per edge, each as long as its edge', () => {
    const walls = buildWallSegments(lShape, 0.3);
    assert.equal(walls.length, lShape.length);
    const lengths = walls.map((wall) => wall.length);
    assert.deepEqual(lengths, [4, 2, 2, 2, 2, 4]);
  });

  test('walls sit outside the playable surface, for either winding', () => {
    for (const polygon of [square, reversed, lShape]) {
      for (const wall of buildWallSegments(polygon, 0.3)) {
        assert.equal(isPointInPolygon(wall.center, polygon), false);
      }
    }
  });
});
