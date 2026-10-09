# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: code done, the masking net (D116) built
  and pushed. QA run 5 is running, scoped by the owner to the capture path only (filter, mask,
  storage, *Captured on this phone*). Then fix by the `qa` skill's tiers, then the PR.** The owner's
  part follows the PR: Vercel, the signing key, installing, the week of soak (`docs/local.md`).
- **QA so far:** runs 1–4 full, each on the OTP/TAC filter. Records: `qa/B02/report-run1..4.md`,
  `ledger.md` (every fix and its tier, the D116 round included). Run 5 writes `report.md`. Report
  with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA (publish run 5 to the same URL).
- **Verified after D116 in the session:** Kotlin core 39/39; QA's probes 147/148 (the red one is the
  deliberate TAC CAFE drop); unit 141/141; Playwright 100/100; QA's Playwright 45/45 (AC-8 needs its
  own server); all APKs and the emulator tests build. The emulator runs on GitHub Actions (`Shell`).
- **Not verified yet:** anything on the phone; the signed release (no key); the review alias (no Vercel).

## Decided, and why

- **D116 (owner's call, 9 Oct): a doubtful OTP is masked; the drafter learns OTP wordings.** A filter
  of rules keeps losing to invented wordings, so a miss is made harmless instead:
  - **B02 (built):** `OtpMask` in the core. The filter is unchanged; what it keeps but carries an OTP
    word and a run of 4+ digits is stored with those digits masked (amounts left), `maybe_otp` set,
    the dedupe key from the masked text. Outbox version 3. Spec §6.2.
  - **B09/B10 (their briefs say so):** the drafter judges each masked event; an OTP gets an
    `ignore: OTP` template that the listener applies natively; *This was a payment* undoes it.
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

1. If QA run 5 finished: commit its record, publish its report, fix by its tiers (the `qa` skill).
   If it didn't: start it again with the same thin, capture-only prompt.
2. Check the `Shell` workflow on the latest push (the emulator's new masking test).
3. Open the PR, *B02 · The shell and the listener*, with the phone checks from the brief's *On your phone*.
- When the owner sends the Vercel addresses: write them into `apps/shell/sites.json` and push.
- When soak samples arrive: anonymise into `docs/notifications.md`; add their OTPs and payments to
  `OtpFilterTest`; answer §21 Q2, Q3, Q26, Q27 and the launcher test (D77).
- Then B03, on `B03/skeleton-tabs` from `main`, once B02 is merged.

## Don't reopen

D1–D116, unless the owner raises one. In particular remote against bundled (D114), masking plus learned
OTP templates rather than more filter rules (D116), the slice order (D111), no screen mockups (D84), one
brief, one branch; shadcn first, customised in place.
