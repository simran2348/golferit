import { useEffect, useState } from 'react';
import type { InitResponse, ScoreEntry, StreakInfo } from '../../shared/api';

export type PlayerState =
  | { status: 'loading' }
  | {
      status: 'ready';
      username: string | null;
      best: ScoreEntry | null;
      streak: StreakInfo | null;
    }
  | { status: 'error' };

const isInitResponse = (value: unknown): value is InitResponse =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === 'init';

/**
 * Identity comes from the server (`reddit.getCurrentUsername()` against the
 * trusted Devvit request context), never from client-side claims.
 */
export const usePlayer = (): PlayerState => {
  const [state, setState] = useState<PlayerState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch('/api/init', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!isInitResponse(data)) throw new Error('Unexpected response');
        setState({
          status: 'ready',
          username: data.username,
          best: data.best,
          streak: data.streak,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to load player', err);
        setState({ status: 'error' });
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  return state;
};
