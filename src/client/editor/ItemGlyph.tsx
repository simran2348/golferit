import type { ItemKind, Rotation } from '../../shared/editor/design';

type ItemGlyphProps = {
  kind: ItemKind;
  rotation: Rotation;
  /** Top-left of the 10×10 cell in SVG units. */
  x: number;
  y: number;
};

/** Spinner rotation flips the spin direction (mirror), it doesn't turn. */
const glyphTransform = (kind: ItemKind, rotation: Rotation) =>
  kind === 'spinner'
    ? rotation % 2 === 1
      ? 'translate(10 0) scale(-1 1)'
      : ''
    : `rotate(${rotation * 90} 5 5)`;

/**
 * Top-down icon for an item, drawn in a 10×10 box. Rotation is clockwise
 * quarter turns; the arrow/tunnel shows which way the ball travels.
 */
export const ItemGlyph = ({ kind, rotation, x, y }: ItemGlyphProps) => (
  <g transform={`translate(${x} ${y}) ${glyphTransform(kind, rotation)}`}>
    {kind === 'ramp' ? (
      <>
        {/* Slopes either side of a flat top; ball travels left/right. */}
        <rect
          x={0.3}
          y={0.3}
          width={9.4}
          height={9.4}
          rx={0.6}
          fill="#4fae36"
        />
        <rect x={3.9} y={0.3} width={2.2} height={9.4} fill="#8fe06f" />
        <path
          d="M1 5 L3 3.4 L3 6.6 Z M9 5 L7 3.4 L7 6.6 Z"
          fill="#fff"
          opacity={0.9}
        />
      </>
    ) : kind === 'spinner' ? (
      <>
        <circle cx={5} cy={5} r={4.4} fill="#ffffff" opacity={0.45} />
        <rect
          x={0.9}
          y={4.25}
          width={8.2}
          height={1.5}
          rx={0.4}
          fill="#ff6b5a"
          transform="rotate(-30 5 5)"
        />
        {/* Clockwise arrow. */}
        <path
          d="M2.2 1.9 A4.2 4.2 0 0 1 8.4 2.6"
          stroke="#8b5a2b"
          strokeWidth={0.6}
          fill="none"
        />
        <path d="M8.9 1.6 L8.9 3.4 L7.2 3 Z" fill="#8b5a2b" />
        <circle cx={5} cy={5} r={1.2} fill="#8b5a2b" />
      </>
    ) : kind === 'wall' ? (
      <>
        {/* `\` at rotation 0; one turn makes it `/`. */}
        <line
          x1={0.6}
          y1={0.6}
          x2={9.4}
          y2={9.4}
          stroke="#a8692f"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <line
          x1={0.6}
          y1={0.6}
          x2={9.4}
          y2={9.4}
          stroke="#d39a5c"
          strokeWidth={0.6}
          strokeLinecap="round"
        />
      </>
    ) : kind === 'tee' ? (
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
    ) : kind === 'slider' ? (
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
    ) : null}
  </g>
);
