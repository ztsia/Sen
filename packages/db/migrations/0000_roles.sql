-- The two roles besides the owner (spec §17, B05). Roles belong to the whole Postgres cluster (Neon's
-- project), so each is created only if missing. They log in, but with no password until the deploy
-- step sets one (src/deploy.ts); locally, trust authentication lets them in.
-- Neither can bypass RLS, create anything, or make roles. `app_user` owns nothing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sen_auth') THEN
    CREATE ROLE sen_auth LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;
--> statement-breakpoint
-- Everyone gets nothing by default; each table's migration grants what its role needs.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user, sen_auth;
