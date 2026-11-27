import type { GolferitPostData } from './daily';
import type { CourseDesign } from './editor/design';

export type StreakInfo = {
  /** Consecutive UTC days with a completed daily challenge (0 if broken). */
  current: number;
  best: number;
  playedToday: boolean;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  /** Resolved server-side from trusted Devvit context; null when logged out. */
  username: string | null;
  post: GolferitPostData;
  /** Viewer's best on this post; null if none or logged out. */
  best: ScoreEntry | null;
  /** Null when logged out. */
  streak: StreakInfo | null;
};

export type ErrorCode =
  | 'unauthenticated'
  /** Logged in, but Reddit refused an action taken as the user. */
  | 'forbidden'
  | 'invalid'
  | 'not_found'
  | 'server';

export type ErrorResponse = {
  status: 'error';
  code: ErrorCode;
  message: string;
};

/** One putt, as recorded by the client. Enough to replay the round later. */
export type ShotRecord = {
  /** Simulation clock (seconds) when the shot was taken: poses moving obstacles. */
  t: number;
  /** Ball position at the moment of the shot. */
  x: number;
  z: number;
  /** Unit direction on the XZ plane. */
  dx: number;
  dz: number;
  /** 0..1 */
  power: number;
};

export type StartRoundResponse = {
  type: 'roundStarted';
  roundId: string;
};

export type SubmitRoundRequest = {
  roundId: string;
  shots: ShotRecord[];
  penalties: number;
};

export type ScoreEntry = {
  rank: number;
  username: string;
  strokes: number;
  /** Server-measured completion time. */
  timeMs: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: ScoreEntry[];
  /** The viewer's best on this post, or null if none / logged out. */
  me: ScoreEntry | null;
  totalPlayers: number;
};

export type SubmitRoundResponse = {
  type: 'roundSubmitted';
  /** Official (server-validated) result of this round. */
  strokes: number;
  timeMs: number;
  isPersonalBest: boolean;
  leaderboard: LeaderboardResponse;
  streak: StreakInfo | null;
  /** True when this round counted toward the daily streak. */
  countedForStreak: boolean;
};

/** Publish a verified editor design as a community post. */
export type PublishRequest = {
  design: CourseDesign;
  /** The creator's winning test run, checked against the design. */
  shots: ShotRecord[];
  penalties: number;
};

export type PublishResponse = {
  type: 'published';
  postId: string;
  url: string;
};

export type DraftResponse = {
  type: 'draft';
  /** Null when the user hasn't saved a draft yet. */
  design: CourseDesign | null;
};

export type SaveDraftResponse = {
  type: 'draftSaved';
  savedAt: number;
};
