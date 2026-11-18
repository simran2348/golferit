import {
  MAX_ITEMS,
  ROTATABLE,
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

export const TOOLS: readonly ToolInfo[] = [
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
  { id: 'bumper', label: 'Bumper', hint: 'A bouncy post.', drag: false },
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

const nextRotation = (kind: ItemKind, rotation: Rotation): Rotation => {
  // Sliders only have two meaningful orientations.
  const turns = kind === 'slider' ? 2 : 4;
  const next = (rotation + 1) % turns;
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
        if (!ROTATABLE.has(tool)) return design;
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
