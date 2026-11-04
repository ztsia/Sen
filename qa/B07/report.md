# QA · B07 · Sync and the outbox · run 2 (scoped)

Report, with screenshots: https://claude.ai/artifact/A3BCeJcC4rGaRoEDGxXX5m

Written by the main session from the reviewer's final message; the tool refuses report files from the
subagent. Run 1 is `report-run1.md`.

**Verdict: ship.** No Blocker or Major is open.
- Criteria: 12 in all; 7 pass, 5 fail, 0 not reachable.
- Area: capture's health, from the heartbeat to the watchdog push and Home's warning (§6.2), and the paging of `GET /captured`.
- Commits: 683376e..b31cc31.
- Out of scope: everything outside the area. The fixes add no migration, and change no RLS, shared UI, money or auth.

## Suites at HEAD

- Typecheck and lint clean. Unit 472/472.
- `pnpm test:db`: pgTAP pass; API 173 pass, 10 skipped.
- B07's breakage checks: 12/12 killed.
- Run 1's API probes: 19/19. Run 2's: 3/7, the failures being #12, #13, #15 and #16.
- Run 2's browser flows: 4/5 specs; the failing step is #14.

## Run 1's findings, re-checked

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Major | fixed | With access off: `silent no-access`, 1 push saying *Your phone says Sen can't read notifications…*. With access back: silent null, 0 pushes. In a browser, Home says *Capture is off* with *Fix* |
| 2 | Major | fixed | `b07-heartbeat-window` killed |
| 3 | Minor | fixed for ties at the same millisecond | 51 of 51 seen. Microsecond times: #15 |
| 4 | Minor | fixed for a clock running ahead | 1 push. A clock running behind: #16 |
| 5 | Minor | fixed | `b07-watchdog-key-per-instant` killed. Two ticks in one KL day push once; the next day pushes again |
| 6 | Minor | fixed | 12/12 killed. The Kotlin `BatchPlan` check is missing: `qa/mutants.ts` has no Kotlin suite |
| eyes `capture-off/3` | wrong | fixed | The push stand-in uses the server's words |
| eyes `captured` | look again | fixed | The intro now says *kept for you only. Every number but the amounts is hidden.* |

## New findings

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 12 | Minor, new with the fix | With Capture switched back on after a day off, a false *Capture may be off* push can come the next morning, until the shell syncs again. The shell sends no heartbeat when the listener connects (`onListenerConnected` only logs) | R2-AC-3, §6.2, §9.6 |
| 13 | Minor | The listener-off push says *Sen hasn't heard from your phone for a day* although the phone synced an hour ago | R2-AC-2, R2-AC-9 |
| 14 | Minor | Home's banner breaks its date over two lines at 390×844. The widget says *Capture is off* where the banner and the push say *may be off* | R2-AC-9 |
| 15 | Minor | Paging loses events whose posted time has sub-millisecond precision. Only a hand-made client sends those | R2-AC-5 |
| 16 | Minor, not new | A phone clock days behind fakes *No payment notifications for 2 days*, because `least(posted_at, created_at)` trusts it | R2-AC-6, D143 (7) |

Repro: `pnpm exec vitest run --config qa/B07/vitest.probe.config.ts qa/B07/api-probes-run2.probe.ts -t "<name>"`.

Bad cursors (`abc`, a bare instant, `_x`, SQL text, over-long) all return 400 `invalid`, never a 500.

## Not tested here

- **The listener's binding timing on a device** (behind #12). It needs a phone; `docs/local.md` B07 step 3 covers it.
