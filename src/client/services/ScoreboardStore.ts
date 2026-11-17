import type {
  LeaderboardResponse,
  SubmitRoundResponse,
} from '../../shared/api';
import type { GameSession, SessionEvent } from '../game/logic/GameSession';
import { ApiError, fetchLeaderboard, startRound, submitRound } from './api';

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; result: SubmitRoundResponse }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

export type ScoreboardState = {
  leaderboard: LeaderboardResponse | null;
  leaderboardError: boolean;
  submission: SubmissionState;
};

type Listener = () => void;

/**
 * Bridges the game session to the server: starts an official round on the
 * first putt, submits the shot log when the ball drops, and keeps the
 * leaderboard fresh. React reads it with `useSyncExternalStore`.
 */
export class ScoreboardStore {
  private state: ScoreboardState = {
    leaderboard: null,
    leaderboardError: false,
    submission: { status: 'idle' },
  };
  private readonly listeners = new Set<Listener>();
  /** Pending start request for the current round (resolves to its id). */
  private roundStart: Promise<string> | null = null;
  /** Bumped on every restart so stale responses are ignored. */
  private generation = 0;

  constructor(private readonly session: GameSession) {}

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): ScoreboardState => this.state;

  /** Start listening to the session. Returns a disconnect function. */
  connect(): () => void {
    void this.refreshLeaderboard();
    return this.session.onEvent(this.handleEvent);
  }

  readonly refreshLeaderboard = async (): Promise<void> => {
    try {
      const leaderboard = await fetchLeaderboard();
      this.set({ leaderboard, leaderboardError: false });
    } catch (error) {
      console.error('Failed to load leaderboard', error);
      this.set({ leaderboardError: true });
    }
  };

  private readonly handleEvent = (event: SessionEvent): void => {
    switch (event.type) {
      case 'roundStarted':
        // Fire immediately: official timing starts when the server sees this.
        this.roundStart = startRound().then((r) => r.roundId);
        // Errors are surfaced when submitting; avoid unhandled rejections.
        this.roundStart.catch(() => undefined);
        break;
      case 'holed':
        void this.submit(event.shots, event.penalties);
        break;
      case 'restarted':
        this.generation++;
        this.roundStart = null;
        this.set({ submission: { status: 'idle' } });
        break;
    }
  };

  private async submit(
    shots: Extract<SessionEvent, { type: 'holed' }>['shots'],
    penalties: number
  ): Promise<void> {
    const generation = this.generation;
    const roundStart = this.roundStart;
    if (!roundStart) return;
    this.set({ submission: { status: 'saving' } });
    try {
      const roundId = await roundStart;
      const result = await submitRound({ roundId, shots, penalties });
      if (generation !== this.generation) return;
      this.set({
        submission: { status: 'saved', result },
        leaderboard: result.leaderboard,
        leaderboardError: false,
      });
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && error.code === 'unauthenticated') {
        this.set({ submission: { status: 'unauthenticated' } });
        return;
      }
      console.error('Failed to submit round', error);
      this.set({
        submission: {
          status: 'error',
          message:
            error instanceof ApiError && error.code === 'invalid'
              ? `Score rejected: ${error.message}`
              : 'Could not save your score',
        },
      });
    }
  }

  private set(patch: Partial<ScoreboardState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
