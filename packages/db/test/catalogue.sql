-- The catalogue check (B05, done-when 4): no table without RLS, no view without security_invoker, and
-- the roles reach only what they should. Every later slice's tables are checked by it unchanged.
\ir lib/helpers.sql
BEGIN;
SELECT plan(4);

SELECT is_empty('SELECT * FROM tap_sen.catalogue_problems()', 'the catalogue has no problems');

-- it fails when a table is planted without RLS, or a view without security_invoker
CREATE TABLE public.planted (id uuid PRIMARY KEY, user_id uuid NOT NULL);
SELECT results_eq(
  'SELECT * FROM tap_sen.catalogue_problems()',
  $$VALUES ('planted: RLS is off')$$,
  'a table without RLS is caught'
);
ALTER TABLE public.planted ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.planted TO app_user;
SELECT results_eq(
  'SELECT * FROM tap_sen.catalogue_problems()',
  $$VALUES ('planted: app_user has a grant but no policy')$$,
  'a grant without a policy is caught'
);
CREATE VIEW public.planted_view AS SELECT * FROM public.user_settings;
SELECT set_eq(
  'SELECT * FROM tap_sen.catalogue_problems()',
  $$VALUES ('planted: app_user has a grant but no policy'), ('planted_view: view without security_invoker')$$,
  'a view without security_invoker is caught'
);

SELECT * FROM finish();
ROLLBACK;
