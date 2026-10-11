import { useState } from 'react';
import { scaleSen } from '@sen/core/money';
import type { HomeView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loaded } from '@/screens/kit';
import { useBudgets, useHome, useInsights, useNeedsYouCount } from '@/data/hooks';
import { LOOK_IDS, LOOK_NAMES, isLookId, type LookId } from '@/looks/ids';
import { useTheme } from '@/theme/store';
import { cn } from '@/lib/utils';
import type { Ctx } from './surfaces';

// Widgets S, M and L (D32, D74), as stand-ins: Android draws the real ones in each look's colours and
// shapes (D101). Here they borrow the look's tokens, from useHome() and its neighbours.

export type WidgetSize = 'S' | 'M' | 'L';
const SIZE_NAMES: Record<WidgetSize, string> = { S: 'Small', M: 'Medium', L: 'Large' };
const WIDTH: Record<WidgetSize, string> = { S: 'w-40 h-40', M: 'w-full h-40', L: 'w-full h-80' };

/** A thin bar: how much of something has gone, drawn so the two meters line up. */
function Meter({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div role="img" aria-label={`${label}: ${pct}%`} className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

export function Widget({
  size,
  look,
  mode,
  off,
  ctx,
}: {
  size: WidgetSize;
  look: LookId;
  mode: 'light' | 'dark';
  off: boolean;
  ctx: Ctx;
}) {
  const home = useHome();
  const insights = useInsights();
  const budgets = useBudgets();
  const review = useNeedsYouCount();
  return (
    <div
      data-look={look}
      data-mode={mode}
      data-testid={`widget-${size}-${look}-${mode}${off ? '-off' : ''}`}
      className={cn(
        'flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-3 text-card-foreground',
        WIDTH[size],
      )}
    >
      <Loaded q={home} what="the widget" skeleton={<p className="text-sm text-muted-foreground">Loading…</p>}>
        {(h) =>
          off ? (
            <div className="flex h-full flex-col items-start justify-between">
              <button
                type="button"
                className="flex min-h-12 flex-col items-start text-left"
                onClick={() => ctx.go('home')}
                aria-label="Capture is off. Open Home"
              >
                <span className="text-base font-semibold text-money-warning">Capture is off</span>
                {size === 'S' ? null : (
                  <span className="text-sm text-muted-foreground">Sen is not seeing your payments.</span>
                )}
              </button>
              <Button variant="warning" size="sm" onClick={() => ctx.go('settings/capture/access')}>
                Fix
              </Button>
            </div>
          ) : (
            <Body
              h={h}
              size={size}
              ctx={ctx}
              review={review}
              topCategories={insights.data?.whereWent?.slice(0, 3) ?? []}
              atRisk={
                budgets.data?.rows.reduce<NonNullable<typeof budgets.data>['rows'][number] | null>(
                  (a, r) => (!a || r.sen * a.cap > a.sen * r.cap ? r : a),
                  null,
                ) ?? null
              }
            />
          )
        }
      </Loaded>
    </div>
  );
}

function Body({
  h,
  size,
  ctx,
  review,
  topCategories,
  atRisk,
}: {
  h: HomeView;
  size: WidgetSize;
  ctx: Ctx;
  review: number;
  topCategories: { id: string; label: string; sen: number }[];
  atRisk: { label: string; sen: number; cap: number } | null;
}) {
  const f = h.figure;
  const left = f.kind === 'left';
  const budget = f.spent + Math.max(f.sen, 0);
  const spentPct = left
    ? budget > 0
      ? scaleSen(f.spent, 100, budget)
      : 0
    : f.income > 0
      ? scaleSen(f.spent, 100, f.income)
      : 0;
  const elapsedPct = Math.round((f.day * 100) / f.days);
  const label = left ? 'left until payday' : f.kind === 'since-start' ? 'spent since you started' : 'spent this month';
  const delta = h.pace.delta;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <button
        type="button"
        className="flex min-h-12 flex-col items-start gap-1 text-left"
        onClick={() => ctx.go('home')}
        aria-label={`Open Home. ${label}`}
      >
        <span className="text-xs text-muted-foreground">{label}</span>
        <Money sen={left ? f.sen : f.spent} kind={f.over ? 'warning' : 'out'} className="text-2xl" />
      </button>
      <div className="flex flex-col gap-1">
        <Meter label="Spent" pct={spentPct} />
        <Meter label="Days gone" pct={elapsedPct} />
      </div>
      {size !== 'S' && delta !== null ? (
        <p className="text-xs text-muted-foreground">
          <Money sen={Math.abs(delta)} whole /> {delta > 0 ? 'more' : 'less'} than last cycle by this day
        </p>
      ) : null}
      {size === 'L' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden text-sm">
          {topCategories.map((c) => (
            <p key={c.id} className="flex justify-between gap-2">
              <span className="truncate">{c.label}</span>
              <Money sen={c.sen} />
            </p>
          ))}
          {atRisk ? (
            <p className="text-xs text-muted-foreground">
              Most at risk: {atRisk.label}, <Money sen={atRisk.sen} whole /> of <Money sen={atRisk.cap} whole />
            </p>
          ) : null}
          {h.note ? <p className="line-clamp-2 text-xs italic">“{h.note.text}”</p> : null}
        </div>
      ) : null}
      <div className="mt-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={() => ctx.go('scan')}>
          Scan
        </Button>
        {size !== 'S' ? (
          <Button variant="outline" size="sm" onClick={() => ctx.go('review')}>
            Review {review}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** The widgets page: one look at a time, in light, dark, and dark with *Capture is off* and *Fix*. */
export function Widgets({ ctx }: { ctx: Ctx }) {
  const theme = useTheme();
  const [look, setLook] = useState<LookId>(theme.wantLook);
  const [size, setSize] = useState<WidgetSize>('S');
  const variants = [
    { name: 'Light', mode: 'light' as const, off: false },
    { name: 'Dark', mode: 'dark' as const, off: false },
    { name: 'Dark · Capture is off', mode: 'dark' as const, off: true },
  ];
  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-sm text-muted-foreground">
        Stand-ins: Android draws the real widgets in each look’s own colours and shapes (D101).
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Look"
        value={look}
        className="flex-wrap"
        onValueChange={(v) => isLookId(v) && setLook(v)}
      >
        {LOOK_IDS.map((id) => (
          <ToggleGroupItem key={id} value={id}>
            {LOOK_NAMES[id]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        aria-label="Size"
        value={size}
        onValueChange={(v) => (v === 'S' || v === 'M' || v === 'L') && setSize(v)}
      >
        {(['S', 'M', 'L'] as const).map((s) => (
          <ToggleGroupItem key={s} value={s}>
            {SIZE_NAMES[s]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {variants.map((v) => (
        <section key={v.name} aria-label={v.name} className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-muted-foreground">{v.name}</h3>
          <Widget size={size} look={look} mode={v.mode} off={v.off} ctx={ctx} />
        </section>
      ))}
    </div>
  );
}
