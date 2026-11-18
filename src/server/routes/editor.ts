import { Hono, type Context } from 'hono';
import { context } from '@devvit/web/server';
import type {
  DraftResponse,
  ErrorCode,
  ErrorResponse,
  SaveDraftResponse,
} from '../../shared/api';
import { parseDesign } from '../../shared/editor/design';
import { loadDraft, saveDraft } from '../services/drafts';

export const editor = new Hono();

const fail = (c: Context, code: ErrorCode, message: string) =>
  c.json<ErrorResponse>(
    { status: 'error', code, message },
    code === 'unauthenticated'
      ? 401
      : code === 'forbidden'
        ? 403
        : code === 'invalid'
          ? 400
          : 500
  );

editor.get('/draft', async (c) => {
  const { userId } = context;
  if (!userId) return fail(c, 'unauthenticated', 'Log in to save drafts');
  try {
    return c.json<DraftResponse>({
      type: 'draft',
      design: await loadDraft(userId),
    });
  } catch (error) {
    console.error('Draft load failed:', error);
    return fail(c, 'server', 'Could not load your draft');
  }
});

/**
 * Save the work-in-progress design. Only the structure is checked here; a
 * draft may be unfinished. Full course rules run when testing/publishing.
 */
editor.put('/draft', async (c) => {
  const { userId } = context;
  if (!userId) return fail(c, 'unauthenticated', 'Log in to save drafts');
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, 'invalid', 'Body must be JSON');
  }
  const design =
    typeof body === 'object' && body !== null && 'design' in body
      ? parseDesign(body.design)
      : null;
  if (!design) return fail(c, 'invalid', 'Malformed design');
  try {
    await saveDraft(userId, design);
    return c.json<SaveDraftResponse>({
      type: 'draftSaved',
      savedAt: Date.now(),
    });
  } catch (error) {
    console.error('Draft save failed:', error);
    return fail(c, 'server', 'Could not save your draft');
  }
});
