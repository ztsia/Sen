-- The admin's first read across people (D52; spec §16's GET /admin/members, built out in B38): who
-- is a member, their switches and whether they're suspended. Never their money, chosen apps or
-- settings. SECURITY DEFINER, because a security_invoker view would show the admin only their own
-- row; so it checks the admin flag itself first, and pins its search_path.
CREATE FUNCTION admin_members()
RETURNS TABLE (id uuid, name text, email text, is_admin boolean, features jsonb, suspended_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := nullif(current_setting('app.user_id', true), '')::uuid;
BEGIN
  IF me IS NULL OR NOT EXISTS (SELECT 1 FROM user_access a WHERE a.user_id = me AND a.is_admin) THEN
    RAISE EXCEPTION 'only the admin can list members' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.name, u.email, a.is_admin, a.features, a.suspended_at
    FROM auth_user u JOIN user_access a ON a.user_id = u.id
    ORDER BY u.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_members() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_members() TO app_user;
