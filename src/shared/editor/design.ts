/**
 * Course editor data model. Players paint tiles on a grid and drop items on
 * tiles; `buildCourseFromDesign` turns that into a regular CourseDefinition.
 * Kept small and JSON-friendly so drafts store cheaply in Redis.
 */

export const GRID_COLS = 10;
export const GRID_ROWS = 14;
/** World units per tile (the ball is 0.36 across). */
export const TILE_SIZE = 1.5;

export const MIN_TRACK_TILES = 6;
export const MAX_ITEMS = 16;
export const MIN_PAR = 2;
export const MAX_PAR = 6;
export const NAME_MAX_LENGTH = 32;

/** One character per tile, row-major. */
export const TILE_CHARS = { empty: '.', track: 't', water: 'w' } as const;
export type TileKind = keyof typeof TILE_CHARS;

/** Quarter turns clockwise when seen from above. */
export type Rotation = 0 | 1 | 2 | 3;

export type ItemKind = 'tee' | 'cup' | 'bumper' | 'windmill' | 'slider';

export type EditorItem = {
  kind: ItemKind;
  col: number;
  row: number;
  rotation: Rotation;
};

export type CourseDesign = {
  version: 1;
  name: string;
  par: number;
  /** GRID_COLS * GRID_ROWS characters from TILE_CHARS. */
  tiles: string;
  items: EditorItem[];
};

/** Items with an orientation; the rest ignore `rotation`. */
export const ROTATABLE: ReadonlySet<ItemKind> = new Set(['windmill', 'slider']);
/** Exactly one of each is required. */
export const UNIQUE_ITEMS: ReadonlySet<ItemKind> = new Set(['tee', 'cup']);

export const tileIndex = (col: number, row: number) => row * GRID_COLS + col;

export const inGrid = (col: number, row: number) =>
  col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;

export const tileAt = (
  design: CourseDesign,
  col: number,
  row: number
): TileKind => {
  if (!inGrid(col, row)) return 'empty';
  const char = design.tiles[tileIndex(col, row)];
  return char === TILE_CHARS.track
    ? 'track'
    : char === TILE_CHARS.water
      ? 'water'
      : 'empty';
};

export const withTile = (
  design: CourseDesign,
  col: number,
  row: number,
  kind: TileKind
): CourseDesign => {
  if (!inGrid(col, row) || tileAt(design, col, row) === kind) return design;
  const i = tileIndex(col, row);
  return {
    ...design,
    tiles:
      design.tiles.slice(0, i) + TILE_CHARS[kind] + design.tiles.slice(i + 1),
  };
};

/** Starting draft: a short straight lane with tee and cup. */
export const createStarterDesign = (): CourseDesign => {
  let design: CourseDesign = {
    version: 1,
    name: 'My Course',
    par: 3,
    tiles: TILE_CHARS.empty.repeat(GRID_COLS * GRID_ROWS),
    items: [
      { kind: 'tee', col: 4, row: 10, rotation: 0 },
      { kind: 'cup', col: 4, row: 4, rotation: 0 },
    ],
  };
  for (let row = 3; row <= 11; row++) {
    for (const col of [4, 5]) design = withTile(design, col, row, 'track');
  }
  return design;
};

const ITEM_KINDS: ReadonlySet<string> = new Set([
  'tee',
  'cup',
  'bumper',
  'windmill',
  'slider',
]);
const TILES_PATTERN = new RegExp(
  `^[${TILE_CHARS.empty}${TILE_CHARS.track}${TILE_CHARS.water}]{${GRID_COLS * GRID_ROWS}}$`
);

const isItemKind = (value: unknown): value is ItemKind =>
  typeof value === 'string' && ITEM_KINDS.has(value);

const isRotation = (value: unknown): value is Rotation =>
  value === 0 || value === 1 || value === 2 || value === 3;

const parseItem = (value: unknown): EditorItem | null => {
  if (typeof value !== 'object' || value === null) return null;
  if (!('kind' in value) || !isItemKind(value.kind)) return null;
  if (!('col' in value) || !Number.isInteger(value.col)) return null;
  if (!('row' in value) || !Number.isInteger(value.row)) return null;
  if (!('rotation' in value) || !isRotation(value.rotation)) return null;
  const col = Number(value.col);
  const row = Number(value.row);
  if (!inGrid(col, row)) return null;
  return { kind: value.kind, col, row, rotation: value.rotation };
};

/**
 * Structural parse of untrusted input (server drafts, Redis). Gameplay rules
 * (one tee, connected track, ...) are checked by `buildCourseFromDesign`.
 */
export const parseDesign = (value: unknown): CourseDesign | null => {
  if (typeof value !== 'object' || value === null) return null;
  if (!('version' in value) || value.version !== 1) return null;
  if (!('name' in value) || typeof value.name !== 'string') return null;
  if (value.name.length > NAME_MAX_LENGTH) return null;
  if (!('par' in value) || !Number.isInteger(value.par)) return null;
  if (!('tiles' in value) || typeof value.tiles !== 'string') return null;
  if (!TILES_PATTERN.test(value.tiles)) return null;
  if (!('items' in value) || !Array.isArray(value.items)) return null;
  const rawItems: unknown[] = value.items;
  if (rawItems.length > MAX_ITEMS) return null;
  const items: EditorItem[] = [];
  for (const raw of rawItems) {
    const item = parseItem(raw);
    if (!item) return null;
    items.push(item);
  }
  const par = Number(value.par);
  if (par < MIN_PAR || par > MAX_PAR) return null;
  return { version: 1, name: value.name, par, tiles: value.tiles, items };
};
