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
import { TOOLS, type Tool } from './tools';
import { useEditorDraft, type SaveStatus } from './useEditorDraft';

// The 3D engine and physics load only when you press Test play.
const TestPlay = lazy(() =>
  import('./TestPlay').then((m) => ({ default: m.TestPlay }))
);

const SAVE_LABEL: Record<SaveStatus, string> = {
  loading: 'Loading draft…',
  idle: 'Draft',
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

export const EditorScreen = () => {
  const draft = useEditorDraft();
  const { design } = draft;
  const [tool, setTool] = useState<Tool>('track');
  const [testCourse, setTestCourse] = useState<CourseDefinition | null>(null);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);

  const build = useMemo(() => buildCourseFromDesign(design, 'draft'), [design]);
  const verified = verifiedKey === designKey(design);
  const toolInfo = TOOLS.find((t) => t.id === tool);

  const paint = useCallback(
    (col: number, row: number, strokeStart: boolean) =>
      draft.paint(tool, col, row, strokeStart),
    [draft, tool]
  );

  const startTest = () => {
    if (build.ok) setTestCourse(build.course);
  };
  const testedKey = useMemo(() => designKey(design), [design]);
  const handleVerified = useCallback(
    () => setVerifiedKey(testedKey),
    [testedKey]
  );

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
      </header>

      {/* Grid */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="aspect-[10/14] h-full max-h-full max-w-full">
          <DesignGrid
            design={design}
            onStrokeStart={draft.strokeStart}
            onPaint={paint}
          />
        </div>
      </div>

      {/* Tools */}
      <div className="px-3 pt-3">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/90 p-1.5 shadow-lg sm:grid-cols-8">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-bold transition ${
                tool === t.id
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ToolIcon tool={t.id} />
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-xs font-medium text-sky-950/80">
          {toolInfo?.hint}
        </p>
      </div>

      {/* Status + test */}
      <footer className="flex items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1 rounded-xl bg-white/90 px-3 py-2 text-xs shadow">
          <p className="font-bold text-slate-500">
            {SAVE_LABEL[draft.saveStatus]}
            {verified ? (
              <span className="ml-2 text-emerald-600">· Verified ✓</span>
            ) : null}
          </p>
          <p
            className={`truncate font-semibold ${build.ok ? 'text-emerald-700' : 'text-red-600'}`}
          >
            {build.ok
              ? verified
                ? 'You sank it. Ready to publish (coming next).'
                : 'Looks playable! Test it to verify.'
              : `${build.errors[0] ?? ''}${build.errors.length > 1 ? ` (+${build.errors.length - 1} more)` : ''}`}
          </p>
        </div>
        <button
          type="button"
          disabled={!build.ok}
          onClick={startTest}
          className="shrink-0 rounded-full bg-orange-500 px-5 py-3 font-extrabold text-white shadow-[0_4px_0_#c2410c] transition hover:bg-orange-400 active:translate-y-1 active:shadow-[0_1px_0_#c2410c] disabled:bg-slate-400 disabled:shadow-none"
        >
          ▶ Test
        </button>
      </footer>

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
