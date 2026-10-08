import type { ReactNode } from 'react';
import { MessageCircleIcon, TriangleAlertIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { formatSen, percent } from '@sen/core/money';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

// The chart base (patterns.md §4, the dataviz skill), on shadcn's Chart. Two ways to use colour, never
// mixed in one chart: focus and context (the look's accent, and a grey), the default; or separate
// series, chart-1 to chart-3 in the chart's own fixed order, a fourth thing folding into Other. Ordered
// steps use the sequential ramp. The hues are validated per look by docs/ui/directions/palette.mjs.
// Marks: 2 px lines, 4 px rounded data ends, a 2 px gap of the card between fills, markers of 8 px or
// more with a 2 px ring of the card. One axis, recessive. Text never wears a series colour.

/** A question, its chart, a one-line takeaway computed by code, and Ask Sen about this (D73). */
export function ChartCard({
  question,
  takeaway,
  children,
  table,
  onAskSen,
}: {
  question: string;
  takeaway: string;
  children: ReactNode;
  table: ReactNode;
  onAskSen?: () => void;
}) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base leading-snug">{question}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {children}
        {table}
      </CardContent>
      <CardFooter className="flex-col items-start gap-1">
        <p className="text-sm text-muted-foreground">{takeaway}</p>
        {onAskSen ? (
          <Button variant="ghost" size="sm" className="-ml-3" onClick={onAskSen}>
            <MessageCircleIcon aria-hidden="true" />
            Ask Sen about this
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

/** The values behind a chart, as a table a screen reader can read: the chart is never the only way to get them. */
export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface Part {
  key: string;
  label: string;
  sen: number;
}
/**
 * At most three series (patterns.md §4): the first three in the chart's own order keep their slots,
 * and anything after them folds into Other, which takes the context grey. Never ranked by size, so a
 * part keeps its colour when the numbers change.
 */
export function foldParts(parts: Part[], max = 3): (Part & { color: string })[] {
  const kept = parts.slice(0, max).map((p, i) => ({ ...p, color: `var(--chart-${i + 1})` }));
  const rest = parts.slice(max);
  if (!rest.length) return kept;
  return [
    ...kept,
    { key: 'other', label: 'Other', sen: rest.reduce((a, p) => a + p.sen, 0), color: 'var(--chart-context)' },
  ];
}

/** Focus and context: this cycle (the accent) against last cycle (the grey), spent by each day. */
export function PaceChart({
  thisCycle,
  lastCycle,
  days,
  income,
}: {
  thisCycle: number[];
  lastCycle: number[];
  days: number;
  income?: number;
}) {
  const config = {
    thisCycle: { label: 'This cycle', color: 'var(--chart-accent)' },
    lastCycle: { label: 'Last cycle', color: 'var(--chart-context)' },
  } satisfies ChartConfig;
  const today = thisCycle.length;
  const data = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    thisCycle: thisCycle[i],
    lastCycle: lastCycle[i],
  }));
  const top = Math.max(income ?? 0, ...thisCycle, ...lastCycle);
  return (
    <>
      <ChartContainer
        config={config}
        className="aspect-auto h-36 w-full"
        initialDimension={{ width: 320, height: 144 }}
      >
        <LineChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }} accessibilityLayer>
          <XAxis
            dataKey="day"
            ticks={[1, today, days]}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={(t: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) => {
              const d = typeof t.payload?.value === 'number' ? t.payload.value : 0;
              // the end ticks anchor inward, so neither label is cut off at the card's edge
              const anchor = d === 1 ? 'start' : d === days ? 'end' : 'middle';
              return (
                <text
                  x={t.x}
                  y={(typeof t.y === 'number' ? t.y : 0) + 12}
                  textAnchor={anchor}
                  fontSize={11}
                  fill="var(--muted-foreground)"
                >
                  {d === today ? 'Today' : d === days ? 'Payday' : `Day ${d}`}
                </text>
              );
            }}
          />
          <YAxis hide domain={[0, top]} />
          {income ? (
            <ReferenceLine
              y={income}
              stroke="var(--border)"
              label={{
                value: `Income ${formatSen(income)}`,
                position: 'insideTopLeft',
                fill: 'var(--muted-foreground)',
                fontSize: 11,
              }}
            />
          ) : null}
          <ChartTooltip
            cursor={{ stroke: 'var(--border)' }}
            content={
              <ChartTooltipContent labelFormatter={(_, p) => `Day ${p?.[0]?.payload?.day ?? ''}`} indicator="line" />
            }
          />
          <Line
            dataKey="lastCycle"
            stroke="var(--color-lastCycle)"
            strokeWidth={2}
            dot={false}
            strokeLinecap="round"
            isAnimationActive={false}
          />
          <Line
            dataKey="thisCycle"
            stroke="var(--color-thisCycle)"
            strokeWidth={2}
            strokeLinecap="round"
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === today - 1 ? (
                <circle
                  key="today"
                  cx={p.cx}
                  cy={p.cy}
                  r={5}
                  fill="var(--chart-accent)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ) : (
                <g key={p.index} />
              )
            }
          />
        </LineChart>
      </ChartContainer>
      <Legend
        items={[
          { label: 'This cycle', color: 'var(--chart-accent)', line: true },
          { label: 'Last cycle', color: 'var(--chart-context)', line: true },
        ]}
      />
    </>
  );
}

/** A legend: always there for two or more series; identity is never colour alone. Text stays in text colours. */
export function Legend({ items }: { items: { label: string; color: string; sen?: number; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={it.line ? 'h-0.5 w-3.5 rounded-full' : 'size-2.5 rounded-[3px]'}
            style={{ background: it.color }}
          />
          {it.label}
          {it.sen !== undefined ? <span className="num font-semibold text-foreground">{formatSen(it.sen)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Separate series: one bar split into its parts, in the chart's own order (fixed costs · spent · left). */
export function PartsBar({ parts, label }: { parts: Part[]; label: string }) {
  const folded = foldParts(parts);
  const config = Object.fromEntries(
    folded.map((p) => [p.key, { label: p.label, color: p.color }]),
  ) satisfies ChartConfig;
  const row = Object.fromEntries([['name', label], ...folded.map((p) => [p.key, p.sen])]);
  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-12 w-full" initialDimension={{ width: 320, height: 48 }}>
        <BarChart
          data={[row]}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barSize={16}
          accessibilityLayer
        >
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          {folded.map((p, i) => (
            <Bar
              key={p.key}
              dataKey={p.key}
              stackId="parts"
              fill={`var(--color-${p.key})`}
              stroke="var(--card)"
              strokeWidth={2}
              radius={i === 0 ? [4, 0, 0, 4] : i === folded.length - 1 ? [0, 4, 4, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <Legend items={folded.map((p) => ({ label: p.label, color: p.color, sen: p.sen }))} />
    </>
  );
}

export interface CategoryRow {
  label: string;
  sen: number;
  typical: number;
}
/** Focus and context: each category this cycle, the accent where it's above its typical level, which a tick marks. */
export function CategoryBars({ rows }: { rows: CategoryRow[] }) {
  const config = { sen: { label: 'This cycle' } } satisfies ChartConfig;
  const max = Math.max(...rows.map((r) => Math.max(r.sen, r.typical)));
  const data = rows.map((r) => ({ ...r, fill: r.sen > r.typical ? 'var(--chart-accent)' : 'var(--chart-context)' }));
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: rows.length * 34 + 8 }}
      initialDimension={{ width: 320, height: rows.length * 34 + 8 }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 76, bottom: 4, left: 0 }}
        barCategoryGap={8}
        accessibilityLayer
      >
        <CartesianGrid horizontal={false} vertical={false} />
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={112}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--foreground)', fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
        <Bar
          dataKey="sen"
          isAnimationActive={false}
          shape={(p: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            payload?: CategoryRow & { fill: string };
          }) => {
            const { x = 0, y = 0, width = 0, height = 0, payload } = p;
            if (!payload) return <g />;
            const scale = width / Math.max(1, payload.sen);
            const tx = x + payload.typical * scale;
            const w = Math.max(0, width);
            const r = Math.min(4, w);
            return (
              <g>
                <path
                  d={`M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${height - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r)}z`}
                  fill={payload.fill}
                />
                <line x1={tx} x2={tx} y1={y - 3} y2={y + height + 3} stroke="var(--card)" strokeWidth={5.5} />
                <line x1={tx} x2={tx} y1={y - 3} y2={y + height + 3} stroke="var(--foreground)" strokeWidth={1.5} />
                <text
                  x={Math.max(x + w, tx) + 6}
                  y={y + height / 2 + 4}
                  fontSize={12}
                  fill="var(--muted-foreground)"
                  className="num"
                >
                  {formatSen(payload.sen)}
                </text>
              </g>
            );
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * The sequential ramp: a cycle's days, shaded from least to most (chart-seq-1 to chart-seq-5). A day
 * with nothing in it is muted, and days still to come are an outline.
 */
export function SpendCalendar({ spent, days, label }: { spent: (number | undefined)[]; days: number; label: string }) {
  const max = Math.max(1, ...spent.map((v) => v ?? 0));
  const cell = 36,
    gap = 4;
  return (
    <>
      <svg
        viewBox={`0 0 ${7 * cell + 6 * gap} ${Math.ceil(days / 7) * (cell + gap) - gap}`}
        className="w-full max-w-[276px]"
        role="img"
        aria-label={label}
      >
        {Array.from({ length: days }, (_, i) => {
          const v = spent[i];
          const step = v ? Math.ceil((5 * v) / max) : 0;
          const x = (i % 7) * (cell + gap),
            y = Math.floor(i / 7) * (cell + gap);
          const fill = v === undefined ? 'none' : step ? `var(--chart-seq-${step})` : 'var(--muted)';
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={6}
                fill={fill}
                stroke={v === undefined ? 'var(--border)' : 'none'}
              />
              <text x={x + 5} y={y + 13} fontSize={10} fill={step >= 3 ? 'var(--card)' : 'var(--muted-foreground)'}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="mr-1">Less</span>
        {[1, 2, 3, 4, 5].map((k) => (
          <span key={k} className="h-2.5 w-4 rounded-[3px]" style={{ background: `var(--chart-seq-${k})` }} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </>
  );
}

/**
 * A budget's meter: spent against its cap, with a tick where the cycle is. At risk, it takes the
 * warning colour, always with its icon and words (patterns.md §4).
 */
export function BudgetMeter({
  label,
  sen,
  cap,
  cycleShare,
}: {
  label: string;
  sen: number;
  cap: number;
  cycleShare: number;
}) {
  const share = sen / cap;
  const risk = share > cycleShare + 0.1;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="num text-right text-muted-foreground">
          {formatSen(sen)} of {formatSen(cap)}
        </span>
      </div>
      <svg viewBox="0 0 300 12" preserveAspectRatio="none" className="h-3 w-full" aria-hidden="true">
        <rect x="0" y="2" width="300" height="8" rx="4" fill="var(--muted)" />
        <rect
          x="0"
          y="2"
          width={300 * Math.min(1, share)}
          height="8"
          rx="4"
          fill={risk ? 'var(--money-warning)' : 'var(--chart-accent)'}
        />
        <line x1={300 * cycleShare} x2={300 * cycleShare} y1="0" y2="12" stroke="var(--card)" strokeWidth="5.5" />
        <line x1={300 * cycleShare} x2={300 * cycleShare} y1="0" y2="12" stroke="var(--foreground)" strokeWidth="1.5" />
      </svg>
      {risk ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-money-warning">
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          At risk: {percent(share)}% spent, {percent(cycleShare)}% of the cycle gone
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">On track</span>
      )}
    </div>
  );
}
