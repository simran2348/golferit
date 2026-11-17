import { useEffect, useRef, useState } from 'react';
import WebGL from 'three/addons/capabilities/WebGL.js';
import type { CourseDefinition } from '../../shared/types/course';
import { GameEngine } from '../game/engine/GameEngine';
import type { GameSession } from '../game/logic/GameSession';
import type { ZoomController } from '../game/engine/ZoomController';

type GameCanvasProps = {
  course: CourseDefinition;
  session: GameSession;
  zoom: ZoomController;
};

/**
 * Mounts the imperative GameEngine into a div. React renders this component
 * once; the engine's frame loop never touches React state.
 */
export const GameCanvas = ({ course, session, zoom }: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglAvailable] = useState(() => WebGL.isWebGL2Available());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webglAvailable) return;

    const engine = new GameEngine(container, course, session, zoom);
    engine.start();
    // Runs on unmount and before StrictMode's dev re-mount.
    return () => engine.dispose();
  }, [course, session, zoom, webglAvailable]);

  if (!webglAvailable) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-white">
        <p className="max-w-xs text-sm font-medium">
          Your browser or device doesn&apos;t support WebGL 2, which Golferit
          needs to draw the 3D course.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
};
