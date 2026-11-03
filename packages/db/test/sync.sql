-- The outbox's sync (B07, done-when 3 and 9): an event synced twice is one row; its raw text can't
-- be changed by anyone; an edit changes only the fields it names; a tombstone can't be brought back
-- by a stale phone, and choosing an app again is a new row. rls.sql walks the four new tables with
-- everyone else's.
\ir lib/helpers.sql
BEGIN;
SELECT no_plan();
SELECT tap_sen.fixture();

-- runs one query as a person through app_user, as the API does, and answers its first value, or
-- the error's code
CREATE FUNCTION pg_temp.as_app(uid uuid, q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('app.user_id', uid::text, true);
  SET LOCAL ROLE app_user;
  EXECUTE q INTO v;
  RESET ROLE;
  PERFORM set_config('app.user_id', '', true);
  RETURN v;
EXCEPTION WHEN others THEN
  RETURN 'error:' || SQLSTATE;
END
$$;

\set a '''00000000-0000-4000-8000-00000000000a'''
\set b '''00000000-0000-4000-8000-00000000000b'''
\set ev '''00000000-0000-5000-8000-0000000000e1'''

-- ── bank events ─────────────────────────────────────────────────────────────────────────────────
\set syncev 'SELECT sync_bank_event(' :ev ', ''com.ryt'', ''payments'', ''0|com.ryt|7'', ''2026-11-01T01:00Z'', ''2026-11-01T01:00Z'', ''Ryt'', ''You paid RM12.90 to •-ELEVEN'', NULL, false, ''' '1111111111111111111111111111111111111111111111111111111111111111' ''')'
SELECT is(pg_temp.as_app(:a, :'syncev'), 'true', 'a new event is stored');
SELECT is(pg_temp.as_app(:a, :'syncev'), 'false', 'the same event again is a no-op');
SELECT is((SELECT count(*)::int FROM bank_events WHERE dedupe_key = repeat('1', 64)), 1, 'and stays one row');
SELECT is(pg_temp.as_app(:b, :'syncev'), 'false', 'someone else sending its id changes nothing');
SELECT is((SELECT user_id FROM bank_events WHERE id = :ev), :a::uuid, 'the event is still its person''s');

-- the raw columns: refused to app_user by its grants, and to every role by the trigger
SELECT is(pg_temp.as_app(:a, format('UPDATE bank_events SET title = %L WHERE id = %L RETURNING 1', 'x', :ev)), 'error:42501',
  'app_user can''t change an event''s title');
SELECT throws_ok(format('UPDATE bank_events SET text = %L WHERE id = %L', 'RM99.00', :ev), '42501', NULL,
  'nor can the owner change its text');
SELECT throws_ok(format('UPDATE bank_events SET posted_at = now() WHERE id = %L', :ev), '42501', NULL,
  'nor when it was posted');
SELECT throws_ok(format('UPDATE bank_events SET dedupe_key = %L WHERE id = %L', repeat('2', 64), :ev), '42501', NULL,
  'nor its dedupe key');
SELECT lives_ok(format('UPDATE bank_events SET parse_status = %L WHERE id = %L', 'skipped', :ev),
  'its status stays writable');

-- an edit changes only the fields it names (§5): the server links the event (matching), then a phone
-- that hasn't seen the link edits its status
UPDATE bank_events SET linked_event_id = '00000000-0000-5000-8000-0000000000ea', parsed = '{"by":"server"}' WHERE id = :ev;
SELECT is(pg_temp.as_app(:a, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '{"parse_status":"unparsed"}')), 'true',
  'a phone''s edit of the status applies');
SELECT is((SELECT parse_status FROM bank_events WHERE id = :ev), 'unparsed', 'the status it named changed');
SELECT is((SELECT linked_event_id FROM bank_events WHERE id = :ev), '00000000-0000-5000-8000-0000000000ea'::uuid,
  'the link the server made is still there');
SELECT is((SELECT parsed FROM bank_events WHERE id = :ev), '{"by":"server"}'::jsonb, 'and so is what the server read');
SELECT is(pg_temp.as_app(:a, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '{"parsed":null}')), 'true',
  'an edit can clear a field it names');
SELECT is((SELECT parsed FROM bank_events WHERE id = :ev), NULL, 'to SQL null');
SELECT is(pg_temp.as_app(:a, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '{"title":"x"}')), 'error:42501',
  'an edit can''t name a raw column');
SELECT is(pg_temp.as_app(:a, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '{"linked_event_id":null}')), 'error:42501',
  'nor the server''s link');
SELECT is(pg_temp.as_app(:a, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '[1]')), 'error:42501',
  'an edit is an object of fields');
SELECT is(pg_temp.as_app(:b, format('SELECT sync_edit_bank_event(%L, %L)', :ev, '{"parse_status":"dismissed"}')), 'false',
  'someone else''s edit finds no event');
SELECT is((SELECT parse_status FROM bank_events WHERE id = :ev), 'unparsed', 'and changes nothing');

-- ── the chosen apps ──────────────────────────────────────────────────────────────────────────────
\set x '''00000000-0000-4000-8000-0000000000c1'''
\set y '''00000000-0000-4000-8000-0000000000c2'''
\set z '''00000000-0000-4000-8000-0000000000c3'''
\set w '''00000000-0000-4000-8000-0000000000c4'''
CREATE FUNCTION pg_temp.choose(uid uuid, id uuid, pkg text, label text, chosen timestamptz, deleted timestamptz)
RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.as_app(uid, format('SELECT sync_capture_app(%L, %L, %L, %L, %L)', id, pkg, label, chosen, deleted))
$$;
CREATE FUNCTION pg_temp.live(uid uuid, pkg text) RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM capture_apps WHERE user_id = uid AND package = pkg AND deleted_at IS NULL
$$;

SELECT is(pg_temp.choose(:a, :x, 'com.ryt', 'Ryt', '2026-11-01T00:00Z', NULL), 'added', 'choosing an app adds it');
SELECT is(pg_temp.choose(:a, :x, 'com.ryt', 'Ryt', '2026-11-01T00:00Z', NULL), 'kept', 'the same choice again is a no-op');
SELECT is(pg_temp.choose(:a, :x, 'com.ryt', 'Ryt Bank', '2026-11-01T00:00Z', NULL), 'merged', 'a new label merges');
SELECT is(pg_temp.choose(:a, :x, 'com.other', 'Other', '2026-11-01T00:00Z', NULL), 'error:22023', 'a choice''s app never changes');
SELECT ok((SELECT version FROM capture_apps WHERE user_id = :a AND id = :x) > 0, 'a change takes a version');
CREATE TEMP TABLE v1 AS SELECT version FROM capture_apps WHERE user_id = :a AND id = :x;
SELECT is(pg_temp.choose(:a, :x, 'com.ryt', 'Ryt Bank', '2026-11-01T00:00Z', '2026-11-02T00:00Z'), 'removed', 'removing it leaves a tombstone');
SELECT ok((SELECT version FROM capture_apps WHERE user_id = :a AND id = :x) > (SELECT version FROM v1), 'with a newer version');
SELECT is(pg_temp.live(:a, 'com.ryt'), 0::bigint, 'so it''s no longer chosen');

-- a stale phone, which still has it chosen, syncs its old copy
SELECT is(pg_temp.choose(:a, :x, 'com.ryt', 'Ryt Bank', '2026-11-01T00:00Z', NULL), 'stale', 'a stale upsert is refused');
SELECT is(pg_temp.live(:a, 'com.ryt'), 0::bigint, 'and doesn''t bring the tombstone back');
SELECT isnt((SELECT deleted_at FROM capture_apps WHERE user_id = :a AND id = :x), NULL, 'the tombstone stays');

-- choosing it again is a new row
SELECT is(pg_temp.choose(:a, :y, 'com.ryt', 'Ryt', '2026-11-03T00:00Z', NULL), 'added', 'choosing it again adds a new row');
SELECT is(pg_temp.live(:a, 'com.ryt'), 1::bigint, 'so it''s chosen once');

-- a second phone chooses it too, under its own id
SELECT is(pg_temp.choose(:a, :z, 'com.ryt', 'Ryt', '2026-11-03T01:00Z', NULL), 'kept', 'a second phone''s choice of a chosen app is a no-op');
SELECT is(pg_temp.live(:a, 'com.ryt'), 1::bigint, 'still chosen once');
-- an old removal from a phone that never learned the new id: the new choice came after it
SELECT is(pg_temp.choose(:a, :z, 'com.ryt', 'Ryt', '2026-11-01T00:00Z', '2026-11-02T12:00Z'), 'stale', 'an older removal under another id is stale');
SELECT is(pg_temp.live(:a, 'com.ryt'), 1::bigint, 'and the newer choice stays');
-- the second phone removes it, later
SELECT is(pg_temp.choose(:a, :z, 'com.ryt', 'Ryt', '2026-11-03T01:00Z', '2026-11-04T00:00Z'), 'removed', 'a removal under another id removes the live choice');
SELECT is(pg_temp.live(:a, 'com.ryt'), 0::bigint, 'so it''s no longer chosen');

-- someone else, with the same ids, has rows of their own and reaches none of Aisyah's
SELECT is(pg_temp.choose(:b, :x, 'com.ryt', 'Ryt', '2026-11-05T00:00Z', NULL), 'added', 'ids are each person''s own');
SELECT isnt((SELECT deleted_at FROM capture_apps WHERE user_id = :a AND id = :x), NULL, 'Aisyah''s tombstone is untouched');
SELECT is(pg_temp.as_app(:b, format('UPDATE capture_apps SET package = %L RETURNING 1', 'x')), 'error:42501',
  'a choice''s app can''t be changed directly');

-- ── heartbeats and the outbox's ledger ───────────────────────────────────────────────────────────
SELECT is(pg_temp.as_app(:a, 'UPDATE device_heartbeats SET listener_connected = false RETURNING 1'), 'error:42501',
  'a heartbeat can''t be changed after');
SELECT is(pg_temp.as_app(:a, 'DELETE FROM outbox_applied RETURNING 1'), 'error:42501', 'nor can the outbox''s ledger be cleared');
SELECT is(pg_temp.as_app(:a, 'DELETE FROM bank_events RETURNING 1'), 'error:42501', 'nor can an event be deleted');

SELECT * FROM finish();
ROLLBACK;
