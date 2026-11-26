import {
  ORIENTATIONS,
  type ItemKind,
  type Rotation,
} from '../../shared/editor/design';

type ItemGlyphProps = {
  kind: ItemKind;
  rotation: Rotation;
  /** Top-left of the 10×10 cell in SVG units. */
  x: number;
  y: number;
};

/** Spinner rotation flips the spin direction (mirror), it doesn't turn. */
const glyphTransform = (kind: ItemKind, rotation: Rotation) =>
  ORIENTATIONS[kind] < 2
    ? ''
    : kind === 'spinner'
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
    ) : kind === 'bridge' ? (
      <>
        {/* Planks across, rails along: ball travels left/right. */}
        <rect x={0.2} y={2.4} width={9.6} height={5.2} fill="#b07a45" />
        <g stroke="#8b5a2b" strokeWidth={0.35}>
          {[1.6, 3.2, 4.8, 6.4, 8.0].map((x) => (
            <line key={x} x1={x} y1={2.4} x2={x} y2={7.6} />
          ))}
        </g>
        <rect x={0.2} y={2} width={9.6} height={0.7} fill="#8b5a2b" />
        <rect x={0.2} y={7.3} width={9.6} height={0.7} fill="#8b5a2b" />
      </>
    ) : kind === 'tunnel' ? (
      <>
        {/* Stone sides, red roof; the open lane runs left/right. */}
        <rect x={0.4} y={0.5} width={9.2} height={9} rx={0.8} fill="#c9c2b4" />
        <rect
          x={0.4}
          y={2.6}
          width={9.2}
          height={4.8}
          rx={2.2}
          fill="#e2553f"
        />
        <rect
          x={0.4}
          y={3.6}
          width={9.2}
          height={2.8}
          fill="#3b2a20"
          opacity={0.75}
        />
        <path d="M6.2 3.9 L8 5 L6.2 6.1 Z" fill="#fff" opacity={0.9} />
      </>
    ) : kind === 'sand' ? (
      <>
        <rect
          x={0.7}
          y={0.7}
          width={8.6}
          height={8.6}
          rx={2.4}
          fill="#e9d29a"
        />
        <g fill="#c9a964">
          <circle cx={3} cy={3.2} r={0.45} />
          <circle cx={6.6} cy={2.8} r={0.35} />
          <circle cx={5} cy={5.4} r={0.45} />
          <circle cx={2.8} cy={7} r={0.35} />
          <circle cx={7.2} cy={6.8} r={0.45} />
        </g>
      </>
    ) : kind === 'boost' ? (
      <>
        {/* Arrow pad pointing right at rotation 0. */}
        <rect
          x={0.9}
          y={0.9}
          width={8.2}
          height={8.2}
          rx={1.2}
          fill="#2a3550"
        />
        <g fill="none" stroke="#ffcc33" strokeWidth={1} strokeLinejoin="round">
          <path d="M2.2 2.8 L4.4 5 L2.2 7.2" />
          <path d="M4.6 2.8 L6.8 5 L4.6 7.2" opacity={0.8} />
          <path d="M7 3.4 L8.6 5 L7 6.6" opacity={0.6} />
        </g>
      </>
    ) : kind === 'portal' ? (
      <>
        <circle cx={5} cy={5} r={3.8} fill="#2b1450" />
        <circle
          cx={5}
          cy={5}
          r={3.8}
          fill="none"
          stroke="#b07cff"
          strokeWidth={1}
        />
        <path
          d="M5 2.4 A2.6 2.6 0 0 1 7.6 5 M5 7.6 A2.6 2.6 0 0 1 2.4 5"
          stroke="#e7d6ff"
          strokeWidth={0.6}
          fill="none"
        />
        <circle cx={5} cy={5} r={0.8} fill="#e7d6ff" />
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
