# QA B02 · run 7 (scoped: the capture path, on Sonnet)

Saved by the main session from the reviewer's final message (a subagent can't write report files).
Report with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA

```
VERDICT   fix first
          35 criteria, 28 pass, 3 fail, 4 not reachable
          phases run: 1-3 and 5 for the capture path (phase 4: the outbox's UNIQUE key in SQLite,
          on Outbox.kt's schema)
          screenshots: 19 (R7-*)
```

Run 6's findings 10–13 are fixed. New: 2 Major, 2 Minor, 5 Note. Stopped once by the session's usage limit
and resumed. About 248k tokens, 57 tool calls, 22 minutes.

**Ordering:** criteria and flows from the docs before opening source; the ledger's fix tables for runs
1–5 and run 6's criteria headers were read first; run 6's findings only afterwards (R7-AC-29–33 from
them, 34–35 from the source; `acceptance.md` says so).

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 17 | Major | A TAC grouped with commas is stored readable and unmarked: `482, 913`, `4, 8, 2, 9, 1, 3`, `48, 29, 13`, `482 - - 913` (also `482 , 913`, `482. 913`, `482 / / 913`, `482 ,913`, `482,, 913`) | `gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests 'Probe7.after_strong_keyword_odd_gaps'` | R7-AC-34, §6.2, D119 |
| 18 | Major | No test notices if `CaptureGate` stores the title or the expanded text unmasked (43/43 green under either mutation) | change `val (title, text, bigText) = masked.parts` to keep `p.bigText` (or `p.title`); `gradle -p apps/shell/core test --rerun-tasks` | R7-AC-35, D119 |
| 19 | Minor | *Captured* collapses newlines and repeated spaces in the expanded text; Share samples keeps them | `R7_PORT=4300 playwright test -c b02-r7.config.ts -g 'FLOW-1/4'` | R7-AC-20, patterns.md §7 |
| 20 | Minor | Group-summary, ongoing, channel and empty drops from a chosen app leave no log line, though D115 says each drop is logged (read, not run) | `Capture.kt`, `is Decision.Drop ->` | §6.2, D115 |
| 21 | Note | `outbox.insert` is outside the try in `Capture.store`: a SQLite failure on the capture thread is uncaught | `Capture.kt` | §6.2 |
| 22 | Note | The mask joins across any non-letter gap, so dates and times lose digits (`12/9/2026`, `9:47:05 PM`); the safe direction, but the spec should say it | `Probe7.after_time_and_date_overmask` | §6.2, D119 |
| 23 | Note | The simulator keeps nothing across a reload and posts fixed notifications (run 6's #14) | `-g 'FLOW-8'` | R7-AC-26 |
| 24 | Note | `DedupeKeyTest` "counts bytes, not characters" and `CaptureGateTest` "a payment is kept raw" can't fail for the reason they name | read | phase 3 |
| 25 | Note | By design, a number after a currency or with exactly two decimals is never masked, however long (`Your pass is RM482913`) | `Probe7.after_currency*`, `after_decimal*` | §6.2 |
| 15 | Note | No `when` is stored as the post time (run 6, open) | `Probe7.ac32_no_when` | §6.2 |

**17:** the filter groups digits only by a single space or hyphen; the mask joins a comma or dot only when
it stands alone, so a comma and a space end a run and every group is under four digits.
`4, 8, 2, 9, 1, 3` is how a screen reader or voice message reads a code.

**18:**
```
gate stores expanded text as posted:  BUILD SUCCESSFUL, 43 tests, 0 failed
gate stores title as posted:          BUILD SUCCESSFUL, 43 tests, 0 failed
gate stores text as posted:           43 tests completed, 7 failed
```

**19:** `Line one / Line two / (blank) / Line four   spaced` renders as `Line one Line two Line four spaced`
(`white-space: normal`). Suggested: `whitespace-pre-line`.

## What held

- The gate: an unchosen app first, no trace (payment, OTP, summary, ongoing, empty); exact package match
  (10 near-misses refused, case, suffix, prefix, padding, NUL, a Cyrillic "a"); 11 of 12 new OTP wordings
  dropped, the 12th kept masked; 12 of 12 payments kept.
- The mask: 39 digit forms masked (fullwidth, Arabic-Indic, Devanagari, circled, math, sub- and superscript,
  keycaps, every joiner, four spaces, a newline); amounts intact; everything outside digit runs byte-
  identical; eleven hostile inputs never threw (1.6 MB, 200k digits, 200k ZWSP, NULs, lone surrogates…),
  the slowest 1.1 s cold.
- The key and outbox: 8 kept lines → 6 rows; no code in the database file's bytes.
- The screen: one muted line for the one marked row; the intro says numbers are hidden; no horizontal
  scroll at 412 px; 23:30 KL reads the same in Los Angeles, Kiritimati and KL; empty and error states right;
  a tap anywhere on a row ticks it. No floating-point amounts; no `Log.` in the shell.

## Probes (phase 3), each reverted

15 broken one at a time: 13 caught; **not caught:** the gate storing the expanded text or the title unmasked
(finding 18).

## Suites

Web unit 141/141; core 43/43; Probe7 29/30 (red: 17, on purpose); QA e2e 8/9 (red: 19); `capture.spec.ts`
green.

## What I couldn't test

The Android side (listener, outbox, drop log, bridge, share sheet: no KVM); the debug build's listener
being off (read in the manifest); arbitrary text through the simulator; the Xiaomi (whether Android 16
hides OTPs from listeners).
