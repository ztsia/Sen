# Handoff

Rewritten 12 Oct 2026 by the B04 cloud session, before compacting its context. The protocol is in
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
- **QA run 2 (scoped, done):** 10 of 12 fixed, 2 partly (15, and 12's email). Now 70 of 90 pass.
  Report: `qa/B04/report.md`, published as version 2 at the same link. Small fixes still to do (tier 1):
  - 15: *Send to ESS* shows in a browser preview; gate it on the shell or `DEV_TOOLS` with a stand-in label
  - 20:
    - bound `setting.set`'s record and the `sen.answer`, `proposal.answer`, `memory.forget` and `research.confirm` strings
    - cap the composer at 4000 characters and the invite email at 254
    - reject `a..b@x.co` and `a@-b.co`
  - 21: in the payday scenario, Parking is approved but still says its receipt is missing, and *Send to ESS* stays with nothing to send; Home's figure ignores the RM152 claims split (D45)
  - 22:
    - the closed link still carries `at`; add it to the test
    - a friend's empty claims page says *Add a scheme*, though their claims are off
    - a stale *Already added* toast follows to the next screen
    - the fake's `member.*` has no admin check, and B05's API must add one
- **Next:** the run-2 fixes above, then:
  1. **One Sonnet batch (D128), the pieces QA found missing:**
     - *Write off* on a split
     - Sen's *Yes, I did* opening `manual` with the day: `ScreenSearch` needs a `day`, and `manual` must read it
     - *Pay with TNG* and *Save QR* (D101) on `split` and `split-public`
     - sign-in's expired-invitation state (*Ask for a new invitation*)
     - Members: *Unlimited* at invite, *Resend*, *Revoke*, and the export offered on *Remove*
  2. Review the batch, then run all six looks before the PR (`pnpm e2e`, about an hour), and a scoped QA re-check of that batch's area.
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

- If run 2's report isn't in `qa/B04/report.md`, the reviewer was lost. Spawn a fresh scoped `qa-reviewer` on the findings above (the `qa` skill, tier 2).
- If the commit for D128's batch isn't on the branch, brief it (one Sonnet `implementer`) from the list above.

## Don't reopen

D1–D128, unless the owner raises one. One brief, one branch; shadcn first; no screen mockups (D84);
nothing made up in production (modules.md rule 6); deploys by merge only (D122).
