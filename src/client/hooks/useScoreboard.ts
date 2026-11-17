import { useEffect, useSyncExternalStore } from 'react';
import type {
  ScoreboardState,
  ScoreboardStore,
} from '../services/ScoreboardStore';

/** Connects the store to the session for this component's lifetime. */
export const useScoreboard = (store: ScoreboardStore): ScoreboardState => {
  useEffect(() => store.connect(), [store]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};
