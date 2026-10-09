# Handoff

Rewritten 9 Oct 2026 by the session building B02. The protocol is in `CLAUDE.md`, *Session rotation*:
read this first, and rewrite it before you end.

## Where things stand

- **B02 · The shell and the listener, on `B02/shell-listener`: code done; four QA runs, run 4's fixes in;
  the owner decides how to finish the OTP filter (below), then the PR.**
  The owner's part follows the PR: Vercel, the signing key, installing, and the week of soak
  (`docs/local.md`, *B02: the shell on your phone*). The next slice doesn't wait for the soak.
- **QA so far:** four runs, each "fix first", each on the OTP/TAC filter (each new run writes new made-up
  wordings after reading the code, and finds a few), plus smaller findings, all fixed. Records:
  `qa/B02/report-run1..3.md`, `report.md` (run 4), `ledger.md` (every fix and its tier). Report with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA.
- **Verified in the session:** Kotlin core 31/31; QA's core probes from all runs 177/179 (two kept red
  on purpose, ledger run 4); unit 141/141; Playwright 100/100; QA's Playwright 45/45; all four APKs
  build; typecheck, lint, format, hygiene.
- **Verified on GitHub Actions** (the `Shell` workflow, free on this public repo): the core, both APKs
  and the emulator tests on Android 14 (7/7) at `aa0ac73`; the latest push re-runs them.
- **Not verified yet:** anything on the phone; the signed release (no key); the review alias (no Vercel).

## Decided in B02, and why

- **D114:** remote load with a service worker; a page in the APK when nothing is cached.
- **D115** (proposed, the owner confirms on the PR): ids `io.github.ztsia.sen` / `.debug` / `.e2e`;
  ongoing notifications dropped; review alias on a `review` branch; key from a one-off workflow; the
  dedupe key's text is title, text and expanded text, length-prefixed; and **the OTP/TAC filter weighs
  evidence and, in doubt, drops** (spec §6.2). Storing an OTP breaks a non-negotiable; a dropped payment
  is logged by time and app (never text) in the heartbeat and shows as a balance gap. Real OTP wording
  hasn't been sampled yet: when the soak's samples arrive, add each bank's OTP to `OtpFilterTest`.
- **Capacitor's prefix check isn't trusted:** only the site's exact origin stays in the WebView.
- **Native code never trusts the page:** `setChosen` re-runs the classifier; the chosen check runs
  before a notification's extras are read; no notification text is logged.
- **Capture's steps are screens** under Settings → Capture, so B08's first run reuses them; More no
  longer lists Settings' sections. *Captured on this phone* is the soak's; B07 replaces it.
- **Sessions:** `bash scripts/android-sdk.sh` installs the SDK to build APKs here; Maven Central
  rate-limits the VM, so `session-start.sh` installs a Gradle mirror script (`docs/cloud.md` §5).

## Open with the owner

- **How to finish the OTP filter** (asked on 9 Oct; record the answer in D115): another QA run now; or
  a masking safety net first (when a notification has any OTP word but isn't dropped, store it with its
  code-like numbers masked, which amends §6.2's "raw text never changed"); or open the PR and tune the
  filter from the soak's real samples.

- **Which journeys in `docs/flows.md` are core?** None is marked, so QA guesses each run (QA B02 run 2's
  note, run 3's finding 4). Recommend: first run, a payment captured to Review, and Scan.
- Vercel, then its two addresses into a session; the signing key; install; the soak; the hidden tests
  (island, icon, prompt). All in `docs/local.md`.
- **Is the review alias behind Vercel's login?** If so, recommend a bypass the owner pastes once into
  the debug build. Decide when the owner reports it.
- D115 on the PR. Copper's overspent green (from B01) still stands.

## What to do first

- QA run 4's report: fix what it finds by the `qa` skill's tiers, then open the PR, *B02 · The shell
  and the listener*, with the phone checks from the brief's *On your phone*.
- When the owner sends the Vercel addresses: write them into `apps/shell/sites.json` and push.
- When soak samples arrive: anonymise into `docs/notifications.md`; add their OTPs and payments to
  `OtpFilterTest`; answer §21 Q2, Q3, Q26, Q27 and the launcher test (D77).
- Otherwise B03, on `B03/skeleton-tabs` from `main`, once B02 is merged.

## Don't reopen

D1–D115, unless the owner raises one. In particular remote against bundled (D114), the slice order
(D111), no screen mockups (D84), one brief, one branch; shadcn first, customised in place.
