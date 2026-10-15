-- The admin's functions (D52, B05): only the admin gets through, and only switches come back.
\ir lib/helpers.sql
BEGIN;
SELECT no_plan();
SELECT tap_sen.fixture();

SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000a', 'SELECT * FROM admin_members()'),
  'rows:2', 'the admin lists the members');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', 'SELECT * FROM admin_members()'),
  'denied', 'a member can''t list the members');
SELECT is(tap_sen.attempt('app_user', NULL, 'SELECT * FROM admin_members()'),
  'denied', 'nobody signed in can''t list the members');
SELECT is(tap_sen.attempt('sen_auth', NULL, 'SELECT * FROM admin_members()'),
  'denied', 'Better Auth''s role can''t call it');
SELECT set_eq(
  $$SELECT a.attname::text FROM pg_proc p, unnest(p.proargnames) WITH ORDINALITY a(attname, n)
    WHERE p.proname = 'admin_members' AND p.proargmodes[n] = 't'$$,
  ARRAY['id', 'name', 'email', 'is_admin', 'features', 'suspended_at'],
  'it returns switches, never money or settings');

SELECT * FROM finish();
ROLLBACK;
