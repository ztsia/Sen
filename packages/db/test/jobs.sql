-- The scheduler's functions (B06, done-when 6): jobs_people() lists only who a job is for, as ids,
-- and only to the scheduler; jobs_next_once() and jobs_health() return timestamps; record_backup()
-- reaches the admin's rows and nobody can call it but the owner; push_token_claim() moves one token.
-- rls.sql walks the four new tables with everyone else's.
\ir lib/helpers.sql
BEGIN;
SELECT no_plan();
SELECT tap_sen.fixture();

-- ids, never money: each function's result type
SELECT is(pg_get_function_result('jobs_people(text)'::regprocedure), 'SETOF uuid', 'jobs_people returns ids only');
SELECT is(pg_get_function_result('jobs_next_once()'::regprocedure), 'timestamp with time zone', 'jobs_next_once returns a time');
SELECT is(pg_get_function_result('jobs_health()'::regprocedure),
  'TABLE(morning_at timestamp with time zone, backup_at timestamp with time zone)', 'jobs_health returns two times');

-- only the scheduler (no person set) may ask
SELECT is(tap_sen.attempt('app_user', NULL, $$SELECT * FROM jobs_people('daily')$$), 'rows:2',
  'the scheduler lists everyone with access for the daily jobs');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a', $$SELECT * FROM jobs_people('daily')$$), 'denied',
  'a signed-in request, the admin''s included, can''t list people');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', 'SELECT * FROM jobs_next_once()'), 'denied',
  'nor ask when the next job is due');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', 'SELECT * FROM jobs_health()'), 'denied',
  'nor read the health times');
SELECT is(tap_sen.attempt('sen_auth', NULL, $$SELECT * FROM jobs_people('daily')$$), 'denied',
  'Better Auth''s role can''t call it');
SELECT throws_ok($$SELECT * FROM jobs_people('weekly')$$, '22023', NULL, 'an unknown job is refused');

-- the daily jobs skip a suspended person
UPDATE user_access SET suspended_at = now() WHERE user_id = '00000000-0000-4000-8000-00000000000b';
SELECT set_eq($$SELECT * FROM jobs_people('daily')$$, ARRAY['00000000-0000-4000-8000-00000000000a'::uuid],
  'a suspended person gets no daily job');
UPDATE user_access SET suspended_at = NULL WHERE user_id = '00000000-0000-4000-8000-00000000000b';

-- one-off jobs: only the people with one due, or cut off mid-run
SELECT is_empty($$SELECT * FROM jobs_people('once')$$, 'nobody, while every job is in the future');
SELECT ok(jobs_next_once() BETWEEN now() + interval '59 minutes' AND now() + interval '61 minutes',
  'the next one-off is the earliest due');
UPDATE scheduled_jobs SET run_at = now() - interval '1 minute' WHERE dedupe_key = 'test:b';
SELECT set_eq($$SELECT * FROM jobs_people('once')$$, ARRAY['00000000-0000-4000-8000-00000000000b'::uuid],
  'only the person whose job is due');
-- a suspended person's due job neither runs nor wakes the scheduler (QA B06 run 2, finding 2)
UPDATE user_access SET suspended_at = now() WHERE user_id = '00000000-0000-4000-8000-00000000000b';
SELECT is_empty($$SELECT * FROM jobs_people('once')$$, 'a suspended person''s due job doesn''t run');
SELECT ok(coalesce(jobs_next_once() > now(), true), 'nor sets the next wake');
UPDATE user_access SET suspended_at = NULL WHERE user_id = '00000000-0000-4000-8000-00000000000b';
UPDATE scheduled_jobs SET status = 'running', started_at = now() - interval '1 minute' WHERE dedupe_key = 'test:b';
SELECT is_empty($$SELECT * FROM jobs_people('once')$$, 'not while it runs');
UPDATE scheduled_jobs SET started_at = now() - interval '11 minutes' WHERE dedupe_key = 'test:b';
SELECT set_eq($$SELECT * FROM jobs_people('once')$$, ARRAY['00000000-0000-4000-8000-00000000000b'::uuid],
  'a run cut off for 10 minutes is due again');
UPDATE scheduled_jobs SET status = 'done' WHERE dedupe_key = 'test:b';
SELECT is_empty($$SELECT * FROM jobs_people('once')$$, 'and never once it''s done');

-- a one-off job is claimed once: the second of two ticks finds nothing (SKIP LOCKED is the API's;
-- here, the claim's own condition)
UPDATE scheduled_jobs SET status = 'due', run_at = now() - interval '1 minute' WHERE dedupe_key = 'test:a';
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a',
  $$UPDATE scheduled_jobs SET status = 'running', attempts = attempts + 1, started_at = now() WHERE status = 'due' AND run_at <= now()$$),
  'rows:1', 'the first claim takes the due job');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a',
  $$UPDATE scheduled_jobs SET status = 'running', attempts = attempts + 1, started_at = now() WHERE status = 'due' AND run_at <= now()$$),
  'rows:0', 'a second claim finds it taken');
SELECT throws_ok($$INSERT INTO scheduled_jobs (user_id, kind, run_at, dedupe_key)
  VALUES ('00000000-0000-4000-8000-00000000000a', 'test', now(), 'test:a')$$, '23505', NULL,
  'scheduling the same job twice is refused by its key');

-- a daily run is once per person and date
SELECT throws_ok($$INSERT INTO job_runs (user_id, job, run_key, status)
  VALUES ('00000000-0000-4000-8000-00000000000a', 'morning', 'morning:2026-10-24', 'running')$$, '23505', NULL,
  'a second morning run for the same date is refused by its key');

-- health: the morning job's and the backup's times, nothing else
SELECT is((SELECT backup_at FROM jobs_health()), NULL::timestamptz, 'no backup yet');
SELECT isnt((SELECT morning_at FROM jobs_health()), NULL::timestamptz, 'the morning job ran');

-- the backup's record: the owner only, into the admin's rows
SELECT is(tap_sen.attempt('app_user', NULL, $$SELECT record_backup('1', 'ok', 10, 5, NULL)$$), 'denied',
  'the API''s role can''t record a backup');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a', $$SELECT record_backup('1', 'ok', 10, 5, NULL)$$), 'denied',
  'not even as the admin');
SELECT is(record_backup('41', 'ok', 1048576, 90000, NULL), 1, 'the owner records a backup');
SELECT is(record_backup('41', 'ok', 2097152, 95000, NULL), 1, 'a re-run of the same workflow run updates it');
SELECT results_eq($$SELECT user_id, bytes, attempts FROM job_runs WHERE job = 'backup'$$,
  $$VALUES ('00000000-0000-4000-8000-00000000000a'::uuid, 2097152::bigint, 2)$$,
  'one row, the admin''s, with the dump''s size');
SELECT isnt((SELECT backup_at FROM jobs_health()), NULL::timestamptz, 'health sees the backup');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', $$SELECT 1 FROM job_runs WHERE job = 'backup'$$),
  'rows:0', 'a member doesn''t see the backups');

-- a push token belongs to one person: claiming it takes it from the last
SELECT is(tap_sen.attempt('app_user', NULL, $$SELECT push_token_claim('fcm-a')$$), 'denied', 'nobody signed in can''t claim a token');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', $$SELECT push_token_claim('fcm-a')$$), 'rows:1',
  'Ben signs in on Aisyah''s old phone');
SELECT results_eq($$SELECT user_id FROM push_tokens WHERE fcm_token = 'fcm-a'$$,
  $$VALUES ('00000000-0000-4000-8000-00000000000b'::uuid)$$, 'the token is Ben''s alone now');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', $$SELECT push_token_claim('fcm-a')$$), 'rows:1',
  'claiming it again is a no-op');
SELECT is((SELECT count(*) FROM push_tokens WHERE fcm_token = 'fcm-a'), 1::bigint, 'still one row');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', $$INSERT INTO push_tokens (user_id, fcm_token)
  VALUES ('00000000-0000-4000-8000-00000000000b', 'fcm-x')$$), 'denied', 'a token is added only by the claim');

-- an alert is sent once per key
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a',
  $$INSERT INTO alerts_sent (user_id, alert_key) VALUES ('00000000-0000-4000-8000-00000000000a', 'r2_half:2026-10') ON CONFLICT DO NOTHING$$),
  'rows:1', 'the first claim of an alert');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a',
  $$INSERT INTO alerts_sent (user_id, alert_key) VALUES ('00000000-0000-4000-8000-00000000000a', 'r2_half:2026-10') ON CONFLICT DO NOTHING$$),
  'rows:0', 'the second finds it sent');

SELECT * FROM finish();
ROLLBACK;
