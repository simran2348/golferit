import type {
  CourseDefinition,
  Islet,
  Obstacle,
  SceneryItem,
  Vec2,
  WaterHazard,
} from '../types/course';
import { isPointInPolygon, offsetPolygon } from '../course/geometry';
import {
  GRID_COLS,
  GRID_ROWS,
  MAX_ITEMS,
  MAX_PAR,
  MIN_PAR,
  MIN_TRACK_TILES,
  NAME_MAX_LENGTH,
  TILE_SIZE,
  tileAt,
  type CourseDesign,
  type EditorItem,
  type TileKind,
} from './design';

export type BuildResult =
  { ok: true; course: CourseDefinition } | { ok: false; errors: string[] };

type Cell = { col: number; row: number };
type InSet = (col: number, row: number) => boolean;

const NAME_PATTERN = /^[\p{L}\p{N} '’&!?.,:-]+$/u;
/** Ponds sit this far inside their tiles so they never touch the walls. */
const WATER_INSET = 0.1;
const SLIDER_LENGTH = 0.9;
const SLIDER_WIDTH = 0.45;

const isPlayable = (kind: TileKind) => kind !== 'empty';

/** 4-connected flood fill. */
const components = (inSet: InSet): Cell[][] => {
  const seen = new Set<number>();
  const result: Cell[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const key = row * GRID_COLS + col;
      if (!inSet(col, row) || seen.has(key)) continue;
      const group: Cell[] = [];
      const stack: Cell[] = [{ col, row }];
      seen.add(key);
      while (stack.length > 0) {
        const cell = stack.pop()!;
        group.push(cell);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const c = cell.col + dc;
          const r = cell.row + dr;
          const k = r * GRID_COLS + c;
          if (inSet(c, r) && !seen.has(k)) {
            seen.add(k);
            stack.push({ col: c, row: r });
          }
        }
      }
      result.push(group);
    }
  }
  return result;
};

/** Two cells touching only at a corner make an ambiguous, pinched outline. */
const hasCornerOnlyContact = (inSet: InSet): boolean => {
  for (let row = -1; row < GRID_ROWS; row++) {
    for (let col = -1; col < GRID_COLS; col++) {
      const a = inSet(col, row);
      const b = inSet(col + 1, row);
      const c = inSet(col, row + 1);
      const d = inSet(col + 1, row + 1);
      if ((a && d && !b && !c) || (b && c && !a && !d)) return true;
    }
  }
  return false;
};

/**
 * Trace the boundary of a cell set into closed loops of grid-corner points.
 * Edges run clockwise (screen space) around filled cells, so each corner has
 * at most one outgoing edge once corner-only contacts are excluded.
 */
const traceLoops = (cells: Cell[], inSet: InSet): Vec2[][] => {
  const edges = new Map<string, Vec2>();
  const key = (x: number, z: number) => `${x},${z}`;
  for (const { col: c, row: r } of cells) {
    if (!inSet(c, r - 1)) edges.set(key(c, r), { x: c + 1, z: r });
    if (!inSet(c + 1, r)) edges.set(key(c + 1, r), { x: c + 1, z: r + 1 });
    if (!inSet(c, r + 1)) edges.set(key(c + 1, r + 1), { x: c, z: r + 1 });
    if (!inSet(c - 1, r)) edges.set(key(c, r + 1), { x: c, z: r });
  }
  const loops: Vec2[][] = [];
  while (edges.size > 0) {
    const [startKey] = edges.keys();
    if (startKey === undefined) break;
    const [sx, sz] = startKey.split(',').map(Number);
    const loop: Vec2[] = [];
    let cursor: Vec2 = { x: sx ?? 0, z: sz ?? 0 };
    for (let guard = 0; guard < 4 * GRID_COLS * GRID_ROWS + 4; guard++) {
      const k = key(cursor.x, cursor.z);
      const next = edges.get(k);
      if (!next) break;
      edges.delete(k);
      loop.push(cursor);
      cursor = next;
    }
    loops.push(simplify(loop));
  }
  return loops;
};

/** Drop points that sit in the middle of a straight run. */
const simplify = (loop: Vec2[]): Vec2[] =>
  loop.filter((p, i) => {
    const prev = loop[(i - 1 + loop.length) % loop.length]!;
    const next = loop[(i + 1) % loop.length]!;
    return !(
      (prev.x === p.x && p.x === next.x) ||
      (prev.z === p.z && p.z === next.z)
    );
  });

const describeItem = (item: EditorItem) =>
  item.kind[0]!.toUpperCase() + item.kind.slice(1);

/**
 * Turn an editor design into a playable course, or explain why it isn't one.
 * Pure and deterministic: the client previews with it and the server
 * re-runs it on publish, so a tampered client can't sneak in a bad course.
 */
export const buildCourseFromDesign = (
  design: CourseDesign,
  id: string
): BuildResult => {
  const errors: string[] = [];
  const kindAt = (col: number, row: number) => tileAt(design, col, row);
  const playable: InSet = (c, r) => isPlayable(kindAt(c, r));
  const water: InSet = (c, r) => kindAt(c, r) === 'water';

  const name = design.name.trim();
  if (name.length === 0) errors.push('Give your course a name.');
  else if (name.length > NAME_MAX_LENGTH) errors.push('That name is too long.');
  else if (!NAME_PATTERN.test(name)) {
    errors.push(
      'Names can use letters, numbers, spaces and basic punctuation.'
    );
  }
  if (design.par < MIN_PAR || design.par > MAX_PAR) {
    errors.push(`Par must be between ${MIN_PAR} and ${MAX_PAR}.`);
  }

  let trackCount = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (kindAt(col, row) === 'track') trackCount++;
    }
  }
  if (trackCount < MIN_TRACK_TILES) {
    errors.push(`Paint at least ${MIN_TRACK_TILES} track tiles.`);
  }

  const regions = components(playable);
  if (regions.length > 1)
    errors.push('All track must be connected in one piece.');
  if (hasCornerOnlyContact(playable)) {
    errors.push('Tiles can’t touch only at a corner. Join them along an edge.');
  }

  // Items
  if (design.items.length > MAX_ITEMS) {
    errors.push(`Use at most ${MAX_ITEMS} items.`);
  }
  const tees = design.items.filter((i) => i.kind === 'tee');
  const cups = design.items.filter((i) => i.kind === 'cup');
  if (tees.length !== 1) errors.push('Place exactly one tee.');
  if (cups.length !== 1) errors.push('Place exactly one cup.');
  const occupied = new Set<string>();
  for (const item of design.items) {
    const where = `${item.col},${item.row}`;
    if (occupied.has(where)) errors.push('Only one item per tile.');
    occupied.add(where);
    if (kindAt(item.col, item.row) !== 'track') {
      errors.push(
        `${describeItem(item)} must sit on track, not water or empty space.`
      );
    }
  }

  const region = regions[0];
  if (errors.length > 0 || !region) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  const loops = traceLoops(region, playable);
  if (loops.length !== 1) {
    return {
      ok: false,
      errors: ['Track can’t surround empty space. Fill the gap or open it up.'],
    };
  }

  // Centre the course on its bounding box.
  let minC = Infinity;
  let maxC = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (const { col, row } of region) {
    minC = Math.min(minC, col);
    maxC = Math.max(maxC, col);
    minR = Math.min(minR, row);
    maxR = Math.max(maxR, row);
  }
  const centerC = (minC + maxC + 1) / 2;
  const centerR = (minR + maxR + 1) / 2;
  const corner = (p: Vec2): Vec2 => ({
    x: (p.x - centerC) * TILE_SIZE,
    z: (p.z - centerR) * TILE_SIZE,
  });
  const tileCenter = (col: number, row: number): Vec2 => ({
    x: (col + 0.5 - centerC) * TILE_SIZE,
    z: (row + 0.5 - centerR) * TILE_SIZE,
  });

  const outline = loops[0]!.map(corner);

  const ponds: WaterHazard[] = [];
  for (const [i, pond] of components(water).entries()) {
    const pondLoops = traceLoops(pond, water);
    if (pondLoops.length !== 1) {
      return {
        ok: false,
        errors: [
          'Water can’t surround track. Leave the island connected by land.',
        ],
      };
    }
    ponds.push({
      id: `pond-${i}`,
      outline: offsetPolygon(pondLoops[0]!.map(corner), -WATER_INSET),
    });
  }

  const obstacles: Obstacle[] = [];
  design.items.forEach((item, i) => {
    const center = tileCenter(item.col, item.row);
    const rotationY = (-item.rotation * Math.PI) / 2;
    switch (item.kind) {
      case 'bumper':
        obstacles.push({
          kind: 'bumper',
          id: `bumper-${i}`,
          position: center,
          radius: 0.3,
        });
        break;
      case 'windmill':
        obstacles.push({
          kind: 'windmill',
          id: `windmill-${i}`,
          position: center,
          rotationY,
          bladeSpeed: 1.1,
        });
        break;
      case 'slider': {
        // Sweep the straight run of open tiles it sits in (up to 2 each way).
        const horizontal = item.rotation % 2 === 0;
        const step = (n: number) =>
          horizontal
            ? playable(item.col + n, item.row)
            : playable(item.col, item.row + n);
        let lo = 0;
        let hi = 0;
        while (lo > -2 && step(lo - 1)) lo--;
        while (hi < 2 && step(hi + 1)) hi++;
        const runTiles = hi - lo + 1;
        const offset = ((lo + hi) / 2) * TILE_SIZE;
        obstacles.push({
          kind: 'slider',
          id: `slider-${i}`,
          position: horizontal
            ? { x: center.x + offset, z: center.z }
            : { x: center.x, z: center.z + offset },
          rotationY: horizontal ? 0 : -Math.PI / 2,
          travel: Math.max(
            (runTiles * TILE_SIZE - SLIDER_LENGTH) / 2 - 0.05,
            0.2
          ),
          speed: 1.6,
          phase: (item.col * 3 + item.row * 7) % 6,
          length: SLIDER_LENGTH,
          width: SLIDER_WIDTH,
        });
        break;
      }
      case 'tee':
      case 'cup':
        break;
    }
  });

  return {
    ok: true,
    course: {
      id,
      name,
      par: design.par,
      outline,
      tee: tileCenter(tees[0]!.col, tees[0]!.row),
      cup: tileCenter(cups[0]!.col, cups[0]!.row),
      water: ponds,
      bridges: [],
      obstacles,
      scenery: decorate(outline),
      islets: islets(outline),
    },
  };
};

/** Trees and rocks on the island rough, spaced out, deterministic. */
const decorate = (outline: Vec2[]): SceneryItem[] => {
  const ring = offsetPolygon(outline, 0.75);
  const candidates: Vec2[] = [];
  ring.forEach((p, i) => {
    const next = ring[(i + 1) % ring.length]!;
    candidates.push(p, { x: (p.x + next.x) / 2, z: (p.z + next.z) / 2 });
  });
  const placed: SceneryItem[] = [];
  for (const [i, p] of candidates.entries()) {
    if (placed.length >= 10) break;
    if (isPointInPolygon(p, outline)) continue;
    if (
      placed.some(
        (s) => Math.hypot(s.position.x - p.x, s.position.z - p.z) < 1.6
      )
    ) {
      continue;
    }
    placed.push({
      kind: i % 3 === 2 ? 'rock' : 'tree',
      position: p,
      scale: 0.75 + ((i * 37) % 10) / 25,
    });
  }
  return placed;
};

const islets = (outline: Vec2[]): Islet[] => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return [
    {
      id: 'islet-west',
      position: { x: minX - 3.5, y: -1.6, z: (minZ + maxZ) / 2 },
      radius: 1.6,
      scenery: [{ kind: 'tree', position: { x: 0, z: 0 }, scale: 1 }],
    },
    {
      id: 'islet-east',
      position: { x: maxX + 3.2, y: -2.2, z: maxZ - 1 },
      radius: 1.2,
      scenery: [{ kind: 'rock', position: { x: 0.2, z: 0 }, scale: 0.7 }],
    },
  ];
};
