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

-- who may ask for a sign-in code: Better Auth's role asks, and learns only ok, not_invited or suspended
SELECT is(tap_sen.attempt('sen_auth', NULL, $$SELECT 1 FROM (SELECT auth_sign_in_check('BEN@example.com ') r) x WHERE r = 'ok'$$),
  'rows:1', 'an invited address may sign in, whatever its case');
SELECT is(tap_sen.attempt('sen_auth', NULL, $$SELECT 1 FROM (SELECT auth_sign_in_check('nobody@example.com') r) x WHERE r = 'not_invited'$$),
  'rows:1', 'an unknown address is not invited');
UPDATE user_access SET suspended_at = now() WHERE user_id = '00000000-0000-4000-8000-00000000000b';
SELECT is(tap_sen.attempt('sen_auth', NULL, $$SELECT 1 FROM (SELECT auth_sign_in_check('ben@example.com') r) x WHERE r = 'suspended'$$),
  'rows:1', 'a suspended person is told so');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b', $$SELECT 1 FROM (SELECT auth_sign_in_check('ben@example.com') r) x WHERE r IS NOT NULL$$),
  'denied', 'the API''s role can''t ask');

-- one open invitation per address, whatever its case
SELECT throws_ok(
  $$INSERT INTO invitations (id, invited_by, email, token_hash, expires_at)
    VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'DARA@example.com', 'hash-x', now() + interval '1 day')$$,
  '23505', NULL, 'a second open invitation to the same address in other case is refused');

SELECT * FROM finish();
ROLLBACK;
