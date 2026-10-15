-- RLS (B05, done-when 2 and 3): with two people, neither can read, insert, update or delete the
-- other's rows in any table, the admin included; nobody signed in reads nothing; app_user can't get
-- round RLS; and Better Auth's role reaches only auth_*. Walks every table tap_sen.owned_tables()
-- finds, so a later slice's table is covered once the fixture gives it a row per person.
\ir lib/helpers.sql
BEGIN;
SELECT no_plan();
SELECT tap_sen.fixture();

CREATE FUNCTION pg_temp.walk(me uuid, other uuid, nobody uuid) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE
  r record;
  copy text;
BEGIN
  FOR r IN SELECT * FROM tap_sen.owned_tables() LOOP
    RETURN NEXT isnt(tap_sen.attempt(current_user, NULL, format('SELECT 1 FROM %s WHERE %I = %L', r.t, r.col, other)),
      'rows:0', format('%s: the fixture has a row for the other person', r.t));
    RETURN NEXT is(tap_sen.attempt('app_user', me, format('SELECT 1 FROM %s WHERE %I = %L', r.t, r.col, other)),
      'rows:0', format('%s: can''t read the other''s rows', r.t));
    RETURN NEXT is(tap_sen.attempt('app_user', me, format('SELECT 1 FROM %s WHERE %I IS DISTINCT FROM %L', r.t, r.col, me)),
      'rows:0', format('%s: reads only its own rows', r.t));
    RETURN NEXT is(tap_sen.attempt('app_user', NULL, format('SELECT 1 FROM %s', r.t)),
      'rows:0', format('%s: nobody signed in reads nothing', r.t));
    RETURN NEXT ok(tap_sen.attempt('app_user', me, format('UPDATE %s SET %I = %I WHERE %I = %L', r.t, r.col, r.col, r.col, other))
      IN ('rows:0', 'denied'), format('%s: can''t update the other''s rows', r.t));
    RETURN NEXT ok(tap_sen.attempt('app_user', me, format('DELETE FROM %s WHERE %I = %L', r.t, r.col, other))
      IN ('rows:0', 'denied'), format('%s: can''t delete the other''s rows', r.t));
    -- given to the third person, who has no rows, so no unique key can hide a weak WITH CHECK; and
    -- with no WHERE on a column, so the SELECT policy isn't applied to the new row and can't hide it
    -- either (QA B05 run 1, 2). RLS limits it to my own rows.
    RETURN NEXT is(tap_sen.attempt('app_user', me, format('UPDATE %s SET %I = %L', r.t, r.col, nobody)),
      'denied', format('%s: can''t give its own row to someone else', r.t));
    -- a copy of my own row, made out to someone else (with a fresh id, where there is one)
    copy := format(
      'INSERT INTO %1$s SELECT (jsonb_populate_record(NULL::%1$s, to_jsonb(x) || jsonb_build_object(%2$L, %3$L::uuid, ''id'', gen_random_uuid()))).* FROM %1$s x WHERE %2$I = %4$L LIMIT 1',
      r.t, r.col, '%s', me);
    RETURN NEXT is(tap_sen.attempt('app_user', me, format(copy, other)),
      'denied', format('%s: can''t insert a row as the other', r.t));
    RETURN NEXT is(tap_sen.attempt('app_user', me, format(copy, nobody)),
      'denied', format('%s: can''t insert a row as a third person', r.t));
  END LOOP;
END
$$;

-- Ben against Aisyah, and Aisyah, the admin, against Ben: the admin reads none of anyone's rows (D52)
SELECT * FROM pg_temp.walk('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000c');
SELECT * FROM pg_temp.walk('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');

-- what a person can't do to their own access (D52, D98)
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$UPDATE user_access SET ai_unlimited = true WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  'denied', 'a person can''t make themselves Unlimited');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$UPDATE user_access SET features = features || '{"capture":true}' WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  'denied', 'a person can''t switch on their own features');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$UPDATE user_access SET is_admin = true WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  'denied', 'a person can''t make themselves the admin');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$UPDATE audit_log SET action = 'x' WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  'denied', 'the audit log is append-only: no update');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$DELETE FROM audit_log WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  'denied', 'the audit log is append-only: no delete');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  $$SELECT 1 FROM user_settings$$), 'rows:1', 'a person reads their own settings');

-- app_user can't get round RLS
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  'ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY'), 'denied', 'app_user can''t switch RLS off');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  'SET LOCAL row_security = off; SELECT 1 FROM user_settings'), 'denied', 'app_user can''t read with row_security off');
SELECT ok(NOT pg_has_role('app_user', (SELECT tableowner FROM pg_tables WHERE tablename = 'user_settings'), 'MEMBER'),
  'app_user can''t become the owner');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  'CREATE TABLE public.mine (id int)'), 'denied', 'app_user can''t create a table of its own');
SELECT is(tap_sen.attempt('app_user', '00000000-0000-4000-8000-00000000000b',
  'SELECT 1 FROM auth_session'), 'denied', 'app_user can''t read sessions');

-- Better Auth's role reaches auth_* and nothing else (done-when 3)
SELECT is(tap_sen.attempt('sen_auth', NULL, 'SELECT 1 FROM auth_user'), 'rows:3', 'sen_auth reads auth_user');
SELECT is(tap_sen.attempt('sen_auth', NULL, 'SELECT 1 FROM auth_session'), 'rows:2', 'sen_auth reads auth_session');
SELECT is(tap_sen.attempt('sen_auth', NULL, format('SELECT 1 FROM %s', t)), 'denied', format('sen_auth can''t read %s', t))
FROM tap_sen.owned_tables();

SELECT * FROM finish();
ROLLBACK;
