\set QUIET on
\pset format unaligned
\pset tuples_only on
BEGIN;
INSERT INTO auth_user (id,name,email,email_verified) VALUES
 ('00000000-0000-4000-8000-0000000a0001','A','qa-rls-a@example.com',true),
 ('00000000-0000-4000-8000-0000000b0001','B','qa-rls-b@example.com',true),
 ('00000000-0000-4000-8000-0000000c0001','Admin','qa-rls-admin@example.com',true);
INSERT INTO user_access (user_id,is_admin,features) VALUES
 ('00000000-0000-4000-8000-0000000a0001',false,'{"shell":true,"capture":true}'),
 ('00000000-0000-4000-8000-0000000b0001',false,'{"shell":true,"capture":true}'),
 ('00000000-0000-4000-8000-0000000c0001',true,'{"shell":true,"capture":true}');
INSERT INTO bank_events (id,user_id,package,notification_key,posted_at,notified_at,title,text,dedupe_key) VALUES
 ('00000000-0000-5000-8000-0000000a00e1','00000000-0000-4000-8000-0000000a0001','com.ryt','k',now(),now(),'t','A paid', repeat('a',64)),
 ('00000000-0000-5000-8000-0000000b00e1','00000000-0000-4000-8000-0000000b0001','com.ryt','k',now(),now(),'t','B paid', repeat('b',64));
INSERT INTO capture_apps (id,user_id,package,label,chosen_at) VALUES
 ('00000000-0000-4000-8000-0000000a00c1','00000000-0000-4000-8000-0000000a0001','com.ryt','Ryt',now()),
 ('00000000-0000-4000-8000-0000000b00c1','00000000-0000-4000-8000-0000000b0001','com.ryt','Ryt',now());
INSERT INTO device_heartbeats (id,user_id,listener_connected,access,app_version) VALUES
 ('00000000-0000-4000-8000-0000000a00d1','00000000-0000-4000-8000-0000000a0001',true,true,'1'),
 ('00000000-0000-4000-8000-0000000b00d1','00000000-0000-4000-8000-0000000b0001',true,true,'1');
INSERT INTO outbox_applied (id,user_id,kind) VALUES
 ('00000000-0000-4000-8000-0000000a00a1','00000000-0000-4000-8000-0000000a0001','edit'),
 ('00000000-0000-4000-8000-0000000b00a1','00000000-0000-4000-8000-0000000b0001','edit');
CREATE FUNCTION pg_temp.cnt(t text, uid text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int; f int;
BEGIN
  PERFORM set_config('app.user_id', coalesce(uid,''), true);
  SET LOCAL ROLE app_user;
  EXECUTE format('SELECT count(*), count(*) FILTER (WHERE user_id <> %L::uuid) FROM %I', coalesce(uid,'00000000-0000-0000-0000-000000000000'), t) INTO n, f;
  RESET ROLE;
  RETURN n || ' (' || f || ' not theirs)';
EXCEPTION WHEN others THEN RESET ROLE; RETURN 'error ' || SQLSTATE;
END $$;
SELECT t || ' | ' || pg_temp.cnt(t, NULL) || ' | ' || pg_temp.cnt(t,'00000000-0000-4000-8000-0000000a0001') || ' | ' || pg_temp.cnt(t,'00000000-0000-4000-8000-0000000b0001') || ' | ' || pg_temp.cnt(t,'00000000-0000-4000-8000-0000000c0001')

FROM unnest(array['bank_events','capture_apps','device_heartbeats','outbox_applied']) t;
-- owner role sees everything
SELECT 'owner: ' || (SELECT count(*) FROM bank_events WHERE user_id::text LIKE '00000000-0000-4000-8000-0000000%') || ' events';
-- writes across people, as B
CREATE FUNCTION pg_temp.try(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  PERFORM set_config('app.user_id', '00000000-0000-4000-8000-0000000b0001', true);
  SET LOCAL ROLE app_user;
  EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT;
  RESET ROLE; RETURN 'ok, ' || n || ' rows';
EXCEPTION WHEN others THEN RESET ROLE; RETURN 'error ' || SQLSTATE;
END $$;
SELECT 'B insert event as A: ' || pg_temp.try($q$INSERT INTO bank_events (id,user_id,package,notification_key,posted_at,notified_at,dedupe_key) VALUES (gen_random_uuid(),'00000000-0000-4000-8000-0000000a0001','x','k',now(),now(),repeat('c',64))$q$);
SELECT 'B update A event status: ' || pg_temp.try($q$UPDATE bank_events SET parse_status='dismissed' WHERE user_id='00000000-0000-4000-8000-0000000a0001'$q$);
SELECT 'B move own event to A: ' || pg_temp.try($q$UPDATE bank_events SET parse_status='dismissed', user_id='00000000-0000-4000-8000-0000000a0001' WHERE user_id='00000000-0000-4000-8000-0000000b0001'$q$);
SELECT 'B tombstone A app: ' || pg_temp.try($q$UPDATE capture_apps SET deleted_at=now() WHERE user_id='00000000-0000-4000-8000-0000000a0001'$q$);
SELECT 'B insert heartbeat as A: ' || pg_temp.try($q$INSERT INTO device_heartbeats (id,user_id,listener_connected,access,app_version) VALUES (gen_random_uuid(),'00000000-0000-4000-8000-0000000a0001',true,true,'1')$q$);
SELECT 'B claim ledger as A: ' || pg_temp.try($q$INSERT INTO outbox_applied (id,user_id,kind) VALUES (gen_random_uuid(),'00000000-0000-4000-8000-0000000a0001','edit')$q$);
SELECT 'B sync_capture_app on A id: ' || pg_temp.try($q$SELECT sync_capture_app('00000000-0000-4000-8000-0000000a00c1','com.ryt','Ryt',now(),now())$q$);
SELECT 'A app still live: ' || (SELECT deleted_at IS NULL FROM capture_apps WHERE id='00000000-0000-4000-8000-0000000a00c1');
-- B revives its own tombstone directly through app_user's column grant
UPDATE capture_apps SET deleted_at = now() WHERE id='00000000-0000-4000-8000-0000000b00c1';
SELECT 'B revive own tombstone by UPDATE: ' || pg_temp.try($q$UPDATE capture_apps SET deleted_at=NULL WHERE id='00000000-0000-4000-8000-0000000b00c1'$q$);
SELECT 'B heartbeat with own created_at: ' || pg_temp.try($q$INSERT INTO device_heartbeats (id,user_id,listener_connected,access,app_version,created_at) VALUES (gen_random_uuid(),'00000000-0000-4000-8000-0000000b0001',true,true,'1','2020-01-01')$q$);
-- the policies' and RLS flags
SELECT 'rls ' || relname || ' enabled=' || relrowsecurity || ' forced=' || relforcerowsecurity FROM pg_class WHERE relname IN ('bank_events','capture_apps','device_heartbeats','outbox_applied','user_settings') ORDER BY 1;
SELECT 'app_user bypassrls=' || rolbypassrls FROM pg_roles WHERE rolname='app_user';
SELECT 'definer fns touching new tables: ' || string_agg(proname, ',') FROM pg_proc WHERE prosecdef AND (prosrc ILIKE '%bank_events%' OR prosrc ILIKE '%capture_apps%' OR prosrc ILIKE '%device_heartbeats%' OR prosrc ILIKE '%outbox_applied%');
ROLLBACK;
