import {
  MAX_ITEMS,
  ORIENTATIONS,
  UNIQUE_ITEMS,
  inGrid,
  tileAt,
  withTile,
  type CourseDesign,
  type ItemKind,
  type Rotation,
} from '../../shared/editor/design';

export type Tool = 'track' | 'water' | 'erase' | ItemKind;

export type ToolInfo = {
  id: Tool;
  label: string;
  hint: string;
  /** Paint tools apply continuously while dragging; item tools on tap only. */
  drag: boolean;
};

/** Left rail: shaping the course. */
export const EDIT_TOOLS: readonly ToolInfo[] = [
  {
    id: 'track',
    label: 'Track',
    hint: 'Drag to paint the fairway.',
    drag: true,
  },
  {
    id: 'water',
    label: 'Water',
    hint: 'Drag to add water inside the course.',
    drag: true,
  },
  {
    id: 'erase',
    label: 'Erase',
    hint: 'Removes an item, then the tile.',
    drag: true,
  },
  {
    id: 'tee',
    label: 'Tee',
    hint: 'Where the ball starts. Tap to move it.',
    drag: false,
  },
  { id: 'cup', label: 'Cup', hint: 'The hole. Tap to move it.', drag: false },
];

/** Right rail: obstacles. Tap a placed one again to turn it. */
export const OBSTACLE_TOOLS: readonly ToolInfo[] = [
  { id: 'bumper', label: 'Bumper', hint: 'A bouncy post.', drag: false },
  {
    id: 'wall',
    label: 'Angle',
    hint: 'Diagonal wall to bank shots. Tap again to flip it.',
    drag: false,
  },
  {
    id: 'ramp',
    label: 'Ramp',
    hint: 'A hump to putt over. Too soft and it rolls back. Tap to turn.',
    drag: false,
  },
  {
    id: 'spinner',
    label: 'Spinner',
    hint: 'A bar spinning on the ground. Tap again to reverse it.',
    drag: false,
  },
  {
    id: 'windmill',
    label: 'Windmill',
    hint: 'Tap it again to rotate. Blades guard the tunnel.',
    drag: false,
  },
  {
    id: 'slider',
    label: 'Slider',
    hint: 'Slides along its row. Tap again to turn it.',
    drag: false,
  },
];

export const TOOLS: readonly ToolInfo[] = [...EDIT_TOOLS, ...OBSTACLE_TOOLS];

const nextRotation = (kind: ItemKind, rotation: Rotation): Rotation => {
  const next = (rotation + 1) % ORIENTATIONS[kind];
  return next === 1 ? 1 : next === 2 ? 2 : next === 3 ? 3 : 0;
};

/** Apply a tool to one tile. Returns the same object when nothing changes. */
export const applyTool = (
  design: CourseDesign,
  tool: Tool,
  col: number,
  row: number,
  strokeStart: boolean
): CourseDesign => {
  if (!inGrid(col, row)) return design;
  const itemHere = design.items.find((i) => i.col === col && i.row === row);

  switch (tool) {
    case 'track':
      return withTile(design, col, row, 'track');
    case 'water': {
      // Items can't sit on water, so painting water clears them.
      const next = withTile(design, col, row, 'water');
      return itemHere
        ? { ...next, items: design.items.filter((i) => i !== itemHere) }
        : next;
    }
    case 'erase':
      return itemHere
        ? { ...design, items: design.items.filter((i) => i !== itemHere) }
        : withTile(design, col, row, 'empty');
    default: {
      if (!strokeStart) return design;
      if (itemHere?.kind === tool) {
        if (ORIENTATIONS[tool] < 2) return design;
        return {
          ...design,
          items: design.items.map((i) =>
            i === itemHere
              ? { ...i, rotation: nextRotation(i.kind, i.rotation) }
              : i
          ),
        };
      }
      let items = design.items.filter((i) => i !== itemHere);
      if (UNIQUE_ITEMS.has(tool)) items = items.filter((i) => i.kind !== tool);
      if (items.length >= MAX_ITEMS) return design;
      items = [...items, { kind: tool, col, row, rotation: 0 }];
      // Placing an item lays track under it.
      const base =
        tileAt(design, col, row) === 'track'
          ? design
          : withTile(design, col, row, 'track');
      return { ...base, items };
    }
  }
};
