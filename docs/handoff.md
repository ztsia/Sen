# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: done; the PR is open, waiting for the
  owner's merge** (https://github.com/ztsia/Sen/pull/3; the emulator green at `eaa6841`). QA runs 1–4
  were full, 5–7 scoped on the capture path; run 7's fixes and D121 (mask every digit outside an amount)
  are in, self-verified as tier 1 by the owner's call. The owner's part follows the merge:
  Vercel, the signing key, installing, the week of soak (`docs/local.md`).
- **QA records:** `qa/B02/report-run1..6.md`, `report.md` (run 7), `ledger.md` (every fix and tier,
  and the probes D121 superseded), `compare-sonnet/` (run 6's twin on Sonnet). Report:
  https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA.
- **Verified at `eaa6841`:** core 45/45; QA's probes 285/297 (the 12 red: 10 superseded by D121, run 4's
  TAC CAFE choice, `Probe6.ac25`: ledger); unit 141/141; Playwright 100/100; typecheck, lint; the e2e
  APK and emulator tests build. **The emulator** was green at `cebdbdf`.
- **Not verified yet:** anything on the phone; the signed release (no key); the review alias (no Vercel).

## Decided, and why

- **D116, D119, D121:** until B10 can classify a wording, every digit outside an amount is stored as `•`
  (a decimal amount, or the number after a currency code or sign); *maybe OTP* is a hint. From B10 the
  mask applies only to what the classifier sees, and a transaction is stored with its numbers. Every
  rule about how digits are grouped lost to a new shape (runs 5–7).
- **D117, D121:** QA tiers. Every finished slice gets a full run; a scoped re-check **resumes the last
  run's reviewer** (SendMessage to its agent ID), a fresh one only when it's gone; small fixes are
  self-verified. Keep each QA run's agent ID here while its slice is open.
- **D118:** Opus decides and reviews at high effort; `implementer` (Sonnet), `scout` (Haiku) by
  judgement; `qa-reviewer` on Sonnet. Run 6's Sonnet twin found as much as Opus at half the cost
  (`qa/B02/compare-sonnet/report.md`).
- **D120:** Claude through Anthropic's own API joins Gemini; Haiku 5.5 first for the cheap tier; B10
  builds `evals/`.
- **D114, D115** (proposed; the owner confirms on the PR). Never stage `apps/` or `qa/` with
  `git add -A` while a reviewer runs: it mutates code on purpose.

## Open with the owner

- **Which journeys in `docs/flows.md` are core?** Recommend: first run, a payment to Review, and Scan.
- Vercel and its two addresses into `apps/shell/sites.json`; the signing key; install; the soak; the
  hidden tests. All in `docs/local.md`. Is the review alias behind Vercel's login?
- D115 on the PR. Copper's overspent green (from B01). Anthropic's data terms against D34 (before B10).
- Run 6's note 15 (a missing `when` stored as the post time) is for B07 to decide.

## What to do first

1. If the PR has review comments or red CI, address them on `B02/shell-listener`.
2. Once it's merged: B03, on `B03/skeleton-tabs` from `main`.

## Don't reopen

D1–D121, unless the owner raises one. In particular remote against bundled (D114), masking every digit
until classify-first (D119, D121) rather than more filter rules, the slice order (D111), no screen
mockups (D84), one brief, one branch; shadcn first, customised in place.
