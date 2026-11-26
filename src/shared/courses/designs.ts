import { buildCourseFromDesign } from '../editor/buildCourse';
import {
  GRID_COLS,
  GRID_ROWS,
  type CourseDesign,
  type EditorItem,
  type ItemKind,
  type Rotation,
} from '../editor/design';
import type { CourseDefinition } from '../types/course';

/**
 * The built-in holes, drawn exactly as a player would in the editor: a tile
 * map ('.' empty, 't' track, 'w' water) plus items. Building them with the
 * editor's own `buildCourseFromDesign` guarantees every official hole is one
 * a player could make, with the same obstacles.
 *
 * Rotations: 0 = as drawn in the toolbar, each step a quarter turn clockwise.
 * Boost arrows: 0 right, 1 down, 2 left, 3 up. Walls: 0 `\`, 1 `/`.
 */
type Placement = [
  kind: ItemKind,
  col: number,
  row: number,
  rotation?: Rotation,
];

const item = ([kind, col, row, rotation = 0]: Placement): EditorItem => ({
  kind,
  col,
  row,
  rotation,
});

/** The editor designs behind every built-in hole, by course id. */
export const BUILT_IN_DESIGNS = new Map<string, CourseDesign>();

const fromMap = (
  id: string,
  name: string,
  par: number,
  map: readonly string[],
  placements: readonly Placement[]
): CourseDefinition => {
  if (map.length !== GRID_ROWS || map.some((r) => r.length !== GRID_COLS)) {
    throw new Error(`${id}: map must be ${GRID_COLS}×${GRID_ROWS}`);
  }
  const design: CourseDesign = {
    version: 1,
    name,
    par,
    tiles: map.join(''),
    items: placements.map(item),
  };
  BUILT_IN_DESIGNS.set(id, design);
  const result = buildCourseFromDesign(design, id);
  if (!result.ok) throw new Error(`${id}: ${result.errors.join(' ')}`);
  return result.course;
};

/** 1. Warm-up: weave between two bumpers, stay out of the sand. */
export const BUMPER_LANE = fromMap(
  'bumper-lane',
  'Bumper Lane',
  2,
  [
    '..........',
    '..........',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 4, 10],
    ['cup', 4, 3],
    ['bumper', 4, 6],
    ['bumper', 5, 8],
    ['sand', 3, 4],
  ]
);

/** 2. Up the beach past a pond, then a bunker guards the bend. */
export const SANDY_SHORE = fromMap(
  'sandy-shore',
  'Sandy Shore',
  3,
  [
    '..........',
    '.tttttt...',
    '.tttttt...',
    '....wwt...',
    '....wwt...',
    '....ttt...',
    '....ttt...',
    '....ttt...',
    '....ttt...',
    '....ttt...',
    '....ttt...',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 5, 10],
    ['cup', 1, 2],
    ['sand', 6, 2],
    ['sand', 3, 1],
    ['sand', 4, 7],
    ['bumper', 6, 6],
  ]
);

/** 3. A moat with two narrow plank bridges, one down each side. */
export const PLANK_CROSSING = fromMap(
  'plank-crossing',
  'Plank Crossing',
  3,
  [
    '..........',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..wwwwww..',
    '..wwwwww..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..........',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 4, 9],
    ['cup', 4, 1],
    ['bridge', 2, 4, 1],
    ['bridge', 2, 5, 1],
    ['bridge', 7, 4, 1],
    ['bridge', 7, 5, 1],
    ['bumper', 4, 3],
    ['spinner', 5, 7],
  ]
);

/** 4. A long U: boost pads fling the ball up, across and back down. */
export const SPEEDWAY = fromMap(
  'speedway',
  'Speedway',
  3,
  [
    '..........',
    '.tttttttt.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '.t......t.',
    '..........',
    '..........',
  ],
  [
    ['tee', 1, 11],
    ['cup', 8, 11],
    ['wall', 1, 1, 1],
    ['wall', 8, 1, 0],
    ['boost', 1, 8, 3],
    ['boost', 1, 4, 3],
    ['boost', 2, 1, 0],
    ['boost', 5, 1, 0],
    ['boost', 8, 2, 1],
    ['boost', 8, 6, 1],
    ['sand', 8, 9],
  ]
);

/** 5. Two pairs of ramps; too soft and the ball rolls back to you. */
export const RAMP_RALLY = fromMap(
  'ramp-rally',
  'Ramp Rally',
  3,
  [
    '..........',
    '....ttttt.',
    '....ttttt.',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 4, 10],
    ['cup', 8, 1],
    ['ramp', 4, 7, 1],
    ['ramp', 5, 7, 1],
    ['ramp', 6, 1],
    ['ramp', 6, 2],
    ['wall', 4, 1, 1],
    ['bumper', 8, 2],
  ]
);

/** 6. A Z through stone tunnels, with a slider guarding the climb. */
export const TUNNEL_RUN = fromMap(
  'tunnel-run',
  'Tunnel Run',
  4,
  [
    '..........',
    '..........',
    '.ttttt....',
    '.ttttt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....tt....',
    '....ttttt.',
    '....ttttt.',
    '..........',
    '..........',
  ],
  [
    ['tee', 8, 11],
    ['cup', 1, 2],
    ['tunnel', 6, 10],
    ['tunnel', 6, 11],
    ['slider', 4, 7, 1],
    ['tunnel', 2, 2],
    ['tunnel', 2, 3],
    ['wall', 5, 2, 0],
  ]
);

/** 7. An open green full of spinning bars. Time your putts. */
export const SPIN_CYCLE = fromMap(
  'spin-cycle',
  'Spin Cycle',
  3,
  [
    '..........',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 4, 10],
    ['cup', 5, 1],
    ['spinner', 3, 3],
    ['spinner', 6, 4, 1],
    ['spinner', 4, 6],
    ['spinner', 6, 8, 1],
    ['sand', 2, 1],
    ['bumper', 2, 8],
  ]
);

/** 8. No way across the water, except through the teleporter. */
export const WARP_GARDEN = fromMap(
  'warp-garden',
  'Warp Garden',
  3,
  [
    '..........',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..wwwwww..',
    '..wwwwww..',
    '..tttttt..',
    '..tttttt..',
    '..tttttt..',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
  ],
  [
    ['tee', 3, 8],
    ['cup', 7, 2],
    ['portal', 7, 7],
    ['portal', 2, 2],
    ['bumper', 5, 7],
    ['spinner', 4, 2],
    ['sand', 6, 3],
  ]
);

/** 9. Bridge, bunker, then through the windmill to a tucked-away cup. */
export const WINDMILL_WAY = fromMap(
  'windmill-way',
  'Windmill Way',
  4,
  [
    '..........',
    '.ttttt....',
    '.ttttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...www....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '...ttt....',
    '..........',
    '..........',
  ],
  [
    ['tee', 4, 11],
    ['cup', 1, 2],
    ['bridge', 4, 7, 1],
    ['sand', 3, 9],
    ['windmill', 4, 4, 3],
    ['bumper', 2, 1],
  ]
);

/** 10. The lot: teleport shortcut, ramps, spinner, boost and a bunker. */
export const GRAND_TOUR = fromMap(
  'grand-tour',
  'Grand Tour',
  4,
  [
    '..........',
    '.....tttt.',
    '.....tttt.',
    '.....tt...',
    '.....tt...',
    '.....tt...',
    '.tttttt...',
    '.tttttt...',
    '.tt.......',
    '.tt.......',
    '.tt.......',
    '.tttt.....',
    '.tttt.....',
    '..........',
  ],
  [
    ['tee', 4, 12],
    ['cup', 8, 1],
    ['portal', 1, 12],
    ['portal', 6, 7],
    ['ramp', 1, 9, 1],
    ['ramp', 2, 9, 1],
    ['spinner', 3, 6],
    ['boost', 5, 4, 3],
    ['sand', 6, 2],
  ]
);
