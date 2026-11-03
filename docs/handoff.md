# Handoff

## Where things stand (3 Nov)

**B07 · Sync and the outbox** is built on `B07/sync`, and its full QA run is in progress. There's
no PR yet.
- **Database:** `bank_events`, `capture_apps` (tombstones and a `sync_version`), `device_heartbeats`,
  `outbox_applied`. Migrations 0011 and 0012, with pgTAP in `packages/db/test/sync.sql`.
- **API:** `/sync`, `/sync/changes`, `/match` (empty until B11), `/capture/health`, `/captured`; a
  bearer session for the shell; the capture watchdog in the morning frame.
- **Shell:** outbox v4, WorkManager sync, the session in the Keystore, the *Capture* switch, the
  26-hour notice, bridge 4. CI's emulator tests pass (done-when 1, 2, 7). An outbox belongs to its
  first person; another person's sign-in empties it first.
- **Web:** pending writes for `setting.set` (the outbox in the shell; optimistic with *Retry* in a
  browser), *Captured on this phone* from the server, and Home's capture warnings.
- The mechanisms are **D143**. The owner's phone checks and Q25 are in `docs/local.md` → B07.
- **The security scan couldn't run here** (no Workflow tool). It's queued for the laptop before the
  merge (`docs/local.md` → B07 item 6).

## What to do next

1. Read QA's record in `qa/B07/` and fix by the tiers in `ledger.md`; then usage, then the PR
   *B07 · Sync and the outbox*.
2. The owner's answer on B06's F1 and F2 (the sign-in screen says *not invited* and *access paused*).
   The fix, if any, goes on `B06/jobs-realtime-backups`.
3. Lessons for `ztsia/workflow`, from B06's retro (`qa/B06/ledger.md`) and B07's.

## Follow-ups, not B07's

- **Major, on main:** Members → *Remove*: the *Undone* toast covers *Export their data first*.
- Insights' first frames take about 2.5 s; a deliberate sign-out says *You were signed out* in red.
- B05's `for-update-you` check survives although its test runs.

## Environment notes

- The Gradle plugin portal answers 429 through Maven Central, so `scripts/gradle-maven-mirror.gradle`
  goes in `~/.gradle/init.d/` (`docs/cloud.md`).
- Playwright 1.56.1 may want a different headless-shell build than the box has: symlink a shim and
  set `PLAYWRIGHT_BROWSERS_PATH`; never `playwright install`.
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod there trips the CSP.

## Don't argue again

- D129–D143. Deploys happen only by merge (D122). The Worker redeploys on merge (topic `capture`).
- Only `setting.set` is a pending write today; other commands keep their direct path (D143 (9)).
- In cloud sessions, subagents can't start subagents.
