# QA B06 · Jobs, realtime, push and backups, run 3

**Published report:** https://claude.ai/artifact/4TcXmtm89wh94V3KGYYt6d (version 3, this run; private to the owner)

```
VERDICT   fix first
          64 criteria: 62 pass, 1 fails, 1 not reachable
          13 flows: 13 pass (49 steps, each with a screenshot)
          phases run: 1-6      screenshots: qa-artifacts/B06/jobs-realtime-backups/screens/
```

Full run at `db4e5b9`, reviewer on Opus, 25 Oct 2026. (The harness refused the reviewer's write; the main session saved this from its final message. The sweep helper stopped at a usage limit after every command had finished, before writing its `index.md`, so the reviewer read its logs, `results.tsv`, the breakage-check index and the diff report directly.)

Everything B06 promises works when it's walked through, against the real Worker (`wrangler dev`), the real API and QA's own database (`sen_qa`), and every suite is green. **Fix first** because no test holds two guards on critical paths:
- nothing notices if a failed backup starts counting as a backup;
- nothing notices if the Worker starts ticking the API every minute (D141).

Five of the nine breakage checks the reviewer added survived. The eyes pass also found a Major on the Members *Remove* dialog, which isn't B06's code.

**Suites:**

| Suite | Result |
|---|---|
| typecheck, lint | clean |
| unit | 411/411 |
| security, hygiene | `pnpm security` PASS (audit; gitleaks over 407 commits, no leaks; lint rules). `pnpm hygiene` clean |
| test:db | pgTAP 218/218; API 128 pass, 7 skipped (body checks that don't apply to a GET or the tick); route sweep green |
| e2e | 1397 passed |
| lived | 24 passed |
| server | 4 passed |
| breakage checks | 56 of 58 killed. Survivors: `for-update-you` (B05, standing) and `push-token-shared` (finding 7) |
| run 3's own flows | `qa/e2e/b06r3-flows.spec.ts` (config `b06r3.config.ts`): 13/13 |

**Ordering:** the reviewer wrote the criteria and flows from the docs before reading any code. Before that it had seen only the handoff (which names the definer functions) and the headings of runs 1–2. Six of runs 1–2's criteria that its own lacked were added afterwards, marked as such (R3-AC-59 to R3-AC-64).

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | No suite notices a failed backup counting as a backup, in `/health/jobs`, the watchdog or Settings → Data | `node scripts/mutants.mjs --only r3-health-counts-failed-backup,r3-last-backup-counts-failed` | R3-AC-21, 27, 49; §18 |
| 2 | Major | The Worker's only-when-due gate (D141) has no test: it can tick every minute with every suite green | `--only r3-scheduler-ticks-every-minute` | R3-AC-28; D141 |
| 3 | Major (not B06's code) | The *Undone* toast covers *Export their data first* in *Remove Hui Min?*, while *Remove* stays visible | film `metrics/film/members_unlimited_at_invite_resend_and_revoke_remove_with_an_export/9.png`, `10.png` | eyes G9, G10 |
| 4 | Minor | A relay pass whose signature matches only in its first byte is accepted, and no test notices | `--only r3-pass-checks-one-byte` | R3-AC-31 |
| 5 | Minor | Nothing tests that the `jobs` topic reloads the Data screen | `--only r3-jobs-topic-reloads-nothing` | R3-AC-36, 37 |
| 6 | Minor | The storage warning is amber with an icon, but no words say what's wrong | FLOW-R3-4 step 2 | R3-AC-63 (the one fail); patterns.md §3 |
| 7 | Minor | The breakage check `push-token-shared` tests nothing: it edits 0008, but 0010 replaced that function | `--only push-token-shared,r3-push-token-shared-0010` | D139 |
| 8 | Note | In a preview, a backup from today reads *Sun, 25 Oct, 19:01*, never *Today* | FLOW-R3-4 | R3-AC-49 |
| 9 | Note | 999,500,000 to 999,999,999 bytes show as *1000 MB* | `formatBytes(999_500_000)` | R3-AC-50 |
| 10 | Note | `/health/jobs` is open to anyone and costs one query per call (not new exposure) | `GET /api/health/jobs` | D141 |
| 11 | Note | `Scheduler.cron()` writes back the state it read before a tick (found by reading, not reproduced) | `apps/worker/src/scheduler.ts` | D141 |
| 12 | Note | The one metrics flag isn't B06's; accepted, with measurement | below | `qa/limits.ts` |
| 13 | Note | `for-update-you` still survives (B05, standing) | `--only for-update-you` | D139 |
| 14 | Note | The eyes pass's other "look again" items | `qa/B06/eyes.md`, Run 3 | patterns.md §7 |

### 1 · Major: nothing tests that a failed backup doesn't count

Each of these two edits survives:
- **In `jobs_health()` (0009):** removing `AND r.status = 'ok'` from the backup subquery makes the monitor's check pass on a failed backup.
- **In `backupFacts()` (`apps/api/src/jobs/frames.ts`):** removing `eq(r.status, 'ok')` from the last-backup query makes Settings → Data show a failed backup as the last one. It also silences the watchdog, which reads the same `last`.

The code is right today:
- **FLOW-R3-6 step 4:** with the last good backup 49 h old and a failed one today, the check answers 503 `late: [backup]`.
- **FLOW-R3-4:** Settings → Data doesn't show today's failed backup.

But a `sen_ops` workflow that fails every night is exactly what §18's three guards are for, and nothing would say if one of them regressed.

```
| `r3-health-counts-failed-backup` | db | **SURVIVED** | a failed backup keeps /health/jobs green |
| `r3-last-backup-counts-failed` | db | **SURVIVED** | Settings → Data shows a failed backup as the last backup |
both logs: Files=4, Tests=218 ... Result: PASS / Tests  128 passed | 7 skipped (135)
```

### 2 · Major: nothing tests the scheduler's due gate

This edit survives in `Scheduler.cron()`:
- before: `if (!due(s, now) || this.ticking) return;`
- after: `if (this.ticking) return;`

`clock.test.ts` tests the pure `due()`, but nothing drives the Durable Object's `cron()`.

Every tick wakes Neon for 5 minutes. A tick a minute at Neon's 0.25 CU minimum is about 180 CU-hours a month, against the free 100. Neon would then stop for the rest of the month.

```
| `r3-scheduler-ticks-every-minute` | unit | **SURVIVED** | ... | log: Tests  95 passed (95)
```

### 3 · Major (not B06's code): a toast hides the export button before a delete that can't be undone

The reviewer checked the frames itself. From about frame 15 of `…/9.png`, the *Undone* toast from the step before sits over *Export their data first*, and *Remove* stays visible.

B06's diff touches no toast, sheet or members code (`members.tsx` gains one lint comment). So this almost certainly happens on main too, but the diff run films only the branch, and the reviewer didn't see main's film.

The same toast-over-sheet layering shows in eyes G8, G13, G18 and G22.

### 4 to 7 · Minor
- **4 · The relay pass check.** `verifyPass()` checking only the first of 32 signature bytes survives the unit suite (`Tests 95 passed`): the forged-pass tests change the whole signature. With that defect, about 256 tries would forge a 5-minute pass to any person's channel. A channel carries topic names only, never data. A test that flips the last byte would catch it.
- **5 · The `jobs` topic.** Changing `TOPIC_QUERIES.jobs` to `[]` survives the web suite (`Tests 162 passed`). It works today: FLOW-R3-1 step 4 saw the open Data screen read `/api/settings` again after the job's hint, with no navigation.
- **6 · The storage warning.** Past half, the row shows `money-warning` and a triangle, but still only *5.70 GB of 10 GB*. patterns.md §3: *"A warning … is `money-warning` with an icon and words."* The eyes pass flagged the same (R3-4).
- **7 · A check that tests nothing.** 0010 replaced `push_token_claim()` (`CREATE OR REPLACE`, line 24), so the edit to 0008's copy changes nothing:
  - sweep: `push-token-shared` SURVIVED (`Result: PASS`);
  - the reviewer's: `r3-push-token-shared-0010` killed (`# Failed test 34: "the token is Ben's alone now"`, `# Failed test 36: "still one row"`).

  Point the entry at 0010. A check on `jobs_health` or `jobs_next_once` must likewise name the latest migration that defines it.

### Notes 8 to 14
- **8 · Preview clock.** In a preview, the fake moves the app's clock to 18 Oct, so a real backup from today can't read *Today*. Observed: `Last backup\nSun, 25 Oct, 19:01`. The date and time are right, and the same from New York (FLOW-R3-4b). A production build's label wasn't checked.
- **9 · Byte formatting.** Real output: `999500000 -> 1000 MB`, `999999999 -> 1000 MB`, `1000000000 -> 1.00 GB`.
- **10 · `/health/jobs` cost.** From the API metrics: `{"route":"/api/health/jobs","status":200,"queries":1,...}`, and the same for 503. Signed-out `GET /api/*` already makes one query on main's routes. The monitor checks every 3 hours; a secret in its request header would close this.
- **11 · Stale scheduler state.** `await this.save(await this.tick(s, now))` saves `s`, which was read before a fetch that can take up to 5 minutes. A `wake()` during the tick is lost (run 1's note 12), and `lastCron` steps back.
- **12 · The metrics flag** (`step:members…/1`, settle 272 ms against main's 142). Accepted: not B06's.
  - **Main's own samples are inconsistent:** they settle before they first change (settle 142 and 130 ms, first change 248 and 224 ms).
  - **Measured:** Invite tapped with the CPU slowed 4×, three times on each side (vite on the branch and on main's worktree). Both made 99 mutations of the same kinds. On warm runs the first one after 200 ms landed at 664 and 653 ms on the branch, and 648 and 649 ms on main.
  - **Other red tests in the diff run** fail on main too: `subscription` under the metrics config (`getByText('Claude Pro')` resolves to 3 elements) and the `scan-more` catalogue timeouts.
  - **settings/claims' pixel change** is the tab bar labels' anti-aliasing; its tree is unchanged.
  - **The diff run rewrote 86 trees** in `apps/web/e2e/trees/`, line endings only (`git diff --ignore-cr-at-eol` is empty); restored.
- **13 · `for-update-you`** survives, as in run 2; it's B05's area.
- **14 · The eyes pass's other "look again" items on B06's screens:**
  - each *Checks* row wants a line saying what it does;
  - the *Updated* pill is faint in Instrument, Mercury and Copper dark, and its shadow looks tappable;
  - nothing on screen shows that the test job ran;
  - a member could be told their data is backed up.

  The eyes pass also listed items that already happen on main: toasts over sheets, see-through tab crossfades, the capitalised payee in the toast, and refund's list swap.

## Probes

All nine ran in the breakage-check worktree, never in this checkout. They're now entries in `qa/mutants.ts`, under *QA B06 run 3's probes*. The five survivors stay red in later sweeps until findings 1, 2, 4 and 5 are fixed.

| What was broken | Caught? |
|---|---|
| `Scheduler.cron` with the `due()` gate removed | **no** (unit 95/95) |
| `verifyPass` checks one byte | **no** (unit 95/95) |
| `job_runs_own_select USING (true)` | yes (test:db red) |
| `push_tokens_own_delete USING (true)` | yes |
| `alerts_sent`'s key index not UNIQUE | yes |
| `jobs_health()` counts a failed backup | **no** (test:db green) |
| `backupFacts`' last backup counts a failed one | **no** (test:db green) |
| the `jobs` topic reloads nothing | **no** (web 162/162) |
| `push_token_claim`'s DELETE removed in 0010 | yes (pgTAP tests 34 and 36) |

## Backend

RLS matrix on `sen_qa`, migrated fresh from HEAD:

| Who | What they could do |
|---|---|
| No user id, or `''` | 0 rows in each of the four tables |
| A | 1 row in each |
| B | 1 row in each |
| B, on A's rows | read 0, update 0, delete 0. Inserts as A refused: `new row violates row-level security policy` ×4, and `permission denied for table push_tokens` |
| `sen_auth` | `permission denied` |

**Definer functions:**
- As B, all four refuse: `only the scheduler lists people`, `only the health check asks this`, `only the scheduler asks this`, `permission denied for function record_backup`.
- All five pin `search_path`.
- B's claim moves A's token to B, as D142 (5) intends.

**Shared connection:** a user id set inside one transaction doesn't carry to the next on the same connection (`in tx A: 1`, then `next tx: 0`).

**Forged rows:** a member's own `backup ok` row leaves `jobs_health()` at `backup=null`.

**Other checks:** a status of `queued` is refused by `scheduled_jobs_status_check`; no workflow mentions wrangler or Cloudflare; `.gitignore` covers `backups/`, `*.dump` and `*.sql.gz`; neither built bundle holds Firebase's SDK or a secret; the diff has no float in money or byte arithmetic.

**Worked by hand:** dumps held = 1,500,000,000 bytes, leaving out the 3,600,000,000 dump from 31 days ago and the failed one. The screen showed *1.50 GB of 10 GB*. After a 4,200,000,000-byte dump it showed *5.70 GB of 10 GB*, with the warning.

## What couldn't be tested, and why
- **A real push on the Xiaomi, and the alerts channel:** needs the phone; already on the owner's list in docs/local.md.
- **The deployed crons, the cron-job.org email, and a real backup landing in R2 and restoring:** out of a QA session's reach (docs/cloud.md §3).
- **How often the Worker actually ticks (R3-AC-28, the one not reachable):** neither the local API nor `wrangler dev` logs a tick. Finding 2 is the missing test.
- **The last-backup label in a production build against the API:** not run.
- **The whole-codebase claude-security scan:** queued for the owner, not run, as asked.
