import type { LeaderboardResponse, ScoreEntry } from '../../shared/api';
import { formatDuration } from '../../shared/scoring';

type LeaderboardListProps = {
  leaderboard: LeaderboardResponse;
  limit?: number;
};

const Row = ({ entry, isMe }: { entry: ScoreEntry; isMe: boolean }) => (
  <li
    className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm ${
      isMe ? 'bg-emerald-100 font-bold text-emerald-900' : 'text-slate-700'
    }`}
  >
    <span className="w-6 text-right font-black text-slate-400 tabular-nums">
      {entry.rank}
    </span>
    <span className="min-w-0 flex-1 truncate text-left">
      u/{entry.username}
    </span>
    <span className="font-semibold tabular-nums">{entry.strokes}</span>
    <span className="w-14 text-right text-slate-500 tabular-nums">
      {formatDuration(entry.timeMs)}
    </span>
  </li>
);

/** Ranked by strokes, then time. Appends the viewer's row if off the list. */
export const LeaderboardList = ({
  leaderboard,
  limit = 10,
}: LeaderboardListProps) => {
  const { entries, me } = leaderboard;
  const shown = entries.slice(0, limit);
  const meShown = me !== null && shown.some((e) => e.rank === me.rank);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        No scores yet. Be the first to sink it!
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-0.5">
      <li className="flex gap-3 px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        <span className="w-6 text-right">#</span>
        <span className="flex-1 text-left">Player</span>
        <span>Strokes</span>
        <span className="w-14 text-right">Time</span>
      </li>
      {shown.map((entry) => (
        <Row key={entry.rank} entry={entry} isMe={me?.rank === entry.rank} />
      ))}
      {me && !meShown ? (
        <>
          <li aria-hidden="true" className="text-center text-slate-300">
            ⋯
          </li>
          <Row entry={me} isMe />
        </>
      ) : null}
    </ol>
  );
};
