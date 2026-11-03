# Handoff

## Where things stand (3 Nov)

**B06 · Jobs, realtime, push and backups** is merged (PR #20, 25 Oct), and every done-when is met
except **3, a push on the phone** (the owner's, `docs/local.md` → B06 item 5). Its follow-ups are on
`B06/jobs-realtime-backups`, as a small PR:
- **The security scan (done-when 8)** ran 28 Oct to 3 Nov at the laptop, high effort, verified:
  six LOW findings, none Critical, High or Medium. Record and fixes in `qa/B06/security.md`.
  F3 and F6 (daily caps on sign-in codes and tries, production only), F4 (the offline copy goes with
  the session) and F5 (QA's worktrees in `.git/sen-qa/`) are fixed, with tests.
- **F1 and F2 wait on the owner:** the sign-in screen says *not invited* and *access paused*, which
  tells a stranger who uses Sen. Options: keep it (an accepted risk), or say *paused* only by email.
- **4, backups:** green since 28 Oct; the restore test's fix (`sen_ops` #2) is merged and passed.
- **5, monitors:** the two cron-job.org jobs, since 28 Oct.

QA's record: `qa/B06/`. Report: https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d

## What to do next

1. The owner's answer on F1 and F2; then the fix, if any, on this branch.
2. **B07 · Sync and the outbox** (`docs/briefs/B07-sync.md`) on `B07/sync`.
3. **Lessons for the `workflow` plugin** (`ztsia/workflow`; the retro in `qa/B06/ledger.md`): the
   `mutants.mjs` template's CRLF and quoting fixes, and its worktree out of the temp folder (F5); list
   each guard the decisions name, with a breakage check per guard, before the first QA run; a
   read-only sweep agent instead of `implementer`; a high-effort scan outlasts one usage window.

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
