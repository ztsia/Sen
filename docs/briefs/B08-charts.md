# B08 · Charts on shadcn's Chart

**Stage 3 · Capture to ledger** · after: B08 · First run, accounts and categories · next: B09 · branch
`B08/charts`

## Goal

Sen gets **one chart component** (spec §9.8, D151, D152): a chart described as data, drawn by shadcn's
Chart and Recharts, in thirteen kinds, each shown in the gallery from data alone. The screens and,
from B27, Sen's `show_chart` use the same one. Every chart Sen already draws by hand moves onto it
and **reads exactly as before** in all six looks, light and dark: same question, same colours by
role, same takeaway, same table behind it. The palette grows from three series colours to six. It's
also the first slice built as a plan in units: Opus builds the seams, builders do the rest.

## Read first

- `spec_v2.md` §9.8 (the thirteen kinds and the interactions) and §9.3 (the cards that use them).
- D151, D152, D73, D83, D129; `docs/ui/patterns.md` §4 (charts, *The palette*, *Marks*) and §8
  (motion); the `dataviz` skill.
- `docs/workflow/uiux.md` (*Charts*) and `docs/workflow/brief.md` (the plan).
- `apps/web/src/blocks/charts.tsx` (every chart, its colour roles in the comments),
  `apps/web/src/components/ui/chart.tsx` (shadcn's, already customised, unused so far),
  `apps/web/src/components/ui/progress.tsx`, `apps/web/src/screens/insights/goals.tsx` (`GoalRing`).
- `docs/ui/directions/palette.mjs` and `validate_palette.js`, which hold the series hues and their
  checks (`pnpm looks` regenerates `looks.gen.css` from them).
- ui.shadcn.com/charts: the line, area, bar (horizontal, stacked, with a reference line), pie and
  radial examples.

## Builds

### The one component (§9.8)
- **A chart is described as data:** its kind, title, series, points, unit, a note and options. One
  component draws it, on shadcn's `ChartContainer` and Recharts. Nothing at a call site draws
  geometry.
- **Thirteen kinds,** each with its variants, and each shown in `/dev/gallery` from a description
  alone, in every look:
  - line (against last cycle, a limit line, a dashed estimate, stepped)
  - area (single, stacked, shares of 100%)
  - bar (negatives coloured, value labels, one highlighted, a budget or typical line)
  - stacked bar (amounts or shares) and ranked bar (top N with *and N more*, a typical mark)
  - bars with a line (a second axis only when the units differ)
  - donut (the total in the middle, one highlighted) and ring (one, or several with a total)
  - treemap, waterfall and flow (Sankey)
  - calendar (a month or a cycle, with streaks), hand-drawn inside the component: Recharts has none
  - spark, a tiny line for cards and rows
- **An estimate is drawn apart from a fact,** dashed.
- **Left out:** funnel, radar, map and scatter.

### Its interactions
- **A tap shows the exact amount and holds it;** a second tap opens the payments behind it.
- **A tap on the legend hides a series,** and a switch changes the range.
- **Its table sits behind it,** and the takeaway line says the answer in words.

### Six series colours
- **The palette is widened from three series colours to six,** in the same hue order, and checked in
  all twelve look-and-mode pairs, every pair of slots, with the `dataviz` validator (patterns §4,
  *The palette*).
- **If six can't pass every pair** in every look, the slice reports what passes, and the owner
  decides. It doesn't loosen a check.

### The charts already built
- **Every chart in `blocks/charts.tsx`, and the goal ring,** move onto the component, and the meters
  onto `Progress` (the table below). Recharts loads in its own chunk.

## Decided

| Today (hand-drawn) | Becomes |
|---|---|
| `PaceChart`, `PaceSpark`, `Sparkline` | Recharts `LineChart` in `ChartContainer` |
| `ColumnBars` | `BarChart`, its dashed reference as `ReferenceLine` |
| `CategoryBars` | `BarChart` `layout="vertical"`, the typical-level tick as a custom shape |
| `PartsBar` | one-row stacked `BarChart`, `layout="vertical"` |
| `GoalRing` | `RadialBarChart` (shadcn's radial example) |
| `BudgetMeter`, `GoalMeter`, `RankedBars`' share | the customised `Progress` (a one-value meter isn't a chart), the budget's cycle tick and warning state kept |
| `SpendCalendar` | **stays** a hand-drawn grid, now inside the component's calendar kind: Recharts has none. A comment says why |
| `ChartCard`, `ChartTable`, `Legend`, `foldParts` | stay as they are. `Legend` shows sen amounts, which `ChartLegend` can't |

- **Colour by role, never by name at a call site.** One `chartConfig` per role in `blocks/charts.tsx`:
  `accent` → `--chart-accent`, `context` → `--chart-context`, `s1`–`s6` → `--chart-1`–`6`, the ramp
  `--chart-seq-1`–`5`, the budget's `--money-warning`. Both rules of patterns §4 hold: focus and
  context, or separate series, never mixed; at most six series, and a seventh thing folds into
  *Other*, in `chart-context`.
- **Marks as today:** 2 px lines, 4 px rounded data ends, a 2 px gap of the card between fills, markers
  8 px or more with a 2 px ring of the card, one recessive axis, text never in a series colour.
- **Touch:** a tap or drag shows `ChartTooltip`, its values through `formatSen` (already the default),
  and holds it; a second tap opens the payments behind the point, as a category bar does today. The
  takeaway line and `ChartTable` still say it all in words.
- **Animation off** (`isAnimationActive={false}`): a chart shows its data as it is. Steady pixels too.
- **Weight:** Recharts' parts weigh about 110 KB gzipped (measured 11 Nov). They live in their own
  chunk, `blocks/charts/recharts.tsx`, loaded by `React.lazy`, and are preloaded once the first frame
  has painted. `build.firstScreenJsBytes` must not grow; `build.installBytes` growing by about that
  much is accepted (D151). Until the chunk arrives, the chart's box keeps its final size and the
  card's surface, so nothing jumps and no skeleton flashes over data already on screen.
- **Accessibility:** the chart's `svg` keeps the app's focus ring (chart.tsx already does). Recharts'
  accessibility layer stays on; `ChartTable` stays the screen reader's way in.

## The plan in units (write it to `docs/plans/B08-charts.md` first)

1. **Seam, the main session:** the description's type, `chartConfig` by role, the six-colour palette
   and its checks, the lazy chunk with its sized box and preload, the interactions every kind shares
   (tap and hold, second tap, legend, range switch), and the line kind finished as the example every
   other kind copies, with `PaceChart` on it. The gallery (`/dev/gallery`) shows it in every look.
2. **Haiku:** the spark kind (`PaceSpark`, `Sparkline`), and the calendar kind wrapping
   `SpendCalendar`.
3. **Haiku:** the bar and stacked bar kinds (`ColumnBars`, `PartsBar`).
4. **Sonnet `medium`:** the ranked bar kind (`CategoryBars`: its tick's custom shape takes judgment).
5. **Haiku:** the ring kind (`GoalRing`) and the `Progress` meters (`BudgetMeter`, `GoalMeter`,
   `RankedBars`).
6. **Sonnet `medium`:** the area, donut and bars-with-a-line kinds.
7. **Sonnet `medium`:** the treemap, waterfall and flow kinds.
8. **Main session:** review, re-record trees, QA.

Units 2–7 own separate files once unit 1 splits `blocks/charts.tsx`, and run in parallel.

## Done when

1. Every kind draws from a description alone in the gallery, in every look, with its table behind it.
2. No chart in `blocks/charts.tsx` or `goals.tsx` draws its own geometry except `SpendCalendar`,
   which sits inside the component's calendar kind.
3. Every screen reads as before in all twelve look-and-mode pairs. `pnpm test`, `typecheck`, `lint`,
   `pnpm e2e` pass; trees re-recorded (`e2e:trees`), each difference only inside a chart.
4. Six series colours pass the `dataviz` checks in all twelve pairs, or the report says which pass and
   the owner has decided.
5. `node scripts/qa-diff.mjs`: pixel changes only in chart areas; no metric flag except
   `build.installBytes`, explained. The first screen's code didn't grow (`build.firstScreenJsBytes`).
6. `node apps/web/scripts/frame-times.mjs`: Home and Insights no slower than `main` beyond the limits.
7. QA's full run (the `qa` skill) says ship, with the eyes pass on every changed screen.

## On your phone

Open Home and Insights in two looks, light and dark: the charts look as they did, and a tap on one
shows its values and holds them; a second tap opens the payments behind it.
