import { useEffect, useRef, useState } from 'react';
import WebGL from 'three/addons/capabilities/WebGL.js';
import type { CourseDefinition } from '../../shared/types/course';
import { PreviewEngine } from '../game/engine/PreviewEngine';

const ZOOM_STEP = 1.4;

type CoursePreviewProps = {
  course: CourseDefinition;
  onBack: () => void;
};

const roundButton =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-black text-slate-700 shadow-lg hover:bg-white';

/**
 * Full-screen 3D look at the course being built: nothing else on screen.
 * Drag to spin it all the way round, pinch or scroll to zoom.
 */
export const CoursePreview = ({ course, onBack }: CoursePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const [webglAvailable] = useState(() => WebGL.isWebGL2Available());

  // Declared before the course effect so the engine exists when it runs.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webglAvailable) return;
    const engine = new PreviewEngine(container);
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [webglAvailable]);

  useEffect(() => {
    engineRef.current?.setCourse(course);
  }, [course]);

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[#2fa6d9] select-none">
      {webglAvailable ? (
        <div ref={containerRef} className="h-full w-full" />
      ) : (
        <p className="flex h-full items-center justify-center p-6 text-center text-sm font-medium text-white">
          The 3D view needs WebGL 2, which this device doesn&apos;t support.
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-slate-700"
        >
          ← Editor
        </button>
        <p className="max-w-[60%] truncate rounded-full bg-white/90 px-3 py-1.5 text-sm font-extrabold text-slate-800 shadow">
          {course.name} · Par {course.par}
        </p>
      </div>

      {webglAvailable ? (
        <>
          <p className="pointer-events-none absolute bottom-4 left-3 rounded-full bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-white">
            Drag to spin · pinch or scroll to zoom
          </p>
          <div className="absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => engineRef.current?.zoomBy(ZOOM_STEP)}
              className={roundButton}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => engineRef.current?.zoomBy(1 / ZOOM_STEP)}
              className={roundButton}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reset view"
              onClick={() => engineRef.current?.resetView()}
              className={`${roundButton} text-base`}
            >
              ⤢
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
