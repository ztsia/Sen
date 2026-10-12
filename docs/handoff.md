# Handoff

Rewritten 12 Oct 2026 by the B04 cloud session, with B04's PR open. The protocol is in
`CLAUDE.md`, *Session rotation*: read this first, and rewrite it before you end.

## Where things stand

- **B04 is finished; its PR is open** from `B04/skeleton-rest` (*B04 · Skeleton: everything else, and
  your review*). B01–B03 are merged. Nothing more is planned on the branch unless CI or the owner's
  review asks for it.
- **Built:**
  - every B04 screen on made-up data, with the shared ground in `views.ts` and `commands.ts` (*B04* sections) and the fake's area modules in `data/fake/areas/`
  - `split-public` in its own `PublicShell`, on its own fake (`data/public.ts`), reading nothing of the person's
  - the dev panel's native stand-ins, the simulator and all 37 journeys (`dev/journeys.ts`)
  - D128's missing pieces: *Write off*, *Yes, I did* opening `manual?day=`, the *Pay with TNG* / *Save
    QR* stand-ins, sign-in's expired invitation, and Members' *Unlimited*, *Resend*, *Revoke* and export on *Remove*
- **Verified:** six looks × light/dark, `pnpm e2e` 707 of 707 (45.8 min) after D128's batch; Minted
  205 of 205 after run 3's fixes. Unit tests and lint clean.
- **QA:** three runs. Run 3 (scoped): 83 of 102 criteria pass; its findings 23–27 are fixed with tests.
  Records in `qa/B04/` (`report.md` is run 3; run 1 and 2 kept beside it). Published as version 3 at
  https://claude.ai/artifact/EysS8ku2w263ugj35pFXG3
  - Left on purpose: 4 (remembered name, B18), 7 (pinned look, B14), 16 (first run saves, B08), 8 and 18
    (below), 12's leftovers (`.a@x.co`, long local parts: B05's real email check).
- **Next: the owner's review on the phone, in the debug shell:**
  - the seven *Defaults to confirm* (screens.md)
  - Mercury and Copper's WebGL in the real WebView
  - production's one look until B14
  - anything they'd change, recorded in docs first, then fixed on this branch before merge
- **After merge:** B05, the server.

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

- If the PR's CI is red, fix it on `B04/skeleton-rest` first.
- Otherwise, wait for the owner's phone review and act on what they record.

## Don't reopen

D1–D128, unless the owner raises one. One brief, one branch; shadcn first; no screen mockups (D84);
nothing made up in production (modules.md rule 6); deploys by merge only (D122).
