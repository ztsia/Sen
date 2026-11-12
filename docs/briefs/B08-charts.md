# B08 · Charts on shadcn's Chart

**Stage 3 · Capture to ledger** · after: B08 · next: B09 · branch `B08/charts`

## Goal

Every chart Sen already draws by hand moves onto shadcn's Chart and Recharts (D151), and **reads
exactly as before** in all six looks, light and dark: same question, same colours by role, same
takeaway, same table behind it. New charts from here on start from shadcn's examples instead of new
geometry. It's also the first slice built as a plan in units: Opus builds the seams, builders do
the rest.

## Read first

- D151, D73, D83, D129; `docs/ui/patterns.md` §4 (charts) and §8 (motion); the `dataviz` skill.
- `docs/workflow/uiux.md` (*Charts*) and `docs/workflow/brief.md` (the plan).
- `apps/web/src/blocks/charts.tsx` (every chart, its colour roles in the comments),
  `apps/web/src/components/ui/chart.tsx` (shadcn's, already customised, unused so far),
  `apps/web/src/components/ui/progress.tsx`, `apps/web/src/screens/insights/goals.tsx` (`GoalRing`).
- ui.shadcn.com/charts: the line, bar (horizontal, stacked, with a reference line) and radial examples.

## Decided

| Today (hand-drawn) | Becomes |
|---|---|
| `PaceChart`, `PaceSpark`, `Sparkline` | Recharts `LineChart` in `ChartContainer` |
| `ColumnBars` | `BarChart`, its dashed reference as `ReferenceLine` |
| `CategoryBars` | `BarChart` `layout="vertical"`, the typical-level tick as a custom shape |
| `PartsBar` | one-row stacked `BarChart`, `layout="vertical"` |
| `GoalRing` | `RadialBarChart` (shadcn's radial example) |
| `BudgetMeter`, `GoalMeter`, `RankedBars`' share | the customised `Progress` (a one-value meter isn't a chart), the budget's cycle tick and warning state kept |
| `SpendCalendar` | **stays** a hand-drawn grid: Recharts has no calendar. A comment says why |
| `ChartCard`, `ChartTable`, `Legend`, `foldParts` | stay as they are. `Legend` shows sen amounts, which `ChartLegend` can't |

- **Colour by role, never by name at a call site.** One `chartConfig` per role in `blocks/charts.tsx`:
  `accent` → `--chart-accent`, `context` → `--chart-context`, `s1`–`s3` → `--chart-1`–`3`, the ramp
  `--chart-seq-1`–`5`, the budget's `--money-warning`. Both rules of patterns §4 hold: focus and
  context, or separate series, never mixed; at most three series.
- **Marks as today:** 2 px lines, 4 px rounded data ends, a 2 px gap of the card between fills, markers
  8 px or more with a 2 px ring of the card, one recessive axis, text never in a series colour.
- **Touch:** a tap or drag shows `ChartTooltip`, its values through `formatSen` (already the default).
  The takeaway line and `ChartTable` still say it all in words.
- **Animation off** (`isAnimationActive={false}`): a chart shows its data as it is. Steady pixels too.
- **Weight:** Recharts' parts weigh about 110 KB gzipped (measured 11 Nov). They live in their own
  chunk, `blocks/charts/recharts.tsx`, loaded by `React.lazy`, and are preloaded once the first frame
  has painted. `build.firstScreenJsBytes` must not grow; `build.installBytes` growing by about that
  much is accepted (D151). Until the chunk arrives, the chart's box keeps its final size and the
  card's surface, so nothing jumps and no skeleton flashes over data already on screen.
- **Accessibility:** the chart's `svg` keeps the app's focus ring (chart.tsx already does). Recharts'
  accessibility layer stays on; `ChartTable` stays the screen reader's way in.

## The plan in units (write it to `docs/plans/B08-charts.md` first)

1. **Seam, the main session:** `chartConfig` by role, the lazy chunk with its sized box and preload,
   and `PaceChart` finished as the example every other line chart copies. The gallery
   (`/dev/gallery`) shows it in every look.
2. **Haiku:** `PaceSpark`, `Sparkline` (copy `PaceChart`).
3. **Haiku:** `ColumnBars`, `PartsBar`.
4. **Sonnet `medium`:** `CategoryBars` (its tick's custom shape takes judgment).
5. **Haiku:** `Progress` meters (`BudgetMeter`, `GoalMeter`, `RankedBars`) and `GoalRing`.
6. **Main session:** review, re-record trees, QA.

Units 2–5 own separate files once unit 1 splits `blocks/charts.tsx`, and run in parallel.

## Done when

1. No chart in `blocks/charts.tsx` or `goals.tsx` draws its own geometry except `SpendCalendar`.
2. `pnpm test`, `typecheck`, `lint`, `pnpm e2e` pass; trees re-recorded (`e2e:trees`), each difference
   only inside a chart.
3. `node scripts/qa-diff.mjs`: pixel changes only in chart areas; no metric flag except
   `build.installBytes`, explained.
4. `node apps/web/scripts/frame-times.mjs`: Home and Insights no slower than `main` beyond the limits.
5. QA's full run (the `qa` skill) says ship, with the eyes pass on every changed screen.

## On your phone

Open Home and Insights in two looks, light and dark: the charts look as they did, and a tap on one
shows its values.
