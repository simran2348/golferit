import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isPointInPolygon } from '../course/geometry.ts';
import { boostDirection } from '../course/obstacles.ts';
import { isBallInWater } from '../course/rules.ts';
import { buildCourseFromDesign } from './buildCourse.ts';
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_CHARS,
  createStarterDesign,
  withTile,
  type CourseDesign,
  type EditorItem,
  type ItemKind,
  type Rotation,
} from './design.ts';

const errorsOf = (design: CourseDesign): string[] => {
  const result = buildCourseFromDesign(design, 'test');
  assert.equal(result.ok, false, 'expected the build to fail');
  return result.ok ? [] : result.errors;
};

const assertError = (design: CourseDesign, pattern: RegExp) => {
  const errors = errorsOf(design);
  assert.ok(
    errors.some((error) => pattern.test(error)),
    `expected ${pattern} in ${JSON.stringify(errors)}`
  );
};

/** A design with only the given track tiles and items. */
const designOf = (
  tiles: [number, number][],
  items: EditorItem[]
): CourseDesign => {
  let design: CourseDesign = {
    ...createStarterDesign(),
    tiles: TILE_CHARS.empty.repeat(GRID_COLS * GRID_ROWS),
    items,
  };
  for (const [col, row] of tiles) design = withTile(design, col, row, 'track');
  return design;
};

const tee = (col: number, row: number): EditorItem => ({
  kind: 'tee',
  col,
  row,
  rotation: 0,
});
const cup = (col: number, row: number): EditorItem => ({
  kind: 'cup',
  col,
  row,
  rotation: 0,
});

const at = (
  kind: ItemKind,
  col: number,
  row: number,
  rotation: Rotation = 0
): EditorItem => ({ kind, col, row, rotation });

/** Starter lane (cols 4-5, rows 3-11) with water painted on some tiles. */
const withWater = (cells: [number, number][], extra: EditorItem[]) => {
  let design = createStarterDesign();
  for (const [col, row] of cells) design = withTile(design, col, row, 'water');
  return { ...design, items: [...design.items, ...extra] };
};

describe('buildCourseFromDesign', () => {
  test('builds the starter design into a playable course', () => {
    const design = createStarterDesign();
    const result = buildCourseFromDesign(design, 'starter');
    assert.ok(result.ok);
    const { course } = result;
    assert.equal(course.id, 'starter');
    assert.equal(course.par, design.par);
    assert.ok(isPointInPolygon(course.tee, course.outline));
    assert.ok(isPointInPolygon(course.cup, course.outline));
  });

  test('turns placed obstacles into course obstacles', () => {
    const design: CourseDesign = {
      ...createStarterDesign(),
      items: [
        ...createStarterDesign().items,
        { kind: 'ramp', col: 4, row: 7, rotation: 0 },
        { kind: 'spinner', col: 5, row: 8, rotation: 1 },
        { kind: 'wall', col: 5, row: 5, rotation: 0 },
      ],
    };
    const result = buildCourseFromDesign(design, 'items');
    assert.ok(result.ok);
    const kinds = result.course.obstacles.map((obstacle) => obstacle.kind);
    assert.deepEqual(kinds.sort(), ['ramp', 'spinner', 'wall']);
  });

  test('builds tunnels, sand, boost pads and a teleporter pair', () => {
    const design: CourseDesign = {
      ...createStarterDesign(),
      items: [
        ...createStarterDesign().items,
        at('tunnel', 4, 6, 1),
        at('sand', 5, 6),
        at('boost', 4, 8, 1),
        at('portal', 5, 9),
        at('portal', 5, 4),
      ],
    };
    const result = buildCourseFromDesign(design, 'new-items');
    assert.ok(result.ok);
    const kinds = result.course.obstacles.map((obstacle) => obstacle.kind);
    // The two teleporters become one linked obstacle.
    assert.deepEqual(kinds.sort(), ['boost', 'portal', 'sand', 'tunnel']);
    const boost = result.course.obstacles.find((o) => o.kind === 'boost');
    assert.ok(boost?.kind === 'boost');
    // Rotation 1 is a quarter turn clockwise from "right": down the screen.
    const dir = boostDirection(boost);
    assert.ok(Math.abs(dir.x) < 1e-9 && Math.abs(dir.z - 1) < 1e-9);
  });

  test('a bridge keeps the ball dry across its water tile', () => {
    const result = buildCourseFromDesign(
      withWater(
        [
          [4, 7],
          [5, 7],
        ],
        [at('bridge', 4, 7, 1)]
      ),
      'bridge'
    );
    assert.ok(result.ok);
    const { course } = result;
    assert.equal(course.bridges.length, 1);
    const bridge = course.bridges[0]!;
    const middle = {
      x: (bridge.from.x + bridge.to.x) / 2,
      z: (bridge.from.z + bridge.to.z) / 2,
    };
    assert.equal(isBallInWater(middle, course), false);
    // The tile beside it has no bridge.
    assert.equal(
      isBallInWater({ x: middle.x + 1.5, z: middle.z }, course),
      true
    );
  });

  test('bridges on neighbouring tiles join end to end', () => {
    const result = buildCourseFromDesign(
      withWater(
        [
          [4, 6],
          [4, 7],
        ],
        [at('bridge', 4, 6, 1), at('bridge', 4, 7, 1)]
      ),
      'bridges'
    );
    assert.ok(result.ok);
    const [first, second] = result.course.bridges;
    assert.ok(first && second);
    assert.deepEqual(first.to, second.from);
  });

  test('a bridge on dry track', () => {
    const design = createStarterDesign();
    assertError(
      { ...design, items: [...design.items, at('bridge', 4, 7)] },
      /Bridges must sit on water/
    );
  });

  test('a lone teleporter', () => {
    const design = createStarterDesign();
    assertError(
      { ...design, items: [...design.items, at('portal', 4, 7)] },
      /Teleporters come in pairs/
    );
  });

  test('no tee', () => {
    const design = createStarterDesign();
    assertError(
      { ...design, items: design.items.filter((i) => i.kind !== 'tee') },
      /exactly one tee/
    );
  });

  test('no cup', () => {
    const design = createStarterDesign();
    assertError(
      { ...design, items: design.items.filter((i) => i.kind !== 'cup') },
      /exactly one cup/
    );
  });

  test('disconnected track', () => {
    assertError(
      withTile(createStarterDesign(), 0, 0, 'track'),
      /connected in one piece/
    );
  });

  test('tiles touching only at a corner', () => {
    // (6,2) meets the starter lane's (5,3) at a corner only.
    assertError(
      withTile(createStarterDesign(), 6, 2, 'track'),
      /touch only at a corner/
    );
  });

  test('track enclosing empty space', () => {
    const ring: [number, number][] = [];
    for (let i = 2; i <= 6; i++) ring.push([i, 2], [i, 6], [2, i], [6, i]);
    assertError(designOf(ring, [tee(2, 6), cup(6, 2)]), /surround empty space/);
  });

  test('too few track tiles', () => {
    const lane: [number, number][] = [
      [4, 4],
      [4, 5],
      [4, 6],
    ];
    assertError(
      designOf(lane, [tee(4, 6), cup(4, 4)]),
      /at least \d+ track tiles/
    );
  });

  test('item off the track', () => {
    const design = createStarterDesign();
    assertError(
      {
        ...design,
        items: [
          ...design.items,
          { kind: 'bumper', col: 0, row: 0, rotation: 0 },
        ],
      },
      /must sit on track/
    );
  });

  test('each failure reports its own message', () => {
    const design = createStarterDesign();
    const noTee = errorsOf({
      ...design,
      items: design.items.filter((i) => i.kind !== 'tee'),
    });
    const disconnected = errorsOf(withTile(design, 0, 0, 'track'));
    assert.equal(noTee.length, 1);
    assert.equal(disconnected.length, 1);
    assert.notEqual(noTee[0], disconnected[0]);
  });
});
