import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import {
  GRID_COLS,
  GRID_ROWS,
  tileAt,
  type CourseDesign,
} from '../../shared/editor/design';
import { ItemGlyph } from './ItemGlyph';

/** Cells may stretch to fill the space, but never past this aspect ratio. */
const MAX_CELL_STRETCH = 2;
const MAX_ZOOM = 4;
const BUTTON_ZOOM_STEP = 1.4;
const TILE_COLORS = {
  empty: '#d9efe0',
  track: '#74d35a',
  water: '#3cb7f0',
} as const;

type DesignGridProps = {
  design: CourseDesign;
  /** Called once per stroke before the first paint (for undo). */
  onStrokeStart: () => void;
  /** The stroke turned into a pinch: undo whatever it painted. */
  onStrokeCancel: () => void;
  onPaint: (col: number, row: number, strokeStart: boolean) => void;
};

/** Scale and top-left offset (viewport px) of the grid. */
type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };
type Size = { width: number; height: number };

type Gesture =
  | { kind: 'idle' }
  | { kind: 'paint'; pointerId: number; key: string }
  | { kind: 'pan'; start: Point; view: View }
  | { kind: 'pinch'; distance: number; mid: Point; view: View }
  /** Fingers left over after a pinch: ignore until all lift. */
  | { kind: 'blocked' };

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Grid size at zoom 1: fills the viewport, letting cells stretch (within
 * MAX_CELL_STRETCH) so there's no empty band above/below or beside it.
 */
const baseSize = (viewport: Size): Size => {
  let cellWidth = viewport.width / GRID_COLS;
  let cellHeight = viewport.height / GRID_ROWS;
  cellHeight = Math.min(cellHeight, cellWidth * MAX_CELL_STRETCH);
  cellWidth = Math.min(cellWidth, cellHeight * MAX_CELL_STRETCH);
  return { width: cellWidth * GRID_COLS, height: cellHeight * GRID_ROWS };
};

/** Keep the grid covering the viewport when zoomed in, centred otherwise. */
const clampView = (view: View, viewport: Size): View => {
  const base = baseSize(viewport);
  const scale = clampNumber(view.scale, 1, MAX_ZOOM);
  const axis = (offset: number, content: number, room: number) =>
    content <= room
      ? (room - content) / 2
      : clampNumber(offset, room - content, 0);
  return {
    scale,
    x: axis(view.x, base.width * scale, viewport.width),
    y: axis(view.y, base.height * scale, viewport.height),
  };
};

/** Zoom by `factor` keeping the grid point under `focus` still. */
const zoomAround = (
  view: View,
  factor: number,
  focus: Point,
  viewport: Size
): View => {
  const scale = clampNumber(view.scale * factor, 1, MAX_ZOOM);
  const ratio = scale / view.scale;
  return clampView(
    {
      scale,
      x: focus.x - (focus.x - view.x) * ratio,
      y: focus.y - (focus.y - view.y) * ratio,
    },
    viewport
  );
};

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * Top-down grid. Press and drag to paint; one stroke = one undo step.
 * Pinch (touch), scroll or the ± buttons zoom; when zoomed, drag with two
 * fingers, the right/middle mouse button or Space held to move around.
 * Pointer Events cover mouse, touch and pen; touch-action:none stops the
 * page from scrolling or zooming.
 */
export const DesignGrid = ({
  design,
  onStrokeStart,
  onStrokeCancel,
  onPaint,
}: DesignGridProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [view, setViewState] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const viewportSizeRef = useRef(viewport);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>({ kind: 'idle' });
  const spaceHeld = useRef(false);
  const [panReady, setPanReady] = useState(false);

  const setView = useCallback((next: View) => {
    const clamped = clampView(next, viewportSizeRef.current);
    viewRef.current = clamped;
    setViewState(clamped);
  }, []);

  // Track the viewport size; re-clamp so a resize never strands the grid.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const size = {
        width: element.clientWidth,
        height: element.clientHeight,
      };
      viewportSizeRef.current = size;
      setViewport(size);
      setView(viewRef.current);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [setView]);

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const lines = event.deltaMode === 1 ? 16 : 1;
      // ctrlKey = trackpad pinch, which sends small deltas.
      const speed = event.ctrlKey ? 0.01 : 0.0015;
      setView(
        zoomAround(
          viewRef.current,
          Math.exp(-event.deltaY * lines * speed),
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          viewportSizeRef.current
        )
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [setView]);

  // Hold Space to pan with the mouse (not while typing the course name).
  useEffect(() => {
    const typing = (event: KeyboardEvent) =>
      event.target instanceof HTMLInputElement;
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || typing(event)) return;
      event.preventDefault();
      spaceHeld.current = true;
      setPanReady(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      spaceHeld.current = false;
      setPanReady(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const localPoint = (event: PointerEvent): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const cellAt = (event: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    // The rect includes the zoom transform, so this works at any zoom.
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

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    gesture.current = {
      kind: 'pinch',
      distance: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
      mid: midpoint(a, b),
      view: viewRef.current,
    };
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.current.size === 2) {
      // Second finger: this was a pinch, not a paint stroke.
      if (gesture.current.kind === 'paint') onStrokeCancel();
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;

    const wantsPan =
      event.pointerType === 'mouse' &&
      (event.button === 1 || event.button === 2 || spaceHeld.current);
    const cell = wantsPan ? null : cellAt(event);
    if (cell && event.button === 0) {
      gesture.current = {
        kind: 'paint',
        pointerId: event.pointerId,
        key: cell.key,
      };
      onStrokeStart();
      onPaint(cell.col, cell.row, true);
    } else {
      // Off the grid (or a pan button): drag the view around.
      gesture.current = { kind: 'pan', start: point, view: viewRef.current };
    }
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    const active = gesture.current;

    switch (active.kind) {
      case 'paint': {
        if (active.pointerId !== event.pointerId) return;
        const cell = cellAt(event);
        if (!cell || cell.key === active.key) return;
        active.key = cell.key;
        onPaint(cell.col, cell.row, false);
        return;
      }
      case 'pan':
        setView({
          ...active.view,
          x: active.view.x + point.x - active.start.x,
          y: active.view.y + point.y - active.start.y,
        });
        return;
      case 'pinch': {
        const [a, b] = [...pointers.current.values()];
        if (!a || !b) return;
        const mid = midpoint(a, b);
        const scale = clampNumber(
          (active.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
            active.distance,
          1,
          MAX_ZOOM
        );
        const ratio = scale / active.view.scale;
        // The grid point under the starting midpoint follows the fingers.
        setView({
          scale,
          x: mid.x - (active.mid.x - active.view.x) * ratio,
          y: mid.y - (active.mid.y - active.view.y) * ratio,
        });
        return;
      }
      case 'idle':
      case 'blocked':
        return;
    }
  };

  const handleEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size === 0) {
      gesture.current = { kind: 'idle' };
    } else if (gesture.current.kind === 'pinch') {
      gesture.current = { kind: 'blocked' };
    }
  };

  const zoomButton = (factor: number) =>
    setView(
      zoomAround(
        viewRef.current,
        factor,
        { x: viewport.width / 2, y: viewport.height / 2 },
        viewport
      )
    );

  const base = baseSize(viewport);
  const cw = base.width / GRID_COLS;
  const ch = base.height / GRID_ROWS;
  /** Glyphs stay square: sized to the shorter side of a cell. */
  const unit = Math.min(cw, ch) / 10;

  const tiles = [];
  const walls: string[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const kind = tileAt(design, col, row);
      const x = col * cw;
      const y = row * ch;
      tiles.push(
        <rect
          key={`${col},${row}`}
          x={x}
          y={y}
          width={cw}
          height={ch}
          fill={TILE_COLORS[kind]}
          stroke={kind === 'empty' ? '#bfdcc8' : 'none'}
          strokeWidth={0.3 * unit}
        />
      );
      if (kind === 'empty') continue;
      // Wall preview wherever playable tiles meet empty space.
      const open = (c: number, r: number) => tileAt(design, c, r) === 'empty';
      if (open(col, row - 1)) walls.push(`M${x} ${y}h${cw}`);
      if (open(col + 1, row)) walls.push(`M${x + cw} ${y}v${ch}`);
      if (open(col, row + 1)) walls.push(`M${x} ${y + ch}h${cw}`);
      if (open(col - 1, row)) walls.push(`M${x} ${y}v${ch}`);
    }
  }

  const zoomed = view.scale > 1.001;
  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg font-black text-slate-700 shadow disabled:text-slate-300';

  return (
    <div
      ref={viewportRef}
      className={`relative h-full w-full touch-none overflow-hidden select-none ${
        panReady ? 'cursor-grab' : 'cursor-crosshair'
      }`}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      {viewport.width > 0 ? (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: base.width,
            height: base.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${base.width} ${base.height}`}
            className="block h-full w-full shadow-lg shadow-sky-900/20"
            role="img"
            aria-label="Course grid"
          >
            {tiles}
            <path
              d={walls.join('')}
              stroke="#a8692f"
              strokeWidth={1.4 * unit}
              strokeLinecap="square"
              fill="none"
            />
            {design.items.map((item) =>
              item.kind === 'wall' ? (
                // Corner to corner of the real (possibly stretched) cell.
                <line
                  key={`${item.kind}-${item.col}-${item.row}`}
                  x1={item.col * cw}
                  y1={(item.row + (item.rotation % 2 === 1 ? 1 : 0)) * ch}
                  x2={(item.col + 1) * cw}
                  y2={(item.row + (item.rotation % 2 === 1 ? 0 : 1)) * ch}
                  stroke="#a8692f"
                  strokeWidth={1.8 * unit}
                  strokeLinecap="round"
                />
              ) : (
                <g
                  key={`${item.kind}-${item.col}-${item.row}`}
                  transform={`translate(${(item.col + 0.5) * cw} ${(item.row + 0.5) * ch}) scale(${unit}) translate(-5 -5)`}
                >
                  <ItemGlyph
                    kind={item.kind}
                    rotation={item.rotation}
                    x={0}
                    y={0}
                  />
                </g>
              )
            )}
          </svg>
        </div>
      ) : null}

      {/* Zoom buttons; stopPropagation so tapping them never paints. */}
      <div
        className="absolute right-2 bottom-2 flex flex-col gap-1.5"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom in"
          disabled={view.scale >= MAX_ZOOM}
          onClick={() => zoomButton(BUTTON_ZOOM_STEP)}
          className={buttonClass}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!zoomed}
          onClick={() => zoomButton(1 / BUTTON_ZOOM_STEP)}
          className={buttonClass}
        >
          −
        </button>
        {zoomed ? (
          <button
            type="button"
            aria-label="Fit grid"
            onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            className={`${buttonClass} text-sm`}
          >
            ⤢
          </button>
        ) : null}
      </div>
    </div>
  );
};
