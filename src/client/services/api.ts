import type {
  DraftResponse,
  ErrorCode,
  PublishRequest,
  PublishResponse,
  SaveDraftResponse,
  LeaderboardResponse,
  StartRoundResponse,
  SubmitRoundRequest,
  SubmitRoundResponse,
} from '../../shared/api';
import type { CourseDesign } from '../../shared/editor/design';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'network',
    message: string
  ) {
    super(message);
  }
}

const hasType = <T extends string>(
  value: unknown,
  type: T
): value is { type: T } =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === type;

const errorCodeOf = (value: unknown): ErrorCode | null => {
  if (typeof value !== 'object' || value === null || !('code' in value)) {
    return null;
  }
  const { code } = value;
  return code === 'unauthenticated' ||
    code === 'forbidden' ||
    code === 'invalid' ||
    code === 'not_found' ||
    code === 'server'
    ? code
    : null;
};

const messageOf = (value: unknown): string =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof value.message === 'string'
    ? value.message
    : 'Request failed';

/** fetch + JSON + runtime shape check (no casts). */
const request = async <T extends { type: string }>(
  path: string,
  isT: (value: unknown) => value is T,
  init?: RequestInit
): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError('network', 'Network unavailable');
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('server', `Unexpected response (HTTP ${res.status})`);
  }
  if (!res.ok || !isT(data)) {
    throw new ApiError(errorCodeOf(data) ?? 'server', messageOf(data));
  }
  return data;
};

const sendJson = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const postJson = (body: unknown) => sendJson(body);

const isLeaderboard = (v: unknown): v is LeaderboardResponse =>
  hasType(v, 'leaderboard') && 'entries' in v && Array.isArray(v.entries);
const isRoundStarted = (v: unknown): v is StartRoundResponse =>
  hasType(v, 'roundStarted') && 'roundId' in v && typeof v.roundId === 'string';
const isRoundSubmitted = (v: unknown): v is SubmitRoundResponse =>
  hasType(v, 'roundSubmitted') &&
  'leaderboard' in v &&
  isLeaderboard(v.leaderboard);

export const fetchLeaderboard = () =>
  request('/api/leaderboard', isLeaderboard);

export const startRound = () =>
  request('/api/round/start', isRoundStarted, postJson({}));

export const submitRound = (body: SubmitRoundRequest) =>
  request('/api/round/submit', isRoundSubmitted, postJson(body));

const isDraft = (v: unknown): v is DraftResponse =>
  hasType(v, 'draft') && 'design' in v;
const isDraftSaved = (v: unknown): v is SaveDraftResponse =>
  hasType(v, 'draftSaved');

export const fetchDraft = () => request('/api/editor/draft', isDraft);

export const saveDraft = (design: CourseDesign) =>
  request('/api/editor/draft', isDraftSaved, sendJson({ design }, 'PUT'));

const isPublished = (v: unknown): v is PublishResponse =>
  hasType(v, 'published') &&
  'url' in v &&
  typeof v.url === 'string' &&
  'postId' in v &&
  typeof v.postId === 'string';

/** Post a verified design to the subreddit as a community course. */
export const publishCourse = (body: PublishRequest) =>
  request('/api/editor/publish', isPublished, postJson(body));
