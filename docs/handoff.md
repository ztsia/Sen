# Handoff

Rewritten 10 Oct 2026 by the B03 session, mid-slice. The protocol is in `CLAUDE.md`, *Session
rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B03 · Skeleton: the five tabs is in progress on `B03/skeleton-tabs`** (from `main` after PR #6).
  B01, B02, the status-bar fix (PR #5) and D123 (PR #6) are merged.
- **Done and pushed:**
  - The shared types: `packages/core/src/schema.ts` (§15's rows, zod, money as `Sen`/`Amount`
    integers), `views.ts` (one read shape per screen), `commands.ts` (every write, as data, with
    Undo), `cycles.ts` (pay cycles and KL days, tested). `money.ts` gained `scaleSen`, `medianSen`,
    `fxApprox` (tested).
  - The data layer: `apps/web/src/data/` — `backend.ts` (the one interface), `hooks.ts` (a query
    hook per screen, `useWrite` with Undo toasts), `index.ts` (TanStack Query; the fake loads only in
    previews, so production's build holds no made-up data), `fake/` (Wei Ming's month in
    `scenario.ts`, its edge states in `variants.ts`, views and writes, and `fake.test.ts`, which
    parses every view with the shared zod schemas in every scenario).
  - Home, the `cycle` sheet, Review and `skipped`; the dev panel's *Made-up scenario* switch;
    `?scenario=` and `?state=` set them on load. The screens route through `screens/skeleton.ts`
    (previews only); production still shows *Not built yet*.
  - e2e: `screens.spec.ts` (axe and 48 px in all twelve looks, every screen state), `journeys.spec.ts`
    (Home and Review's journeys so far), production's guard in `production.spec.ts`.
- **Also done:** every screen of the brief (Insights and its five, More's four, Scan's five, each
  look's Home material), all 16 journeys in all twelve looks, axe and 48 px on every screen, the
  `uiux` pass (`qa/B03/uiux.md`), and the docs (`CLAUDE.md`, B05's brief). The full `pnpm e2e` is
  green.
- **QA run 1** (full) said *fix first*: 6 Majors, 8 Minors. All fixed in one tier-3 batch
  (`qa/B03/ledger.md`); its report is `qa/B03/report-run1.md`, published at
  https://claude.ai/artifact/WfFSai2Hz3RP9Kbe93w88p.
- **In progress: QA run 2**, a fresh full run (tier 3), and the repo's `pnpm e2e` beside it.
- **Still to do:** read run 2, fix by tier, publish its report to the same artifact, then the PR
  *B03 · Skeleton: the five tabs*.

## Decided, and why

- **D124 (owner, 10 Oct): the core journeys are `first-run`, `pay-new` and `scan-after`**, marked in
  `flows.md`; every QA run walks them.
- **The fake applies a write at once and "syncs" 1.2 s later**, like the outbox will; offline, rows
  stay *Not synced yet*. Undo is a backend command (`{ type: 'undo', token }`), so the API can do it
  its own way in B05.
- **A journey can't reload mid-way:** the made-up data lives in the page's memory, so journeys move
  through the app, not with `page.goto`, after a write.
- **`npx shadcn add` installed an unrelated npm package called `cn`** (it misread the utils alias).
  Removed; add shadcn components with `--dry-run` first and check `package.json` after.

## Open with the owner

- **D115 is still *Proposed*.** The owner asked what it was (10 Oct); I recommended confirming it.
- **Copper's overspent green:** the owner said *Ok* without a recommendation on the table. Mine: keep
  it as designed (verdigris only on copper, the warning always with its icon and words). Confirm.
- The review alias behind Vercel's login; Anthropic's data terms against D34 (before B10); run 6's
  note 15 (B07); `docs/local.md`'s queue.

## What to do first

1. If `qa/B03/report.md` (run 2's) isn't committed, the run was lost: start a fresh full run (the
   `qa` skill); it reads the committed `acceptance.md` and `flows.md` first.
2. Fix its findings by tier, then open the PR.

## Don't reopen

D1–D124, unless the owner raises one. One brief, one branch; shadcn first, customised in place; no
screen mockups (D84); nothing made up in production (modules.md rule 6).
