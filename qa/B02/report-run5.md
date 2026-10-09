# QA B02 · run 5 (scoped: the capture path)

Saved by the main session from the reviewer's final message (a subagent can't write report files).
Report with screenshots: https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA

```
VERDICT   fix first
          36 criteria: 24 pass, 6 fail, 6 not reachable
          phases run: 1-6, scoped by the owner to the capture path (spec §6.2, D86, D115, D116)
          screenshots: qa-artifacts/B02-shell-listener/screens/ (FLOW-15 … FLOW-20)
```

The masking net works on every ordinary shape: amounts are kept; the dedupe key comes from the
masked text; running `Outbox.kt`'s own SQL on the core's rows leaves neither the code nor the key over
the raw text anywhere in the database file; *Captured on this phone* and the simulator show the
masked row as `patterns.md` §7 says.

Two gaps still let a code through, stored raw and unmarked:
- the mask misses numbers the native filter itself reads as codes: groups split by a thin, en or
  ideographic space or a tab, and circled or math-bold digits;
- an OTP worded without a listed word is stored raw: "nombor pengesahan", "sahkan", "log masuk",
  "verify".

**Suites:** unit 141/141; Kotlin core 39/39; typecheck and lint clean. QA's core probes: 217 tests,
193 pass, 24 red (23 are this run's findings; one is run 4's deliberate
`Probe4.r4_merchant_tac_store_no`). QA's run-5 Playwright 5/5; the branch's `capture.spec.ts` 9/9.
CI emulator 8/8 at `7d1045c` (Shell run 37916011487); no app code changed since.

**Order:** criteria and flows were written from the docs before opening `apps/`. QA's earlier records
were read first, and the ledger's D116 row describes the mask in one sentence (`acceptance.md` says
so). Probe5 cases marked "(after reading)" were added after reading the source.

## Findings, worst first

Each repro first needs `gradle -p apps/shell/core jar`, then `gradle -p qa/B02/core-probe test` with
the tests named.

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | The mask misses codes the filter reads as codes; they're stored raw with `maybe_otp = 0` | `--tests 'Probe5.ac52*'` | AC-52, D116, §6.2 |
| 2 | Major | An OTP with no listed word is stored raw | `--tests 'Probe5.ac63*'` | AC-63, D116, CLAUDE.md |
| 3 | Minor | About 2 KB of digit-heavy text overflows the mask's regex stack, uncaught on the capture thread (JVM; not checked on Android) | `--tests Probe5Overflow` | AC-64 |
| 4 | Minor | Over-masking: `No. 123, 9:47 PM` becomes `No. •••, •:47 PM`; the amount in `RM 2500` (after a no-break space) is masked | `--tests 'Probe5.ac52s_short_numbers_stay' --tests 'Probe5.ac51_amount_after_nbsp'` | AC-52s, AC-51 |
| 5 | Minor | `OtpMaskTest`'s zero-width case has no teeth | probe 6 below | AC-52 |
| 6 | Note | The simulator's maybe-OTP is hand-masked text, so a browser walk shows the display, never the mask | FLOW-20 | AC-59s |
| 7 | Note | The emulator test's "nowhere in the outbox" reads only the events' three text fields | `CaptureListenerTest.kt` | AC-65s |
| 8 | Note | Chinese OTPs and a spelled-out `T A C` are stored raw; the spec covers English and Malay only | `--tests 'Probe5.ac63_chinese'` | AC-62s, AC-63 |
| 9 | Note | Upgrading the outbox to version 3 doesn't re-mask older rows; only CI emulators ever ran version 2 | phase 4 SQLite run | AC-60 |

### 1 · Major: the mask and the filter disagree on what a code is

`OtpMask.RUN` joins digits only across a short list of separators and counts digits with
`Character.isDigit(char)`. The filter reads the text after NFKC, so a thin space becomes a space and a
circled digit becomes a digit. In the shape the filter keeps (the OTP word only in advice), the mask
sees two 3-digit runs and masks nothing; `mask()` returns null, so the event isn't even marked.

```
Drop(reason=OTP)  <- Ryt Bank | Your TAC is 482 913. | null            (U+2009)
Keep(maybeOtp=false) -> Ryt Bank | Transfer RM50.00 to TAN WEI MING: 482 913. Never share your TAC. | null
Probe5 > ac52_thin_space() FAILED
```

Fails the same way: en space, ideographic space, tab, circled and math-bold digits (the filter calls
all of these codes: `Probe5.ac52_filter_reads_them_as_codes` passes); middle dot, em dash, minus sign,
underscore, `(482) 913`. Masked correctly: a space, pairs, single digits, a hyphen, `OTP482913`,
`A-482913`, zero-width, a no-break space, fullwidth and Arabic-Indic digits.

### 2 · Major: the net's trigger is a word list

```
Keep(maybeOtp=false) -> Ryt Bank | Nombor pengesahan anda ialah 482913 | null
Keep(maybeOtp=false) -> Ryt Bank | Masukkan 482913 untuk sahkan transaksi RM50.00. | null
Keep(maybeOtp=false) -> Ryt Bank | Gunakan 482913 untuk log masuk | null
Keep(maybeOtp=false) -> Ryt Bank | Use 482913 to verify your login. | null
Keep(maybeOtp=false) -> Ryt Bank | Your verification number is 482913 | null
```

This follows D116's letter ("has an OTP word") but not its purpose ("so no possible code is ever
stored") or the CLAUDE.md non-negotiable. The mask's trigger could be far broader than the filter's.
**Owner question:** how wide should the mask's trigger be? Dropped correctly: passcode, kata laluan
sekali guna, one-time PIN, security code, 2FA code, token, activation code.

### 3 · Minor: the regex stack overflows

On the JVM with a 1 MB thread stack it fails below the 5,120 characters a notification field can hold:

```
OVERFLOW mask/singles: first at 2072 chars (n=1025)
OVERFLOW gate/singles: first at 2390 chars (n=1184)
OVERFLOW mask/digit run: first at 2058 chars (n=2032)
OVERFLOW mask/groups: first at 2294 chars (n=284)
OVERFLOW mask/comma pairs: first at 2454 chars (n=608)
java.lang.StackOverflowError
```

`Capture.store` has no catch; on Android an uncaught Throwable on `sen-capture` kills the process, and
a reconnect replays the notification, so the crash would repeat. ART's regex is ICU-backed and may not
recurse this way. Suggested: cap what the filter and mask read, catch Throwable around `decide`, and an
emulator test with a 5,000-character digit run.

### 4 · Minor: over-masking

```
Keep(maybeOtp=true) -> Ryt Bank | Paid RM12.90 at Table 12, No. •••, •:47 PM. Never share your TAC. | null
AssertionFailedError: amount changed: Paid RM •••• at KEDAI MAJU. Ref ••••••. Never share your TAC.
```

A run can span up to three separators, including `, `, so unrelated numbers are joined. The currency
check allows at most one ASCII whitespace, so `RM 2500` after a no-break space, `RM  2500` and
`RM 2,500` lose their amount. Decimal amounts are always kept.

### 5 · Minor: a test without teeth

With the invisible-character class removed from `OtpMask.RUN`, all 39 core tests stay green: the only
zero-width case, `48​2910`, splits 2+4, so its 4-digit half is masked either way. `Probe5.ac52_zero_width`
(`48​29​13`) goes red under the same defect.

### Notes 6–9

- 6: the simulator's maybe-OTP matches what the core produces for its raw form (`Probe5.ac59s`), but no
  input reaches a mask in the browser.
- 7: the other outbox tables have no text columns, so the claim holds by schema; a byte check of the
  whole SQLite file agrees.
- 8: `Keep(maybeOtp=false) -> Ryt Bank | 您的验证码是482913 | null`
- 9: `v2->v3 events cols has maybe_otp: True | rows: [('old', 0)]`

## Probes (phase 3)

| Broke | Caught? | What went red |
|---|---|---|
| The gate stores the raw fields | Yes | 3 of 39 in `OtpMaskTest` |
| The dedupe key is taken from the raw text | Yes | `the dedupe key is taken from the masked text` |
| The filter runs after the mask | Yes | 2 in `CaptureGateTest` |
| The mask keeps no amounts | Yes | 5 in `OtpMaskTest` |
| The mask triggers on strong words only | Yes | 4 in `OtpMaskTest` |
| `RUN` ignores zero-width characters | **No** | Nothing: 39/39 green (finding 5) |
| `captured.tsx` loses the maybe-OTP line | Yes | `capture.spec.ts`: element not found |

## Phase 4: the outbox's SQL (SQLite, `Outbox.kt`'s own statements)

```
v1->v3 … has maybe_otp: True | rows: [('old', 0)]
v2->v3 … has maybe_otp: True | rows: [('old', 0)]
inserted 3 of 5 posts
482913 in the database file bytes: False
771204 in the database file bytes: False
raw-text key in file: False | masked-text key (recomputed in Python) == stored: True
```

## Phase 5: flows (412×915, preview build on port 4183)

FLOW-15, 16, 17, 18 and 20 pass. FLOW-19, the native batch in `Probe5.kt`, fails on findings 1–4. axe
(WCAG 2.1 AA) finds nothing on *Captured on this phone* with a masked row.

## Fix tier (D117)

Fixes to findings 1–5 stay within the capture path and touch the OTP non-negotiable: tier 2, a fresh
scoped run. This is the fifth QA round to find OTP gaps in this area.

## What I couldn't test, and why

- Native only, no emulator in a session: the bridge's `events()` and `shareSamples()` with a masked row
  (AC-56, AC-58); the drop log and last-event time around a masked event (AC-55s, AC-63s).
- Finding 3 on Android (ART's regex).
- The real upgrade through `SQLiteOpenHelper.onUpgrade` on a version-2 file.
- The Xiaomi: the soak follows the PR.
- Out of the owner's scope: the other B02 journeys, the timezone and offline runs.
