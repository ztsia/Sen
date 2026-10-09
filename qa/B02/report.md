# QA · B02 · The shell and the listener (run 3)

**Report with screenshots:** https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA

Run 3, 9 Oct 2026, at `aa0ac73`, a fresh `qa-reviewer` after run 2's tier-3 fixes. Run 1's record is
`report-run1.md`, run 2's `report-run2.md`. Rendered report: `qa-artifacts/B02-shell-listener/report.html`.

```
VERDICT   fix first
          46 criteria, 35 pass, 2 fail, 9 not reachable
          phases run: 1-6 (no server: phase 4 ran the outbox's SQLite schema and the APK manifests)
          screenshots: qa-artifacts/B02-shell-listener/screens/ (45)
```

Suites: unit 141/141; Kotlin core 27/27; the branch's Playwright 100/100; typecheck, lint, format clean;
hygiene passes (only `private/` was checked: the DENYLIST secret isn't set). All four APKs build here (release,
debug, e2e, e2e-androidTest). CI `Shell` run 37888315873 on `aa0ac73` passed: core, apks and emulator (7/7).
QA's Playwright: 19 specs, 19 pass. QA's core probes: 91 cases. `Probe` 20/20 and `Probe2` 31/31 pass;
the new `Probe3` passes 26 of 40 (findings 1 and 2; one of its 14 failures is a promo voucher, which can be
dropped harmlessly).

Ordering: AC-17's new cases were written from the docs (D115 now states the joining rule) before the filter
was opened. The run-2 ledger, a QA record that describes the redesign in words, was read first. Cases marked
"after reading" in `Probe3.kt` were added once the filter's regexes had been read.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Blocker | The OTP/TAC filter still stores OTPs. An amount, a comma or a brand name inside the keyword-to-code join breaks it | `gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe3` | AC-17 (i, l), §6.2, D115, CLAUDE.md non-negotiable |
| 2 | Major | Real payments are still dropped as OTPs. `kod` and `code is` are keywords, and reference and approval codes follow them | same, cases ps7–ps10, ps14 | AC-17s, §6.2, D115 |
| 3 | Minor | The handoff predates both QA runs, and the ledger says it carries an owner question that it doesn't | `git log --oneline -1 -- docs/handoff.md` | AC-45s, CLAUDE.md *Session rotation* |
| 4 | Note | Still no journey in `docs/flows.md` is marked core | `grep -n -i core docs/flows.md` | QA rules |
| 5 | Note | QA's own run-1 specs are stale (Capture moved under Settings) | `playwright test -c b02.config.ts b02-prod b02-rowtap` | — |

**1. The filter misses OTPs (Blocker).** A word in the clause may not contain `.` or `,`, so any amount
(`RM50.00`, `RM1,250.00`) ends the clause. The backward join (code, then *is your*, then keyword) accepts only
`is|are|your|the|as|adalah|ialah|merupakan|anda|ini` between them, so a brand name breaks it. Google's real
wording, `G-482910 is your Google verification code`, is one example. A comma inside the clause, or a
zero-width space, also gets past it. Cases i and l were in acceptance.md before the filter was read. The
gate keeps the Maybank-style TAC as an event to store:
```
isOtp=false  <- Your TAC for DuitNow Transfer of RM50.00 to TAN WEI MING is 482910. Valid for 3 mins.
isOtp=false  <- TAC for RM1,250.00 transfer is 482910
isOtp=false  <- G-482910 is your Google verification code.
isOtp=false  <- 482910 is your Grab verification code
isOtp=false  <- Your OTP, valid for 3 minutes, is 482910
isOtp=false  <- Use 482910 to approve your RM50.00 transfer. Do not share this code.
isOtp=false  <- Your OTP is ​482910        (a zero-width space)
gate(chosen, maybank-style TAC) = Keep(event=RawEvent(dedupeKey=f18211a2..., packageName=my.rytbank.app, ...,
  text=Your TAC for DuitNow Transfer of RM50.00 to TAN WEI MING is 482910. Valid for 3 mins., bigText=null))
```
This is the third run in a row where the filter fails on ordinary wording. Each fix so far has patched the
exact shapes QA listed. Before another patch, I recommend two things:
- Test against a broader corpus, including each bank's real OTP wording once the soak samples it. In
  `docs/notifications.md`, the *OTP or TAC* row is still unknown for all four apps.
- Settle with the owner which error the filter should prefer, since D115 is still *Proposed*.

What limits the harm meanwhile (it doesn't waive the finding): Android 15 and later hide most OTP notifications
from listeners (§6.2), and the outbox stays on the phone until B07.

**2. The filter drops payments (Major).** `kod` (Malay for *code*) and `code is` are keywords, so a
reference or approval code reads as an OTP code. The title and text are joined before matching, so a
keyword at the end of the title can also join a number at the start of the text. A dropped payment leaves no
row and no log, so nothing would show it during the soak. The branch's own test keeps
`Kod rujukan 482910.` only because it has no colon.
```
isOtp=true  <- Pembayaran RM12.90 kepada ZUS COFFEE berjaya. Kod rujukan: 48291077
isOtp=true  <- Payment of RM12.90 to ZUS COFFEE successful. Your reference code is 48291077
isOtp=true  <- Card payment RM38.15 at PETRON approved. Approval code is 482910.
isOtp=true  <- DuitNow to TAN PIN HUI: 48291077 RM50.00 successful
isOtp=true  <- Payment to PIN | 482910 RM12.90 paid using your Main Account | null   (title | text)
```

**3. The handoff is stale (Minor).** `docs/handoff.md` last changed in 038a8bb, before QA run 1:
```
038a8bb Handoff: B02's code done, QA running, the PR next
11:- **Verified in the session:** the core's Kotlin tests (22); ...
```
It doesn't mention QA runs 1–2 or the filter's redesign. It also lacks the core-journeys question that
the ledger's run-2 row 7 says is in the handoff.

**4. Core journeys (Note).** Still unmarked, for the owner. This run walked the frame instead: the five
tabs, then Settings → Capture (`b02-r3-core.spec.ts`).

**5. Stale QA specs (Note).** `qa/e2e/b02-prod.spec.ts` and `b02-rowtap.spec.ts` look for Capture on More
and time out (3 tests). Run 2's and run 3's specs replace them.

## Probes (phase 3): 7 of 7 caught

| What was broken | Caught |
|---|---|
| The clause join removed from `OtpFilter` | yes, `27 tests completed, 1 failed` |
| The chosen-apps check moved below the OTP check (`CaptureGate`) | yes, 1 failed (run 2's finding 3 is now pinned) |
| `when` dropped from the dedupe key | yes, 2 failed |
| The expanded text dropped from the dedupe key | yes, 1 failed |
| Email apps choosable (`AppClassifier`) | yes, 1 failed |
| `Origin` ignores the port | yes, 1 failed |
| Security footers added as OTP keywords | yes, 1 failed |

`git status` showed no app source changed after each probe was reverted.

Phase 4 ran these against the outbox schema in SQLite:
- A replayed insert is ignored (rowcount 0).
- A plain duplicate is refused (`UNIQUE constraint failed: events.dedupe_key`).
- A new `when` gives a second row.
- NULLs in required columns are refused.
- `channel_drops` starts empty.

aapt2 on the APKs showed:
- The right ids: `io.github.ztsia.sen`, `.debug` and `.e2e`.
- No `QUERY_ALL_PACKAGES`, and `disabled_filter_types=conversations`.
- The debug build's listener and boot receiver disabled.
- Two launcher aliases, with only Minted enabled.

No secret turned up in either APK or in the production bundle, and there are no dev tools in production.

## What I couldn't test, and why

- **The real listener on the Xiaomi** (the soak: Q2, Q3, Q26, Q27). It needs the device and is queued in
  `docs/local.md`.
- **Probes on emulator-only paths**, such as dropping the outbox's UNIQUE, or removing the chosen check from
  `Capture.post`. This VM has no KVM, and running them on CI would mean pushing a defect to the branch.
- **Android-only behaviour:** `openInBrowser`, the status bar, insets, haptics, *Switch icon* toggling, the
  Live Update and the prompt's buttons.
- **The release and debug addresses.** Both are null in `sites.json` until Vercel is linked.
- **The signed release.** There's no key yet.
- **Real OTP wording.** None has been sampled, so every case, QA's included, is made up.
- **Offline capture syncing exactly once.** Sync is B07's.
- **A new deploy taking over inside the WebView.** This was checked in Chromium only.

## Tier

Findings 1 and 2 touch a `CLAUDE.md` non-negotiable (the OTP/TAC filter in native code). Their fix is tier 3,
so a full QA run 4 should follow it, not a targeted one.
