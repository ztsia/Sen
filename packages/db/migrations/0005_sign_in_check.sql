-- Who may ask for a sign-in code (D52, QA B05 run 1, 10): an invited person not suspended. Better
-- Auth's role reaches only auth_*, so suspension (on user_access) is answered by this one narrow
-- function, which says only 'ok', 'not_invited' or 'suspended' about the address it's given.
CREATE FUNCTION auth_sign_in_check(address text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    (SELECT CASE WHEN a.suspended_at IS NOT NULL THEN 'suspended' ELSE 'ok' END
     FROM auth_user u LEFT JOIN user_access a ON a.user_id = u.id
     WHERE u.email = lower(trim(address))),
    'not_invited')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION auth_sign_in_check(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION auth_sign_in_check(text) TO sen_auth;
