import type { ScoreboardState } from '../services/ScoreboardStore';
import { LeaderboardList } from './LeaderboardList';

type LeaderboardPanelProps = {
  scoreboard: ScoreboardState;
  onClose: () => void;
  onRetry: () => void;
};

export const LeaderboardPanel = ({
  scoreboard,
  onClose,
  onRetry,
}: LeaderboardPanelProps) => {
  const { leaderboard, leaderboardError } = scoreboard;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-sky-950/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="leaderboard-title"
        className="animate-notice-in flex max-h-full w-full max-w-sm flex-col rounded-3xl bg-white p-5 shadow-2xl shadow-sky-950/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2
              id="leaderboard-title"
              className="text-xl font-black text-slate-800"
            >
              Leaderboard
            </h2>
            {leaderboard ? (
              <p className="text-xs font-medium text-slate-500">
                {leaderboard.totalPlayers}{' '}
                {leaderboard.totalPlayers === 1 ? 'player' : 'players'} · fewest
                strokes, then fastest
              </p>
            ) : null}
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close leaderboard"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          {leaderboard ? (
            <LeaderboardList leaderboard={leaderboard} />
          ) : leaderboardError ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-slate-500">
                Couldn&apos;t load the leaderboard.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="cursor-pointer rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Try again
              </button>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-slate-500">Loading…</p>
          )}
        </div>
      </div>
    </div>
  );
};
