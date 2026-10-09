# QA ledger · B02

## Run 1 → fixes (9 Oct 2026)

**Tier 3 for the batch: a fresh full QA run follows.** Several fixes touch a `CLAUDE.md` non-negotiable
(the OTP/TAC filter, run in native code before anything is stored) and shared code (`SettingsRow` in
`blocks/rows.tsx`, a pattern of `patterns.md` §7; the placeholder's lists, which are navigation). A batch
takes its highest tier.

| # | Finding | Fix | Tier, and why |
|---|---|---|---|
| 1 | Done-when 3's test can't pass: the same web build defines `window.Capacitor` on any origin | `ShellTest.c` now checks what matters on the other origin: no `androidBridge`, `Capacitor.getPlatform()` is `web`, and a call through it is refused | 3 (batch). The bridge's origin lock itself was right; the test proved nothing |
| 2 | Done-when 4's unchosen test raced its own marker | Markers are posted by Sen itself, always chosen; the chosen list never changes while a notification is on its way. Android hands a listener notifications in posting order, so a stored marker means everything before it was handled | 3 (non-negotiable's test) |
| 3 | The OTP filter kept `OTP123456`, "code is", "kod anda", "PIN is" | A notification is an OTP when it has a keyword **and** a code (6–8 digits anywhere, or 4–5 straight after the keyword); a keyword may run into its code; new keywords | 3 (non-negotiable) |
| 4 | The OTP filter dropped payments that only mention TAC, or a merchant named TAC | Same fix: a keyword alone drops nothing. Amounts, dates, times, references, account digits and phone numbers aren't codes | 3 (non-negotiable) |
| 5 | The "never caches the API" test only grepped the worker | It now calls the API through the worker online, finds nothing cached, and sees the API fail offline. Red: with the worker changed to cache `/api/`, the test fails (`1 failed`); green with the real worker | 1 on its own; in the batch |
| 6 | The heartbeat's last-event time moved on replays and duplicates | `Capture.store` moves it only when the insert is new | 2 on its own |
| 7 | *Share samples* with nothing ticked acted anyway | The screen says *Tick the notifications to share first.* and stays in picking; the simulator refuses `EMPTY` as the shell does | 2 on its own |
| 8 | The simulator couldn't walk the sad paths | Dev panel: *Post it again* (a replay), *Post an OTP*, and a brand with no steps | 2 on its own |
| 9 | Hand-built rows on the soak and Account screens | `SettingsRow` gains an information row and a long-press row; Account and the heartbeat use it; `patterns.md` §7 records both and the raw notification row | 3 (shared pattern) |
| 10 | More showed two *Account* and two *Claims* rows | More leaves `settings/…` to Settings, whose placeholder lists its sections; `local.md`'s paths updated | 3 (navigation) |
| 11 | Handoff stale; cloud.md's emulator row blank | Handoff rewritten (pushed after QA had read it); cloud.md §5 records the emulator on GitHub's runners | docs |
| 12 | The dedupe key hashes title and expanded text beyond spec §6.2 | Kept, deliberately: an in-place rewrite with the same key and `when` is new wording. Spec §6.2 and D115 now say so | spec bug, fixed in the spec |
| 13 | U+001F inside a field could collide | Each field is length-prefixed (UTF-8 bytes) instead of joined with a separator; tests pin it, nothing has synced yet | 3 (batch) |
| 14 | *Choose these 5* ticked Google Wallet | A card wallet may be chosen but isn't suggested (D88): *Choose these 4* | 2 on its own |
| 15 | "Tested on a Xiaomi" before any test | "Sen is tried on a Xiaomi first; the heartbeat shows whether capture keeps running." | 1 on its own |

Verified before the re-run: Kotlin core 25/25 (QA's probe 23/23 against the new filter and key); unit
141/141; Playwright 100/100; typecheck, lint, format clean; the e2e APK and its tests build here. The
emulator tests run on the push (`Shell` workflow).

## Run 2 → fixes (9 Oct 2026)

**Tier 3 again: a fresh full QA run 3 follows.** The Blocker is the OTP/TAC filter, a `CLAUDE.md`
non-negotiable. Run 2's findings 1 and 2 show the run-1 fix was the wrong shape: "a keyword somewhere and
a number somewhere" can't be right both ways. The filter is redesigned rather than patched again.

| # | Finding | Fix | Tier, and why |
|---|---|---|---|
| 1 | Blocker: OTPs stored in six shapes (split, `#`, `G-`, `No.`, a few words between) | A keyword and a code must be **joined**: keyword → closed list of linking words → code; code → *is your*, *adalah*… → keyword; or keyword → any words in one clause → *is*/*ialah*/colon → code. A code may be grouped by spaces or hyphens and carry `#` or a letter and hyphen in front | 3 (Blocker, non-negotiable) |
| 2 | Major: payments dropped when a footer meets a 6–8 digit number | The same: a keyword and a number that merely share a notification no longer count; security footers (*never share*, *jangan kongsi*) are no longer keywords; a comma or full stop ends a join | 3 (non-negotiable) |
| 3 | The gate's tests didn't pin chosen-first or exact matching | `CaptureGateTest`: a real OTP, a summary, an ongoing, an empty and a dropped channel, all from an unchosen app, are `NOT_CHOSEN`; prefix, case and near-miss packages are refused. Red: moving the chosen check below the OTP check, and matching by prefix, each fail one test (`27 tests completed, 1 failed`); green with the real gate | 1 on its own |
| 4 | The title on *Captured on this phone* couldn't be selected | `.selectable` on the title too | 1 on its own |
| 5 | The simulator's replay and OTP were only words | They go through the simulator's own store: chosen check, then a marked OTP dropped, then a dedupe identity (package, title, text, expanded text, `when`), so a replay adds nothing | 2 on its own |
| 6 | *Keep Sen running* promised a Home warning only B07 builds | It points to the heartbeat under *Captured on this phone* | 1 on its own |
| 7 | No journey in `docs/flows.md` is marked core | For the owner: in the handoff | — |

Verified before run 3: Kotlin core 27/27; QA's probes from both runs (`qa/B02/core-probe`, `Probe` and
`Probe2`) 51/51 against the new filter; unit 141/141; the branch's Playwright 100/100; QA run 2's own
Playwright specs 17/17 (FLOW-5's selectable title included); typecheck, lint, format clean.

## Run 3 → fixes (9 Oct 2026)

**Tier 3: a fresh full QA run 4 follows.** Run 3 found the filter failing both ways a third time, and
said so plainly: each fix had patched the cases QA listed. So this round changed the approach, not the
cases, and was checked against wording no run had listed before QA sees it again.

| # | Finding | Fix | Tier, and why |
|---|---|---|---|
| 1 | Blocker: OTPs stored when an amount, a comma or a brand sits between keyword and code | **Evidence, not patterns.** Sentence by sentence (title apart from text), advice set aside; a strong keyword (otp-keywords.txt) outside advice and a code anywhere in the rest drop it, whatever sits between. Advice that holds a code or points at one ("share this code") drops it too. Zero-width characters are removed first | 3 (Blocker, non-negotiable) |
| 2 | Major: payments dropped where `kod` / `code is` / `PIN` met a reference | `kod`, `code`, `pin`, `password` are weak: they count only joined to their code ("PIN is 4829", "Gunakan kod 482910", "123456 is your code", "PIN for card activation is 482910"), never after a qualifier (reference, approval, booking… code; kod rujukan, kelulusan…) or in a promotion. A number after a reference, approval, account, merchant, phone or month word isn't a code | 3 (non-negotiable) |
| — | A dropped payment left no trace (run 3's note on finding 2) | Each OTP drop from a chosen app is logged by time and app, never text, in the heartbeat's log (*Dropped a one-time code from Ryt Bank*); the emulator test asserts it. The soak can now tell a dropped payment from a missing one | 3 (with the batch) |
| 3 | The handoff predated runs 1–3; the ledger's owner question wasn't in it | Handoff rewritten with this commit | docs |
| 4 | No core journey in `docs/flows.md` | In the handoff, for the owner | — |
| 5 | QA run 1's `b02-prod`, `b02-rowtap` (and `b02-flows`, `b02-a11y`) stale | Updated for the changes QA itself asked for: Capture under Settings, *Choose these 4*, the version row no longer a button. 44/44 of QA's specs pass (`b02-update`'s AC-8 needs its own server on :4177 and wasn't re-run) | 1 |

**Evidence before run 4:** Kotlin core 29/29, of which two sets are wording no QA run listed (19 OTPs
from Malaysian banks, e-wallets and apps; 14 payments with footers, dates, IDs, phone numbers and a
promotion); QA's probes from all three runs (`Probe`, `Probe2`, `Probe3`) 91/91; unit 141/141; the
branch's Playwright 100/100; QA's Playwright 44/44; all four APKs build; typecheck, lint, format clean.

## Run 4 → fixes (9 Oct 2026)

**Tier 3: a fresh full run 5 follows, if the owner wants one (see the handoff).** Run 4 found the
evidence-based filter right on every case written from the spec before the code was read (37/37), and
wrong on 18 of 20 written after reading it, all on the weak-keyword path and non-code numbers.

| # | Finding | Fix | Tier, and why |
|---|---|---|---|
| 1 | Blocker: weak-keyword OTPs stored across an amount or a few words; digits spaced one by one never a code | QA's structural fix: a weak keyword (code, kod, password; PIN only when it reads as a PIN) and a code in the same sentence drop it, outside a promotion. Single-digit groups count | 3 (Blocker, non-negotiable) |
| 2 | Major: payments dropped on hyphen dates, card auth codes, other footers | A hyphen date with a real day and month isn't a code; auth, authorisation, payment, txn and transaction codes are references (with or without "is"); "authorisation code" and "Secure2u" are no longer strong keywords (card receipts and Maybank's payments use them); advice now includes "keep … confidential", "protect your PIN", "rahsiakan" | 3 (non-negotiable) |
| 3 | `heartbeats.package` added without a version bump | Outbox version 2; `onUpgrade` adds `package` and `drop_key`. Checked in SQLite on the version-1 schema: the columns arrive, a replayed drop is logged once, ordinary beats aren't touched | 2 on its own |
| — | A reconnect would re-log an OTP still showing (run 4, not reported for want of an emulator) | Each drop carries a key hashed from the package, the notification's key and its `when` (no text), unique in the log; the emulator's replay test asserts one line | 2 |
| 4 | No test pinned that a subdomain is another origin | `OriginTest`: `x.sen.vercel.app` and `vercel.app` refused | 1 |
| 5 | Note: a code whose keyword is only in a footer is kept | Kept, deliberately: dropping it would drop every payment with a store number and a "never share your TAC" footer (run 2's Major). Spec §6.2 says so. `Probe4.r4_keyword_only_in_advice` stays red as the record of that choice | spec |
| — | Note (listed for the owner, not counted): "TAC CAFE 2241" dropped | In doubt, so it drops, as §6.2 says; it's logged. `Probe4.r4_merchant_tac_store_no` stays red as the record | — |
| 6 | Note: a stale `vite preview` made `pnpm e2e` test an old build | `playwright.config.ts` no longer reuses a running server unless `PW_REUSE=1` | 1 |
| 7 | Note: no core journeys in `docs/flows.md` | For the owner (handoff) | — |

**Evidence:** Kotlin core 31/31; QA's probes from all four runs 177/179 (the two red are the
deliberate notes above); unit 141/141; Playwright 100/100 on fresh builds; QA's Playwright 45/45
(AC-8, which needs its own server, not re-run); all four APKs build.

## The masking net, D116 (9 Oct 2026)

The owner's answer to run 4's question (D116): rather than another round of filter rules, a miss is
made harmless. The filter is unchanged; what it keeps but might hold a code is stored masked.

| # | Change | Tier, and why |
|---|---|---|
| 1 | `OtpMask` in the core: an OTP word anywhere (advice included) and a run of four or more digits (grouped, glued to letters, with invisible characters) masks every such run as `•`, leaving amounts; `RawEvent.maybeOtp`; the dedupe key from the masked text. `OtpMaskTest` (8 tests) | 3 (the OTP non-negotiable) |
| 2 | Outbox version 3 adds `events.maybe_otp`; the bridge, Share samples, *Captured on this phone* (a muted line, `patterns.md`) and the simulator (*Post a maybe-OTP*) show it. Emulator test: a doubtful OTP is stored masked and marked, and its code is nowhere in the outbox | 3, with 1 |
| 3 | `Probe4.r4_keyword_only_in_advice` now expects the event kept masked, not raw (run 4's note 5 is settled by D116). `r4_merchant_tac_store_no` stays red: the filter is unchanged, so "TAC CAFE 2241" still drops | — |
| 4 | QA's `b02-a11y` copper-dark picking check measured the button while it faded back from `:active` (4.04:1; at rest it passes). It failed at `820eadb` too. It now waits for animations to finish | 1 (test timing, no app change) |
| 5 | Spec §6.2, D116, the B09 and B10 briefs | docs |

**Evidence:** Kotlin core 39/39; QA's probes 147/148 test methods (the red one is the deliberate TAC CAFE
drop); unit 141/141; Playwright 100/100 (with the maybe-OTP row); QA's Playwright 45/45 (AC-8 needs its own
server, not re-run); all four APKs and the emulator tests build. The emulator runs on the next push.
