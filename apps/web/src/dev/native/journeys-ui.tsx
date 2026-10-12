import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/blocks/sheet';
import { startDraft } from '@/data/hooks';
import { useUi } from '@/frame/ui-store';
import { useTheme } from '@/theme/store';
import { JOURNEYS, journeyById, type Journey } from '../journeys';
import { useCtx } from './use-ctx';
import { useNative } from './store';
import { Widget } from './widgets';

// The guided journeys (B04): a list of every flows.md journey, and a small bar that walks one screen by
// screen. The data is dev/journeys.ts, so Playwright can walk the same list.

interface Playing {
  journey: string | null;
  step: number;
  /** The draft that reading and confirm show, made when a step asks for a new one. */
  draft: string | null;
  start: (id: string) => void;
  go: (step: number) => void;
  setDraft: (id: string | null) => void;
  end: () => void;
}

export const useJourney = create<Playing>((set) => ({
  journey: null,
  step: 0,
  draft: null,
  start: (journey) => set({ journey, step: 0, draft: null }),
  go: (step) => set({ step }),
  setDraft: (draft) => set({ draft }),
  end: () => set({ journey: null, step: 0, draft: null }),
}));

export function JourneysSheet() {
  const { sheet, setSheet } = useNative();
  const start = useJourney((s) => s.start);
  const groups = [...new Set(JOURNEYS.map((j) => j.group))];
  return (
    <Sheet
      open={sheet === 'journeys'}
      onOpenChange={(o) => setSheet(o ? 'journeys' : null)}
      title="Guided journeys"
      description="Every journey in docs/flows.md, screen by screen. Core journeys are walked in every QA run."
    >
      <div className="flex flex-col gap-3 pb-4">
        {groups.map((g) => (
          <section key={g} aria-label={g} className="flex flex-col">
            <h3 className="pb-1 text-sm font-semibold text-muted-foreground">{g}</h3>
            {JOURNEYS.filter((j) => j.group === g).map((j) => (
              <button
                key={j.id}
                type="button"
                data-testid={`journey-${j.id}`}
                className="flex min-h-12 items-center justify-between gap-2 border-b border-border py-2 text-left"
                onClick={() => {
                  setSheet(null);
                  // let the list's sheet finish closing before the first step navigates
                  setTimeout(() => start(j.id), 450);
                }}
              >
                <span className="flex flex-col">
                  <span className="text-base">{j.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {j.id} · {j.steps.length} steps
                  </span>
                </span>
                {j.core ? <Badge variant="secondary">Core</Badge> : null}
              </button>
            ))}
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** Puts the app where a step says: its scenario and state, its screen, and any stand-in over it. */
function useApplyStep(j: Journey | undefined, i: number) {
  // useGo returns a new function each render, so the effect reads the latest through a ref
  const ctx = useCtx();
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  });
  const token = useRef(0);
  useEffect(() => {
    const step = j?.steps[i];
    if (!j || !step) return;
    const mine = ++token.current;
    const ui = useUi.getState();
    ui.setScenario(step.scenario ?? j.scenario ?? 'wei-ming');
    ui.setDevState(step.state ?? 'normal');
    useNative.getState().setSheet(null);
    useNative.getState().setShade(step.surface ?? null);
    const run = ctxRef.current;
    void (async () => {
      const search = { ...step.search };
      if (step.draft === 'new') {
        try {
          useJourney.getState().setDraft(await startDraft(null, search.id ?? null));
        } catch {
          useJourney.getState().setDraft(null);
        }
      }
      if (step.draft) search.id = useJourney.getState().draft ?? search.id;
      if (mine !== token.current) return;
      if (step.screen === 'sen') {
        // Sen opens over the screen before it
        if (i === 0) run.go('home');
        ui.setSenOpen(true);
      } else if (step.screen === 'cycle' || step.screen === 'scan-more') {
        run.go('home');
        if (step.screen === 'scan-more') ui.setScanMoreOpen(true);
      } else run.go(step.screen, search);
    })();
  }, [j, i]);
}

export function JourneyOverlay() {
  const { journey, step, go, end } = useJourney();
  const theme = useTheme();
  const scenario = useUi((s) => s.scenario);
  const j = journey ? journeyById.get(journey) : undefined;
  const ctx = useCtx();
  useApplyStep(j, step);
  const cur = j?.steps[step];
  if (!j || !cur) return null;
  const last = step === j.steps.length - 1;
  return (
    <div
      role="region"
      aria-label="Guided journey"
      data-testid="journey-bar"
      className={`pointer-events-auto fixed inset-x-0 z-[var(--z-index-dev)] mx-auto flex max-w-[480px] flex-col gap-2 px-2 ${
        cur.screen === 'sen' ? 'top-2' : 'bottom-24'
      }`}
    >
      {cur.widgets ? (
        <Widget
          size="M"
          look={theme.wantLook}
          mode={scenario === 'capture-off' ? 'dark' : 'light'}
          off={scenario === 'capture-off'}
          ctx={ctx}
        />
      ) : null}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
        <p className="text-xs font-semibold text-muted-foreground">
          {j.title} · Step {step + 1} of {j.steps.length}
        </p>
        <p className="text-sm" data-testid="journey-caption">
          {cur.caption}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={step === 0} onClick={() => go(step - 1)}>
            Back
          </Button>
          <Button size="sm" onClick={() => (last ? end() : go(step + 1))}>
            {last ? 'Finish' : 'Next'}
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={end}>
            End
          </Button>
        </div>
      </div>
    </div>
  );
}
