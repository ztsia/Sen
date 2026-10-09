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
