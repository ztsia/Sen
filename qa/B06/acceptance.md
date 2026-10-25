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

## Run 2 (25 Oct 2026, full run at 3c7005a, reviewer on Opus)

Written from the docs only, before opening any implementation file: the brief, `spec_v2.md` §5, §5.1,
§15, §16, §17, §18, D85, D99, D100, D126, D141, D142, `patterns.md` §7 (*Live updates*),
`screens.md` (Settings → Data), `flows.md` (`lost-phone`, the core journeys) and `CLAUDE.md`'s
non-negotiables. **Bias declared:** before writing these I had seen the first 40 lines of
`report-run1.md` (run 1's findings table), so R2-AC-36, R2-AC-38 and R2-AC-43 are not independent of
run 1. Run 1's criteria were read only after this section was written; what they had that this
lacked is added at the end, marked.

### Tables and the definer functions (§15, done-when 6)

```
R2-AC-1   One-off job deduped
          Given  a scheduled_jobs row for user A with dedupe_key K
          When   a second row for A with K is inserted
          Then   unique violation (23505); 1 row. Sad twin: the same K for user B is a second row
          Spec   §15 scheduled_jobs UNIQUE (user_id, dedupe_key)
R2-AC-2   An alert is sent once
          Given  alerts_sent has (A, key)    When the helper is asked to send (A, key) again
          Then   it reports "already sent"; 1 row. Sad twin: (B, key) is sent
          Spec   §15 alerts_sent; brief "a helper makes every reminder safe to re-run"
R2-AC-3   A push token registered twice is one row; another person registering it takes it
          Then   push_tokens has 1 row for that token, owned by the last person
          Spec   §15 push_tokens UNIQUE (user_id, fcm_token); D142 (5)
R2-AC-4   RLS on all four tables, keyed on user_id
          Then   relrowsecurity on scheduled_jobs, job_runs, alerts_sent, push_tokens; as
                 app_user with no user id: 0 rows; as B: 0 of A's rows; B can't insert a row with
                 A's user_id (WITH CHECK)
          Spec   CLAUDE.md non-negotiable; §15 "job_runs included"
R2-AC-5   The people function lists only the people a job is for, and no money
          Then   its result columns hold ids/flags only; a person the job isn't for is absent
          Spec   done-when 6; §5 "one narrow SECURITY DEFINER function per job"
R2-AC-6   (sad) app_user can't use the scheduler's definer functions to list other people
          Then   EXECUTE as app_user on the people/health/record functions is refused
          Spec   §5, §17 "only migrations and the backup use the owner role"
R2-AC-7   Every size figure is an integer type: no float/numeric columns; sizes bigint bytes
          Spec   CLAUDE.md (integers); D142 (3)
```

### /jobs/tick (§16, D99, D141, done-when 1)

```
R2-AC-8   (sad) No secret or a wrong secret: 401 {code,message}, no job_runs row, no job runs
R2-AC-9   A tick at 07:15 KL runs the morning job once for each listed person; job_runs has one
          morning row per person for that KL date
R2-AC-10  (sad) A second tick at 07:40 KL the same KL date: no new morning rows
R2-AC-11  (sad) Two ticks at once in the window: still exactly one morning row per person
R2-AC-12  A tick at 21:xx KL runs the evening job once per person per KL date; at 12:00 KL
          neither frame runs
R2-AC-13  (sad, timezone) The KL date is the key: 07:15 KL on 26 Oct is 23:15 UTC on 25 Oct and
          counts as 26 Oct; the next morning runs again
R2-AC-14  A due one-off job (run_at <= now) runs once; status done; a job_runs row
R2-AC-15  (sad) A job not yet due doesn't run; a done job never runs again
R2-AC-16  (sad) A failing one-off job: attempts +1, error kept, retried later, failed after its
          last attempt; it never blocks other jobs
R2-AC-17  (sad) Two ticks at once never run the same one-off twice
R2-AC-18  Each job runs as its person under RLS: its database work sees only that person
R2-AC-19  The tick answers when it next needs waking (D141)
R2-AC-20  Scheduling a job asks the Worker to wake sooner; the Worker's /schedule refuses a call
          without its secret (D141)
```

### The Worker (D99, D100, D141)

```
R2-AC-21  The cron calls /jobs/tick only when the time the last tick named has come
R2-AC-22  Worker GET /health fails when the cron hasn't run for 5 minutes, or ticks have failed
          for 15; 200 otherwise; no database call
R2-AC-23  (sad) A relay connection with no pass, a forged pass, an expired pass, or a pass for
          another channel is refused
R2-AC-24  The API's hint post to the relay needs a secret; without it, refused, nothing sent
R2-AC-25  A hint is {seq, topics} only: no amount, name, row id or any data  (D100, §17)
```

### /realtime/token (§16)

```
R2-AC-26  Signed in: a pass for user:<own id> only, expiring in 5 minutes
R2-AC-27  (sad) Signed out: 401; a request naming another person's channel never gets a pass for it
```

### Hints after changes, and the web app (D100, patterns §7)

```
R2-AC-28  After a change by A, A's channel gets a hint with that change's topics; B's channel none
R2-AC-29  A hint invalidates only the queries for its topics; the open screen shows the new value
          with no reload (done-when 2)
R2-AC-30  Topic names are listed in one place
R2-AC-31  On return to the app (visible again) and on reconnect, the open screen reloads
R2-AC-32  While the relay is down the screen re-fetches every 30 s and shows "Updated N min ago"
          in muted; once the relay is back, polling stops and the stamp goes
R2-AC-33  (sad) While connected, no 30 s polling and no stamp
```

### Push (D142 (4)-(6))

```
R2-AC-34  Registering a token needs a session; signed out: 401
R2-AC-35  Sign-out deletes this device's token
R2-AC-36  Sign out everywhere (the lost phone) leaves none of the person's tokens
          Spec  flows.md lost-phone, §17 Login, D142 (5)
R2-AC-37  The web bundle holds no Firebase SDK and no service-account key  (D142 (6))
R2-AC-38  The test push and test job are admin only: a member gets 403; more than 3 a minute: 429
          Spec  D142 (4)
```

### /health/jobs (§16, §18, D99)

```
R2-AC-39  Returns no data: the body carries no ids, names, counts or timestamps
R2-AC-40  200 when the last morning run is under 26 h old and the last successful backup under
          2 days; non-2xx when either is late
R2-AC-41  (sad) A failed backup run doesn't count as the last backup
R2-AC-42  (sad) No morning run or backup ever recorded: fails, not passes
R2-AC-43  Health can't be made green by rows any member can write
```

### Backups (§17, D85, D126, D142 (2)-(3))

```
R2-AC-44  record_backup() is callable by the owner role, refused to app_user; it writes one
          job_runs row with the dump's size in bytes
R2-AC-45  Settings > Data shows the last successful backup to the admin; a member sees no backup
          section  (screens.md: "backups: admin")
R2-AC-46  Storage used vs 10,000,000,000 bytes: dumps held = the sizes of the last 30 days of
          successful backups; integer bytes
R2-AC-47  The morning job pushes the admin a health warning at half (5,000,000,000 bytes), once
          a month (alerts_sent)
R2-AC-48  The backup watchdog: after 2 days without a successful backup, the morning job pushes
          once (alerts_sent), only to the admin
R2-AC-49  .gitignore covers database dumps
```

### Security and the non-negotiables

```
R2-AC-50  pnpm security and pnpm hygiene pass; gitleaks over the history finds nothing
R2-AC-51  The production web bundle holds none of: the scheduler secret, the relay signing key,
          the Firebase service account, R2 keys
R2-AC-52  The CSP's connect-src names the relay's own origin(s), no wildcard
R2-AC-53  The admin's Checks and Data show no member's money or chosen apps (D52)
R2-AC-54  Every new route is in routes.table.ts and passes the route sweep; errors are
          {code, message, field?}, never a stack or a 500
R2-AC-55  No float in the diff's money or byte arithmetic (parseFloat, toFixed, / outside the
          money module)
```

### Taken from run 1's criteria after this section was written

```
R2-AC-56  (sad) A stale or repeated hint (a seq already seen): no error, at most a harmless refetch
          From run 1 AC-33; D100
R2-AC-57  Settings > Data follows patterns.md: a skeleton while loading, an error that says what to
          do, no screen-specific row or card
          From run 1 AC-50; CLAUDE.md "one set of UI patterns"
```

## Run 3 (25 Oct 2026, full run at db4e5b9, reviewer on Opus)

Written from `spec_v2.md` §5, §5.1, §15–§18, D85, D99, D100, D122, D126, D141, D142, the brief,
`screens.md` (Settings → Data) and `patterns.md` §7, **before reading the implementation**. **Bias
declared:** I had read the headings (only) of runs 1–2's sections and `docs/handoff.md`, which names
the definer functions (`jobs_people`, `jobs_next_once`, `jobs_health`, `record_backup`,
`push_token_claim`). Runs 1–2's criteria are read after this section; what they had that this lacks
is added at the end, marked.

### Tables and definer functions (§15, §17, done-when 6)

```
R3-AC-1   RLS on every new table
          Given  scheduled_jobs, job_runs, alerts_sent, push_tokens
          When   pg_class and pg_policies are read
          Then   relrowsecurity and relforcerowsecurity true on all four; every policy keyed on user_id
          Spec   §15 ("job_runs included"); CLAUDE.md non-negotiable
R3-AC-2   (sad) Person B can't read or write A's job rows
          Given  A has one row in each table
          When   app_user as B selects, updates, deletes, and inserts a row with user_id = A
          Then   0 rows read, 0 changed, 0 deleted; the insert refused by WITH CHECK (42501)
R3-AC-3   (sad) No user id set
          When   app_user selects each table with app.user_id unset or ''
          Then   0 rows each
R3-AC-4   Uniques hold
          When   the same (user_id, dedupe_key | alert_key | fcm_token) is inserted twice for one person
          Then   23505 on the second; one row. Sad twin R3-AC-5: the same key for two people is two rows
          Spec   §15
R3-AC-6   The jobs' people function lists ids only, no money
          When   its result columns are read, and it is called for a frame
          Then   no amount, balance or sen column; only people the job is for
          Spec   done-when 6; §5 "one narrow function per job"
R3-AC-7   (sad) app_user can't use a definer function beyond its purpose
          When   app_user as B calls each definer function
          Then   EXECUTE refused, or nothing of A's beyond what its one purpose names
R3-AC-8   Every SECURITY DEFINER function pins search_path
R3-AC-9   scheduled_jobs.status takes only due|running|done|failed (23514 otherwise)
```

### /jobs/tick (§16, D99, D141, done-when 1)

```
R3-AC-10  Morning frame, due, right secret → the morning job runs once per listed person: one job_runs
          row each, status ok
R3-AC-11  (sad) No secret / wrong secret → 401 { code, message }; nothing runs; job_runs unchanged
R3-AC-12  The same tick twice on one KL date → job_runs for the morning job doesn't grow
R3-AC-13  (twin) The next KL date → one more row per person
R3-AC-14  Frame boundaries in KL time: 06:59 KL nothing; 07:00 runs; a tick at 06:30 KL (22:30 UTC the
          day before) doesn't run it; the job's date is the KL date, not UTC's
R3-AC-15  Evening frame at 21:00 KL, once per person per KL date; (sad) 20:59 nothing
R3-AC-16  A one-off job a minute ahead: a tick before run_at doesn't run it; after, it runs once;
          status done, attempts 1
R3-AC-17  Two overlapping ticks → the one-off job runs exactly once (one job_runs row)
R3-AC-18  (sad) A one-off job that throws → attempts + 1, retried later; failed after the cap;
          job_runs.error holds the message; the tick's response carries no stack
R3-AC-19  Jobs run as the person, under RLS: a job for A sees none of B's rows
R3-AC-20  The alerts helper sends a key once; a second run sends nothing (alerts_sent one row)
R3-AC-21  Backup watchdog: no successful backup for > 2 days → one push, once (alerts_sent);
          (twin) a backup within 2 days → no push
R3-AC-22  R2 at half (≥ 5,000,000,000 bytes held) → one health warning a month; (twin) under half, none
```

### /health/jobs (§16, §18, D99, D141)

```
R3-AC-23  Healthy (morning run < 26 h, a successful backup < 2 days) → 2xx; body carries no data
          (no user ids, counts, sizes)
R3-AC-24  (sad) Morning run > 26 h old → non-2xx
R3-AC-25  (sad) Last successful backup > 2 days → non-2xx
R3-AC-26  (sad) No morning run or no backup ever → non-2xx (fails closed)
R3-AC-27  (sad) A failed backup doesn't count as the last success
```

### The Worker (D99, D100, D141)

```
R3-AC-28  The scheduler ticks only when due (next frame, a 5-min retry in a window,
          jobs_next_once()); (sad) not every minute otherwise
R3-AC-29  POST /schedule wakes it sooner; (sad) without the secret, refused
R3-AC-30  GET /health fails when the cron hasn't run for 5 min or ticks failed for 15; no DB call
R3-AC-31  The relay: a pass opens only its own user:<id>; (sad) expired (> 5 min), forged or another
          channel's pass refused
R3-AC-32  The relay carries {seq, topics} only; (sad) a client can't publish to a channel
R3-AC-33  The Worker deploys with no secret in ztsia/Sen's Actions (D122, brief)
```

### /realtime/token (§16, D100)

```
R3-AC-34  Signed in → a signed pass for user:<own id>, 5 minutes
R3-AC-35  (sad) Signed out → 401 and no pass; a request can't name another person's channel
```

### Hints and the web app (D100, patterns §7, §18, done-when 2)

```
R3-AC-36  After a change through the API, a hint {seq, topics} goes to the person's channel; topic
          names in one place
R3-AC-37  An open screen receiving a hint reloads those topics' queries, with no page reload
R3-AC-38  Relay down → a reload every 30 s only while down, and "Updated N min ago" in muted;
          (twin) relay up → no 30 s polling, no stamp
R3-AC-39  Reload on return to the app and on reconnect
R3-AC-40  (sad) A malformed or unknown-topic hint is ignored without error
```

### Push (§5.1, D142 (4)-(6))

```
R3-AC-41  Registering a token makes one push_tokens row; registering again changes nothing
R3-AC-42  A token B registers that A held moves to B (A's row gone); (sad) A can't see B's tokens
R3-AC-43  A person keeps their newest ten; an eleventh drops the oldest; one re-registered counts new
R3-AC-44  Sign-out of the last session, or everywhere, deletes the person's tokens
R3-AC-45  Test push: admin only, 3 a minute; (sad) non-admin 403; the 4th in a minute 429
R3-AC-46  Schedule a test job: admin only, 3 a minute; (sad) non-admin 403
R3-AC-47  The built web app holds no Firebase SDK (D142 (6))
```

### Backups and Settings → Data (§17, D85, D126, D142 (2)-(3))

```
R3-AC-48  record_backup() records a job_runs row with its size; owner role only; (sad) app_user refused
R3-AC-49  Settings → Data shows the last successful backup to the admin; (sad) not to a non-admin
R3-AC-50  Storage used against 10 GB from Sen's counts: dumps held = the last 30 days of successful
          backups' sizes, integer bytes, 10⁹-byte GB
R3-AC-51  No dump committed; .gitignore covers dumps
```

### Security and non-negotiables

```
R3-AC-52  No float in money or byte paths in the diff
R3-AC-53  No secret in the built web app (scheduler secret, relay key, service account)
R3-AC-54  The admin's Settings → Data shows no one's money
R3-AC-55  pnpm security passes on the whole repo (done-when 7)
R3-AC-56  Every new route is in routes.table.ts and passes the route sweep
R3-AC-57  Errors are { code, message, field? }; no stack, no 500 on bad input
R3-AC-58  The CSP adds only the relay's origins (no wildcard)
```

### Taken from runs 1–2's criteria after this section was written

```
R3-AC-59  (sad) /health/jobs can't be made green by rows a member can write (job_runs inserted
          by a member as user A under RLS don't count)
          From R2-AC-43, run 1 finding 3
R3-AC-60  The tick answers when it next needs waking (D141), and that time skips suspended people
          From R2-AC-19, run 2 finding 2
R3-AC-61  (sad) After A's change, B's channel gets no hint
          From R2-AC-28
R3-AC-62  (sad) A stale or repeated hint (a seq already seen): no error, at most a harmless refetch
          From R2-AC-56
R3-AC-63  Settings → Data follows patterns.md (skeleton while loading, a plain error with what to
          do, no screen-specific row or card)
          From R2-AC-57
R3-AC-64  A sign-out that ends the last session deletes the person's tokens on the server; another
          session left, the app's DELETE forgets that phone
          From run 2 finding 8, D142 (5)
```

## Run 3, scoped re-check (25 Oct 2026, db4e5b9..8579176)

Area: the Worker's scheduler, from the cron each minute to the API's `/jobs/tick` and back, with the
API's wakes (spec §16, D99, D141). Fixed in it: run 3's finding 2 and note 11. Criteria the fixes call
for, written after reading the fix commit (`e025494`), so weaker evidence than run 3's own.

```
R3S-AC-1  Only when due
          Given  the API answered next = 3 h ahead
          When   the cron runs each minute for 3 h
          Then   one tick at the start, the next at 3 h; none between       D141
R3S-AC-2  (sad) A failed tick retries in 5 minutes, not each minute; failingSince is set, and the
          Worker's /health says `tick` after 15 minutes of failures; a success clears it
R3S-AC-3  A wake that comes while a tick runs survives the tick's save: next = the sooner of the wake
          and the API's answer                                           note 11
R3S-AC-4  (twin) Two wakes during one tick: the sooner wins, whatever their order
R3S-AC-5  (sad) A wake later than the API's answer doesn't delay the tick
R3S-AC-6  A cron during a tick: its lastCron survives the tick's save (never steps back), so /health
          stays ok through a long tick                                     note 11
R3S-AC-7  (sad) A cron during a tick never starts a second tick
R3S-AC-8  (sad) A tick that throws or answers non-2xx after a wake still keeps the wake
R3S-AC-9  The API's answer is clamped: at least a minute ahead, at most 16 h; no answer = retry in 5 min
R3S-AC-10 (sad) POST /schedule without the scheduler secret, or with a time that isn't one: refused,
          nothing changes
```
