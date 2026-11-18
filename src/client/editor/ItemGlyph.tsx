import type { ItemKind, Rotation } from '../../shared/editor/design';

type ItemGlyphProps = {
  kind: ItemKind;
  rotation: Rotation;
  /** Top-left of the 10×10 cell in SVG units. */
  x: number;
  y: number;
};

/**
 * Top-down icon for an item, drawn in a 10×10 box. Rotation is clockwise
 * quarter turns; the arrow/tunnel shows which way the ball travels.
 */
export const ItemGlyph = ({ kind, rotation, x, y }: ItemGlyphProps) => (
  <g transform={`translate(${x} ${y}) rotate(${rotation * 90} 5 5)`}>
    {kind === 'tee' ? (
      <>
        <rect x={1.5} y={1.5} width={7} height={7} rx={1.5} fill="#2f7a2a" />
        <circle cx={5} cy={5} r={1.9} fill="#fff" />
      </>
    ) : kind === 'cup' ? (
      <>
        <circle
          cx={5}
          cy={6}
          r={2.3}
          fill="#1d2b1a"
          stroke="#fff"
          strokeWidth={0.5}
        />
        <line x1={5} y1={6} x2={5} y2={1} stroke="#fff" strokeWidth={0.6} />
        <path d="M5 1 L8.6 2.2 L5 3.4 Z" fill="#ff4d4d" />
      </>
    ) : kind === 'bumper' ? (
      <>
        <circle cx={5} cy={5} r={3} fill="#ff6b5a" />
        <circle cx={5} cy={5} r={1.5} fill="#fff" />
      </>
    ) : kind === 'windmill' ? (
      <>
        <rect
          x={1.5}
          y={0.8}
          width={7}
          height={8.4}
          rx={0.8}
          fill="#f4ead5"
          stroke="#8b5a2b"
          strokeWidth={0.4}
        />
        {/* Tunnel the ball rolls through, left to right at rotation 0. */}
        <rect x={1.5} y={4} width={7} height={2} fill="#4fa83a" />
        <path d="M6.2 3.4 L8.2 5 L6.2 6.6 Z" fill="#2f7a2a" />
        {/* Blades on the entry side. */}
        <g stroke="#8b5a2b" strokeWidth={0.7} strokeLinecap="round">
          <line x1={0.6} y1={1.8} x2={2.4} y2={8.2} />
          <line x1={0.6} y1={8.2} x2={2.4} y2={1.8} />
        </g>
      </>
    ) : (
      <>
        {/* Slider: block on a rail, travelling left/right at rotation 0. */}
        <line
          x1={0.4}
          y1={5}
          x2={9.6}
          y2={5}
          stroke="#8b5a2b"
          strokeWidth={0.8}
        />
        <rect x={3} y={3.2} width={4} height={3.6} rx={0.4} fill="#ff6b5a" />
        <rect x={4.4} y={3.2} width={1.2} height={3.6} fill="#fff" />
        <path
          d="M0.3 5 L1.6 4 L1.6 6 Z M9.7 5 L8.4 4 L8.4 6 Z"
          fill="#8b5a2b"
        />
      </>
    )}
  </g>
);
