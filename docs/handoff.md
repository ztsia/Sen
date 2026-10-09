# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: code done; run 5's findings fixed (D119:
  every long number outside amounts masked). QA run 6 is running, scoped to the capture path (tier 2).
  Then fix by the `qa` skill's tiers, then the PR.** The owner's part follows the PR: Vercel, the
  signing key, installing, the week of soak (`docs/local.md`).
- **QA so far:** runs 1–4 full, 5 scoped (all on the OTP filter, then the mask). Records:
  `qa/B02/report-run1..5.md`, `ledger.md` (every fix and its tier). Run 6 writes `report.md`. Report
  with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA (publish run 6 to the same URL).
- **Verified in the session at `a6a2437`:** core 41/41; QA's probes 217/218 (red: the deliberate TAC
  CAFE drop); unit 141/141; Playwright 100/100; APKs build. **CI's emulator** failed at `bc2219f`: a
  5,000-character notification was dropped as *unread* (Android's regex throws where the JVM overflows);
  `a6a2437` catches both. Check that run first.
- **Not verified yet:** anything on the phone; the signed release (no key); the review alias (no Vercel).

## Decided, and why

- **D116, D119:** until B09/B10 can classify a wording, every kept notification has its long numbers
  outside amounts masked; *maybe OTP* is a hint. From B10, a new wording is masked whole, classified by a
  cheap model through our API (raw digits in memory only), and gets its numbers back only if it's a
  transaction. Spec §6.2, the B09/B10 briefs.
- **D117:** QA tiers by how far a fix reaches: small (self-verify), scoped (fresh reviewer on the area),
  full (only when a fix reaches the whole flow). Every finished slice gets a full run.
- **D118:** Opus decides and reviews at high effort; `implementer` (Sonnet) and `scout` (Haiku) by
  judgement; `qa-reviewer` on Sonnet (run 6 ran on Opus: the agent file was edited mid-session). No
  per-task review loops.
- **D120:** Claude through Anthropic's own API joins Gemini; Haiku 5.5 first for the cheap tier; B10
  builds `evals/` (golden sets scored by code; the session judges blind what code can't).
- **D114, D115** (proposed; the owner confirms on the PR). **Never stage `apps/` or `qa/` with
  `git add -A` while a reviewer runs:** it mutates code on purpose (one mutation was committed once).

## Open with the owner

- **The Sonnet comparison run: wait for the owner's nod** (quota). Once run 6 is done: the same thin
  prompt as run 6, `model: sonnet`, in its own worktree at the commit run 6 checked, writing to
  `qa/B02/compare-sonnet/`. Compare findings, misses, false alarms, tokens and time.
- **Which journeys in `docs/flows.md` are core?** Recommend: first run, a payment to Review, and Scan.
- Vercel and its two addresses into `apps/shell/sites.json`; the signing key; install; the soak; the
  hidden tests. All in `docs/local.md`. Is the review alias behind Vercel's login?
- D115 on the PR. Copper's overspent green (from B01). Anthropic's data terms against D34 (before B10).

## What to do first

1. If QA run 6 finished: commit its record (a subagent can't write `report.md`: save it from its
   message), publish the report, fix by its tiers. If it didn't: start it again, same prompt.
2. Check the `Shell` workflow on the latest push.
3. Open the PR, *B02 · The shell and the listener*, with the phone checks from the brief.
- Then B03, on `B03/skeleton-tabs` from `main`, once B02 is merged.

## Don't reopen

D1–D120, unless the owner raises one. In particular remote against bundled (D114), masking plus
classify-first rather than more filter rules (D116, D119), the slice order (D111), no screen mockups
(D84), one brief, one branch; shadcn first, customised in place.
