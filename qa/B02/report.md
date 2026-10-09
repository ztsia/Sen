# QA · B02 · The shell and the listener

**Report with screenshots:** https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA (run 2; run 1's record is
`report-run1.md`)

Run 2, 9 Oct 2026, at `1a7827d`, a fresh `qa-reviewer` after run 1's tier-3 fixes (its final message,
saved here because the harness refused its own write).

```
VERDICT   fix first
          46 criteria, 35 pass, 2 fail, 9 not reachable
          phases run: 1-6 (no server: phase 4 ran the outbox's SQLite schema and the APK manifests)
          screenshots: 40
```

Suites: unit 141/141; Kotlin core 25/25; the branch's Playwright 100/100; typecheck, lint, format clean;
hygiene passes (private/ only, no DENYLIST yet); CI Shell run 37884510996 on `1a7827d`: core, both APKs
and the emulator all green (7/7). QA's Playwright: 17, 16 pass (FLOW-5, finding 4). QA's core probe
`Probe2`: 31 cases, 11 fail (findings 1 and 2).

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Blocker | The OTP/TAC filter stores OTPs in six ordinary shapes | `gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe2` | AC-17, §6.2, CLAUDE.md non-negotiable |
| 2 | Major | Real payments are silently dropped as OTPs when a security footer meets any 6–8 digit number | same | AC-17s, §6.2, D115 |
| 3 | Minor | The gate's tests don't pin chosen-first order or an exact package match; two probes stayed green | swap the checks in `CaptureGate.kt` | AC-16, §6.2 |
| 4 | Minor | On *Captured on this phone*, the title can't be selected | `b02-r2-flows.spec.ts -g FLOW-5` | AC-33, patterns.md §7 |
| 5 | Minor | The simulator's *Post it again* and *Post an OTP* only show a toast | dev panel | AC-17, AC-21 |
| 6 | Note | *Keep Sen running* promises a Home warning that only B07 builds | a brand with no steps | AC-32s, §18 |
| 7 | Note | No journey in `docs/flows.md` is marked core | `grep -i core docs/flows.md` | QA rules |

**1.** Dropped only with a keyword and a code `isCode` accepts. Never qualify: codes split by a space or
hyphen, after `#` or `-`, after `No.`, and 4-digit codes with words between them and the keyword.
```
isOtp=false  <- Your OTP is 123 456. Valid for 3 minutes.
isOtp=false  <- Your verification code is 123-456
isOtp=false  <- G-482910 is your verification code.
isOtp=false  <- Your TAC is #482910 for DuitNow Transfer
isOtp=false  <- TAC No. 482910 for RM50.00 transfer
isOtp=false  <- Your OTP for login: 4829
```

**2.** Footer phrases (`never share`, `do not share`, `jangan kongsi`) and `pin` count as keywords, and any
unprefixed 6–8 digit number anywhere counts as a code.
```
isOtp=true  <- RM12.90 paid at 7-ELEVEN 123456 KL using your Main Account. Never share your PIN.
isOtp=true  <- RM8.00 paid to MERCHANT 482910 via DuitNow QR. Do not share your TAC.
isOtp=true  <- Card payment RM38.15 at PETRON approved. Approval code 482910. Never share your OTP.
isOtp=true  <- You've received RM42.50 from TAN PIN HUI. Reference number 20261009.
isOtp=true  <- Anda telah menerima RM50.00 daripada TAN WEI MING. No. Transaksi 48291077. Jangan kongsi TAC anda.
```

**3.** `CaptureGateTest`'s "even an OTP from it is NOT_CHOSEN" posts `OTP 1`, which isn't an OTP. Moving
the chosen check below the OTP check, or matching packages by prefix, left the core tests green.

**4.** The title (`ItemTitle`) inherits `user-select: none`; only the text paragraphs carry `.selectable`.

**5.** `sim.repost()` and `sim.otp()` only call `toastDone`, so the flows pass whatever the code does.

**6.** "If capture stops, Sen warns you on Home": the watchdog and Home's warning are B07's.

**7.** For the owner: which journeys in `docs/flows.md` are core.

## Probes

| What was broken | Caught |
|---|---|
| `when` dropped from the dedupe key | yes |
| 6-digit codes no longer count | yes |
| Origin compares host only | yes |
| Chosen check by package prefix | **no** (finding 3) |
| Default SMS app not blocked | yes |
| Chosen check moved after the OTP check | **no** (finding 3) |
| Back on Home goes Home | yes |
| Service worker caches every GET, the API included | yes |
| Every Malay OTP keyword removed | yes |

Phase 4: the outbox schema in SQLite ignores a replayed insert and refuses a plain duplicate; the three
APKs read with aapt2 have the right ids, no `QUERY_ALL_PACKAGES`, conversations refused, the debug build's
listener and boot receiver disabled, two launcher aliases with one enabled; no secrets in the release APK
or the production bundle; no dev tools in production.

## Not testable here

The real listener on the Xiaomi (the soak; Q2, Q3, Q26, Q27); probes on emulator-only paths (no KVM);
Android-only behaviour (openInBrowser, status bar, insets, haptics, Switch icon, the Live Update, the
prompt's buttons); a new deploy taking over inside the WebView (Chromium only: in the shell, back on Home
minimises, so a waiting worker may wait until Android kills the process); the release and debug
addresses (null until Vercel); the signed release (no key yet).
