-- Shared by every pgTAP file (\ir lib/helpers.sql). Lives in the test database only, in schema tap_sen,
-- never in a migration. Each later slice's tables are covered by these without new code: the
-- catalogue check finds them, and rls.sql walks every one of them.
-- pgTAP in a schema of its own: in public, its views would fail the catalogue check
SET client_min_messages = warning;
CREATE SCHEMA IF NOT EXISTS tap;
CREATE EXTENSION IF NOT EXISTS pgtap SCHEMA tap;
CREATE SCHEMA IF NOT EXISTS tap_sen;
SET search_path = public, tap, tap_sen;

-- Tables whose owner column isn't `user_id` (spec §15 names them so). Every other table needs a
-- `user_id`, or the catalogue check fails.
CREATE OR REPLACE FUNCTION tap_sen.owner_column(t regclass) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN t = 'public.invitations'::regclass THEN 'invited_by'
    WHEN EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = t AND attname = 'user_id' AND NOT attisdropped)
      THEN 'user_id'
  END
$$;

-- The tables people own: every table in public but Better Auth's own.
CREATE OR REPLACE FUNCTION tap_sen.owned_tables() RETURNS TABLE (t regclass, col text) LANGUAGE sql STABLE AS $$
  SELECT c.oid::regclass, tap_sen.owner_column(c.oid::regclass)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname NOT LIKE 'auth\_%'
  ORDER BY c.relname
$$;

-- The catalogue check (B05): everything a new table or view must get right, as one list of problems.
-- Empty means the schema passes. catalogue.sql asserts it's empty, and that it isn't for a planted
-- table without RLS.
CREATE OR REPLACE FUNCTION tap_sen.catalogue_problems() RETURNS SETOF text LANGUAGE sql STABLE AS $$
  -- every table has RLS on
  SELECT format('%s: RLS is off', c.relname)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  UNION ALL
  -- every view reads as its caller, so RLS applies through it
  SELECT format('%s: view without security_invoker', c.relname)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'] OR c.reloptions @> ARRAY['security_invoker=on'], false)
  UNION ALL
  -- every table a person owns says whose it is
  SELECT format('%s: no user_id', o.t) FROM tap_sen.owned_tables() o WHERE o.col IS NULL
  UNION ALL
  -- a table app_user can reach has a policy for it, keyed on its owner column
  SELECT format('%s: app_user has a grant but no policy', o.t)
  FROM tap_sen.owned_tables() o
  WHERE has_table_privilege('app_user', o.t, 'SELECT, INSERT, UPDATE, DELETE')
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = o.t
                    AND 'app_user'::regrole::oid = ANY (p.polroles))
  UNION ALL
  -- no policy lets everything through for app_user
  SELECT format('%s: policy %s for app_user is always true', p.polrelid::regclass, p.polname)
  FROM pg_policy p
  WHERE 'app_user'::regrole::oid = ANY (p.polroles)
    AND (pg_get_expr(p.polqual, p.polrelid) = 'true' OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true')
  UNION ALL
  -- Better Auth's role reaches its own tables and nothing else
  SELECT format('%s: sen_auth has a grant', c.relname)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm') AND c.relname NOT LIKE 'auth\_%'
    AND has_table_privilege('sen_auth', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
  UNION ALL
  -- and the API's role never reaches Better Auth's tables (sessions, codes)
  SELECT format('%s: app_user has a grant', c.relname)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'auth\_%'
    AND has_table_privilege('app_user', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
  UNION ALL
  -- neither role owns anything, or could switch RLS off
  SELECT format('%s owns %s', r.rolname, c.relname)
  FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
  WHERE r.rolname IN ('app_user', 'sen_auth')
  UNION ALL
  SELECT format('%s can bypass RLS', rolname) FROM pg_roles
  WHERE rolname IN ('app_user', 'sen_auth') AND (rolbypassrls OR rolsuper OR rolcreaterole OR rolcreatedb)
  UNION ALL
  -- and neither can become another role (SET ROLE goes by the login's memberships)
  SELECT format('%s is a member of %s', m.rolname, r.rolname)
  FROM pg_auth_members am JOIN pg_roles m ON m.oid = am.member JOIN pg_roles r ON r.oid = am.roleid
  WHERE m.rolname IN ('app_user', 'sen_auth')
  UNION ALL
  -- a SECURITY DEFINER function must pin its search_path, or a caller's schema can hijack it
  SELECT format('%s: SECURITY DEFINER without search_path', p.oid::regprocedure)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
    AND NOT coalesce(EXISTS (SELECT 1 FROM unnest(p.proconfig) s WHERE s LIKE 'search_path=%'), false)
$$;

-- Runs `q` as `role`, signed in as `uid` (or nobody), the way the API does: SET LOCAL ROLE and a
-- transaction-local app.user_id. Says what happened: 'rows:N' or 'denied' (SQLSTATE 42501, from a
-- missing grant or a WITH CHECK). A failure rolls back its own changes; a success is reset by hand.
CREATE OR REPLACE FUNCTION tap_sen.attempt(role text, uid uuid, q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  BEGIN
    PERFORM set_config('app.user_id', coalesce(uid::text, ''), true);
    EXECUTE format('SET LOCAL ROLE %I', role);
    IF q ~* '^\s*select' THEN
      EXECUTE format('SELECT count(*) FROM (%s) q', q) INTO n;
    ELSE
      EXECUTE q;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    RESET ROLE;
    PERFORM set_config('app.user_id', '', true);
    RETURN 'rows:' || n;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'denied';
  END;
END
$$;

-- The two-person fixture: Aisyah (A) and Ben (B), and Chong (C), who has no rows yet. Inserted as
-- the owner, as the seed and Better Auth would. Every later slice adds a row per person for its own
-- tables here, so rls.sql proves them too.
CREATE OR REPLACE FUNCTION tap_sen.fixture() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  c uuid := '00000000-0000-4000-8000-00000000000c';
BEGIN
  INSERT INTO auth_user (id, name, email, email_verified) VALUES
    (a, 'Aisyah', 'aisyah@example.com', true),
    (b, 'Ben', 'ben@example.com', true),
    (c, 'Chong', 'chong@example.com', true);
  INSERT INTO auth_session (id, expires_at, token, user_id) VALUES
    (gen_random_uuid(), now() + interval '1 day', 'token-a', a),
    (gen_random_uuid(), now() + interval '1 day', 'token-b', b);
  INSERT INTO user_access (user_id, is_admin, features) VALUES
    (a, true, '{"shell":true,"capture":true,"agent":true,"splits":true,"email":true,"calendar":true,"claims":true}'),
    (b, false, '{"shell":false,"capture":false,"agent":true,"splits":true,"email":false,"calendar":false,"claims":false}');
  INSERT INTO user_settings (user_id, own_names, expected_payday) VALUES
    (a, ARRAY['AISYAH BINTI A'], 'last-working'),
    (b, ARRAY['BEN B'], '25');
  INSERT INTO invitations (id, invited_by, email, token_hash, expires_at) VALUES
    (gen_random_uuid(), a, 'dara@example.com', 'hash-a', now() + interval '7 days'),
    (gen_random_uuid(), b, 'eli@example.com', 'hash-b', now() + interval '7 days');
  INSERT INTO audit_log (user_id, entity, entity_id, action, after, actor) VALUES
    (a, 'user_settings', a, 'update', '{"expected_payday":"last-working"}', 'user'),
    (b, 'user_settings', b, 'update', '{"expected_payday":"25"}', 'user');
  -- B06
  INSERT INTO scheduled_jobs (user_id, kind, run_at, dedupe_key) VALUES
    (a, 'test', now() + interval '1 hour', 'test:a'),
    (b, 'test', now() + interval '1 hour', 'test:b');
  INSERT INTO job_runs (user_id, job, run_key, status) VALUES
    (a, 'morning', 'morning:2026-10-24', 'ok'),
    (b, 'morning', 'morning:2026-10-24', 'ok');
  INSERT INTO alerts_sent (user_id, alert_key) VALUES (a, 'backup_late:2026-10-24'), (b, 'sen_push:2026-10-24');
  INSERT INTO push_tokens (user_id, fcm_token) VALUES (a, 'fcm-a'), (b, 'fcm-b');
  -- B07
  INSERT INTO bank_events (id, user_id, package, notification_key, posted_at, notified_at, title, text, dedupe_key) VALUES
    ('00000000-0000-5000-8000-0000000000ea', a, 'my.com.tngdigital.ewallet', '0|tng|1', now(), now(), 'Payment', 'RM•.•• paid', repeat('a', 64)),
    ('00000000-0000-5000-8000-0000000000eb', b, 'my.com.tngdigital.ewallet', '0|tng|1', now(), now(), 'Payment', 'RM•.•• paid', repeat('b', 64));
  INSERT INTO capture_apps (id, user_id, package, label, chosen_at) VALUES
    (gen_random_uuid(), a, 'my.com.tngdigital.ewallet', 'TNG eWallet', now()),
    (gen_random_uuid(), b, 'my.com.tngdigital.ewallet', 'TNG eWallet', now());
  INSERT INTO device_heartbeats (id, user_id, listener_connected, access, app_version) VALUES
    (gen_random_uuid(), a, true, true, '0.7.0'), (gen_random_uuid(), b, true, true, '0.7.0');
  INSERT INTO outbox_applied (id, user_id, kind) VALUES (gen_random_uuid(), a, 'command'), (gen_random_uuid(), b, 'command');
  -- B08
  INSERT INTO accounts (id, user_id, name, kind, notifier_package, notifier_label, opening_balance, opening_at) VALUES
    ('00000000-0000-4000-8000-0000000001a0', a, 'TNG eWallet', 'tracked', 'my.com.tngdigital.ewallet', 'Touch ''n Go eWallet', 10000, now() - interval '1 day'),
    ('00000000-0000-4000-8000-0000000001b0', b, 'TNG eWallet', 'tracked', 'my.com.tngdigital.ewallet', 'Touch ''n Go eWallet', 20000, now() - interval '1 day');
  INSERT INTO account_names (id, user_id, package, label, account_id) VALUES
    (gen_random_uuid(), a, 'my.com.tngdigital.ewallet', 'eWallet', '00000000-0000-4000-8000-0000000001a0'),
    (gen_random_uuid(), b, 'my.com.tngdigital.ewallet', 'eWallet', '00000000-0000-4000-8000-0000000001b0');
  INSERT INTO categories (id, user_id, name, kind, is_meal) VALUES
    ('00000000-0000-4000-8000-0000000002a0', a, 'Meals', 'spend', true),
    ('00000000-0000-4000-8000-0000000002b0', b, 'Meals', 'spend', true);
  INSERT INTO transactions (id, user_id, account_id, bank_event_id, occurred_at, direction, amount, kind, category_id, source) VALUES
    (gen_random_uuid(), a, '00000000-0000-4000-8000-0000000001a0', '00000000-0000-5000-8000-0000000000ea', now(), 'out', 1250, 'spend', '00000000-0000-4000-8000-0000000002a0', 'notification'),
    (gen_random_uuid(), b, '00000000-0000-4000-8000-0000000001b0', '00000000-0000-5000-8000-0000000000eb', now(), 'out', 800, 'spend', '00000000-0000-4000-8000-0000000002b0', 'notification');
END
$$;
