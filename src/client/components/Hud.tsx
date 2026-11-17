import type { CourseDefinition } from '../../shared/types/course';
import { formatDuration } from '../../shared/scoring';
import type { GameSnapshot } from '../game/logic/GameSession';
import type { PlayerState } from '../hooks/usePlayer';
import type { ScoreboardState } from '../services/ScoreboardStore';
import { RoundTimer } from './RoundTimer';

type HudProps = {
  course: CourseDefinition;
  player: PlayerState;
  snapshot: GameSnapshot;
  scoreboard: ScoreboardState;
  onOpenLeaderboard: () => void;
};

const playerLabel = (player: PlayerState): string => {
  switch (player.status) {
    case 'loading':
      return '…';
    case 'ready':
      return player.username ? `u/${player.username}` : 'Guest';
    case 'error':
      return 'Offline';
  }
};

const statusMessage = (snapshot: GameSnapshot): string | null => {
  switch (snapshot.phase) {
    case 'loading':
      return 'Warming up the physics…';
    case 'error':
      return snapshot.errorMessage;
    case 'aiming':
      return snapshot.strokes === 0
        ? 'Press anywhere, pull back, release to putt'
        : null;
    case 'rolling':
    case 'complete':
      return null;
  }
};

const chip =
  'rounded-2xl bg-white/90 shadow-lg shadow-sky-900/20 backdrop-blur';

/** Read-only overlay. pointer-events-none so it never blocks the canvas. */
export const Hud = ({
  course,
  player,
  snapshot,
  scoreboard,
  onOpenLeaderboard,
}: HudProps) => {
  const status = statusMessage(snapshot);
  const best = scoreboard.leaderboard?.me ?? null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      {/* Two rows so it fits a 360px phone without wrapping:
          [hole]          [player][trophy]
          [strokes|time]  [personal best] */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className={`${chip} min-w-0 px-3 py-1.5 sm:px-4 sm:py-2`}>
            <p className="text-[10px] font-bold tracking-widest whitespace-nowrap text-emerald-600 uppercase sm:text-xs">
              Hole 1 · Par {course.par}
            </p>
            <h1 className="truncate text-base leading-tight font-extrabold text-slate-800 sm:text-xl">
              {course.name}
            </h1>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="max-w-[9rem] min-w-0 truncate rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg shadow-sky-900/20 backdrop-blur sm:max-w-[14rem] sm:text-sm">
              {playerLabel(player)}
            </span>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              aria-label="Open leaderboard"
              className="pointer-events-auto flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-amber-400 text-base shadow-lg shadow-sky-900/20 transition hover:bg-amber-300 active:scale-95"
            >
              <span aria-hidden="true">🏆</span>
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div
            className={`${chip} flex items-stretch gap-3 px-3 py-1.5 sm:px-4`}
          >
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Strokes
              </p>
              <p className="text-lg leading-tight font-black text-slate-800 tabular-nums sm:text-xl">
                {snapshot.strokes}
              </p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Time
              </p>
              <RoundTimer
                startedAt={snapshot.startedAt}
                finalMs={snapshot.result?.elapsedMs ?? null}
                className="text-lg leading-tight font-black text-slate-800 tabular-nums sm:text-xl"
              />
            </div>
          </div>
          {best ? (
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-slate-600 shadow backdrop-blur sm:text-xs">
              Best {best.strokes} · {formatDuration(best.timeMs)} · #{best.rank}
            </span>
          ) : null}
        </div>
      </div>

      {snapshot.notice ? (
        <div
          // New key per notice restarts the pop-and-fade animation.
          key={snapshot.notice.id}
          className="animate-notice absolute top-1/4 left-1/2 -translate-x-1/2 rounded-full bg-sky-900/85 px-5 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg sm:text-base"
        >
          {snapshot.notice.message}
        </div>
      ) : null}

      {status ? (
        <p
          className={`${chip} self-center px-4 py-2 text-center text-xs font-semibold text-slate-700 sm:text-sm`}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
};
