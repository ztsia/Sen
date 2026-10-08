# Handoff

Rewritten 8 Oct 2026 by the second B01 session, which fixed QA's findings. The protocol is in
`CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B01 · Design system and the six looks, on `B01/design-system`: QA's findings are fixed, and a
  fresh full QA run (tier 3) is in progress or done.** No PR is open yet.
- Fixed and verified (`qa/B01/ledger.md` has each fix, its tier and its evidence): all three Majors
  (an unknown screen or path, a finger's long-press on Scan, the no-float lint everywhere amounts
  flow), the six Minors, and Notes 11, 12, 13 and 15. Also: a reload's stale sheet step no longer
  passes for an open sheet, and the looks' live drawing skips canvases off screen.
- **Verified:** unit 119/119; the slice's e2e 68/68 (new `e2e/edges.spec.ts`, with real touch events);
  QA's own specs 48/48 (were 39/48); typecheck, lint, format, `looks.gen.css` and hygiene clean.
- **Not verified yet:** CI on GitHub (it runs on the PR), the Vercel deploys, the phone.

## Decided this session, and why

- **A build is production unless it says preview** (`SEN_ENV=preview`, or Vercel's
  `VERCEL_ENV=preview`). A build that forgets to say never ships dev tools. The slice's and QA's
  Playwright configs build the preview with `SEN_ENV=preview`.
- **Dev-only chunks are imported behind `__SEN_ENV__ !== 'production'` compared in place**
  (`src/sen-env.d.ts`). Through an imported `DEV_TOOLS`, Rollup still emitted the chunks.
- **The no-float rule covers all source**: `Number()`, unary `+` and `parseInt` are banned in every
  app, API, worker and core file. Only `packages/looks` (SVG geometry) is exempt.
- **`tokens`, `extra` and `fonts` stay CSS, not `DIR` fields** (QA Note 10): one source, and colours
  never wait on a look's code. Written into `patterns.md` §1 and the brief.
- **The hygiene check reads paths and every commit in the PR's range**; CI checks out full history.
- **A look switches only once its code has arrived**; offline, the look on show stays.

## Open with the owner

- **Copper's overspent figure is verdigris green**, as its design intends, against patterns.md §3
  (green means money in). Kept as designed until the owner says otherwise.
- **Link Vercel** and **add the `DENYLIST` secret**, before the PR is reviewed: `docs/local.md` has
  the steps. Then open the preview on the phone (the PR's *Try it on your phone*), including Scan's
  long-press check in `docs/local.md`.
- Secret scanning and push protection, any time (`docs/local.md`).
- The laptop ESS capture (D110) is still open; it matters only for B34.

## What to do first

- If the fresh QA run's report isn't in `qa/B01/report.md` yet (dated after this handoff), run the
  `qa` skill again: a fresh full run, the batch was tier 3. Commit its record and publish its report
  to the same artifact (https://claude.ai/artifact/5Fecg9iXRig3LpcogMy8B9).
- Fix what it finds, sorted into tiers in `qa/B01/ledger.md`. **Owner, 8 Oct: after these fixes, no
  further QA run.** Verify each fix yourself: reproduce the finding first (red), fix, show it green,
  and re-run the slice's and QA's suites. Record the evidence in the ledger. Then open the PR, titled
  *B01 · Design system and the six looks*, with the frame times from `docs/cloud.md` §5 and a
  *Try it on your phone* list.
- B02's service worker should precache all six look chunks (about 70 kB), so a quarter's change
  works offline (B14).
- Once merged: **B02 · The shell and the listener**, on `B02/shell-listener` from `main`.

## Don't reopen

D1–D113, unless the owner raises one. In particular the slice order (D111), no screen mockups (D84),
and from 8 Oct: one brief, one branch; shadcn first, customised in place.
