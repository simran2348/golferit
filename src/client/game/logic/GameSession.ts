import type { CourseDefinition } from '../../../shared/types/course';
import type { ShotRecord } from '../../../shared/api';
import {
  MAX_STROKES,
  WATER_PENALTY_STROKES,
} from '../../../shared/constants/game';
import {
  hasReachedStrokeLimit,
  scoreLabel,
} from '../../../shared/course/rules';

export type GamePhase = 'loading' | 'error' | 'aiming' | 'rolling' | 'complete';

export type GameNotice = {
  /** Increments per notice so the UI can re-trigger its animation. */
  id: number;
  message: string;
};

export type GameResult = {
  strokes: number;
  par: number;
  holed: boolean;
  label: string;
  /** Locally measured, first putt to ball in cup. */
  elapsedMs: number;
};

export type GameSnapshot = {
  phase: GamePhase;
  strokes: number;
  par: number;
  maxStrokes: number;
  /** `performance.now()` at the first putt; null before it. */
  startedAt: number | null;
  notice: GameNotice | null;
  result: GameResult | null;
  errorMessage: string | null;
};

export type SessionEvent =
  | { type: 'roundStarted' }
  | {
      type: 'holed';
      shots: ShotRecord[];
      penalties: number;
      elapsedMs: number;
    }
  | { type: 'restarted' };

type Listener = () => void;
type EventListener = (event: SessionEvent) => void;

/**
 * Turn/score/timing state machine for one hole. Framework-agnostic: the engine
 * drives it from the physics loop, React reads it via `useSyncExternalStore`,
 * and the score reporter listens to its events. Snapshots are immutable and
 * only replaced on game events, never per frame.
 */
export class GameSession {
  private snapshot: GameSnapshot;
  private readonly listeners = new Set<Listener>();
  private readonly eventListeners = new Set<EventListener>();
  private noticeId = 0;
  private shots: ShotRecord[] = [];
  private penalties = 0;

  constructor(
    private readonly course: CourseDefinition,
    private readonly now: () => number = () => performance.now()
  ) {
    this.snapshot = this.initialSnapshot('loading');
  }

  // Arrow properties so React can pass them around without binding.
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): GameSnapshot => this.snapshot;

  readonly restart = (): void => {
    if (this.snapshot.phase !== 'complete') return;
    this.resetRound();
    this.set(this.initialSnapshot('aiming'));
    this.emit({ type: 'restarted' });
  };

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** Engine signals it will (re)load physics. */
  beginLoading(): void {
    this.resetRound();
    this.set(this.initialSnapshot('loading'));
  }

  markReady(): void {
    if (this.snapshot.phase === 'loading') this.set({ phase: 'aiming' });
  }

  markFailed(message: string): void {
    this.set({ phase: 'error', errorMessage: message });
  }

  canShoot(): boolean {
    return this.snapshot.phase === 'aiming';
  }

  recordShot(shot: ShotRecord): void {
    if (!this.canShoot()) return;
    const isFirst = this.shots.length === 0;
    this.shots.push(shot);
    this.set({
      phase: 'rolling',
      strokes: this.snapshot.strokes + 1,
      startedAt: this.snapshot.startedAt ?? this.now(),
      notice: null,
    });
    if (isFirst) this.emit({ type: 'roundStarted' });
  }

  /** Resting ball was knocked by an obstacle: no stroke, wait for it to stop. */
  ballDisturbed(): void {
    if (this.snapshot.phase === 'aiming') this.set({ phase: 'rolling' });
  }

  ballStopped(): void {
    if (this.snapshot.phase !== 'rolling') return;
    if (hasReachedStrokeLimit(this.snapshot.strokes)) {
      this.finish(MAX_STROKES, false);
    } else {
      this.set({ phase: 'aiming' });
    }
  }

  /** Water or out of bounds: add penalty, ball returns to its previous spot. */
  penalty(message: string): void {
    if (this.snapshot.phase !== 'rolling') return;
    this.penalties += WATER_PENALTY_STROKES;
    const strokes = this.snapshot.strokes + WATER_PENALTY_STROKES;
    if (hasReachedStrokeLimit(strokes)) {
      this.finish(MAX_STROKES, false);
      return;
    }
    this.set({
      phase: 'aiming',
      strokes,
      notice: { id: ++this.noticeId, message },
    });
  }

  holed(): void {
    if (this.snapshot.phase !== 'rolling') return;
    const elapsedMs = this.finish(this.snapshot.strokes, true);
    this.emit({
      type: 'holed',
      shots: [...this.shots],
      penalties: this.penalties,
      elapsedMs,
    });
  }

  /** Returns the elapsed time it recorded. */
  private finish(strokes: number, holed: boolean): number {
    const startedAt = this.snapshot.startedAt;
    const elapsedMs = startedAt === null ? 0 : this.now() - startedAt;
    this.set({
      phase: 'complete',
      strokes,
      notice: null,
      result: {
        strokes,
        par: this.course.par,
        holed,
        label: holed ? scoreLabel(strokes, this.course.par) : 'Stroke limit',
        elapsedMs,
      },
    });
    return elapsedMs;
  }

  private resetRound(): void {
    this.shots = [];
    this.penalties = 0;
  }

  private initialSnapshot(phase: GamePhase): GameSnapshot {
    return {
      phase,
      strokes: 0,
      par: this.course.par,
      maxStrokes: MAX_STROKES,
      startedAt: null,
      notice: null,
      result: null,
      errorMessage: null,
    };
  }

  private set(patch: Partial<GameSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private emit(event: SessionEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }
}
