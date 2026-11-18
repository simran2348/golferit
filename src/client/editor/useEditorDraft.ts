import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  createStarterDesign,
  parseDesign,
  type CourseDesign,
} from '../../shared/editor/design';
import { ApiError, fetchDraft, saveDraft } from '../services/api';
import { applyTool, type Tool } from './tools';

const HISTORY_LIMIT = 50;
const AUTOSAVE_DELAY_MS = 1000;

export type SaveStatus =
  'loading' | 'idle' | 'saving' | 'saved' | 'unauthenticated' | 'error';

type State = { design: CourseDesign; past: CourseDesign[]; revision: number };

type Action =
  | { type: 'load'; design: CourseDesign }
  | { type: 'strokeStart' }
  | { type: 'cancelStroke' }
  | {
      type: 'paint';
      tool: Tool;
      col: number;
      row: number;
      strokeStart: boolean;
    }
  | { type: 'setName'; name: string }
  | { type: 'setPar'; par: number }
  | { type: 'undo' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'load':
      return { design: action.design, past: [], revision: 0 };
    case 'strokeStart':
      // Snapshot before a stroke; dropped again if the stroke changes nothing.
      return {
        ...state,
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
      };
    case 'cancelStroke': {
      // A one-finger stroke turned into a pinch: drop what it painted.
      const past = [...state.past];
      const before = past.pop();
      if (!before) return state;
      return before === state.design
        ? { ...state, past }
        : { design: before, past, revision: state.revision + 1 };
    }
    case 'paint': {
      const next = applyTool(
        state.design,
        action.tool,
        action.col,
        action.row,
        action.strokeStart
      );
      return next === state.design
        ? state
        : { ...state, design: next, revision: state.revision + 1 };
    }
    case 'setName':
      return {
        ...state,
        design: { ...state.design, name: action.name },
        revision: state.revision + 1,
      };
    case 'setPar':
      return {
        ...state,
        design: { ...state.design, par: action.par },
        revision: state.revision + 1,
      };
    case 'undo': {
      // Skip snapshots identical to the current design (no-op strokes).
      const past = [...state.past];
      let previous = past.pop();
      while (previous === state.design && past.length > 0)
        previous = past.pop();
      if (!previous || previous === state.design) return { ...state, past };
      return { design: previous, past, revision: state.revision + 1 };
    }
  }
};

/**
 * Editor state: the design, undo history and server autosave. Drafts live in
 * Redis (not localStorage), so they survive app updates and follow the user
 * across devices.
 */
export const useEditorDraft = () => {
  const [state, dispatch] = useReducer(reducer, {
    design: createStarterDesign(),
    past: [],
    revision: 0,
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const canSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetchDraft()
      .then(({ design }) => {
        if (cancelled) return;
        const parsed = design ? parseDesign(design) : null;
        if (parsed) dispatch({ type: 'load', design: parsed });
        setSaveStatus('idle');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const unauthenticated =
          error instanceof ApiError && error.code === 'unauthenticated';
        canSave.current = !unauthenticated;
        setSaveStatus(unauthenticated ? 'unauthenticated' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave after edits (revision 0 = freshly loaded).
  const { design, revision } = state;
  useEffect(() => {
    if (revision === 0 || !canSave.current) return;
    const timer = window.setTimeout(() => {
      setSaveStatus('saving');
      saveDraft(design)
        .then(() => setSaveStatus('saved'))
        .catch((error: unknown) => {
          const unauthenticated =
            error instanceof ApiError && error.code === 'unauthenticated';
          if (unauthenticated) canSave.current = false;
          setSaveStatus(unauthenticated ? 'unauthenticated' : 'error');
        });
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [design, revision]);

  return {
    design,
    canUndo: state.past.some((d) => d !== design),
    saveStatus,
    strokeStart: useCallback(() => dispatch({ type: 'strokeStart' }), []),
    cancelStroke: useCallback(() => dispatch({ type: 'cancelStroke' }), []),
    paint: useCallback(
      (tool: Tool, col: number, row: number, strokeStart: boolean) =>
        dispatch({ type: 'paint', tool, col, row, strokeStart }),
      []
    ),
    setName: useCallback(
      (name: string) => dispatch({ type: 'setName', name }),
      []
    ),
    setPar: useCallback((par: number) => dispatch({ type: 'setPar', par }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
  };
};
