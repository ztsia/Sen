import { useState, type ReactNode } from 'react';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { formatSen, medianSen, percent, scaleSen } from '@sen/core/money';
import type { InsightsView } from '@sen/core/views';
import {
  BudgetMeter,
  CategoryBars,
  ChartCard,
  ChartTable,
  ColumnBars,
  GoalMeter,
  PaceChart,
  PartsBar,
  RankedBars,
  SpendCalendar,
  Sparkline,
} from '@/blocks/charts';
import { Money } from '@/blocks/money';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useInsights } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useUi } from '@/frame/ui-store';
import { shortDay } from '@/lib/dates';
import { Loaded, Section, useGo } from '../kit';

/**
 * Insights (screens.md, D62, D73, spec §9.3): where is my money going, and am I on track? One scroll
 * of question cards; a card with no data isn't shown. Every takeaway is worked out by code from the
 * numbers beside it.
 */
export default function Insights() {
  const [cycleId, setCycleId] = useState<string | undefined>();
  const q = useInsights(cycleId);
  return (
    <Screen bar={<AppBar title="Insights" />} senRoom>
      <h2 className="sr-only">Insights</h2>
      <Loaded q={q} what="Insights" skeleton={<InsightsSkeleton />}>
        {(v) => <InsightsBody v={v} onPick={setCycleId} />}
      </Loaded>
    </Screen>
  );
}

function InsightsSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 px-4 pt-2">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

const askSen = () => useUi.getState().setSenOpen(true);
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function isEmpty(v: InsightsView) {
  return [
    v.onTrack,
    v.budgets,
    v.whereWent,
    v.leak,
    v.smallThings,
    v.meal,
    v.experiment,
    v.eatOut,
    v.spokenFor,
    v.renews,
    v.saving,
    v.goals,
    v.trust,
    v.topMerchants,
  ].every((x) => x === null);
}

function InsightsBody({ v, onPick }: { v: InsightsView; onPick: (id: string) => void }) {
  const go = useGo();
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = (
    <>
      <SettingsRow
        label={
          v.cycle.current ? `${v.cycle.label} (this ${v.cycle.basis === 'pay' ? 'cycle' : 'month'})` : v.cycle.label
        }
        value={`${shortDay(v.cycle.start)} – ${shortDay(v.cycle.end)}`}
        onOpen={() => setPickerOpen(true)}
      />
      <Sheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Look at"
        description="Pick the cycle the cards below are about."
      >
        <div className="flex flex-col">
          {[...v.cycles].reverse().map((c) => (
            <Item
              key={c.id}
              asChild
              size="sm"
              className="min-h-14 w-full flex-nowrap rounded-none text-left text-base active:bg-accent"
            >
              <button
                type="button"
                aria-pressed={c.id === v.cycle.id}
                onClick={() => {
                  setPickerOpen(false);
                  onPick(c.id);
                }}
              >
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="text-base font-normal">{c.label}</ItemTitle>
                  <ItemDescription className="text-sm">
                    {shortDay(c.start)} – {shortDay(c.end)}
                    {c.current ? ' · now' : ''}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  {c.id === v.cycle.id ? <CheckIcon className="size-5 text-icon" aria-label="Chosen" /> : null}
                </ItemActions>
              </button>
            </Item>
          ))}
        </div>
      </Sheet>
    </>
  );

  if (isEmpty(v))
    return (
      <>
        {picker}
        <EmptyState line="Your first insights show once you've a few payments." />
      </>
    );

  const groups: [string, (ReactNode | null)[]][] = [
    [
      'This cycle',
      [
        onTrackCard(v),
        budgetsCard(v, go),
        whereWentCard(v, go),
        leakCard(v),
        v.smallThings ? smallCard(v.smallThings) : null,
      ],
    ],
    ['Food', [mealCard(v), experimentCard(v), eatOutCard(v)]],
    ['Commitments', [spokenCard(v), renewsCard(v, go)]],
    ['Over time', [savingCard(v), goalsCard(v, go), trustCard(v), merchantsCard(v)]],
  ];

  return (
    <div className="flex flex-col pb-4">
      {picker}
      {groups.map(([title, cards]) => {
        const shown = cards.filter((c) => c !== null);
        return shown.length ? (
          <Section key={title} title={title}>
            <div className="flex flex-col gap-3 px-4 pt-1">{shown}</div>
          </Section>
        ) : null;
      })}
      <div className="pt-5">
        <SettingsRow label="The year" value={v.cycle.end.slice(0, 4)} onOpen={() => go('insights/year')} />
      </div>
    </div>
  );
}

type Go = ReturnType<typeof useGo>;

function onTrackCard(v: InsightsView) {
  const t = v.onTrack;
  if (!t) return null;
  const today = t.thisCycle.length;
  const spent = t.thisCycle[today - 1] ?? 0;
  const before = t.lastCycle?.[today - 1];
  const diff = before === undefined ? null : spent - before;
  let line = `You've spent ${formatSen(spent)} so far`;
  if (diff === null) line += '.';
  else if (diff === 0) line += ', the same as last cycle by this day.';
  else line += `, ${formatSen(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than last cycle by this day.`;
  if (t.estimate !== null) line += ` An estimate for payday: ${formatSen(t.estimate)}.`;
  return (
    <ChartCard
      key="onTrack"
      question="Am I on track?"
      takeaway={line}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Spent by each day, this cycle and last"
          head={['Day', 'This cycle', 'Last cycle']}
          rows={t.thisCycle.map((s, i) => [
            i + 1,
            formatSen(s),
            t.lastCycle?.[i] === undefined ? 'none' : formatSen(t.lastCycle[i]!),
          ])}
        />
      }
    >
      <PaceChart thisCycle={t.thisCycle} lastCycle={t.lastCycle ?? []} days={t.days} income={t.income ?? undefined} />
    </ChartCard>
  );
}

function budgetsCard(v: InsightsView, go: Go) {
  const b = v.budgets;
  if (!b) return null;
  const risky = b.rows.filter((r) => r.sen / r.cap > b.cycleShare + 0.1);
  const line = risky.length
    ? `${risky.length} of ${count(b.rows.length, 'budget')} ${risky.length === 1 ? 'is' : 'are'} spending faster than the cycle: ${risky.map((r) => r.label).join(', ')}.`
    : `All ${count(b.rows.length, 'budget')} are on track for the cycle so far.`;
  return (
    <ChartCard
      key="budgets"
      question="Which budgets are at risk?"
      takeaway={line}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Spent against each budget"
          head={['Category', 'Spent', 'Budget']}
          rows={b.rows.map((r) => [r.label, formatSen(r.sen), formatSen(r.cap)])}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {b.rows.map((r) => (
          <BudgetMeter key={r.id} label={r.label} sen={r.sen} cap={r.cap} cycleShare={b.cycleShare} />
        ))}
        <p className="text-xs text-muted-foreground">The line on each bar is how far through the cycle you are.</p>
        <Button variant="outline" size="sm" className="self-start" onClick={() => go('budgets')}>
          Open budgets
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </ChartCard>
  );
}

function whereWentCard(v: InsightsView, go: Go) {
  const rows = v.whereWent;
  if (!rows) return null;
  const above = rows.filter((r) => r.sen > r.typical).sort((a, b) => b.sen - b.typical - (a.sen - a.typical))[0];
  const line = above
    ? `${above.label} is ${formatSen(above.sen - above.typical)} above its usual level by this day.`
    : 'Nothing is above its usual level for this point in the cycle.';
  return (
    <ChartCard
      key="whereWent"
      question="Where did it go, and what changed?"
      takeaway={line}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Spent in each category, against its usual"
          head={['Category', 'This cycle', 'Usual by this day']}
          rows={rows.map((r) => [r.label, formatSen(r.sen), formatSen(r.typical)])}
        />
      }
    >
      <CategoryBars rows={rows.map((r) => ({ label: r.label, sen: r.sen, typical: r.typical }))} />
      <p className="text-xs text-muted-foreground">The bar is this cycle; the line is the usual level by this day.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="See the payments in a category">
        {rows.map((r) => (
          <Button
            key={r.id}
            variant="outline"
            size="sm"
            onClick={() => go('payments', { cycle: v.cycle.id, category: r.id })}
          >
            {r.label}
          </Button>
        ))}
      </div>
    </ChartCard>
  );
}

function leakCard(v: InsightsView) {
  const l = v.leak;
  if (!l) return null;
  const perWeekday = new Array<number>(7).fill(0);
  const start = new Date(`${v.cycle.start}T12:00:00+08:00`).getUTCDay();
  l.spent.forEach((s, i) => {
    perWeekday[(start + i) % 7] = (perWeekday[(start + i) % 7] ?? 0) + (s ?? 0);
  });
  const top = Math.max(...perWeekday);
  const line =
    top > 0
      ? `Most of your treats and extras land on ${DAYS[perWeekday.indexOf(top)]!}: ${formatSen(top)} this cycle.`
      : 'No treats or extras so far this cycle.';
  return (
    <ChartCard
      key="leak"
      question="When does the money leak?"
      takeaway={line}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Treats and extras spent each day"
          head={['Day', 'Spent']}
          rows={l.spent.map((s, i) => [i + 1, s === null ? 'not yet' : formatSen(s)])}
        />
      }
    >
      <SpendCalendar
        spent={l.spent.map((s) => s ?? undefined)}
        days={l.days}
        label="Each day of the cycle, shaded by treats and extras spent"
      />
    </ChartCard>
  );
}

function smallCard(s: NonNullable<InsightsView['smallThings']>) {
  return (
    <ChartCard
      key="small"
      question="Do the small things add up?"
      takeaway={`${count(s.count, 'payment')} under ${formatSen(s.under)}, about ${formatSen(scaleSen(s.total, 1, Math.max(1, s.count)))} each.`}
      onAskSen={askSen}
      table={null}
    >
      <p className="text-3xl font-semibold">
        <Money sen={s.total} />
      </p>
    </ChartCard>
  );
}

function mealCard(v: InsightsView) {
  const m = v.meal;
  if (!m) return null;
  const history = m.history.filter((h) => h.sen > 0).map((h) => ({ label: h.label, value: h.sen }));
  return (
    <ChartCard
      key="meal"
      question="What does a meal cost me?"
      takeaway={`An estimate from ${count(m.meals, 'meal')}: each bill shared by the people who ate it.`}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Average meal by cycle"
          head={['Cycle', 'Average meal']}
          rows={history.map((h) => [h.label, formatSen(h.value)])}
        />
      }
    >
      <div>
        <p className="text-3xl font-semibold">
          <Money sen={m.average} />
        </p>
        <p className="text-sm text-muted-foreground">an estimate, per meal</p>
      </div>
      {history.length >= 2 ? <Sparkline points={history} format={formatSen} /> : null}
    </ChartCard>
  );
}

function experimentCard(v: InsightsView) {
  const e = v.experiment;
  if (!e) return null;
  const now = e.weeks[e.weeks.length - 1];
  const over = e.weeks.filter((w) => w.count > e.limit).length;
  const line = now
    ? `${now.label}: ${count(now.count, 'time')} against a limit of ${e.limit} a week, ${now.count > e.limit ? 'over' : 'within it'}. ${over ? `Over in ${over} of ${count(e.weeks.length, 'week')}.` : 'Never over so far.'}`
    : '';
  return (
    <ChartCard
      key="experiment"
      question="Am I keeping my experiment?"
      takeaway={line}
      onAskSen={askSen}
      table={
        <ChartTable
          caption={`${e.label}, times each week`}
          head={['Week', 'Times']}
          rows={e.weeks.map((w) => [w.label, w.count])}
        />
      }
    >
      <p className="text-sm text-muted-foreground">{e.label}</p>
      <ColumnBars
        name="Times"
        columns={e.weeks.map((w) => ({ label: w.label, value: w.count }))}
        format={(n) => String(n)}
        reference={{ value: e.limit, label: `Limit ${e.limit} a week` }}
      />
    </ChartCard>
  );
}

function eatOutCard(v: InsightsView) {
  const e = v.eatOut;
  if (!e) return null;
  const total = e.eatingOut + e.groceries;
  return (
    <ChartCard
      key="eatOut"
      question="Eating out or cooking?"
      takeaway={
        total > 0
          ? `${percent(e.eatingOut / total)}% of what you spent on food was eating out.`
          : 'Nothing spent on food yet.'
      }
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Food spending"
          head={['Part', 'Spent']}
          rows={[
            ['Eating out', formatSen(e.eatingOut)],
            ['Groceries', formatSen(e.groceries)],
          ]}
        />
      }
    >
      <PartsBar
        label="Food spending"
        parts={[
          { key: 'eatingOut', label: 'Eating out', sen: e.eatingOut },
          { key: 'groceries', label: 'Groceries', sen: e.groceries },
        ]}
      />
    </ChartCard>
  );
}

function spokenCard(v: InsightsView) {
  const s = v.spokenFor;
  if (!s) return null;
  return (
    <ChartCard
      key="spoken"
      question="How much is spoken for before I spend?"
      takeaway={
        s.left >= 0
          ? `${formatSen(s.fixed)} goes to fixed costs; ${formatSen(s.left)} is left to spend.`
          : `${formatSen(s.fixed)} goes to fixed costs, and you're ${formatSen(-s.left)} over after spending.`
      }
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Income split"
          head={['Part', 'Amount']}
          rows={[
            ['Fixed costs', formatSen(s.fixed)],
            ['Spent', formatSen(s.spent)],
            ['Left', formatSen(s.left)],
          ]}
        />
      }
    >
      <PartsBar
        label="Income split"
        parts={[
          { key: 'fixed', label: 'Fixed costs', sen: s.fixed },
          { key: 'spent', label: 'Spent', sen: s.spent },
          { key: 'left', label: 'Left', sen: Math.max(0, s.left) },
        ]}
      />
    </ChartCard>
  );
}

function renewsCard(v: InsightsView, go: Go) {
  const r = v.renews;
  if (!r) return null;
  const first = r.next[0];
  return (
    <ChartCard
      key="renews"
      question="What renews soon?"
      takeaway={first ? `Next: ${first.name} on ${shortDay(first.on)}.` : 'Nothing renews soon.'}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Next renewals"
          head={['Subscription', 'Date', 'About']}
          rows={r.next.map((n) => [n.name, shortDay(n.on), formatSen(n.sen)])}
        />
      }
    >
      <div>
        <p className="text-3xl font-semibold">
          <Money sen={r.monthly} />
        </p>
        <p className="text-sm text-muted-foreground">a month in subscriptions</p>
      </div>
      <ul className="flex flex-col">
        {r.next.map((n) => (
          <li key={n.id} className="flex justify-between gap-3 py-1 text-sm">
            <span className="min-w-0 wrap-anywhere">
              {n.name} <span className="text-muted-foreground">· {shortDay(n.on)}</span>
            </span>
            <Money sen={n.sen} className="font-normal" />
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="self-start" onClick={() => go('subscriptions')}>
        Open subscriptions
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </ChartCard>
  );
}

function savingCard(v: InsightsView) {
  const s = v.saving;
  if (!s) return null;
  const last = s.cycles[s.cycles.length - 1];
  if (!last) return null;
  const rel = last.sen > s.median ? 'above' : last.sen < s.median ? 'below' : 'level with';
  return (
    <ChartCard
      key="saving"
      question="Am I saving more than before?"
      takeaway={`${last.label} left ${formatSen(last.sen)}, ${rel} your median of ${formatSen(s.median)} over ${count(s.cycles.length, 'cycle')}.`}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Left at each payday"
          head={['Cycle', 'Left']}
          rows={s.cycles.map((c) => [c.label, formatSen(c.sen)])}
        />
      }
    >
      <ColumnBars
        name="Left"
        columns={s.cycles.map((c) => ({ label: c.label, short: c.label.slice(0, 3), value: c.sen }))}
        format={formatSen}
        reference={{ value: s.median, label: `Median ${formatSen(s.median)}` }}
      />
    </ChartCard>
  );
}

function goalsCard(v: InsightsView, go: Go) {
  const g = v.goals;
  if (!g) return null;
  const nearest = [...g].filter((x) => x.target > 0).sort((a, b) => b.saved / b.target - a.saved / a.target)[0];
  return (
    <ChartCard
      key="goals"
      question="Will my goals make it?"
      takeaway={
        nearest
          ? `${nearest.name} is closest, ${percent(Math.min(1, nearest.saved / nearest.target))}% of the way.`
          : 'No targets set yet.'
      }
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Saved against each goal"
          head={['Goal', 'Saved', 'Target']}
          rows={g.map((x) => [x.name, formatSen(x.saved), formatSen(x.target)])}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {g.map((x) => (
          <GoalMeter key={x.id} label={x.name} saved={x.saved} target={x.target} />
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => go('goals')}>
          Open goals
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </ChartCard>
  );
}

function trustCard(v: InsightsView) {
  const t = v.trust;
  if (!t) return null;
  const last = t.cycles[t.cycles.length - 1];
  if (!last) return null;
  const median = medianSen(t.cycles.map((c) => c.sen)) ?? 0;
  return (
    <ChartCard
      key="trust"
      question="Can I trust these numbers?"
      takeaway={
        last.sen > 0
          ? `${formatSen(last.sen)} this cycle couldn't be matched to a payment; the middle cycle is ${formatSen(median)}.`
          : 'Every payment this cycle is accounted for.'
      }
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Money that couldn't be matched to a payment"
          head={['Cycle', 'Unaccounted']}
          rows={t.cycles.map((c) => [c.label, formatSen(c.sen)])}
        />
      }
    >
      <ColumnBars
        name="Unaccounted"
        columns={t.cycles.map((c) => ({ label: c.label, short: c.label.slice(0, 3), value: c.sen }))}
        format={formatSen}
        reference={{ value: median, label: `Median ${formatSen(median)}` }}
      />
    </ChartCard>
  );
}

function merchantsCard(v: InsightsView) {
  const m = v.topMerchants;
  const top = m?.[0];
  if (!m || !top) return null;
  return (
    <ChartCard
      key="merchants"
      question="Where do I spend most often?"
      takeaway={`${top.label}: ${count(top.count, 'time')}, ${formatSen(top.sen)} in all.`}
      onAskSen={askSen}
      table={
        <ChartTable
          caption="Most frequent merchants"
          head={['Merchant', 'Times', 'Spent']}
          rows={m.map((r) => [r.label, r.count, formatSen(r.sen)])}
        />
      }
    >
      <RankedBars
        rows={m.map((r) => ({
          label: r.label,
          share: r.count / top.count,
          detail: (
            <>
              {r.count}× · <Money sen={r.sen} className="font-normal" />
            </>
          ),
        }))}
      />
    </ChartCard>
  );
}
