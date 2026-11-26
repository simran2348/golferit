import { navigateTo, showToast } from '@devvit/web/client';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import {
  MAX_PAR,
  MIN_PAR,
  NAME_MAX_LENGTH,
  type CourseDesign,
} from '../../shared/editor/design';
import { buildCourseFromDesign } from '../../shared/editor/buildCourse';
import type { CourseDefinition } from '../../shared/types/course';
import { DesignGrid } from './DesignGrid';
import { ItemGlyph } from './ItemGlyph';
import {
  EDIT_TOOLS,
  OBSTACLE_TOOLS,
  TOOLS,
  type Tool,
  type ToolInfo,
} from './tools';
import { useEditorDraft, type SaveStatus } from './useEditorDraft';
import { ApiError, publishCourse } from '../services/api';
import type { VerifiedRun } from './TestPlay';

// The 3D engine and physics load only when you press Test play.
const TestPlay = lazy(() =>
  import('./TestPlay').then((m) => ({ default: m.TestPlay }))
);

// Full-screen 3D view; shares the Three.js chunk with TestPlay.
const CoursePreview = lazy(() =>
  import('./CoursePreview').then((m) => ({ default: m.CoursePreview }))
);

const SAVE_LABEL: Record<SaveStatus, string> = {
  loading: 'Loading draft…',
  idle: 'New course',
  saving: 'Saving…',
  saved: 'Saved ✓',
  unauthenticated: 'Log in to save',
  error: 'Not saved',
};

const designKey = (design: CourseDesign) =>
  JSON.stringify({ t: design.tiles, i: design.items, p: design.par });

const ToolIcon = ({ tool }: { tool: Tool }) => {
  if (tool === 'track' || tool === 'water' || tool === 'erase') {
    return (
      <span
        aria-hidden="true"
        className={`block h-6 w-6 rounded-md border-2 ${
          tool === 'track'
            ? 'border-emerald-700/30 bg-[#74d35a]'
            : tool === 'water'
              ? 'border-sky-700/30 bg-[#3cb7f0]'
              : 'border-dashed border-slate-400 bg-white'
        }`}
      />
    );
  }
  return (
    <svg viewBox="0 0 10 10" className="h-6 w-6" aria-hidden="true">
      <ItemGlyph kind={tool} rotation={0} x={0} y={0} />
    </svg>
  );
};

type ToolRailProps = {
  label: string;
  tools: readonly ToolInfo[];
  active: Tool;
  onSelect: (tool: Tool) => void;
};

/** Vertical tool column; scrolls if the screen is very short. */
const ToolRail = ({ label, tools, active, onSelect }: ToolRailProps) => (
  <nav
    aria-label={label}
    className="flex w-[3.75rem] shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-white/90 p-1 shadow-lg sm:w-[4.5rem]"
  >
    <p className="pt-0.5 text-center text-[8px] font-bold tracking-normal text-slate-400 uppercase sm:text-[9px] sm:tracking-wider">
      {label}
    </p>
    {tools.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onSelect(t.id)}
        aria-pressed={active === t.id}
        className={`flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-bold transition sm:text-[11px] ${
          active === t.id
            ? 'bg-orange-500 text-white shadow'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <ToolIcon tool={t.id} />
        {t.label}
      </button>
    ))}
  </nav>
);

export const EditorScreen = () => {
  const draft = useEditorDraft();
  const { design } = draft;
  const [tool, setTool] = useState<Tool>('track');
  const [testCourse, setTestCourse] = useState<CourseDefinition | null>(null);
  /** Best winning test run, tied to the exact layout it was played on. */
  const [verifiedRun, setVerifiedRun] = useState<
    (VerifiedRun & { key: string }) | null
  >(null);
  const [publishStep, setPublishStep] = useState<
    'closed' | 'confirm' | 'publishing'
  >('closed');
  const [previewCourse, setPreviewCourse] = useState<CourseDefinition | null>(
    null
  );

  const build = useMemo(() => buildCourseFromDesign(design, 'draft'), [design]);
  const testedKey = useMemo(() => designKey(design), [design]);
  const verified = verifiedRun?.key === testedKey ? verifiedRun : null;
  const toolInfo = TOOLS.find((t) => t.id === tool);

  const paint = useCallback(
    (col: number, row: number, strokeStart: boolean) =>
      draft.paint(tool, col, row, strokeStart),
    [draft, tool]
  );

  const startTest = () => {
    if (build.ok) setTestCourse(build.course);
  };
  const handleVerified = useCallback(
    (run: VerifiedRun) =>
      setVerifiedRun((previous) =>
        previous?.key === testedKey && previous.strokes <= run.strokes
          ? previous
          : { ...run, key: testedKey }
      ),
    [testedKey]
  );

  const publish = async () => {
    if (!verified) return;
    setPublishStep('publishing');
    try {
      const { url } = await publishCourse({
        design,
        shots: verified.shots,
        penalties: verified.penalties,
      });
      showToast({ text: 'Your course is live!', appearance: 'success' });
      navigateTo(url);
    } catch (error) {
      setPublishStep('closed');
      showToast(
        error instanceof ApiError && error.code !== 'network'
          ? error.message
          : 'Could not publish. Try again.'
      );
    }
  };

  return (
    <main className="relative flex h-full flex-col bg-gradient-to-b from-sky-300 to-sky-500 select-none">
      {/* Header */}
      <header className="flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <input
          value={design.name}
          onChange={(e) => draft.setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          aria-label="Course name"
          className="min-w-0 flex-1 rounded-xl bg-white/95 px-3 py-2 text-base font-extrabold text-slate-800 shadow outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex items-center rounded-xl bg-white/95 shadow">
          <button
            type="button"
            aria-label="Lower par"
            disabled={design.par <= MIN_PAR}
            onClick={() => draft.setPar(design.par - 1)}
            className="h-10 w-8 font-black text-slate-700 disabled:text-slate-300"
          >
            −
          </button>
          <span className="w-12 text-center text-sm font-bold whitespace-nowrap text-slate-700">
            Par {design.par}
          </span>
          <button
            type="button"
            aria-label="Raise par"
            disabled={design.par >= MAX_PAR}
            onClick={() => draft.setPar(design.par + 1)}
            className="h-10 w-8 font-black text-slate-700 disabled:text-slate-300"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={draft.undo}
          disabled={!draft.canUndo}
          aria-label="Undo"
          className="h-10 w-10 rounded-xl bg-white/95 text-lg font-black text-slate-700 shadow disabled:text-slate-300"
        >
          ↶
        </button>
        <button
          type="button"
          disabled={!build.ok}
          onClick={() => {
            if (build.ok) setPreviewCourse(build.course);
          }}
          aria-label="View course in 3D"
          title={build.ok ? 'View in 3D' : 'Fix the course to view it in 3D'}
          className="h-10 rounded-xl bg-sky-900 px-3 text-sm font-black text-white shadow transition hover:bg-sky-800 disabled:bg-white/70 disabled:text-slate-400"
        >
          3D
        </button>
      </header>

      {/* Edit rail · grid · obstacle rail */}
      <div className="flex min-h-0 flex-1 gap-2 px-2">
        <ToolRail
          label="Edit"
          tools={EDIT_TOOLS}
          active={tool}
          onSelect={setTool}
        />
        <div className="min-h-0 min-w-0 flex-1">
          <DesignGrid
            design={design}
            onStrokeStart={draft.strokeStart}
            onStrokeCancel={draft.cancelStroke}
            onPaint={paint}
          />
        </div>
        <ToolRail
          label="Obstacles"
          tools={OBSTACLE_TOOLS}
          active={tool}
          onSelect={setTool}
        />
      </div>
      <p className="px-3 pt-1.5 text-center text-xs font-medium text-sky-950/80">
        <span className="font-bold">{toolInfo?.label}:</span> {toolInfo?.hint}
        <span className="hidden sm:inline"> · Scroll or pinch to zoom</span>
      </p>

      {/* Status + test */}
      <footer className="flex items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1 rounded-xl bg-white/90 px-3 py-2 text-xs shadow">
          <div className="flex items-start justify-between gap-2 font-bold text-slate-500">
            <p className="min-w-0">
              {SAVE_LABEL[draft.saveStatus]}
              {draft.canResume ? (
                <button
                  type="button"
                  onClick={draft.resumeDraft}
                  className="ml-2 font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                >
                  Resume last draft
                </button>
              ) : null}
              {verified ? (
                <span className="ml-2 text-emerald-600">· Verified ✓</span>
              ) : null}
            </p>
            {draft.canReset ? (
              <button
                type="button"
                onClick={() => {
                  draft.reset();
                  showToast('Started over. Tap ↶ to undo.');
                }}
                className="shrink-0 font-bold text-red-600 underline underline-offset-2 hover:text-red-700"
              >
                Start over
              </button>
            ) : null}
          </div>
          <p
            className={`truncate font-semibold ${build.ok ? 'text-emerald-700' : 'text-red-600'}`}
          >
            {build.ok
              ? verified
                ? `You sank it in ${verified.strokes}. Ready to publish!`
                : 'Looks playable! Test it to verify.'
              : `${build.errors[0] ?? ''}${build.errors.length > 1 ? ` (+${build.errors.length - 1} more)` : ''}`}
          </p>
        </div>
        {verified ? (
          <>
            <button
              type="button"
              onClick={startTest}
              aria-label="Test again"
              className="h-12 w-12 shrink-0 rounded-full bg-white/95 text-lg font-black text-orange-600 shadow hover:bg-white"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setPublishStep('confirm')}
              className="shrink-0 rounded-full bg-emerald-600 px-5 py-3 font-extrabold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-500 active:translate-y-1 active:shadow-[0_1px_0_#047857]"
            >
              Publish
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!build.ok}
            onClick={startTest}
            className="shrink-0 rounded-full bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_4px_0_#c2410c] transition hover:bg-orange-400 active:translate-y-1 active:shadow-[0_1px_0_#c2410c] disabled:bg-slate-400 disabled:shadow-none"
          >
            ▶ Test
          </button>
        )}
      </footer>

      {publishStep !== 'closed' && verified ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-950/40 p-6 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-labelledby="publish-title"
            className="animate-notice-in w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
              Publish course
            </p>
            <h2
              id="publish-title"
              className="mt-1 truncate text-2xl font-black text-slate-800"
            >
              {design.name.trim()}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This posts your course to the subreddit, credited to you. Anyone
              can play it and climb its leaderboard. Par {design.par}; you sank
              it in {verified.strokes}.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                autoFocus
                disabled={publishStep === 'publishing'}
                onClick={() => void publish()}
                className="w-full rounded-full bg-emerald-600 py-3 font-extrabold text-white shadow-[0_4px_0_#047857] hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
              >
                {publishStep === 'publishing' ? 'Publishing…' : 'Publish'}
              </button>
              <button
                type="button"
                disabled={publishStep === 'publishing'}
                onClick={() => setPublishStep('closed')}
                className="w-full rounded-full bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Full-screen 3D: covers the editor, which stays mounted underneath. */}
      {previewCourse ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#2fa6d9] font-bold text-white">
              Loading 3D…
            </div>
          }
        >
          <CoursePreview
            course={previewCourse}
            onBack={() => setPreviewCourse(null)}
          />
        </Suspense>
      ) : null}

      {testCourse ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#2fa6d9] font-bold text-white">
              Loading 3D…
            </div>
          }
        >
          <TestPlay
            course={testCourse}
            onExit={() => setTestCourse(null)}
            onVerified={handleVerified}
          />
        </Suspense>
      ) : null}
    </main>
  );
};
