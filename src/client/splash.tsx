import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { formatDuration } from '../shared/scoring';
import { courseForPost, parsePostData, postLabel } from '../shared/daily';
import { usePlayer, type PlayerState } from './hooks/usePlayer';
import { JoinButton } from './components/JoinButton';

/** One line under the Play button: personal best / streak / nudge. */
const PlayerLine = ({ player }: { player: PlayerState }) => {
  if (player.status !== 'ready' || !player.username) return null;
  const { best, streak } = player;
  const parts: string[] = [];
  if (best) {
    parts.push(
      `Your best: ${best.strokes} · ${formatDuration(best.timeMs)} (#${best.rank})`
    );
  }
  if (streak && streak.current > 0) {
    parts.push(`🔥 ${streak.current}-day streak`);
  }
  return (
    <p className="relative text-sm font-semibold text-emerald-950/80">
      {parts.length > 0
        ? parts.join('  ·  ')
        : `Ready when you are, u/${player.username}`}
    </p>
  );
};

/**
 * Inline feed view. Deliberately light: no Three.js here. Post data is read
 * synchronously; best/streak arrive from one small request.
 */
export const Splash = () => {
  const [post] = useState(() => parsePostData(context.postData));
  const course = courseForPost(post);
  const player = usePlayer();

  return (
    <main className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 px-6 text-center select-none">
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/2 h-48 w-[140%] -translate-x-1/2 rounded-[50%] bg-emerald-400"
      />
      <div className="relative flex flex-col items-center gap-1">
        <p className="text-xs font-bold tracking-[0.3em] text-white/90 uppercase">
          {post.kind === 'daily'
            ? 'Daily Challenge'
            : post.kind === 'community'
              ? 'Community Course'
              : '3D Mini Golf'}
        </p>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(12,74,110,0.35)]">
          Golferit
        </h1>
      </div>
      <div className="relative rounded-2xl bg-white/90 px-4 py-2 shadow-lg shadow-sky-900/20">
        <p className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase">
          {postLabel(post)}
        </p>
        <p className="text-base font-extrabold text-slate-800">
          {course.name} · Par {course.par}
        </p>
      </div>
      <button
        type="button"
        className="relative cursor-pointer rounded-full bg-orange-500 px-8 py-3 text-lg font-extrabold text-white shadow-[0_5px_0_#c2410c] transition hover:bg-orange-400 active:translate-y-1 active:shadow-[0_1px_0_#c2410c]"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play
      </button>
      <PlayerLine player={player} />
      <button
        type="button"
        className="relative cursor-pointer rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-sky-900 shadow transition hover:bg-white"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'editor')}
      >
        🛠 Build your own course
      </button>
      {/* Logged-in viewers only: logged-out users can't subscribe. */}
      {player.status === 'ready' && player.username && player.subredditName ? (
        <JoinButton
          subredditName={player.subredditName}
          alreadyJoined={player.joined}
          pendingJoin={player.pendingJoin}
        />
      ) : null}
    </main>
  );
};

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
