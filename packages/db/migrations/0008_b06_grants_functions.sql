-- B06's grants and functions (spec §5, §15, §16; D99). RLS decides which rows; grants decide which
-- operations exist. The scheduler has no person, so what it needs across people goes through the
-- narrow SECURITY DEFINER functions below, each returning ids or timestamps, never money.
GRANT SELECT, INSERT, UPDATE ON scheduled_jobs, job_runs TO app_user;
--> statement-breakpoint
-- claimed before a reminder is sent, released if the send fails
GRANT SELECT, INSERT, DELETE ON alerts_sent TO app_user;
--> statement-breakpoint
-- added only through push_token_claim(), so a token belongs to one person
GRANT SELECT, DELETE ON push_tokens TO app_user;
--> statement-breakpoint

-- Who a job is for (spec §16's /jobs/tick): `daily` is everyone not suspended (the morning and
-- evening jobs); `once` is everyone with a one-off job due, or one cut off mid-run. Ids only. The tick
-- then runs each one as that person, under RLS. Refused to a request that runs as someone, so a
-- signed-in route can never list who else uses Sen.
CREATE FUNCTION jobs_people(job text) RETURNS SETOF uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF nullif(current_setting('app.user_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'only the scheduler lists people' USING ERRCODE = '42501';
  END IF;
  IF job = 'daily' THEN
    RETURN QUERY SELECT a.user_id FROM user_access a WHERE a.suspended_at IS NULL ORDER BY a.user_id;
  ELSIF job = 'once' THEN
    RETURN QUERY
      SELECT DISTINCT j.user_id
      FROM scheduled_jobs j JOIN user_access a ON a.user_id = j.user_id
      WHERE a.suspended_at IS NULL
        AND ((j.status = 'due' AND j.run_at <= now())
          OR (j.status = 'running' AND j.started_at < now() - interval '10 minutes'));
  ELSE
    RAISE EXCEPTION 'no such job: %', job USING ERRCODE = '22023';
  END IF;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION jobs_people(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION jobs_people(text) TO app_user;
--> statement-breakpoint

-- When the next one-off job is due, across people, so the Worker wakes the API (and Neon) only then
-- (D99; Neon's free compute is spent only when something's due). A timestamp, nothing else.
CREATE FUNCTION jobs_next_once() RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF nullif(current_setting('app.user_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'only the scheduler asks this' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT min(CASE WHEN j.status = 'due' THEN j.run_at ELSE j.started_at + interval '10 minutes' END)
    FROM scheduled_jobs j
    WHERE j.status IN ('due', 'running')
  );
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION jobs_next_once() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION jobs_next_once() TO app_user;
--> statement-breakpoint

-- What /health/jobs judges (spec §16, §18): when the morning job last succeeded for anyone, and when
-- the last backup did. Two timestamps, no data.
CREATE FUNCTION jobs_health() RETURNS TABLE (morning_at timestamptz, backup_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF nullif(current_setting('app.user_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'only the health check asks this' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    (SELECT max(r.ran_at) FROM job_runs r WHERE r.job = 'morning' AND r.status = 'ok'),
    (SELECT max(r.ran_at) FROM job_runs r WHERE r.job = 'backup' AND r.status = 'ok');
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION jobs_health() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION jobs_health() TO app_user;
--> statement-breakpoint

-- The nightly backup's record (spec §17, D85), called by sen_ops' workflow as the owner role it
-- already dumps with: one row in the admin's job_runs, which Settings → Data and the watchdog read.
-- Idempotent per workflow run (`run_key`), so a re-run attempt updates its row. Not granted to
-- anyone: only the owner, who made it, can call it.
CREATE FUNCTION record_backup(run_key text, status text, bytes bigint, duration_ms integer, error text)
RETURNS integer
LANGUAGE sql VOLATILE
SET search_path = public, pg_temp
AS $$
  WITH done AS (
    INSERT INTO job_runs (user_id, job, run_key, status, bytes, duration_ms, error)
    SELECT a.user_id, 'backup', 'backup:' || record_backup.run_key, record_backup.status, record_backup.bytes,
      record_backup.duration_ms, left(record_backup.error, 500)
    FROM user_access a WHERE a.is_admin
    ON CONFLICT (user_id, run_key) DO UPDATE
      SET status = excluded.status, bytes = excluded.bytes, duration_ms = excluded.duration_ms,
          error = excluded.error, ran_at = now(), attempts = job_runs.attempts + 1
    RETURNING 1
  )
  SELECT count(*)::integer FROM done
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION record_backup(text, text, bigint, integer, text) FROM PUBLIC;
--> statement-breakpoint

-- A phone's push token, for the signed-in person (spec §5.1 Push). A token names one phone, so it
-- belongs to one person: claiming it takes it from whoever had it, or that person's notifications
-- would reach a phone now signed in as someone else. Touches only rows holding this one token.
CREATE FUNCTION push_token_claim(token text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := nullif(current_setting('app.user_id', true), '')::uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501';
  END IF;
  DELETE FROM push_tokens p WHERE p.fcm_token = token AND p.user_id <> me;
  INSERT INTO push_tokens (user_id, fcm_token) VALUES (me, token) ON CONFLICT (user_id, fcm_token) DO NOTHING;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION push_token_claim(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION push_token_claim(text) TO app_user;
