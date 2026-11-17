import { formatDuration } from '../../shared/scoring';
import type { GolferitPostData } from '../../shared/daily';
import type { GameResult } from '../game/logic/GameSession';
import type {
  ScoreboardState,
  SubmissionState,
} from '../services/ScoreboardStore';
import { LeaderboardList } from './LeaderboardList';

type ResultCardProps = {
  result: GameResult;
  post: GolferitPostData;
  scoreboard: ScoreboardState;
  onPlayAgain: () => void;
};

const relativeToPar = (strokes: number, par: number): string => {
  const diff = strokes - par;
  if (diff === 0) return 'Even par';
  return diff < 0 ? `${-diff} under par` : `${diff} over par`;
};

const SaveStatus = ({
  submission,
  post,
}: {
  submission: SubmissionState;
  post: GolferitPostData;
}) => {
  switch (submission.status) {
    case 'idle':
      return null;
    case 'saving':
      return <p className="text-sm text-slate-500">Saving your score…</p>;
    case 'unauthenticated':
      return (
        <p className="text-sm text-slate-500">
          Log in to Reddit to save your score.
        </p>
      );
    case 'error':
      return <p className="text-sm text-red-600">{submission.message}</p>;
    case 'saved': {
      const { result } = submission;
      const me = result.leaderboard.me;
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-emerald-700">
            {result.isPersonalBest ? '★ New personal best! ' : 'Score saved. '}
            {me
              ? `Rank #${me.rank} of ${result.leaderboard.totalPlayers}`
              : null}
          </p>
          {result.countedForStreak && result.streak ? (
            <p className="text-sm font-bold text-orange-600">
              🔥 {result.streak.current}-day streak
              {result.streak.current >= result.streak.best &&
              result.streak.current > 1
                ? ' (your best!)'
                : ''}
            </p>
          ) : post.kind === 'daily' ? (
            <p className="text-xs text-slate-500">
              Streaks count on the day&apos;s challenge only.
            </p>
          ) : null}
        </div>
      );
    }
  }
};

export const ResultCard = ({
  result,
  post,
  scoreboard,
  onPlayAgain,
}: ResultCardProps) => {
  const { submission, leaderboard } = scoreboard;
  // Prefer the server-measured (official) time once the score is saved.
  const official = submission.status === 'saved' ? submission.result : null;
  const timeMs = official?.timeMs ?? result.elapsedMs;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sky-950/30 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-labelledby="result-title"
        className="animate-notice-in flex max-h-full w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-5 text-center shadow-2xl shadow-sky-950/30 sm:p-6"
      >
        <div>
          <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
            {result.holed ? 'Hole complete' : 'Out of strokes'}
          </p>
          <h2
            id="result-title"
            className="mt-1 text-3xl font-black tracking-tight text-slate-800"
          >
            {result.label}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 py-2">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Strokes
            </p>
            <p className="text-2xl font-black text-slate-800 tabular-nums">
              {result.strokes}
            </p>
            <p className="text-xs text-slate-500">
              {result.holed
                ? relativeToPar(result.strokes, result.par)
                : `Par ${result.par}`}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 py-2">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Time
            </p>
            <p className="text-2xl font-black text-slate-800 tabular-nums">
              {formatDuration(timeMs)}
            </p>
            <p className="text-xs text-slate-500">
              {official ? 'Official' : 'First putt to cup'}
            </p>
          </div>
        </div>

        {result.holed ? (
          <SaveStatus submission={submission} post={post} />
        ) : null}

        {leaderboard && leaderboard.entries.length > 0 ? (
          <div className="text-left">
            <p className="mb-1 text-xs font-bold tracking-widest text-slate-400 uppercase">
              Top players
            </p>
            <LeaderboardList leaderboard={leaderboard} limit={5} />
          </div>
        ) : null}

        <button
          type="button"
          autoFocus
          onClick={onPlayAgain}
          className="w-full shrink-0 cursor-pointer rounded-full bg-orange-500 py-3 text-base font-extrabold text-white shadow-[0_4px_0_#c2410c] transition hover:bg-orange-400 active:translate-y-1 active:shadow-[0_1px_0_#c2410c]"
        >
          Play again
        </button>
      </div>
    </div>
  );
};
