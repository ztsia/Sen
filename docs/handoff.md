# Handoff

## Where things stand (4 Nov)

**B07 · Sync and the outbox** is done on `B07/sync`, and its PR is open. QA is at **ship**: run 1
found two Majors in the watchdog, both fixed, and the scoped run 2 confirmed. Record in `qa/B07/`;
report: https://claude.ai/artifact/A3BCeJcC4rGaRoEDGxXX5m
- **Database:** `bank_events`, `capture_apps` (tombstones, `sync_version`), `device_heartbeats`,
  `outbox_applied`. Migrations 0011 and 0012; pgTAP in `packages/db/test/sync.sql`.
- **API:** `/sync`, `/sync/changes`, `/match` (empty until B11), `/capture/health`, `/captured`
  (paged on posted time and id); a bearer session for the shell; the watchdog in the morning frame.
  The watchdog reads what each heartbeat says: access off warns at once; the 24 h count from the
  listener's own last heartbeat; events count on the server's clock.
- **Shell:** outbox v4, WorkManager sync, the session in the Keystore, the *Capture* switch, the
  26-hour notice, bridge 4. The outbox belongs to its first person; another's sign-in empties it. The
  listener syncs when it connects. CI's emulator tests pass.
- **Web:** pending writes for `setting.set` (the outbox in the shell; optimistic with *Retry* in a
  browser), *Captured on this phone* from the server, and Home's capture warnings.
- The mechanisms are **D143** (9 points).

## Before the merge (the owner)

1. **The security scan at the laptop** (`docs/local.md` → B07 item 6): a cloud session has no
   Workflow tool. Fix every Critical and High on this branch before merging.
2. Then merge. The Worker redeploys on merge (new realtime topic `capture`); migrations run on deploy.

## After the merge (the owner)

`docs/local.md` → B07 steps 1–5: install, *Captured on this phone*, the watchdog for a day (QA's
open device question, finding 12, is answered there), *Sign out everywhere*, Q25 after a week.

## What to do next

1. B06's F1 and F2 still wait on the owner (the sign-in screen says *not invited* and *access
   paused*); the fix, if any, goes on `B06/jobs-realtime-backups`.
2. **B08 · First run, accounts and categories.**
3. Lessons for `ztsia/workflow` from B06's and B07's retros (`qa/B06/ledger.md`, `qa/B07/ledger.md`).

## Follow-ups, not fixed in B07

- B07 QA 14: Home's `HealthBar` wraps its date; the widget stand-in says *Capture is off* where the
  push says *may be off*. B07 QA notes 7 (tombstone and heartbeat time writable by direct SQL), 8
  (global version counter), 9 (over-long notifications refused): `qa/B07/ledger.md`.
- `qa/mutants.ts` has no Kotlin suite, so the shell's `BatchPlan` has no breakage check.
- **Major, on main:** Members → *Remove*: the *Undone* toast covers *Export their data first*.
  The slow Undo in Sen's sheet (eyes `proposal/3`) is main's too.

## Environment notes

- `scripts/gradle-maven-mirror.gradle` goes in `~/.gradle/init.d/`; gitleaks builds from the Go proxy
  (`docs/cloud.md`). Playwright may need a symlinked headless-shell; never `playwright install`.
- The web app must not value-import `@sen/core/views`, `sync` or `commands`: zod trips the CSP.
- A QA reviewer in a cloud session can't write `report.md`; the main session writes it.

## Don't argue again

- D129–D143. Deploys happen only by merge (D122). Only `setting.set` is a pending write today.
