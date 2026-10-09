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
