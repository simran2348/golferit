import { useEffect, useRef } from 'react';
import { formatDuration } from '../../shared/scoring';

type RoundTimerProps = {
  /** `performance.now()` at the first putt; null before it. */
  startedAt: number | null;
  /** Final time once the hole is complete. */
  finalMs: number | null;
  className?: string;
};

const TICK_MS = 100;

/**
 * Live stopwatch. While running it writes to the DOM node directly every
 * 100 ms instead of setting React state, so the clock never re-renders the HUD.
 */
export const RoundTimer = ({
  startedAt,
  finalMs,
  className,
}: RoundTimerProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (finalMs !== null) {
      node.textContent = formatDuration(finalMs);
      return;
    }
    if (startedAt === null) {
      node.textContent = formatDuration(0);
      return;
    }
    const tick = () => {
      node.textContent = formatDuration(performance.now() - startedAt);
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [startedAt, finalMs]);

  return (
    <span ref={ref} className={className}>
      {formatDuration(finalMs ?? 0)}
    </span>
  );
};
