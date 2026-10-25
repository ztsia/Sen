-- The health check counts only the admin's runs (QA B06 run 1, finding 3). app_user may write its
-- own job_runs rows, so a member's own 'ok' rows could otherwise hide a dead morning frame or backup
-- from the outside monitor. The backup is recorded as the admin's (record_backup()), and the morning
-- frame runs for the admin as for everyone, so the admin's rows say both.
CREATE OR REPLACE FUNCTION jobs_health() RETURNS TABLE (morning_at timestamptz, backup_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF nullif(current_setting('app.user_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'only the health check asks this' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    (SELECT max(r.ran_at) FROM job_runs r JOIN user_access a ON a.user_id = r.user_id AND a.is_admin
      WHERE r.job = 'morning' AND r.status = 'ok'),
    (SELECT max(r.ran_at) FROM job_runs r JOIN user_access a ON a.user_id = r.user_id AND a.is_admin
      WHERE r.job = 'backup' AND r.status = 'ok');
END
$$;
