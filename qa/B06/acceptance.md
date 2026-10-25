# B06 · Jobs, realtime, push and backups: acceptance criteria

## Run 1 (25 Oct 2026, full run, reviewer on Opus)

Written from the docs only, before reading the implementation: the brief
(`docs/briefs/B06-jobs-realtime-backups.md`), `spec_v2.md` §5, §5.1, §15, §16, §17, §18,
`docs/decisions.md` D85, D99, D100, D126, D141, D142, `docs/ui/patterns.md` §7 (*Live updates*,
*Loading*), `docs/screens.md` (Settings → Data) and `CLAUDE.md`'s non-negotiables. The only file
outside docs read before this was `scripts/qa-diff.mjs` (lines 85–110, the output folder and its
dirty check), which is QA tooling, not the slice.

Each criterion names its observable. A twin marked *(sad)* checks that the failure case fails the
right way.

### The job tables (§15, done-when 6)

```
AC-1   RLS on the four new tables
       Given  scheduled_jobs, job_runs, alerts_sent and push_tokens, each with a row for user A
       When   user B (app.user_id = B) selects from each, through app_user
       Then   0 rows from each; relrowsecurity is true on each; user A sees exactly A's rows
       Spec   CLAUDE.md non-negotiable (RLS from first migration); spec §15, §17

AC-2   (sad) No user id set
       Given  the same rows
       When   app_user selects with app.user_id unset or ''
       Then   0 rows, and an INSERT naming user A's id fails the policy (42501)
       Spec   §5 "Requests with no signed-in person never set a user id"

AC-3   (sad) Writing another person's row
       When   user B inserts or updates a row with user_id = A in any of the four tables
       Then   the statement is refused (RLS WITH CHECK) and no row changes
       Spec   §15, §17

AC-4   One-off job dedupe
       Given  a scheduled_jobs row (user A, dedupe_key k)
       When   the same (user A, k) is scheduled again
       Then   scheduled_jobs still has 1 row for (A, k)
       Spec   §15 UNIQUE (user_id, dedupe_key); non-negotiable "every input has a dedupe key"

AC-5   (sad twin of AC-4) Two different keys, or the same key for two people
       Then   2 rows: the key is per person, not global
       Spec   §15

AC-6   alerts_sent makes a reminder safe to re-run
       Given  the alert helper is called twice for (A, alert_key)
       Then   alerts_sent has 1 row and the alert's side effect (a push) happens once
       Spec   §15 "alerts_sent makes every reminder and check-in safe to re-run"; brief

AC-7   (sad) A different alert_key, or another person
       Then   it sends, and a second row exists
       Spec   §15

AC-8   push_tokens: a token belongs to one person
       Given  token t registered by user A
       When   user B registers t (the phone signed in as B)
       Then   push_tokens has exactly 1 row for t, owned by B; A's is gone
       Spec   D142 (5)

AC-9   (sad) Re-registering the same token as the same person
       Then   still 1 row (UNIQUE (user_id, fcm_token)); no error shown
       Spec   §15

AC-10  Sign-out deletes the token
       When   user A signs out
       Then   push_tokens has 0 rows for A's token
       Spec   D142 (5)

AC-11  The definer function lists only the people a job is for, and no money
       When   the scheduler's people-listing function is called
       Then   it returns only ids (and non-money facts) of people a job is due for; no column of
              money (no sen amount, balance, transaction); a suspended person is not listed
       Spec   brief done-when 6; §5 "one narrow SECURITY DEFINER function per job"

AC-12  (sad) The definer functions can't be misused
       When   app_user (as user A) calls the scheduler's definer functions, or record_backup()
       Then   refused (permission denied) — or, where app_user may call one, it reaches only
              what its one purpose names
       Spec   §5, §17 "Only migrations and the backup use the owner role"; D142 (2)
```

### `/jobs/tick` (§16, D99, D141)

```
AC-13  The tick checks its secret
       When   POST /api/jobs/tick with no secret, or a wrong one
       Then   401 (or 403) with { code, message }; no job_runs row is written; nothing runs
       Spec   §16 Auth; brief

AC-14  The morning frame runs once per person and KL date
       Given  a tick at 07:30 Asia/Kuala_Lumpur (23:30 UTC the day before)
       When   the tick runs, then runs again in the same window
       Then   one morning job_runs row per eligible person for that KL date, not two
       Spec   §16 /jobs/tick "idempotent per person, job and Kuala Lumpur date"

AC-15  (sad) Outside the window, or before 07:00 KL
       When   a tick at 06:59 KL or 12:00 KL
       Then   no morning run; at 21:00 KL the evening frame runs once, and not twice
       Spec   §16; brief "the morning job, 07:00–08:00; the evening job, 21:00"

AC-16  The KL date, not the UTC date, keys idempotency
       Given  a morning run recorded at 07:10 KL on day D
       When   a tick at 07:50 KL on day D (still 23:50 UTC on D-1), and then 07:10 KL on D+1
       Then   no new run on D; one new run on D+1
       Spec   CLAUDE.md conventions (KL boundaries); §16

AC-17  A one-off job runs at its time, once, even if two ticks overlap (done-when 1)
       Given  a scheduled_jobs row due now (status due)
       When   two ticks run concurrently
       Then   the job runs exactly once: 1 job_runs row for it, status done, attempts 1
       Spec   brief done-when 1; §16 "a tick that comes twice is a no-op"

AC-18  (sad) Not due yet
       Given  run_at one hour ahead
       When   a tick runs now
       Then   it stays due, attempts 0, no job_runs row for it
       Spec   §16

AC-19  A failing one-off job retries, then fails
       Given  a job whose handler throws
       When   ticks run past each retry
       Then   attempts grows by one per try; after the last, status failed; each try has a
              job_runs row with status and error text; no stack trace leaves the API
       Spec   brief "with attempts and retry"; §15 job_runs.error

AC-20  Each job runs as its person, under RLS
       When   the tick runs jobs for A and then B on one pooled connection
       Then   B's job never sees app.user_id = A (set_config is transaction-local), and a job's
              work reads only its person's rows
       Spec   §5 "Every request runs as you"; §16

AC-21  Every run is recorded
       Then   each frame or one-off run leaves a job_runs row with job, ran_at, status,
              duration_ms (integer), error null on success
       Spec   §15, §18
```

### `/health/jobs` (§16, §18, D141)

```
AC-22  Healthy
       Given  a morning run under 26 hours old and a successful backup under 2 days old
       Then   GET /api/health/jobs is 2xx, with no data in the body (no ids, names, counts of
              money, or per-person facts)
       Spec   §16 "Returns no data"; brief

AC-23  (sad) The morning job is late
       Given  the last morning run 26 h 1 min old
       Then   non-2xx (e.g. 503), still with no data
       Spec   brief "fails when the morning job is more than 26 hours old"

AC-24  (sad) The backup is late, or there has never been one
       Given  the last successful backup 2 days 1 min old (or none at all; or only failed ones)
       Then   non-2xx
       Spec   brief; §18 "Backups stop"

AC-25  The backup watchdog
       Given  no successful backup for over 2 days
       When   the morning job runs, twice on the same day
       Then   one push to the admin, recorded once in alerts_sent
       Spec   brief; §18
```

### The Worker (D99, D100, D141)

```
AC-26  The scheduler ticks only when due
       Then   with nothing due, a cron minute makes no call to /jobs/tick; at the time the last
              tick named, it calls once
       Spec   D141

AC-27  The Worker's own /health
       Then   fails when its cron hasn't run for 5 minutes, or ticks have failed for 15; no
              database call
       Spec   D141

AC-28  The relay's pass
       Given  a pass from /realtime/token for user:<A>
       Then   it opens user:<A>; it does not open user:<B>; a pass over 5 minutes old, or with a
              changed signature or channel, is refused
       Spec   brief "signed, 5 minutes, one channel"; D100

AC-29  Hints carry no data
       Then   what the API posts and the relay forwards is { seq, topics } only
       Spec   D100; §17 "The Cloudflare relay sees only which topics changed"
```

### `/realtime/token` (§16)

```
AC-30  Signed in: a pass for your own channel
       When   POST /api/realtime/token as user A
       Then   2xx, a pass naming user:<A>, expiring in 5 minutes
       Spec   §16

AC-31  (sad) Signed out, or asking for someone else's channel
       Then   401 for no session; a request naming user:<B> yields no pass for B
       Spec   §16, §17
```

### Realtime in the web app (patterns §7, D100, §18)

```
AC-32  A hint reloads only its topics' queries
       When   a hint { seq, topics: [t] } arrives
       Then   the queries for topic t refetch; others don't; topic names live in one module
       Spec   brief "Topic names are listed in one place"

AC-33  (sad) A stale or repeated hint
       When   a hint with a seq already seen arrives
       Then   no extra refetch (or a harmless one); no error shown
       Spec   D100

AC-34  Fallbacks while the relay is down
       When   the relay connection drops
       Then   the screen shows "Updated … ago" in muted, refetches every 30 s while down, and
              stops the 30 s polling once it reconnects (and reloads on reconnect)
       Spec   brief; patterns §7 Live updates; §18

AC-35  (sad) The relay is up
       Then   no "Updated … ago" text, and no 30 s polling
       Spec   brief "every 30 s only while the relay is down"

AC-36  Return to the app reloads
       When   the page becomes visible again
       Then   its queries refetch
       Spec   D100
```

### Push (§5.1, D142)

```
AC-37  Registering a push token needs a session
       Then   signed out → 401, no row
       Spec   §16 Auth

AC-38  A test push: dev panel in previews, Settings → Data → Checks in production, admin only,
       3 a minute at most
       When   the admin taps Send a test push 4 times in a minute
       Then   3 are sent, the 4th refused with a plain message; a non-admin can't reach the
              Checks (no section, and the route answers 403)
       Spec   D142 (4); brief "A test push"

AC-39  Schedule a test job
       When   the admin taps Schedule a test job
       Then   one scheduled_jobs row a minute ahead; it runs once (AC-17)
       Spec   D142 (4); done-when 1

AC-40  The web app never ships Firebase's SDK
       Then   the production bundle contains no firebase SDK code and no Firebase service
              account or private key
       Spec   D142 (6); non-negotiable "Secrets never ship in the app"
```

### Backups and Settings → Data (§17, D126, D142)

```
AC-41  Settings → Data shows the last successful backup, to the admin
       Given  backups recorded (one failed later than the last success)
       Then   the admin sees the last *successful* backup's date and time in KL
       Spec   §17; screens.md Data row "backups: admin"

AC-42  (sad) A non-admin
       Then   no backup, storage or checks section; the route behind them refuses
       Spec   screens.md; D52 "the admin never reads anyone's money"

AC-43  Storage used against 10 GB
       Then   the figure comes from Sen's own counts (no bucket listing), in 10^9-byte GB, as
              integer bytes, and a figure above half shows a warning
       Spec   D126, D142 (3)

AC-44  record_backup() records a run in job_runs, and only the owner role can call it
       Spec   D142 (2); §17
```

### Cross-cutting non-negotiables

```
AC-45  No float in money or byte counts; no money anywhere the scheduler, health, or admin
       checks return
       Spec   CLAUDE.md non-negotiables

AC-46  Secrets never ship: the built web app has no scheduler secret, relay signing key,
       Firebase service account or private key
       Spec   CLAUDE.md; §17

AC-47  The CSP names the two relays exactly, never a wildcard
       Spec   §17 "The shell trusts only our own site"; "Never a wildcard"

AC-48  The new routes are in the route table and pass the sweep; errors are { code, message,
       field? }, never a stack trace or a 500 for bad input
       Spec   §16; docs/workflow/qa.md

AC-49  pnpm security passes on the whole repo (done-when 7); pnpm hygiene passes
       Spec   brief

AC-50  Settings → Data follows patterns.md: loading is a skeleton, error states say what to do,
       no screen-specific row or card
       Spec   CLAUDE.md "One navigation and one set of UI patterns"
```

### Added after reading the implementation (phase 3–4), so weaker evidence

```
AC-51  Sign out everywhere stops pushes to every phone
       Given  a person with push tokens on two phones
       When   they Sign out everywhere (the lost-phone journey)
       Then   push_tokens has 0 rows for them: no phone they've left keeps their notifications
       Spec   D142 (5) "sign-out deletes it … a stale token would show someone's notifications on a
              phone they've left"; flows.md lost-phone; spec §17 Login
```
