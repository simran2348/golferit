import { useEffect, useMemo, useState } from 'react';
import type { CourseDefinition } from '../../shared/types/course';
import type { ShotRecord } from '../../shared/api';
import { scoreLabel } from '../../shared/course/rules';
import { GameCanvas } from '../components/GameCanvas';
import { RoundTimer } from '../components/RoundTimer';
import { ZoomControls } from '../components/ZoomControls';
import { ZoomController } from '../game/engine/ZoomController';
import { GameSession } from '../game/logic/GameSession';
import { useGameSnapshot } from '../hooks/useGameSnapshot';

export type VerifiedRun = {
  shots: ShotRecord[];
  penalties: number;
  strokes: number;
};

type TestPlayProps = {
  course: CourseDefinition;
  onExit: () => void;
  /** Called when the creator sinks the ball, with the winning run. */
  onVerified: (run: VerifiedRun) => void;
};

const chip =
  'rounded-2xl bg-white/90 shadow-lg shadow-sky-900/20 backdrop-blur';

/**
 * Plays the draft in the real engine. Local only: no rounds are started and
 * nothing is submitted to any leaderboard.
 */
export const TestPlay = ({ course, onExit, onVerified }: TestPlayProps) => {
  const session = useMemo(() => new GameSession(course), [course]);
  const [zoom] = useState(() => new ZoomController());
  const snapshot = useGameSnapshot(session);

  useEffect(
    () =>
      session.onEvent((event) => {
        if (event.type === 'holed') {
          onVerified({
            shots: event.shots,
            penalties: event.penalties,
            strokes: event.shots.length + event.penalties,
          });
        }
      }),
    [session, onVerified]
  );

  const { result } = snapshot;
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[#2fa6d9] select-none">
      <GameCanvas course={course} session={session} zoom={zoom} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className={`${chip} flex items-stretch gap-3 px-3 py-1.5`}>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
              Test play · Par {course.par}
            </p>
            <p className="max-w-[9rem] truncate text-sm font-extrabold text-slate-800">
              {course.name}
            </p>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Strokes
            </p>
            <p className="text-lg leading-tight font-black text-slate-800 tabular-nums">
              {snapshot.strokes}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Time
            </p>
            <RoundTimer
              startedAt={snapshot.startedAt}
              finalMs={result?.elapsedMs ?? null}
              className="text-lg leading-tight font-black text-slate-800 tabular-nums"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-slate-700"
        >
          ← Editor
        </button>
      </div>

      {snapshot.phase === 'error' ? (
        <p
          className={`${chip} absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-sm`}
        >
          {snapshot.errorMessage}
        </p>
      ) : null}

      <ZoomControls zoom={zoom} />

      {result ? (
        <div className="absolute inset-0 flex items-center justify-center bg-sky-950/30 p-6 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-labelledby="test-result"
            className="animate-notice-in w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
              {result.holed ? 'Course verified ✓' : 'Out of strokes'}
            </p>
            <h2
              id="test-result"
              className="mt-1 text-2xl font-black text-slate-800"
            >
              {result.holed
                ? scoreLabel(result.strokes, result.par)
                : 'Not sunk yet'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {result.holed
                ? `You sank it in ${result.strokes}. Players will know it can be done.`
                : 'A course has to be beaten by its creator before it can be published.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                autoFocus
                onClick={onExit}
                className="w-full rounded-full bg-orange-500 py-3 font-extrabold text-white shadow-[0_4px_0_#c2410c] hover:bg-orange-400"
              >
                Back to editor
              </button>
              <button
                type="button"
                onClick={session.restart}
                className="w-full rounded-full bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
