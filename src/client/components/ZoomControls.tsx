import { useSyncExternalStore } from 'react';
import type { ZoomController } from '../game/engine/ZoomController';

type ZoomControlsProps = {
  zoom: ZoomController;
};

const button =
  'pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center text-xl font-black text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent';

/**
 * Zoom buttons (no pinch gesture, so zooming can't be mistaken for a putt).
 * Zoomed in, the camera follows the ball.
 */
export const ZoomControls = ({ zoom }: ZoomControlsProps) => {
  const { canZoomIn, canZoomOut } = useSyncExternalStore(
    zoom.subscribe,
    zoom.getSnapshot
  );
  return (
    <div className="pointer-events-none absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 sm:right-4 sm:bottom-4">
      <div className="flex flex-col divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white/90 shadow-lg shadow-sky-900/20 backdrop-blur">
        <button
          type="button"
          className={button}
          onClick={zoom.zoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className={button}
          onClick={zoom.zoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
      <button
        type="button"
        className={`${button} rounded-2xl bg-white/90 text-base shadow-lg shadow-sky-900/20 backdrop-blur`}
        onClick={zoom.reset}
        disabled={!canZoomOut}
        aria-label="Show whole course"
        title="Show whole course"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </div>
  );
};
