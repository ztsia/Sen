# Handoff

Rewritten 12 Oct 2026 by the B04 cloud session, after QA run 2's fixes and D128's batch. The protocol is in
`CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B04 is in progress** on `B04/skeleton-rest`. B01–B03 are merged.
- **Built and committed:**
  - every B04 screen on made-up data, with the shared ground in `views.ts` and `commands.ts` (*B04* sections) and the fake's area modules in `data/fake/areas/`
  - `split-public` in its own `PublicShell`, on its own fake (`data/public.ts`), reading nothing of the person's
  - the dev panel's native stand-ins, the simulator and all 37 journeys (`dev/journeys.ts`)
- **Done-when 1 and 2 are met.**
  - Every flows.md journey is walked in 6 looks, light and dark, and axe passes on every screen and stand-in.
  - The full `pnpm e2e` run is 703 of 703 green in 57 min. Unit tests: 289.
- **QA run 1 (full):** *fix first*, with 62 of 90 criteria passing. Report: `qa/B04/report-run1.md`, published at https://claude.ai/artifact/EysS8ku2w263ugj35pFXG3
  - Fixed in `851cbd0`, tier 1: findings 1, 2, 3, 5, 6, 9, 10, 11, 12 (welcome credit RM10 and email check), 15, 17 and 19.
- **QA run 2 (scoped, done):** 10 of 12 fixed, 2 partly; 70 of 90 pass. Report: `qa/B04/report.md`,
  published as version 2 at the same link.
  - Its small fixes (15, 20, 21, 22) are in `ad49bb0`, with tests.
- **D128's missing pieces are built** (`daa498a`, one Sonnet batch, reviewed): *Write off*, *Yes, I did*
  opening `manual` on its day (`?day=`), *Pay with TNG* / *Save QR* stand-ins, sign-in's expired
  invitation (`?state=expired`), and Members' *Unlimited*, *Resend*, *Revoke* and export on *Remove*.
  B17's brief notes a written-off share needs its own column.
- **Next:**
  1. The full six-look `pnpm e2e` (`E2E_LOOKS=all`, about an hour) was running when this was written.
     If it isn't green in the log, rerun it and fix what fails.
  2. A scoped QA re-check (the `qa` skill, tier 2) of run 2's fixes and D128's pieces, after e2e (they
     share ports 4173/4174, so never at once).
  3. Log usage, then open the PR *B04 · Skeleton: everything else, and your review*.
  4. **The owner's review on the phone, in the debug shell:**
     - the seven *Defaults to confirm* (screens.md)
     - Mercury and Copper's WebGL in the real WebView
     - production's one look until B14
     - anything they'd change, recorded in docs first

## Decided, and why

- **D127 (11 Oct):** D115 confirmed; Copper's verdigris kept; `noindex` in B05; Anthropic's data terms checked in B10.
- **D128 (12 Oct):**
  - The missing pieces above join B04.
  - First run that saves (B08), a pinned look (B14) and the remembered name (B18) stay with their slices, and their briefs say so.
  - CI runs Playwright in Minted and Copper on each PR push and all six nightly (`E2E_LOOKS`).
  - QA's mechanical part runs on Haiku first.
- **Subagents can't start subagents.** Tested twice: a general-purpose agent, and `scout` with `Agent` in its tools. So the main session starts the Haiku sweep before QA (`qa` skill, step 2).
  - The sweep must run `E2E_SHOTS=… pnpm e2e` to keep screenshots.
  - It must wait for the hour-long run to end: B04's sweep reported twice while the run was still going.
- **The D125 Haiku trial:**
  - Settings' basic sections cost $0.08 on Haiku against $1.07 for Sonnet, but needed 2 fixes against Sonnet's 0.
  - The QA sweep stopped early, and its lint fix was clean.
  - Verdict: Haiku for mechanical work, with the contract spelled out, *only your files*, and *wait for long runs*.
- **Writes:** `useWrite` drops the identical command within the tap guard's 500 ms, so every screen gets the double-tap rule (patterns.md §7).
- **Reads:** the fake hands each read back as a copy, so in-place changes reach the screens.
- Earlier decisions stand: D122 deploys only by merge; log usage before every handoff and PR; use `npx shadcn add` with `--dry-run` first.

## Open with the owner

- QA run 1's notes, finding 18: the Elsewhere row is 56 px; `?state=offline` works in production (from B03); the date style "30 Sept".
- Finding 8: the simulator's *A notification arrives* asks again once the rule exists, so `pay-new`'s end state can't be shown.
- `ReviewRow` shows 3 answers, but `ask_user` allows 4. Categories and rules can't be added yet (B12).
- `docs/local.md`'s queue, now with B04's phone checks.

## What to do first

- Check the six-look e2e result, then run the scoped QA re-check (*Next*, 2).

## Don't reopen

D1–D128, unless the owner raises one. One brief, one branch; shadcn first; no screen mockups (D84);
nothing made up in production (modules.md rule 6); deploys by merge only (D122).
