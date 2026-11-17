import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { STARTER_COURSE } from '../shared/constants/courses';

/**
 * Inline feed view. Deliberately light: no Three.js here. The 3D scene loads
 * only in the expanded `game` entrypoint.
 */
export const Splash = () => (
  <main className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 px-6 text-center select-none">
    <div
      aria-hidden="true"
      className="absolute -bottom-24 left-1/2 h-48 w-[140%] -translate-x-1/2 rounded-[50%] bg-emerald-400"
    />
    <div className="relative flex flex-col items-center gap-1">
      <p className="text-xs font-bold tracking-[0.3em] text-white/90 uppercase">
        3D Mini Golf
      </p>
      <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(12,74,110,0.35)]">
        Golferit
      </h1>
    </div>
    <div className="relative rounded-2xl bg-white/90 px-4 py-2 shadow-lg shadow-sky-900/20">
      <p className="text-sm font-semibold text-slate-700">
        {STARTER_COURSE.name} · Par {STARTER_COURSE.par}
      </p>
    </div>
    <button
      type="button"
      className="relative cursor-pointer rounded-full bg-orange-500 px-8 py-3 text-lg font-extrabold text-white shadow-[0_5px_0_#c2410c] transition active:translate-y-1 active:shadow-[0_1px_0_#c2410c] hover:bg-orange-400"
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      Play
    </button>
    {context.username ? (
      <p className="relative text-sm font-medium text-emerald-950/80">
        Ready when you are, u/{context.username}
      </p>
    ) : null}
  </main>
);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
