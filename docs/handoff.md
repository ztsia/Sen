# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: code done; QA runs 5 and 6 (scoped, the
  capture path) fixed. Next: QA run 7, scoped, on Sonnet, but only on the owner's nod (quota). Then the
  PR.** The owner's part follows the PR: Vercel, the signing key, installing, the soak (`docs/local.md`).
- **QA so far:** runs 1–4 full, 5–6 scoped. Records: `qa/B02/report-run1..5.md`, `report.md` (run 6),
  `ledger.md`. Report: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA (run 7 to the same URL; rename
  `report.md` to `report-run6.md` first).
- **Verified at `9e4c72a`:** core 43/43; QA's probes 265/267 (red: run 4's TAC CAFE choice and
  `Probe6.ac25`, which needs a JVM overflow that warm-up removes: ledger); unit 141/141; Playwright
  100/100; the e2e APK builds. **Check the `Shell` workflow** (the emulator) on the latest push first.
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

- **Two QA runs wait for the owner's nod** (quota): run 7 (scoped, the capture path, Sonnet, findings
  10–13 fixed), and the Sonnet comparison: run 6's thin prompt, `model: sonnet`, in its own worktree at
  `07e1ad7`, writing to `qa/B02/compare-sonnet/`; compare with run 6 (Opus, about 240k tokens, 102 tool
  calls, 31 minutes): findings, misses, false alarms, tokens, time.
- **Which journeys in `docs/flows.md` are core?** Recommend: first run, a payment to Review, and Scan.
- Vercel and its two addresses into `apps/shell/sites.json`; the signing key; install; the soak; the
  hidden tests. All in `docs/local.md`. Is the review alias behind Vercel's login?
- D115 on the PR. Copper's overspent green (from B01). Anthropic's data terms against D34 (before B10).

## What to do first

1. On the owner's nod: QA run 7 (save `report.md` from its message: a subagent can't write it), publish,
   fix by its tiers; and the Sonnet comparison.
2. Check the `Shell` workflow on the latest push.
3. Open the PR, *B02 · The shell and the listener*, with the phone checks from the brief.
- Then B03, on `B03/skeleton-tabs` from `main`, once B02 is merged.

## Don't reopen

D1–D120, unless the owner raises one. In particular remote against bundled (D114), masking plus
classify-first rather than more filter rules (D116, D119), the slice order (D111), no screen mockups
(D84), one brief, one branch; shadcn first, customised in place.
