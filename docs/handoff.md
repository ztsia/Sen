# Handoff

## Where things stand (25 Oct, late)

**B06 · Jobs, realtime, push and backups** on **`B06/jobs-realtime-backups`**, PR **#20**. Built, and
through QA:
- three full runs, then a scoped re-check of the scheduler; its verdict was *ship* for that area;
- every finding that is B06's is fixed, each with a test shown to catch its break;
- record in `qa/B06/` (`ledger.md` has every fix, tier and the retro). Report:
  https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d (version 3 is run 3, version 4 the re-check).

**The merge waits only on the security scan** (done-when 8, `docs/local.md` → B06 item 7). It needs
Claude Code's Workflow tool, which this session lacked. Run it with *Dynamic workflows* on at the
laptop, or try a cloud session (untested). Then copy its results to `qa/B06/security.md` and fix every
Critical and High.

**Done-whens:**
- **1, 2, 6, 7, 9:** done, verified on the review alias, locally and in QA.
- **3, a push on the phone:** the owner's, after the release.
- **4, a backup in R2:** merge `sen_ops`' `b06-backup` right after B06.
- **5, the monitor:** cron-job.org after the merge. The owner asked a session to set it up with Claude
  in Chrome (the extension wasn't connected on 25 Oct).
- **8:** the scan.

## What to do next

1. The scan's results, if the owner has run it: `qa/B06/security.md`, then fix by the `qa` skill's tiers.
2. Mark PR #20 ready if it's still a draft; after the owner merges, set up the two cron-job.org
   monitors in Chrome (`docs/local.md` → B06 item 4).
3. **Lessons for the `workflow` plugin** (`ztsia/workflow`; the retro in `qa/B06/ledger.md`):
   - the `mutants.mjs` template's CRLF and quoting fixes;
   - the build should list each guard its decisions name, with a breakage check per guard, before the
     first QA run;
   - a read-only sweep agent instead of `implementer`.

   Send them as a PR, or to the peer session that owns the plugin (the owner allowed that once, for
   the scan question).

## Follow-ups found by QA, not B06's

- **Major, on main:** on Members → *Remove*, the *Undone* toast covers *Export their data first*.
  This is shared toast and sheet layering, and toasts sit over sheets elsewhere too (eyes G8–G22).
  Fix it in a small PR or the next slice that touches sheets.
- The Insights tab's first frames take about 2.5 s on main too (run 2, finding 9).
- A deliberate sign-out says *You were signed out* in error red (B05).
- B05's `for-update-you` check survives although its test runs.
- The eyes' look-agains on Settings → Data: what each Check does, the faint *Updated* pill in three
  dark looks.

## On this laptop

Postgres 16 + pgTAP run in the Docker container `senpg` (image `sen-pg16`, `-p 127.0.0.1:5432:5432`,
user `sen_owner`, trust; `packages/db` mounted at `/work`). The `psql` and `pg_prove` shims and
`gitleaks.exe` are in this session's scratchpad `bin/`, so they must be recreated in a new session:
- `psql`: `docker exec -i senpg psql "$@"`;
- `pg_prove`: copies the calling checkout's `test/` into a temporary folder in the container and runs
  there, so a `main` worktree runs `main`'s tests.

The breakage checks and qa-diff now work on Windows.

## Decided

- D141: ticks only when due. D142: (3) R2's numbers, confirmed by the owner; (5) a token goes with the
  person's sessions, and each person keeps their newest ten.
- In production, Settings itself is still a skeleton: Data and Account are reached by their address.

## Don't argue again

- D129–D142. Deploys happen only by merge (D122).
- `/health/jobs` is open by design (D141), so the monitor needs no secret.
- In cloud sessions, subagents can't start subagents.
