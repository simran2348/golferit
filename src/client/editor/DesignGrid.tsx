import { useRef, type PointerEvent } from 'react';
import {
  GRID_COLS,
  GRID_ROWS,
  tileAt,
  type CourseDesign,
} from '../../shared/editor/design';
import { ItemGlyph } from './ItemGlyph';

const CELL = 10;
const TILE_COLORS = {
  empty: '#d9efe0',
  track: '#74d35a',
  water: '#3cb7f0',
} as const;

type DesignGridProps = {
  design: CourseDesign;
  /** Called once per stroke before the first paint (for undo). */
  onStrokeStart: () => void;
  onPaint: (col: number, row: number, strokeStart: boolean) => void;
};

/**
 * Top-down grid. Press and drag to paint; one stroke = one undo step.
 * Pointer Events cover mouse, touch and pen; touch-action:none stops the
 * page from scrolling while painting.
 */
export const DesignGrid = ({
  design,
  onStrokeStart,
  onPaint,
}: DesignGridProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const stroke = useRef<{ pointerId: number; key: string } | null>(null);

  const cellAt = (event: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const col = Math.floor(
      ((event.clientX - rect.left) / rect.width) * GRID_COLS
    );
    const row = Math.floor(
      ((event.clientY - rect.top) / rect.height) * GRID_ROWS
    );
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row, key: `${col},${row}` };
  };

  const handleDown = (event: PointerEvent<SVGSVGElement>) => {
    if (stroke.current) return;
    const cell = cellAt(event);
    if (!cell) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stroke.current = { pointerId: event.pointerId, key: cell.key };
    onStrokeStart();
    onPaint(cell.col, cell.row, true);
  };

  const handleMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = stroke.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const cell = cellAt(event);
    if (!cell || cell.key === active.key) return;
    active.key = cell.key;
    onPaint(cell.col, cell.row, false);
  };

  const handleEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (stroke.current?.pointerId === event.pointerId) stroke.current = null;
  };

  const tiles = [];
  const walls: string[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const kind = tileAt(design, col, row);
      const x = col * CELL;
      const y = row * CELL;
      tiles.push(
        <rect
          key={`${col},${row}`}
          x={x}
          y={y}
          width={CELL}
          height={CELL}
          fill={TILE_COLORS[kind]}
          stroke={kind === 'empty' ? '#bfdcc8' : 'none'}
          strokeWidth={0.3}
        />
      );
      if (kind === 'empty') continue;
      // Wall preview wherever playable tiles meet empty space.
      const open = (c: number, r: number) => tileAt(design, c, r) === 'empty';
      if (open(col, row - 1)) walls.push(`M${x} ${y}h${CELL}`);
      if (open(col + 1, row)) walls.push(`M${x + CELL} ${y}v${CELL}`);
      if (open(col, row + 1)) walls.push(`M${x} ${y + CELL}h${CELL}`);
      if (open(col - 1, row)) walls.push(`M${x} ${y}v${CELL}`);
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${GRID_COLS * CELL} ${GRID_ROWS * CELL}`}
      className="block h-full w-full cursor-crosshair touch-none rounded-xl shadow-lg shadow-sky-900/20 select-none"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      role="img"
      aria-label="Course grid"
    >
      {tiles}
      <path
        d={walls.join('')}
        stroke="#a8692f"
        strokeWidth={1.4}
        strokeLinecap="square"
        fill="none"
      />
      {design.items.map((item) => (
        <ItemGlyph
          key={`${item.kind}-${item.col}-${item.row}`}
          kind={item.kind}
          rotation={item.rotation}
          x={item.col * CELL}
          y={item.row * CELL}
        />
      ))}
    </svg>
  );
};
