# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener` (last commit before this handoff
  `820eadb`): code done; four QA runs, all their fixes in. One piece left: the masking net (D116), then
  QA run 5, then the PR.** The owner's part follows the PR: Vercel, the signing key, installing, and the
  week of soak (`docs/local.md`, *B02: the shell on your phone*). The next slice doesn't wait for the soak.
- **QA so far:** four runs, each "fix first", each on the OTP/TAC filter (each run invents new wordings
  after reading the code), plus smaller findings, all fixed. Records: `qa/B02/report-run1..3.md`,
  `report.md` (run 4), `ledger.md`. Report with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA.
- **Verified at `820eadb` in the session:** Kotlin core 31/31; QA's core probes 177/179 (two kept red
  on purpose, ledger run 4); unit 141/141; Playwright 100/100; QA's Playwright 45/45; all APKs build;
  typecheck, lint, format, hygiene. **On GitHub Actions** (`Shell` workflow, free on this public repo):
  emulator 7/7 at `a4fd670`; check the run for `820eadb` first.
- **Not verified yet:** anything on the phone; the signed release (no key); the review alias (no Vercel).

## Decided, and why

- **D116 (owner's call, 9 Oct): a doubtful OTP is masked; the drafter learns OTP wordings.** A filter
  of rules keeps losing to invented wordings, so a miss is made harmless instead:
  - **B02 (now):** the native filter still drops clear OTPs. A chosen app's notification with an OTP
    word (strong or weak list) and a code-like number that isn't dropped is stored with those numbers
    masked `••••••` and a `maybe_otp` flag on the outbox row. Mask in the core (pure Kotlin, testable),
    before the dedupe key and the insert; the dedupe key is computed on the masked text. Outbox VERSION 3
    adds the column. The two red probes from run 4 should end up masked, not stored raw: turn them green
    as "masked". Show *maybe OTP* on *Captured on this phone*. Spec §6.2 and the ledger record it.
  - **B09/B10 (later, their briefs):** the template drafter gets a second job. A masked event is drafted
    as a payment template, or as `ignore: OTP`, after which the event is deleted and the phone drops that
    wording natively. Learned OTP wordings appear in Settings → Capture with *This was a payment*. Add
    a line to those briefs.
- **D114:** remote load with a service worker; a page in the APK when nothing is cached.
- **D115** (proposed, the owner confirms on the PR): ids, ongoing notifications dropped, review alias on
  a `review` branch, key from a one-off workflow, the dedupe key's fields, the evidence-based filter.
- **Native code never trusts the page;** only the site's exact origin stays in the WebView; no
  notification text is logged. **Sessions:** `bash scripts/android-sdk.sh` builds APKs here; Maven
  Central rate-limits the VM, so `session-start.sh` installs a Gradle mirror (`docs/cloud.md` §5).

## Open with the owner

- **Which journeys in `docs/flows.md` are core?** QA guesses each run. Recommend: first run, a payment
  captured to Review, and Scan.
- Vercel, then its two addresses into `apps/shell/sites.json`; the signing key; install; the soak; the
  hidden tests (island, icon, prompt). All in `docs/local.md`.
- **Is the review alias behind Vercel's login?** If so, a bypass pasted once into the debug build.
- D115 on the PR. Copper's overspent green (from B01) still stands.

## What to do first

1. Check the `Shell` run for `820eadb`; fix anything red.
2. Build the masking net (above): core, outbox, the captured screen, tests (core, emulator: a doubtful
   OTP stored masked), spec §6.2, ledger. Commit and push.
3. QA run 5, a fresh full run (tier 3, the `qa` skill); fix by its tiers.
4. Open the PR, *B02 · The shell and the listener*, with the phone checks from the brief's *On your phone*.
- When soak samples arrive: anonymise into `docs/notifications.md`; add their OTPs and payments to
  `OtpFilterTest`; answer §21 Q2, Q3, Q26, Q27 and the launcher test (D77).
- Then B03, on `B03/skeleton-tabs` from `main`, once B02 is merged.

## Don't reopen

D1–D116, unless the owner raises one. In particular remote against bundled (D114), masking plus learned
OTP templates rather than more filter rules (D116), the slice order (D111), no screen mockups (D84), one
brief, one branch; shadcn first, customised in place.
