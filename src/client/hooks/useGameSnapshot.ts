import { useSyncExternalStore } from 'react';
import type { GameSession, GameSnapshot } from '../game/logic/GameSession';

/** Re-renders only when the session publishes a new snapshot (game events). */
export const useGameSnapshot = (session: GameSession): GameSnapshot =>
  useSyncExternalStore(session.subscribe, session.getSnapshot);
