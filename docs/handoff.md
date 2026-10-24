# Handoff

## Where things stand (25 Oct)

**B06 · Jobs, realtime, push and backups** on **`B06/jobs-realtime-backups`**, draft PR **#20**. Built,
tested locally and committed; being verified on the review alias (`review` fast-forwarded to B06).
`sen_ops`' backup and restore test are on its branch **`b06-backup`**, to merge right after B06 (the
backup records itself through `record_backup()`, which B06's production deploy creates).

**Done:**
- Workflow cleanup for plugin 1.1.0 (done-when 9).
- Tables `scheduled_jobs`, `job_runs`, `alerts_sent`, `push_tokens` with RLS and pgTAP; the
  scheduler's definer functions (`jobs_people`, `jobs_next_once`, `jobs_health`, `record_backup`,
  `push_token_claim`) (done-when 6).
- The API: `/jobs/tick` (frames once per person and KL date, one-off jobs with SKIP LOCKED and retries,
  every run in `job_runs`), `/health/jobs`, FCM push, relay passes and hints, the test routes.
- The Worker (`apps/worker`): a scheduler that ticks the API only when something is due (D141), the
  relay, its own `/health`. Both Workers deployed (`sen-worker`, `sen-worker-preview` on
  `sen-my.workers.dev`), crons running, and connected to Cloudflare's Git builds.
- Web: live updates, the 30 s fallback and *Updated 2 min ago*, push registration (bridge 3),
  Settings → Data real (backup, R2 storage, admin's checks).
- Shell: Capawesome's FCM plugin, the alerts channel, `google-services.json` from
  `SEN_GOOGLE_SERVICES_B64` in the Shell workflow. Shell CI green.
- `pnpm security` (done-when 7 locally; CI runs it on the PR).
- Secrets, set by the owner's one script (24 Oct): both Workers' and Vercel's scheduler/relay secrets,
  `RELAY_URL`, Firebase in previews, `sen_ops`' `DATABASE_URL` and `R2_ACCOUNT_ID`.
- Verified locally end to end (Worker + API on `sen_dev`): a tick, a hint on an open socket, a test job
  run once with two crons at once.

## What to do next

1. On the review alias: done-when 1 (test job) and 2 (two screens; relay stopped → 30 s fallback),
   then the test push on the phone's *Sen review* (done-when 3, needs the new APK).
2. QA (`qa` skill), then the PR's description; the owner merges, then merges `sen_ops#b06-backup`,
   sets up cron-job.org (done-when 5) and confirms R2's numbers (D142).
3. **Done-when 8, the whole-codebase `claude-security` scan, can't run in this session** (it needs
   the Workflow tool). The owner runs it in its own session: `claude --agent claude-security:claude-security`
   in the repo, scan codebase, high effort; findings into `qa/B06/security.md`.

## Decided (24 Oct)

- D141: ticks only when due (Neon's compute); the Worker's own `/health` for a stopped cron.
- D142: two Workers from one config; backup reports via `record_backup()` as the owner role; R2
  numbers (10⁹-byte GB, push at half) await the owner; production's test menu is Settings → Data's
  *Checks*; a push token belongs to one person; the web app calls FCM by name, no npm package.
- In production, Settings itself is still a skeleton: Data and Account are reached by their address
  (`/s/settings/data`), until the slice that makes Settings real.

## Don't argue again

- D129–D142 (the owner's calls and B06's). Deploys happen only by merge (D122); the Workers' first
  deploy by hand was the one bootstrap.
- Money never counts up or down in motion. Haptics through `performHapticFeedback` (bridge 2).
- In cloud sessions, subagents can't start subagents.
