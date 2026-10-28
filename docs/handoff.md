# Handoff

## Where things stand (28 Oct)

**B06 · Jobs, realtime, push and backups** is **merged** (PR #20, 25 Oct), though its security scan
(done-when 8) had not run. `B06/jobs-realtime-backups` continues for B06's follow-ups: the scan's
results and fixes go on it, as a small PR. QA's record is in `qa/B06/` (`ledger.md`). Report:
https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d

**Done-whens:**
- **1, 2, 6, 7, 9:** done.
- **3, a push on the phone:** the owner's (`docs/local.md` → B06 item 5).
- **4, a backup in R2:** the owner merged `sen_ops` #1 on 28 Oct; the backup ran green and
  `/health/jobs` answers 200. The restore test failed: the dump's default privileges name Neon's
  `neon_superuser` and `cloud_admin`. The fix is **`sen_ops` PR #2**, green on its branch; it waits
  for the owner's merge, which runs the test once more on `main`.
- **5, the monitor:** two cron-job.org jobs, set up in Chrome on 28 Oct (`docs/local.md` → item 4).
- **8, the security scan:** not run. This laptop's Claude Code now has *Dynamic workflows* on.

## What to do next

1. **The scan**, on `main`'s code (this branch, fast-forwarded): *Claude Security, scan the codebase
   at high effort*. Copy `CLAUDE-SECURITY-<time>/CLAUDE-SECURITY-RESULTS.md` to `qa/B06/security.md`,
   fix every Critical and High by the `qa` skill's tiers, then a PR. Say in `docs/cloud.md` that a
   laptop session ran it.
2. Check `sen_ops` #2 merged and its run on `main` passed.
3. **B07 · Sync and the outbox** (`docs/briefs/B07-sync.md`) on `B07/sync`.
4. **Lessons for the `workflow` plugin** (`ztsia/workflow`; the retro in `qa/B06/ledger.md`): the
   `mutants.mjs` template's CRLF and quoting fixes; list each guard the decisions name, with a
   breakage check per guard, before the first QA run; a read-only sweep agent instead of `implementer`.

## Follow-ups found by QA, not B06's

- **Major, on main:** on Members → *Remove*, the *Undone* toast covers *Export their data first*
  (shared toast and sheet layering; toasts sit over sheets elsewhere too, eyes G8–G22). Fix in a small
  PR or the next slice that touches sheets.
- The Insights tab's first frames take about 2.5 s on main too (run 2, finding 9).
- A deliberate sign-out says *You were signed out* in error red (B05).
- B05's `for-update-you` check survives although its test runs.
- **CI flaked once** at 027fde3 (the `capture-off` journey's *Widgets* click; axe's contrast on
  *agent/usage, empty* and *payday, offline* in Minted dark). If it recurs, wait for the screen to settle.
- The eyes' look-agains on Settings → Data: what each Check does, the faint *Updated* pill in three
  dark looks.

## On this laptop

Postgres 16 + pgTAP run in the Docker container `senpg` (image `sen-pg16`, `-p 127.0.0.1:5432:5432`,
user `sen_owner`, trust; `packages/db` mounted at `/work`). The `psql` and `pg_prove` shims and
`gitleaks.exe` lived in the 25 Oct session's scratchpad `bin/`; recreate them:
- `psql`: `docker exec -i senpg psql "$@"`;
- `pg_prove`: copies the calling checkout's `test/` into a temporary folder in the container and runs
  there, so a `main` worktree runs `main`'s tests.

The auto-mode classifier refuses force-pushes, even to a session's own unmerged branch: fix forward.

## Decided

- D141: ticks only when due. D142: (3) R2's numbers, confirmed by the owner; (5) a token goes with the
  person's sessions, and each person keeps their newest ten.
- In production, Settings itself is still a skeleton: Data and Account are reached by their address.

## Don't argue again

- D129–D142. Deploys happen only by merge (D122).
- `/health/jobs` is open by design (D141), so the monitor needs no secret.
- In cloud sessions, subagents can't start subagents.
