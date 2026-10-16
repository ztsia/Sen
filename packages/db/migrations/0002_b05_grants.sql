-- B05's grants. RLS decides which rows; grants decide which operations exist at all. Every later
-- migration that adds a table grants it here in the same way, and the catalogue check fails on a
-- table `app_user` can reach without RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_user, auth_session, auth_account, auth_verification TO sen_auth;
--> statement-breakpoint
-- read-only to its person: written by the admin's functions (B38) and the seed
GRANT SELECT ON user_access, invitations TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON user_settings TO app_user;
--> statement-breakpoint
-- append-only
GRANT SELECT, INSERT ON audit_log TO app_user;
