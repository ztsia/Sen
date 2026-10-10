# B06 · Jobs, realtime, push and backups

**Stage 2 · Ground** · after: B05 · next: B07

## Goal

What keeps Sen honest runs before any real money reaches the server:
- scheduled jobs, on time
- open screens updating by themselves
- push to the phone
- a nightly backup that's been restored once
- an outside monitor that emails the owner when any of these stops

## Read first

- `spec_v2.md`:
  - §5: the table rows for *Scheduled jobs*, *Realtime* and *Nightly backup*
  - §5.1: *Schedules*, *Realtime*, *Push* and *Backups*
  - §15: `scheduled_jobs`, `job_runs`, `alerts_sent` and `push_tokens`
  - §16: `/jobs/tick` (the frames only; each job's work belongs to its slice), `/health/jobs` and
    `/realtime/token`
  - §17: *Secrets* and *Backups*
  - §18, all of it
- Decisions: D85 (`sen_ops`), D99, D100.
- `docs/ui/patterns.md` §7: *Live updates* and *Loading*.
- Skill: `database`.

## Builds

### The Cloudflare Worker
- **Cron triggers every few minutes** call `POST /jobs/tick` with the scheduler secret.
- **The relay:** one WebSocket channel per person (`user:<id>`), and later per split
  (`split:<id>`). A pass comes from `/realtime/token`: signed, 5 minutes, one channel. The API posts
  `{seq, topics}` hints after each change, never data.
- **Deploy it without secrets in `ztsia/Sen`'s Actions**, for example through Cloudflare's own Git
  builds. Record the choice. It must deploy by itself on a merge to `main` (D122).

### Jobs in the API
- **`/jobs/tick`:**
  - checks the secret
  - lists the people a job is for through one narrow `SECURITY DEFINER` function
  - runs each job as that person, under RLS
  - is idempotent per person, job and Kuala Lumpur date, or per `dedupe_key`; a tick that comes
    twice is a no-op
  - records every run in `job_runs`
- **Job frames:**
  - the morning job, 07:00–08:00
  - the evening job, 21:00
  - one-off jobs from `scheduled_jobs` at their `run_at`, with attempts and retry

  Later slices register their work in these frames.
- **`alerts_sent`:** a helper makes every reminder safe to re-run.
- **`/health/jobs`** returns no data, and fails when the morning job is more than 26 hours old or
  the last backup is more than 2 days old.
- **The backup watchdog,** in the morning job: a push after 2 days without a backup. It's written by
  code and doesn't count against Sen's one push.

### Realtime in the web app
- **Hints invalidate queries by topic.** Topic names are listed in one place, for later slices to
  add to.
- **Fallbacks:** reload on return to the app and on reconnect, and every 30 s only while the relay
  is down, with *Updated 2 min ago* in `muted`.

### Push
- **FCM in the shell**, through a maintained plugin, with `push_tokens` and a send helper in the API
  using the Firebase service account.
- **A test push** in the dev panel, or the hidden test menu in production.

### Backups (in `sen_ops`)
- **A nightly workflow:** `pg_dump` with the owner role, written to R2, recorded in `job_runs`.
  Decide how: report back through the API with its own secret, or insert directly.
- **A restore tested once,** into a scratch database, with the steps written in `sen_ops`.
- **Settings → *Data*** shows the last successful backup (admin).

### The outside monitor
- **A cron-job.org check of `/health/jobs`** that emails the owner. The steps go into
  `docs/local.md`.

## Leaves for later

- Each job's actual work (watchdogs, reminders and the rest) arrives with its slice. The capture
  watchdog comes in B07.

## Done when

1. A one-off test job scheduled for a minute ahead runs on time, once, even if two ticks overlap
   (test the idempotency).
2. A change on one device updates the same screen open on another, with no refresh, and the 30 s
   fallback works with the relay stopped.
3. A test push arrives on the Xiaomi.
4. A backup lands in R2, restores into a scratch database, and shows in Settings → *Data*.
5. Stopping the Worker's cron makes `/health/jobs` fail, and the monitor emails the owner.
6. pgTAP covers the new tables. The definer function lists only the people a job is for, and
   returns no money.

## On your phone

- [ ] Install the new release (push is a native change), allow notifications, and receive the
      test push.

## Needs from you first

- **Cloudflare:** an account, the R2 bucket, the Worker with Git builds connected, and the scheduler
  and relay secrets shared with Vercel.
- **Firebase:** a project for FCM in the same Google Cloud project, with its service account in
  Vercel.
- **`sen_ops`:** push access for this session (`add_repo`), plus the database owner URL and R2 keys
  as its Actions secrets.
- **The monitor:** a cron-job.org account.

This slice writes each of these steps into `docs/local.md` first.
