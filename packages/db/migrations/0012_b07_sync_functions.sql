-- B07's grants, triggers and functions (spec §5, §6.2, §6.5, §15). RLS decides which rows; grants
-- decide which operations and columns exist. Every write the outbox syncs goes through a function
-- below, which holds its rule: a bank event's raw text never changes, an edit sets only the fields it
-- names, and a tombstone stays.

GRANT SELECT, INSERT ON bank_events TO app_user;
--> statement-breakpoint
-- only the status columns: the raw ones can't even be named in an UPDATE (the trigger below guards
-- them from every role, the owner included)
GRANT UPDATE (parse_status, parsed_by, parsed, linked_event_id) ON bank_events TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT ON capture_apps TO app_user;
--> statement-breakpoint
GRANT UPDATE (label, deleted_at) ON capture_apps TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT ON device_heartbeats, outbox_applied TO app_user;
--> statement-breakpoint

-- Raw text is stored first and never changed (§6.2, D121). B10's classifier, which puts a known
-- wording's digits back, changes this trigger with its own migration.
CREATE FUNCTION bank_events_raw_immutable() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.id, NEW.user_id, NEW.package, NEW.channel_id, NEW.notification_key, NEW.posted_at,
      NEW.notified_at, NEW.title, NEW.text, NEW.big_text, NEW.maybe_otp, NEW.dedupe_key, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.user_id, OLD.package, OLD.channel_id, OLD.notification_key, OLD.posted_at,
      OLD.notified_at, OLD.title, OLD.text, OLD.big_text, OLD.maybe_otp, OLD.dedupe_key, OLD.created_at) THEN
    RAISE EXCEPTION 'a bank event''s raw text never changes' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER bank_events_raw_immutable BEFORE UPDATE ON bank_events
FOR EACH ROW EXECUTE FUNCTION bank_events_raw_immutable();
--> statement-breakpoint

-- What the phone pulls down is ordered by one counter (§5 *What the phone keeps offline*): each
-- insert or update of a synced-down row takes the next number. Owned by the owner; the trigger's
-- function is SECURITY DEFINER only to take a number, so app_user needs no grant on the sequence.
CREATE SEQUENCE sync_version AS bigint;
--> statement-breakpoint
CREATE FUNCTION sync_version_bump() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.version := nextval('public.sync_version');
  RETURN NEW;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sync_version_bump() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER capture_apps_version BEFORE INSERT OR UPDATE ON capture_apps
FOR EACH ROW EXECUTE FUNCTION sync_version_bump();
--> statement-breakpoint

-- A captured notification, from the outbox (§6.2, §6.5). Answers whether it was new: the same event
-- again (a retried sync, a replay after a reconnect, a reinstall, a second phone) has the same id and
-- dedupe key, and is a no-op. The API checks the id is this person's UUIDv5 of the dedupe key first.
CREATE FUNCTION sync_bank_event(
  p_id uuid, p_package text, p_channel_id text, p_notification_key text, p_posted_at timestamptz,
  p_notified_at timestamptz, p_title text, p_text text, p_big_text text, p_maybe_otp boolean,
  p_dedupe_key text
) RETURNS boolean
LANGUAGE sql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH ins AS (
    INSERT INTO bank_events (id, user_id, package, channel_id, notification_key, posted_at, notified_at,
                             title, text, big_text, maybe_otp, dedupe_key)
    VALUES (p_id, nullif(current_setting('app.user_id', true), '')::uuid, p_package, p_channel_id,
            p_notification_key, p_posted_at, p_notified_at, p_title, p_text, p_big_text, p_maybe_otp,
            p_dedupe_key)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM ins)
$$;
--> statement-breakpoint

-- A field-level edit of an event's status (§5): only the fields it names change, so it can't undo
-- what the server changed in the others since (matching's link, a re-read). Answers whether the event
-- was there. The raw columns and the link aren't the phone's to edit.
CREATE FUNCTION sync_edit_bank_event(p_id uuid, p_fields jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_fields) k WHERE k NOT IN ('parse_status', 'parsed_by', 'parsed')
  ) THEN
    RAISE EXCEPTION 'only an event''s status is the phone''s to edit' USING ERRCODE = '42501';
  END IF;
  UPDATE bank_events SET
    parse_status = CASE WHEN p_fields ? 'parse_status' THEN p_fields->>'parse_status' ELSE parse_status END,
    parsed_by = CASE WHEN p_fields ? 'parsed_by' THEN (p_fields->>'parsed_by')::uuid ELSE parsed_by END,
    parsed = CASE WHEN p_fields ? 'parsed' THEN nullif(p_fields->'parsed', 'null'::jsonb) ELSE parsed END
  WHERE id = p_id;
  RETURN FOUND;
END
$$;
--> statement-breakpoint

-- A choice in the app picker, from the outbox (D86). Answers what happened:
-- - `added`: a new choice;
-- - `kept`: nothing changed (a retry, or the app is already chosen on another phone, under its id);
-- - `merged`: its label changed;
-- - `removed`: the choice now has a tombstone;
-- - `stale`: the phone's copy is out of date, and nothing changed. A tombstone is never brought back:
--   choosing the app again is a new row, with a new id.
-- Removing a choice the server holds under another id (made on another phone) removes the live one,
-- unless that was chosen after this removal.
CREATE FUNCTION sync_capture_app(
  p_id uuid, p_package text, p_label text, p_chosen_at timestamptz, p_deleted_at timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := nullif(current_setting('app.user_id', true), '')::uuid;
  r capture_apps;
BEGIN
  SELECT * INTO r FROM capture_apps WHERE user_id = me AND id = p_id FOR UPDATE;
  IF FOUND THEN
    IF r.package IS DISTINCT FROM p_package THEN
      RAISE EXCEPTION 'a choice''s app never changes' USING ERRCODE = '22023';
    END IF;
    IF r.deleted_at IS NOT NULL THEN
      RETURN 'stale';
    END IF;
    IF p_deleted_at IS NOT NULL THEN
      UPDATE capture_apps SET deleted_at = p_deleted_at WHERE user_id = me AND id = p_id;
      RETURN 'removed';
    END IF;
    IF r.label IS DISTINCT FROM p_label THEN
      UPDATE capture_apps SET label = p_label WHERE user_id = me AND id = p_id;
      RETURN 'merged';
    END IF;
    RETURN 'kept';
  END IF;
  IF p_deleted_at IS NOT NULL THEN
    UPDATE capture_apps SET deleted_at = p_deleted_at
    WHERE user_id = me AND package = p_package AND deleted_at IS NULL AND chosen_at <= p_deleted_at;
    RETURN CASE WHEN FOUND THEN 'removed' ELSE 'stale' END;
  END IF;
  INSERT INTO capture_apps (id, user_id, package, label, chosen_at)
  VALUES (p_id, me, p_package, p_label, p_chosen_at)
  ON CONFLICT DO NOTHING;
  RETURN CASE WHEN FOUND THEN 'added' ELSE 'kept' END;
END
$$;
