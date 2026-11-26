import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildCourseFromDesign } from './buildCourse.ts';
import {
  GRID_COLS,
  GRID_ROWS,
  MAX_ITEMS,
  MAX_PAR,
  MIN_PAR,
  NAME_MAX_LENGTH,
  createStarterDesign,
  inGrid,
  parseDesign,
  tileAt,
  tileIndex,
  withTile,
  type EditorItem,
} from './design.ts';

describe('tileIndex / inGrid', () => {
  test('indexes tiles row by row', () => {
    assert.equal(tileIndex(0, 0), 0);
    assert.equal(tileIndex(3, 2), 2 * GRID_COLS + 3);
    assert.equal(
      tileIndex(GRID_COLS - 1, GRID_ROWS - 1),
      GRID_COLS * GRID_ROWS - 1
    );
  });

  test('accepts exactly the cells of the grid', () => {
    assert.equal(inGrid(0, 0), true);
    assert.equal(inGrid(GRID_COLS - 1, GRID_ROWS - 1), true);
    assert.equal(inGrid(-1, 0), false);
    assert.equal(inGrid(0, -1), false);
    assert.equal(inGrid(GRID_COLS, 0), false);
    assert.equal(inGrid(0, GRID_ROWS), false);
  });
});

describe('tileAt / withTile', () => {
  test('reads painted tiles; anything off the grid is empty', () => {
    const design = createStarterDesign();
    assert.equal(tileAt(design, 4, 5), 'track');
    assert.equal(tileAt(design, 0, 0), 'empty');
    assert.equal(tileAt(design, -1, 5), 'empty');
    assert.equal(tileAt(design, 4, GRID_ROWS), 'empty');
  });

  test('returns a new design and leaves the original untouched', () => {
    const design = createStarterDesign();
    const tiles = design.tiles;
    const next = withTile(design, 0, 0, 'water');
    assert.notEqual(next, design);
    assert.equal(tileAt(next, 0, 0), 'water');
    assert.equal(design.tiles, tiles);
    assert.equal(tileAt(design, 0, 0), 'empty');
    assert.equal(next.tiles.length, tiles.length);
  });

  test('returns the same object when nothing changes', () => {
    const design = createStarterDesign();
    assert.equal(withTile(design, 4, 5, 'track'), design);
    assert.equal(withTile(design, -1, 0, 'track'), design);
  });
});

describe('createStarterDesign', () => {
  test('is a valid, buildable design', () => {
    const design = createStarterDesign();
    assert.deepEqual(parseDesign(JSON.parse(JSON.stringify(design))), design);
    assert.equal(buildCourseFromDesign(design, 'starter').ok, true);
  });
});

describe('parseDesign', () => {
  const valid = createStarterDesign();
  const item: EditorItem = { kind: 'bumper', col: 4, row: 6, rotation: 0 };

  test('accepts every item kind', () => {
    const kinds: EditorItem['kind'][] = [
      'tee',
      'cup',
      'bumper',
      'windmill',
      'slider',
      'ramp',
      'spinner',
      'wall',
    ];
    const items: EditorItem[] = kinds.map((kind, i) => ({
      kind,
      col: i,
      row: 0,
      rotation: 1,
    }));
    assert.deepEqual(parseDesign({ ...valid, items })?.items, items);
  });

  test('rejects things that are not designs', () => {
    const junk: unknown[] = [null, undefined, 'design', 42, [], {}];
    for (const value of junk) assert.equal(parseDesign(value), null);
  });

  test('rejects a wrong version, name, par or tile string', () => {
    const bad: unknown[] = [
      { ...valid, version: 2 },
      { ...valid, name: 7 },
      { ...valid, name: 'x'.repeat(NAME_MAX_LENGTH + 1) },
      { ...valid, par: MIN_PAR - 1 },
      { ...valid, par: MAX_PAR + 1 },
      { ...valid, par: 3.5 },
      { ...valid, tiles: valid.tiles.slice(1) },
      { ...valid, tiles: `${valid.tiles}.` },
      { ...valid, tiles: `x${valid.tiles.slice(1)}` },
    ];
    for (const value of bad) assert.equal(parseDesign(value), null);
  });

  test('accepts the longest allowed name', () => {
    const name = 'x'.repeat(NAME_MAX_LENGTH);
    assert.equal(parseDesign({ ...valid, name })?.name, name);
  });

  test('rejects malformed items', () => {
    const bad: unknown[] = [
      'items',
      [{ ...item, kind: 'cannon' }],
      [{ ...item, rotation: 4 }],
      [{ ...item, col: 1.5 }],
      [{ ...item, col: GRID_COLS }],
      [{ ...item, row: -1 }],
      [{ kind: 'bumper', col: 1, row: 1 }],
      [null],
    ];
    for (const items of bad) {
      assert.equal(parseDesign({ ...valid, items }), null);
    }
  });

  test('rejects more than MAX_ITEMS items', () => {
    const items: EditorItem[] = Array.from(
      { length: MAX_ITEMS + 1 },
      (_, i) => ({
        ...item,
        col: i % GRID_COLS,
        row: Math.floor(i / GRID_COLS),
      })
    );
    assert.equal(parseDesign({ ...valid, items }), null);
    assert.notEqual(parseDesign({ ...valid, items: items.slice(1) }), null);
  });
});
