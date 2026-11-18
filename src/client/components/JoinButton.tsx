import type {} from '@devvit/web-view-scripts/devvit-global.js';
import { canRunAsUser, navigateTo, showToast } from '@devvit/web/client';
import { requestTokenRefresh } from '@devvit/web-view-scripts/token.js';
import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  markJoinIntent,
  subscribeToSubreddit,
} from '../services/api';

type JoinButtonProps = {
  subredditName: string;
  alreadyJoined: boolean;
  /** The viewer tapped Join before Reddit reloaded the post for consent. */
  pendingJoin: boolean;
};

type JoinState = 'idle' | 'joining' | 'joined';

const REFRESH_TIMEOUT_MS = 3000;
/** protos: Scope.SUBSCRIBE_TO_SUBREDDIT and ConsentStatus values. */
const SUBSCRIBE_SCOPE = 3;
const CONSENT_REVOKED = 1;

/**
 * Best-effort refresh of the signed request context, so the server sees
 * consent granted without a reload. Internal SDK behaviour, hence the timeout.
 */
const refreshRequestContext = () =>
  Promise.race([
    requestTokenRefresh().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, REFRESH_TIMEOUT_MS)),
  ]);

/** False if the viewer explicitly declined "join as you" for this app. */
const consentNotDeclined = (): boolean => {
  const state = globalThis.devvit?.appPermissionState;
  if (!state) return true; // Older clients don't report it; let the server decide.
  return !(
    state.consentStatus === CONSENT_REVOKED &&
    state.requestedScopes.includes(SUBSCRIBE_SCOPE)
  );
};

const isPermissionRefused = (error: unknown) =>
  error instanceof ApiError && error.code === 'forbidden';

/**
 * Subscribes the viewer to the subreddit the app is installed in (the test
 * sub during development, the public sub once launched: no code change).
 *
 * Tap → record intent (server) + ask consent (Reddit prompt). Granting consent
 * reloads the post, so the join usually completes on the *next* load, driven
 * by `pendingJoin`. If Reddit still refuses, we open the subreddit so the
 * viewer can use Reddit's own Join button.
 */
export const JoinButton = ({
  subredditName,
  alreadyJoined,
  pendingJoin,
}: JoinButtonProps) => {
  // Resume a join that was interrupted by the consent reload, unless the
  // viewer declined consent.
  const [resume] = useState(
    () => pendingJoin && !alreadyJoined && consentNotDeclined()
  );
  const [state, setState] = useState<JoinState>(
    alreadyJoined ? 'joined' : resume ? 'joining' : 'idle'
  );
  const resumed = useRef(false);

  const onJoined = () => {
    setState('joined');
    showToast({
      text: `Welcome to r/${subredditName}!`,
      appearance: 'success',
    });
  };

  const onJoinFailed = (error: unknown) => {
    console.error('Join failed', error);
    setState('idle');
    if (isPermissionRefused(error)) {
      showToast(`Opening r/${subredditName}. Tap Join there!`);
      navigateTo(`https://www.reddit.com/r/${subredditName}`);
    } else {
      showToast(`Couldn't join r/${subredditName}. Try again.`);
    }
  };

  useEffect(() => {
    // Declined consent: do nothing (the intent expires on its own).
    if (!resume || resumed.current) return;
    resumed.current = true;
    subscribeToSubreddit().then(onJoined, onJoinFailed);
    // Once per page load; the handlers only use stable props.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (event: Event) => {
    setState('joining');
    // Start both immediately: the consent prompt needs the live click, and the
    // intent must reach the server before Allow triggers the reload.
    const intent = markJoinIntent().catch(() => undefined);
    void (async () => {
      try {
        const allowed = await canRunAsUser(event);
        await intent;
        if (!allowed) {
          setState('idle');
          showToast(
            `Golferit needs your OK to join r/${subredditName} for you.`
          );
          return;
        }
        // Consent was already granted (no reload happened): join right away.
        await refreshRequestContext();
        await subscribeToSubreddit().then(onJoined, onJoinFailed);
      } catch (error) {
        console.error('Join failed', error);
        setState('idle');
        showToast(`Couldn't join r/${subredditName}. Try again.`);
      }
    })();
  };

  if (state === 'joined') {
    return (
      <span className="relative rounded-full bg-emerald-600/90 px-4 py-1.5 text-sm font-bold text-white shadow">
        ✓ Joined r/{subredditName}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={state === 'joining'}
      onClick={(e) => handleClick(e.nativeEvent)}
      className="relative cursor-pointer rounded-full bg-sky-900/85 px-4 py-1.5 text-sm font-bold text-white shadow transition hover:bg-sky-900 disabled:cursor-wait disabled:opacity-70"
    >
      {state === 'joining' ? 'Joining…' : `＋ Join r/${subredditName}`}
    </button>
  );
};
