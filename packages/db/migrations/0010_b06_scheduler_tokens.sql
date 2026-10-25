-- A suspended person's due one-off job never runs (jobs_people skips them), so it must not set the
-- next wake either: it stays due, and every tick would answer "in a minute", waking Neon each minute
-- (D141; QA B06 run 2, finding 2). Only active people's jobs count, as in jobs_people('once').
CREATE OR REPLACE FUNCTION jobs_next_once() RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF nullif(current_setting('app.user_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'only the scheduler asks this' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT min(CASE WHEN j.status = 'due' THEN j.run_at ELSE j.started_at + interval '10 minutes' END)
    FROM scheduled_jobs j JOIN user_access a ON a.user_id = j.user_id
    WHERE j.status IN ('due', 'running') AND a.suspended_at IS NULL
  );
END
$$;
--> statement-breakpoint

-- A person's phones and browsers, not hundreds: each push goes to every token, one FCM call each
-- (QA B06 run 2, finding 7). Registering again makes a token new, so the ones in use stay; past the
-- newest ten, the oldest go.
CREATE OR REPLACE FUNCTION push_token_claim(token text) RETURNS void
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
  INSERT INTO push_tokens (user_id, fcm_token) VALUES (me, token)
    ON CONFLICT (user_id, fcm_token) DO UPDATE SET created_at = now();
  DELETE FROM push_tokens p WHERE p.user_id = me AND p.id NOT IN (
    SELECT q.id FROM push_tokens q WHERE q.user_id = me ORDER BY q.created_at DESC, q.id LIMIT 10);
END
$$;
