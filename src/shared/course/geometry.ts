import type { Vec2 } from '../types/course';

/** Shoelace formula. Sign depends on winding order. */
export const polygonSignedArea = (points: readonly Vec2[]): number => {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
};

/** Ray-casting point-in-polygon test on the XZ plane. */
export const isPointInPolygon = (
  point: Vec2,
  polygon: readonly Vec2[]
): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const crosses =
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

export type Bounds2 = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const polygonBounds = (points: readonly Vec2[]): Bounds2 => {
  const bounds: Bounds2 = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (const p of points) {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minZ = Math.min(bounds.minZ, p.z);
    bounds.maxZ = Math.max(bounds.maxZ, p.z);
  }
  return bounds;
};

/** Outward unit normal of the edge a→b for a polygon with the given winding. */
const outwardNormal = (a: Vec2, b: Vec2, area: number): Vec2 => {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = (b.x - a.x) / length;
  const dz = (b.z - a.z) / length;
  return area > 0 ? { x: dz, z: -dx } : { x: -dz, z: dx };
};

export type WallSegment = {
  start: Vec2;
  end: Vec2;
  /** Centre of the wall box (already pushed outward by half its thickness). */
  center: Vec2;
  length: number;
  /** Rotation around Y that aligns a box's local X axis with the edge. */
  rotationY: number;
  /** Unit vector pointing away from the playable surface. */
  normal: Vec2;
};

/**
 * Derive one straight wall per outline edge. Walls sit just outside the
 * putting surface so the full outline stays playable. Used by the renderer now
 * and by physics colliders later, so both always agree.
 */
export const buildWallSegments = (
  outline: readonly Vec2[],
  thickness: number
): WallSegment[] => {
  const area = polygonSignedArea(outline);
  return outline.map((start, i) => {
    const end = outline[(i + 1) % outline.length]!;
    const normal = outwardNormal(start, end, area);
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    return {
      start,
      end,
      length,
      normal,
      center: {
        x: (start.x + end.x) / 2 + (normal.x * thickness) / 2,
        z: (start.z + end.z) / 2 + (normal.z * thickness) / 2,
      },
      rotationY: Math.atan2(-(end.z - start.z), end.x - start.x),
    };
  });
};

/**
 * Grow (positive) or shrink (negative) a simple polygon by `distance` using
 * mitred corners. Miters are
 * clamped so very sharp corners don't spike.
 */
export const offsetPolygon = (
  outline: readonly Vec2[],
  distance: number
): Vec2[] => {
  const area = polygonSignedArea(outline);
  const count = outline.length;
  return outline.map((point, i) => {
    const prev = outline[(i - 1 + count) % count]!;
    const next = outline[(i + 1) % count]!;
    const n1 = outwardNormal(prev, point, area);
    const n2 = outwardNormal(point, next, area);
    const mx = n1.x + n2.x;
    const mz = n1.z + n2.z;
    const mLength = Math.hypot(mx, mz) || 1;
    const dirX = mx / mLength;
    const dirZ = mz / mLength;
    const cos = dirX * n1.x + dirZ * n1.z;
    // Clamp miters (works for negative distances too, i.e. insetting).
    const magnitude = Math.min(
      Math.abs(distance) / Math.max(cos, 1e-3),
      Math.abs(distance) * 3
    );
    const scale = Math.sign(distance) * magnitude;
    return { x: point.x + dirX * scale, z: point.z + dirZ * scale };
  });
};

export type CornerPost = {
  center: Vec2;
  rotationY: number;
};

/**
 * One post per outline vertex, placed on the bisector of the two adjacent
 * walls so it covers their joint. Shared so visuals and colliders match.
 */
export const buildCornerPosts = (
  segments: readonly WallSegment[],
  thickness: number
): CornerPost[] =>
  segments.map((segment, i) => {
    const previous = segments[(i - 1 + segments.length) % segments.length]!;
    return {
      center: {
        x:
          segment.start.x +
          ((segment.normal.x + previous.normal.x) * thickness) / 2,
        z:
          segment.start.z +
          ((segment.normal.z + previous.normal.z) * thickness) / 2,
      },
      rotationY: segment.rotationY,
    };
  });
