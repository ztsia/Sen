# QA B02 · run 6 (scoped: the capture path)

Saved by the main session from the reviewer's final message (a subagent can't write report files).
Report with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA

```
VERDICT   fix first
          27 criteria, 24 pass, 1 fail, 2 not reachable
          phases run: 1-6, scoped to spec §6.2 / D86 / D115 / D116 / D119
          (phase 4 is the outbox's SQLite schema; the slice has no server)
          screenshots: qa-artifacts/B02-shell-listener/screens/R6-FLOW-*.png
          tested at: 07e1ad7 (code as of a6a2437; core jar rebuilt after it)
```

Run 5's five findings are all fixed. The one Major left: a TAC whose digits carry keycap emoji marks, a
variation selector or an invisible joiner, or are grouped by a bullet or colons, gets past both the
filter and the mask, stored readable and unmarked.

**Area:** a chosen app's notification between the listener and storage, and how it shows on *Captured
on this phone* and in the simulator. **Left out:** the shell, the picker, *Keep Sen running*, the hidden
tests and sync (runs 1–4; none of this area's fixes reach them). The run was on Opus: the agent file's
`model: sonnet` was added mid-session, after the session had read it.

**Ordering:** criteria and flows were written from the docs before reading source. D119 reached the
docs in `2474aff` while they were being written; the criteria were amended to it before reading code
(`acceptance.md` says so). R6-AC-26 and 27 were added after reading run 5's AC-63 and AC-56; R6-AC-25's
probe and the `after_*` probes after reading the source, marked so.

**The tree moved during the run:** `0b89422` accidentally included the reviewer's `captured.tsx`
mutation, `d787078` restored it, `a6a2437` changed `CaptureGate`. Every result below is from re-runs
after those commits.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 10 | Major | A TAC with the strongest keyword is stored readable and unmarked when its digits carry keycap or variation marks or a CGJ, or are grouped by a bullet or colons | `gradle -p qa/B02/core-probe test --tests 'Probe6.after_strong_keyword*'` | R6-AC-24, §6.2 D119, CLAUDE.md |
| 11 | Minor | The mask joins digits across at most 3 spaces; the filter reads any whitespace run as one, so `Masukkan 482    913 untuk sahkan.` is stored readable | `--tests 'Probe6.after_four_spaces'` | R6-AC-24, D119 |
| 12 | Minor | No test guards "a notification the filter can't read is kept masked **and marked**" (probes P8a, P8, P7b leave 41/41 green) | see below | R6-AC-25, D119 |
| 13 | Minor | *Captured* says "as the apps wrote them" and patterns.md §7 "exactly as the app wrote them", but unmarked rows now show masked numbers with no explanation | `playwright … -c b02-r6.config.ts -g R6-FLOW-5` | patterns.md §7, D119 |
| 14 | Note | The simulator can't post arbitrary text, and its dedupe identity isn't §6.2's key | `capture-sim.ts store()` | R6-AC-22 |
| 15 | Note | A notification with no `when` is stored with its post time as `when`, so "none" and a real stamp look alike | `CaptureGateTest` | §6.2 |
| 16 | Note | bc2219f rewrote QA's run-5 probes and specs to fit D119 | `git show bc2219f -- qa/` | records |

### 10 · Major · TAC digits with marks or odd grouping get past both lines

The filter's code candidate needs `\p{N}+` runs joined only by a space or hyphen; NFKC leaves U+FE0F,
U+20E3, U+FE0E and U+034F in place; the mask's `kind()` classes them as `OTHER`, which ends a run.

```
Keep(maybeOtp=false) -> Ryt Bank | Your TAC is 4️⃣8️⃣2️⃣9️⃣1️⃣3️⃣. | null
Keep(maybeOtp=false) -> Ryt Bank | Your TAC is 4︎8︎2︎9︎1︎3. | null
Keep(maybeOtp=false) -> Ryt Bank | Your TAC is 482͏913. | null
Keep(maybeOtp=false) -> Ryt Bank | Your TAC is 482•913. | null
Keep(maybeOtp=false) -> Ryt Bank | Your TAC is 48:29:13. | null
```

No Malaysian bank is known to use these shapes, but the gate runs on any app chosen through *More*.
Suggested: treat every `\p{M}` and default-ignorable code point as invisible in both `OtpFilter.sentences`
and `OtpMask.kind`; consider `•` and `:` between digits as separators; add the cases to both tests.

### 11 · Minor · four spaces split a code for the mask, not for the filter

```
Keep(maybeOtp=false) -> Ryt Bank | Masukkan 482    913 untuk sahkan. | null
Drop(reason=OTP)  <- Ryt Bank | Your TAC is 482    913. | null
```

Suggested: count a whole run of whitespace as one separator, as the filter does.

### 12 · Minor · nothing guards the "unreadable is marked" rule

```
P8a the filter's overflow keeps the event unmarked: SUITE GREEN (decorative)
P8 the filter's failure keeps the event unmarked (a6a2437): SUITE GREEN (decorative)
P7b a RuntimeException from the filter no longer caught (a6a2437): SUITE GREEN (decorative)
Probe6 > ac25_unreadable_kept_masked_and_marked() FAILED   (under P8a)
```

The emulator's long-notification text starts with `Never share your TAC.`, so its `maybeOtp` comes from
that word whether or not the catch ran. Suggested: Probe6.ac25's case in `CaptureGateTest`; a word-free
emulator text.

### 13 · Minor · "as the apps wrote them" is no longer true

```
R6-FLOW-5 intro: 3 notifications, newest first, as the apps wrote them. They stay on this phone.
row 0: "You've received RM42.50 from TAN WEI MING on ••/•/••••, 9:48 PM (GMT+8)."
```

Suggested: *as the apps wrote them, with long numbers hidden*, and a D119 line in patterns.md §7.

### Notes 14–16

- 14: the dev panel posts fixed samples, so a browser walk proves the screen, never the mask; the samples
  match the core (`Probe6.after_sim_sample_parity`). Its dedupe identity has no notification key or
  length prefixes.
- 15: `whenMillis = if (p.whenMillis > 0) p.whenMillis else p.postTime` feeds both the key and `when_ms`.
  Decide before B07 derives ids from the key.
- 16: `Probe5.kt` (three `untouched` → `maskedUnmarked`, commented), `b02-flows.spec.ts` (Ryt's date
  masked), `b02-r5-flows.spec.ts` (formatting). Honest and D119-consistent, but run 5's record no longer
  shows what run 5 ran.

## Run 5's findings, re-checked

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Major: the mask missed shapes the filter reads | fixed | Probe5 `ac52_*`; `Probe6.ac24_shapes_masked` (thin space, fullwidth, brackets, underscore, zero-width, math bold, circled, superscript, Devanagari). Other shapes: finding 10 |
| 2 | Major: unlisted OTP wording stored raw | fixed (D119) | Probe5 `ac63_*`; `Probe6.ac26_unlisted_wordings`, Chinese included |
| 3 | Minor: the mask's regex overflowed near 2 KB | fixed on the JVM | 5,120 chars → Keep in 21 ms; ART only on the emulator |
| 4 | Minor: over-masking | fixed | `No. 123, 9:47 PM` unchanged; `RM  2500` keeps its amount |
| 5 | Minor: the invisible-character test had no teeth | fixed | Probe P6: `OtpMaskTest > codes in every shape … FAILED` |

## Probes (phase 3), each reverted

| Broke | Noticed? |
|---|---|
| Dedupe key from the raw text | yes (`OtpMaskTest`) |
| Mask only with an OTP word | yes (3 red) |
| Length prefix dropped from the key | yes (`DedupeKeyTest`) |
| Filter before the chosen check | yes (`CaptureGateTest`) |
| Amounts never recognised | yes (6 red) |
| Invisible characters don't join | yes |
| The filter's `StackOverflowError` not caught | yes |
| The filter's overflow keeps the event unmarked | **no** (12) |
| The `RuntimeException` branch unmarked, or not caught | **no** (12) |
| *Captured*'s maybe-OTP line removed | yes |
| The simulator lets an OTP into storage | yes |

## Suites

Core 41/41; web unit 141/141; typecheck, lint clean. QA probes 1–6: 267 tests, 13 red (Probe4's
deliberate TAC CAFE drop, and 12 Probe6 shapes behind findings 10 and 11). Playwright on QA's own preview
(:4196, 412×915): run 6's specs 7/7, `capture.spec.ts` 9/9, run 5's 5/5. SQLite on Outbox.kt's v3: 63 kept
events → 61 rows (two deliberate duplicates); a duplicate insert fails on `UNIQUE`; one row under the
masked-text key, none under the raw; neither `771204` nor the raw-text key in the file; drop log keys
dk1, dk1, dk2 → 2 rows, no text column.

## Flows (412×915, a screenshot per step)

All seven pass: R6-FLOW-1 (four payments, newest first, KL time, empty state), 2 (an unchosen app and an
OTP leave nothing; one drop line), 3 (masked and marked), 4 (a replay stored once), 5 (masked, unmarked:
finding 13), 6 (a touch on the row's text ticks it; share), 7 (America/New_York: `Today, 23:30`, then
`Yesterday, 23:30` after KL's midnight). `docs/flows.md` still marks no journey as core.

## What I couldn't test, and why

- The listener, outbox, drop log, bridge and share sheet on Android (no KVM; the emulator runs on GitHub
  Actions; no green emulator run after a6a2437 was seen).
- ART's regex on hostile inputs.
- Share samples' actual text (R6-AC-23) and the bridge's event list (R6-AC-27): Android only.
- Logcat: static check only (no `Log.`, `println` or `printStackTrace` in the app's Kotlin).
- Real notifications on the Xiaomi: the soak (a check was added to `docs/local.md`, `ad45a08`).
- Offline and app-killed survival, and everything outside the capture path.

**Recommendation:** fixing 10 changes `OtpFilter` and `OtpMask`, both in this area: a scoped re-run.
