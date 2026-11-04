# QA · B07 · Sync and the outbox · run 1

Written by the main session from the reviewer's final message; the tool refused report files from the subagent.

**Verdict: fix first.**
- Criteria: 48 in all; 44 pass, 2 fail, 2 not reachable.
- Findings: 2 Major, 0 Blocker.
- Phases run: 1 to 6. The eyes pass had no Agent tool in the reviewer, so the main session spawns it.
- Code under test: 683376e. Commits after it, up to bd964d0, are docs only.

Sync itself holds: replays, retries, tombstones, field edits, isolation between people and the
*Capture* switch. 8 of 10 deliberate breaks turned the suites red. The two Majors are in the capture
watchdog.

## Suites

| Check | Result |
|---|---|
| typecheck, lint | clean |
| unit | 471/471 |
| `pnpm test:db` | pgTAP 340 pass. API 168 pass, 10 skipped (GET routes in the write sweep, by design) |
| `pnpm e2e` | 1409 pass |
| `e2e:lived`, `e2e:server` | 24/24, 5/5 |
| Kotlin core | 65/65 (`--rerun-tasks`) |
| `pnpm security` | failed in the sweep, because `gitleaks` wasn't on PATH. With gitleaks 8.30.1 built from the Go proxy it passes: 376 commits, no leaks. The audit shows 10 moderate |
| `pnpm hygiene` | pass |
| mutants | 74/74 killed, none of them B07's (finding 6) |
| diff | 1 changed (`settings/capture/captured`), 1 new (`home@capture-off`), 0 check findings, 2 metrics flags (noise, finding 11) |
| QA's specs | `qa/e2e/b07-flows.spec.ts` 7/7; `qa/B07/api-probes.probe.ts` 16/19 (the 3 failures are findings 1, 3 and 4) |

## Findings

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 1 | Major | With notification access revoked, or the listener killed, no *Capture may be off* push comes for up to 48 h after the last payment. The server reads only when the heartbeat and the last event arrived, never what the heartbeat says (`access`, `listenerConnected`). In a browser, Home ignores them too | AC-20c, brief done-when 5, local.md B07 step 3 |
| 2 | Major | The 24-hour heartbeat rule's test catches nothing: the fixture's events are over 48 h old, so the no-events rule fires the same push. Raising the limit to 72 h stays green | AC-20, §6.2 Health |
| 3 | Minor | *Captured on this phone* drops events that share a posted time at a page boundary (`posted_at < before`); 50 of 51 seen | AC-30 |
| 4 | Minor | The no-events watchdog trusts the phone's clock: an event stamped in the future silences it | D143 (7) |
| 5 | Minor | The once-a-day guard isn't held by a test: keying the alert on the instant instead of the KL day survives | brief *Health* |
| 6 | Minor | B07 added no breakage checks to `qa/mutants.ts` | D139, B06 retro |
| 7 | Note | `app_user` can clear its own tombstone (column grant on `deleted_at`) and back-date a heartbeat (INSERT covers `created_at`) by direct SQL; neither is reachable through the API | D143 (4), (7) |
| 8 | Note | The pull-down version is one global counter, so its gaps show how many changes other people made | D52 |
| 9 | Note | A notification over 8,000 characters (16,000 expanded) is refused for ever and stays on the phone | §6.2 |
| 10 | Note | `pnpm security` needs `gitleaks`. GitHub release downloads answer 403 here; `go install github.com/zricethezav/gitleaks/v8@v8.30.1` through proxy.golang.org works | qa.md |
| 11 | Note | The two metrics flags (`review`, `settings/claims` settle) are noise: re-measured with medians about equal, the same work on both builds, and both break 1,000 ms on main too | D139 |

### Repros

- 1: `pnpm exec vitest run --config qa/B07/vitest.probe.config.ts -t "access revoked"`. With access off, 30 h after the last payment, there are 0 pushes, and health reads `silent:null`.
- 2: `HEARTBEAT_SILENT_MS` set to 72 h, then `pnpm test:db` → 168 passed (the mutant survived).
- 3: `-t "paging through 51"`: page 1 has 50 rows, page 2 has 0.
- 4: `-t "phone clock"`: with a future `posted_at` and 3 days without a real event, there are 0 pushes.
- 5: the key `capture_off:${ctx.day}` changed to `${ctx.now.toISOString()}`, then 168 passed (the mutant survived).

### Breakage checks to add (finding 6)

The reviewer's proposed list:
- `b07-event-id-unchecked`
- `b07-raw-text-mutable`
- `b07-stale-upsert-revives`
- `b07-capture-off-ignored`
- `b07-edit-reapplied`
- `b07-bearer-unsigned`
- `b07-batch-oversized-blocks` (Kotlin core)
- `b07-not-synced-flickers` (web)
- `b07-heartbeat-window`
- `b07-watchdog-key-per-instant`

## Backend

- **RLS matrix** (`qa/B07/rls-matrix.sql`) is clean across the four new tables:
  - no user id set, or the admin: 0 rows;
  - A and B see only their own;
  - B writing, or moving rows, as A: 42501, or 0 rows touched.
- **Routes:** all five are in the route table. Malformed requests get `{ code, message }`, never a 500. Five identical batches at once make one row each. Hostile text is stored exactly.
- **Bearer:** works as stored and URL-decoded. A forged signature gets 401, and so does a token after *Sign out everywhere*.

## Journeys (390×844, Minted light)

- **FLOW-7:** Home's warning, then *Fix* opens Settings → Capture.
- **FLOW-8**, a browser write:
  - *Not synced yet* appears after 5 s, not at 2.5 s;
  - a 500 reverts the field and offers *Retry*;
  - *Retry* saves once the API is back.
- **FLOW-9:** *Captured on this phone* is the same in KL and New York time.
- **Core journeys** pass: `first-run`, `pay-new`, `scan-after`.

## Not tested here

- **The shell on a device**, because there is no KVM: the listener, WorkManager, the Keystore, the outbox's owner claim, the 26-hour notice. CI's emulator covers them.
- **The owner's phone checks** (`docs/local.md` B07 steps 1–4), and Q25 (step 5).
- **Home's *Capture is off* inside the shell.** Its logic is covered by `capture-warnings.test.ts`.
- **The Claude Security scan**, queued for the laptop (step 6).
