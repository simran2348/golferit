import {
  MAX_ITEMS,
  ORIENTATIONS,
  PORTAL_COUNT,
  itemTile,
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
    id: 'bridge',
    label: 'Bridge',
    hint: 'Planks across water. Tap again to turn it.',
    drag: false,
  },
  {
    id: 'sand',
    label: 'Sand',
    hint: 'A bunker. The ball slows right down in it.',
    drag: false,
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
    id: 'tunnel',
    label: 'Tunnel',
    hint: 'A covered passage. Only the middle is open. Tap to turn.',
    drag: false,
  },
  {
    id: 'boost',
    label: 'Boost',
    hint: 'Speeds the ball up along the arrow. Tap to turn it.',
    drag: false,
  },
  {
    id: 'portal',
    label: 'Teleport',
    hint: 'Place two. In one, out the other.',
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
    case 'water': {
      // Only bridges sit on water; repainting clears items that no longer fit.
      const next = withTile(design, col, row, tool);
      return itemHere && itemTile(itemHere.kind) !== tool
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
      if (
        tool === 'portal' &&
        items.filter((i) => i.kind === 'portal').length >= PORTAL_COUNT
      ) {
        return design;
      }
      if (items.length >= MAX_ITEMS) return design;
      items = [...items, { kind: tool, col, row, rotation: 0 }];
      // Placing an item lays the tile it needs (track, or water for bridges).
      const tile = itemTile(tool);
      const base =
        tileAt(design, col, row) === tile
          ? design
          : withTile(design, col, row, tile);
      return { ...base, items };
    }
  }
};
