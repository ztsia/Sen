# QA · B02 · The shell and the listener

**Report with screenshots:** https://claude.ai/artifact/XUMeedU2cVicKBEWeqcFMA

Run 1, 9 Oct 2026, at `45aacca`, by the `qa-reviewer` subagent (its final message, saved here because
the harness refused its own write). The HTML report with screenshots is linked below once published.

```
VERDICT   fix first
          52 criteria, 36 pass, 9 fail, 7 not reachable
          phases run: 1-6 (B02 has no server, so phase 4 ran the outbox's SQLite schema instead)
          screenshots: 46
```

Suites: Vitest 141/141; Kotlin core 22/22; the branch's Playwright 98/98; typecheck and lint clean;
CI emulator (run 37881271168) 7 tests, 5 pass, 2 fail; QA's own Playwright 15, 13 pass (findings 7, 10).

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Done-when 3 fails on CI, and its test can't prove the bridge is refused to another origin | run 37881271168 (ShellTest.kt:99) | AC-3, §17 |
| 2 | Major | Done-when 4's unchosen-app test fails on CI, and it races its own marker | same run (CaptureListenerTest.kt:59) | AC-23, §6.2 |
| 3 | Major | The OTP filter keeps `OTP123456`, "…code is…", "Kod anda ialah…" and "Your PIN is…" | `gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test` | AC-24, §6.2 |
| 4 | Major | The OTP filter silently drops real payments that mention TAC, OTP or a security warning | same | AC-25, §6.2, §6.6 |
| 5 | Minor | The branch's "never caches the API" test is decorative | worker changed to cache /api/: test stays green | AC-7, D114 |
| 6 | Minor | The heartbeat's last-event time moves on every duplicate and replay | `Capture.kt` store() | AC-30, §6.2 |
| 7 | Minor | *Share samples* with nothing ticked acts anyway | FLOW-9 step 2 | AC-52 |
| 8 | Minor | The simulator can't walk the sad paths: no OTP, no re-post, always a Xiaomi | dev panel | AC-44, AC-49 |
| 9 | Minor | The soak and Account rows are built by hand instead of from patterns.md's rows | captured, account | AC-60 |
| 10 | Minor | More has two "Account" and two "Claims" rows | /more | AC-61 |
| 11 | Minor | The handoff said B02 "not started"; cloud.md §5's emulator row is blank though the emulator ran | docs | AC-62, done-when 9 |
| 12 | Minor | The dedupe key also hashes title and expanded text, beyond spec §6.2, frozen once B07 syncs | core probe | AC-28 |
| 13 | Note | A U+001F inside a field produces a key collision, despite the comment | core probe | AC-28 |
| 14 | Note | *Choose these 5* ticks Google Wallet as well as the owner's four apps | Your apps | D88 |
| 15 | Note | *Keep Sen running* says "Tested on a Xiaomi" before any Xiaomi test has happened | Keep Sen running | §6.2 |

**1.** The test asserts `typeof window.Capacitor === 'undefined'` on `http://127.0.0.1:4173`, which
serves the same web build; its bundle's `@capacitor/core` defines `window.Capacitor` on any origin, so
it can never pass. The check that matters, `typeof window.androidBridge`, never runs. The first half
passed: the page couldn't navigate the WebView to the other origin.

**2.** The test posts as `com.android.shell` while only Ryt is chosen, then `settle()` adds
`com.android.shell` to the chosen list for its marker. `cmd notification post` returns before the
listener's callback runs, so the unchosen notification is likely judged as chosen. If the race isn't the
cause, an unchosen app reached storage, which would be a Blocker; as written the test can't tell.

**3.** A keyword can't be followed by a digit (`OTP123456`), and there's no phrase for "…code is…",
"kod anda" or "PIN is".

**4.** Bare `tac`/`otp` and `never share`/`do not share`/`jangan kongsi` also match payments (a merchant
`TAC CAFE`, a transfer ending "We never ask for your TAC"). Each is dropped before storage.

**5.** The test only greps `sw.js` for `'/api/'`. The behaviour is right today (FLOW-10).

**6.** `Heartbeat.event` runs before `outbox.insert`, whatever it returns, so a replay after a reboot
reads as a new event.

**7.** The simulator resolves `shareSamples({ids: []})`; the native plugin rejects `EMPTY`, and the
screen would then toast the wrong reason.

## Probes

| Broke | Caught |
|---|---|
| Chosen-apps check removed from CaptureGate | yes |
| `tac` removed from otp-keywords.txt | yes |
| OTP whole-word boundaries removed | yes |
| `when` dropped from the dedupe key | yes |
| Dedupe key's field separator dropped | yes |
| Origin check changed to accept a startsWith match | yes |
| `com.whatsapp` taken off the denylist | yes |
| Service worker caches `/api/` | **no** |
| `UNIQUE` on the outbox's dedupe key dropped | not run (emulator only); the table definition in SQLite ignores a replayed insert |

## What passed

APKs from CI: package names, the review build's listener disabled, no `QUERY_ALL_PACKAGES`,
conversations refused, the fallback page in the APK. CI emulator: the fallback page offline, the bridge
answering our origin, airplane mode after the first load, a chosen app stored and its OTP dropped, a
reconnect replay with no duplicates. Chromium: every capture screen, the picker refusing WhatsApp, Gmail,
Messages and Instagram, KL times under another time zone, offline with the API never cached, a new
deploy waiting for the next launch, axe clean. All 27 curated packages exist on Play. The production
bundle holds no secret and no simulator.

## Not testable here

The real listener, bridge and outbox on a device beyond CI's emulator (no KVM); the soak (the owner's);
native back, status bar, edge-to-edge, splash, haptics, openInBrowser; the signed release (no key yet);
sync and RLS (B05, B07).
