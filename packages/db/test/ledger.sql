-- The ledger (B08, done-when 2 to 4): the starting categories with their flags and system keys;
-- Unaccounted can't be picked by hand; one account per app (D145); references stay within one person;
-- and the balance view, on hand-checked rows, counting only what moved after `opening_at`. rls.sql
-- walks the four new tables with everyone else's, and catalogue.sql checks them and the two views.
\ir lib/helpers.sql
BEGIN;
SELECT no_plan();
SELECT tap_sen.fixture();

-- runs one query as a person through app_user, as the API does, and answers its first value, or the
-- error's code
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
\set c '''00000000-0000-4000-8000-00000000000c'''

-- ── the starting categories (§8, D33) ───────────────────────────────────────────────────────────

SELECT is(pg_temp.as_app(:c, 'SELECT seed_categories()'), '21', 'the seed adds the 21 starting categories');
SELECT is(pg_temp.as_app(:c, 'SELECT seed_categories()'), '0', 'seeding again adds nothing');
SELECT is(pg_temp.as_app(:a, 'SELECT seed_categories()'), '0', 'someone with categories already gets none');
SELECT is(pg_temp.as_app(NULL, 'SELECT seed_categories()'), 'error:42501', 'nobody signed in can''t seed');

SELECT results_eq(
  $$SELECT position, name, kind, is_meal, is_beverage, is_discretionary, system_key FROM categories
    WHERE user_id = '00000000-0000-4000-8000-00000000000c' ORDER BY position$$,
  $$VALUES
    (1, 'Meals', 'spend', true, false, false, NULL::text),
    (2, 'Drinks & desserts', 'spend', false, true, true, NULL),
    (3, 'Groceries', 'spend', false, false, false, NULL),
    (4, 'Transport', 'spend', false, false, false, NULL),
    (5, 'Car', 'spend', false, false, false, NULL),
    (6, 'Phone & internet', 'spend', false, false, false, NULL),
    (7, 'Home & bills', 'spend', false, false, false, NULL),
    (8, 'Shopping', 'spend', false, false, true, NULL),
    (9, 'Entertainment', 'spend', false, false, true, NULL),
    (10, 'Subscriptions', 'spend', false, false, false, NULL),
    (11, 'Health', 'spend', false, false, false, NULL),
    (12, 'Personal care', 'spend', false, false, false, NULL),
    (13, 'Gifts & treats', 'spend', false, false, true, NULL),
    (14, 'Family', 'spend', false, false, false, NULL),
    (15, 'Travel', 'spend', false, false, true, NULL),
    (16, 'Fees & charges', 'spend', false, false, false, NULL),
    (17, 'Cash', 'spend', false, false, false, 'cash'),
    (18, 'Unaccounted', 'spend', false, false, false, 'unaccounted'),
    (19, 'Salary', 'income', false, false, false, 'salary'),
    (20, 'Interest & returns', 'income', false, false, false, NULL),
    (21, 'Other income', 'income', false, false, false, NULL)$$,
  'the starting list, in order, with its flags and system keys'
);

-- what can't be done to a category
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET archived_at = now() WHERE system_key = 'salary' RETURNING 1$$),
  'error:23514', 'a system category can''t be archived');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET is_discretionary = true WHERE system_key = 'unaccounted' RETURNING 1$$),
  'error:23514', 'Unaccounted takes no flags');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET is_meal = true WHERE name = 'Salary' RETURNING 1$$),
  'error:23514', 'a money-in category takes no spending flags');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET kind = 'income' WHERE name = 'Meals' RETURNING 1$$),
  'error:42501', 'a category''s kind never changes');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET system_key = NULL WHERE name = 'Cash' RETURNING 1$$),
  'error:42501', 'a system key never changes');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO categories (id, user_id, name, kind) VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'meals', 'spend') RETURNING 1$$),
  'error:23505', 'two live categories can''t share a name, whatever its case');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET name = 'Food', updated_at = now() WHERE name = 'Meals' RETURNING name$$),
  'Food', 'a category can be renamed');
SELECT is(pg_temp.as_app(:c, $$UPDATE categories SET archived_at = now() WHERE name = 'Car' RETURNING 1$$),
  '1', 'a category can be archived');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO categories (id, user_id, name, kind) VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'Car', 'spend') RETURNING 1$$),
  '1', 'an archived category''s name can be used again');

-- ── accounts (§7, D145) ─────────────────────────────────────────────────────────────────────────

SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind, notifier_package, notifier_label, opening_balance)
  VALUES ('00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-00000000000c', 'Ryt Bank', 'tracked', 'my.rytbank.app', 'Ryt Bank', 320000) RETURNING 1$$),
  '1', 'an account for an app');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind, notifier_package, notifier_label)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'Ryt pocket', 'tracked', 'my.rytbank.app', 'Ryt Bank') RETURNING 1$$),
  'error:23505', 'one live account per app (D145)');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind, notifier_package, notifier_label)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'Maybank', 'elsewhere', 'com.maybank2u.life', 'MAE') RETURNING 1$$),
  'error:23514', 'an Elsewhere account has no app');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind, opening_balance)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'Maybank', 'elsewhere', 100) RETURNING 1$$),
  'error:23514', 'an Elsewhere account holds no balance');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind)
  VALUES ('00000000-0000-4000-8000-0000000001c3', '00000000-0000-4000-8000-00000000000c', 'Maybank', 'elsewhere') RETURNING 1$$),
  '1', 'an Elsewhere account');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO accounts (id, user_id, name, kind, opening_balance)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'Too much', 'tracked', 10000000000000) RETURNING 1$$),
  'error:23514', 'an opening balance beyond MAX_SEN is refused');
SELECT is(pg_temp.as_app(:c, $$UPDATE accounts SET notifier_package = 'com.pbb.mypb' WHERE name = 'Ryt Bank' RETURNING 1$$),
  'error:42501', 'an account''s app never changes');
SELECT is(pg_temp.as_app(:c, $$UPDATE accounts SET opening_at = now() WHERE name = 'Ryt Bank' RETURNING 1$$),
  'error:42501', 'an account''s opening moment never changes');
SELECT cmp_ok(pg_temp.as_app(:c, $$SELECT version FROM accounts WHERE name = 'Ryt Bank'$$)::bigint, '>', 0::bigint,
  'an account takes a version for the offline copy');

-- references stay within one person: Chong can't point at Aisyah's account, category or event, so a
-- foreign key can't tell Chong whether someone else's id exists
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, account_id, occurred_at, direction, amount, kind, source)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-0000000001a0', now(), 'out', 100, 'spend', 'manual') RETURNING 1$$),
  'error:23503', 'a payment can''t name someone else''s account');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, category_id, occurred_at, direction, amount, kind, source)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-0000000002a0', now(), 'out', 100, 'spend', 'manual') RETURNING 1$$),
  'error:23503', 'a payment can''t name someone else''s category');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, bank_event_id, occurred_at, direction, amount, kind, source)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', '00000000-0000-5000-8000-0000000000ea', now(), 'out', 100, 'spend', 'notification') RETURNING 1$$),
  'error:23503', 'a payment can''t name someone else''s bank event');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO account_names (id, user_id, package, label, account_id)
  VALUES (gen_random_uuid(), '00000000-0000-4000-8000-00000000000c', 'my.com.tngdigital.ewallet', 'eWallet', '00000000-0000-4000-8000-0000000001a0') RETURNING 1$$),
  'error:23503', 'an account name can''t map to someone else''s account');

-- ── Unaccounted is never picked by hand (§7, §8, done-when 3) ───────────────────────────────────

SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, account_id, category_id, occurred_at, direction, amount, kind, source)
  SELECT gen_random_uuid(), user_id, '00000000-0000-4000-8000-0000000001c1', id, now(), 'out', 100, 'spend', 'manual'
  FROM categories WHERE system_key = 'unaccounted' RETURNING 1$$),
  'error:23514', 'a payment can''t be put in Unaccounted');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, account_id, category_id, occurred_at, direction, amount, kind, source)
  SELECT gen_random_uuid(), user_id, '00000000-0000-4000-8000-0000000001c1', id, now(), 'out', 100, 'adjustment', 'adjustment'
  FROM categories WHERE name = 'Groceries' RETURNING 1$$),
  'error:23514', 'an adjustment is always Unaccounted');
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, account_id, category_id, occurred_at, direction, amount, kind, source)
  SELECT '00000000-0000-4000-8000-0000000003c1', user_id, '00000000-0000-4000-8000-0000000001c1', id, now() - interval '1 year', 'out', 100, 'spend', 'manual'
  FROM categories WHERE name = 'Groceries' RETURNING 1$$),
  '1', 'a payment in an ordinary category');
SELECT is(pg_temp.as_app(:c, $$UPDATE transactions SET category_id = (SELECT id FROM categories WHERE system_key = 'unaccounted')
  WHERE id = '00000000-0000-4000-8000-0000000003c1' RETURNING 1$$),
  'error:23514', 'a payment can''t be moved into Unaccounted');
-- the other half (QA B08 run 4, finding 1): a balance check's adjustment does book there, and stays one
SELECT is(pg_temp.as_app(:c, $$INSERT INTO transactions (id, user_id, account_id, category_id, occurred_at, direction, amount, kind, source)
  SELECT '00000000-0000-4000-8000-0000000003c2', user_id, '00000000-0000-4000-8000-0000000001c1', id, now() - interval '1 year', 'out', 100, 'adjustment', 'adjustment'
  FROM categories WHERE system_key = 'unaccounted' RETURNING 1$$),
  '1', 'a balance check''s adjustment books to Unaccounted');
SELECT is(pg_temp.as_app(:c, $$UPDATE transactions SET kind = 'spend' WHERE id = '00000000-0000-4000-8000-0000000003c2' RETURNING 1$$),
  'error:23514', 'an adjustment in Unaccounted can''t be turned into a payment there');
SELECT is(pg_temp.as_app(:c, $$UPDATE transactions SET my_share = 200 WHERE id = '00000000-0000-4000-8000-0000000003c1' RETURNING 1$$),
  'error:23514', 'your share is never more than what moved (D19)');
SELECT is(pg_temp.as_app(:c, $$UPDATE transactions SET amount = '1.5' WHERE id = '00000000-0000-4000-8000-0000000003c1' RETURNING 1$$),
  'error:22P02', 'an amount is whole sen, never a fraction');
SELECT is(pg_temp.as_app(:c, $$UPDATE transactions SET source = 'receipt' WHERE id = '00000000-0000-4000-8000-0000000003c1' RETURNING 1$$),
  'error:42501', 'a payment''s source never changes');
SELECT is(pg_temp.as_app(:c, $$DELETE FROM transactions WHERE id = '00000000-0000-4000-8000-0000000003c1' RETURNING 1$$),
  'error:42501', 'a payment is never deleted, only tombstoned');

-- ── the balance view (§7, done-when 2), on hand-checked rows ────────────────────────────────────
-- Ben's Ryt account opened with RM1,000.00 at 9:00 on 1 Nov 2026 (KL). What counts:
--   8:59:59  out    RM50.00   before the opening: already in the RM1,000.00     not counted
--   9:00:00  out    RM7.00    the opening moment itself: already in it           not counted
--   9:00:01  in     RM200.00  just after                                         +200.00
--   10:00    out    RM30.50   a split bill, Ben's share RM10.00: the account paid all −30.50
--   11:00    out    RM99.00   tombstoned                                         not counted
--   now      out    RM12.34   on another account                                 not here
-- 1,000.00 + 200.00 − 30.50 = RM1,169.50

INSERT INTO accounts (id, user_id, name, kind, notifier_package, notifier_label, opening_balance, opening_at) VALUES
  ('00000000-0000-4000-8000-0000000001b1', :b, 'Ryt Bank', 'tracked', 'my.rytbank.app', 'Ryt Bank', 100000, '2026-11-01 09:00:00+08'),
  ('00000000-0000-4000-8000-0000000001b2', :b, 'Maybank', 'elsewhere', NULL, NULL, 0, '2026-11-01 09:00:00+08'),
  ('00000000-0000-4000-8000-0000000001b3', :b, 'Old wallet', 'tracked', 'com.example.old', 'Old', 5000, '2026-11-01 09:00:00+08');
INSERT INTO transactions (id, user_id, account_id, occurred_at, direction, amount, kind, source, deleted_at) VALUES
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b1', '2026-11-01 08:59:59+08', 'out', 5000, 'spend', 'notification', NULL),
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b1', '2026-11-01 09:00:00+08', 'out', 700, 'spend', 'notification', NULL),
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b1', '2026-11-01 09:00:01+08', 'in', 20000, 'income', 'notification', NULL),
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b1', '2026-11-01 10:00:00+08', 'out', 3050, 'spend', 'notification', NULL),
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b1', '2026-11-01 11:00:00+08', 'out', 9900, 'spend', 'manual', '2026-11-01 11:05:00+08'),
  (gen_random_uuid(), :b, '00000000-0000-4000-8000-0000000001b0', now(), 'out', 1234, 'spend', 'notification', NULL);
UPDATE accounts SET archived_at = now() WHERE id = '00000000-0000-4000-8000-0000000001b3';
-- a balance is what left the account, never the person's share of it (§7, QA B08 run 1, 7)
UPDATE transactions SET my_share = 1000
  WHERE account_id = '00000000-0000-4000-8000-0000000001b1' AND occurred_at = '2026-11-01 10:00:00+08';

SELECT is(pg_temp.as_app(:b, $$SELECT format('%s %s %s', money_in, money_out, balance) FROM account_balances
  WHERE account_id = '00000000-0000-4000-8000-0000000001b1'$$),
  '20000 3050 116950', 'Ryt: RM1,000.00 + RM200.00 − RM30.50 = RM1,169.50, counting only what moved after opening');
-- Ben's TNG from the fixture: RM200.00, opened a day ago, less the fixture's RM8.00 and the RM12.34 above
SELECT is(pg_temp.as_app(:b, $$SELECT balance FROM account_balances WHERE account_id = '00000000-0000-4000-8000-0000000001b0'$$),
  '17966', 'TNG: RM200.00 − RM8.00 − RM12.34 = RM179.66');
SELECT is(pg_temp.as_app(:b, $$SELECT count(*) FROM account_balances WHERE account_id = '00000000-0000-4000-8000-0000000001b2'$$),
  '0', 'an Elsewhere account has no balance');
SELECT is(pg_temp.as_app(:b, $$SELECT format('%s %s', total, accounts) FROM balance_totals$$),
  '134916 2', 'the total: RM1,169.50 + RM179.66 = RM1,349.16, across live tracked accounts (the archived one is left out)');

-- the boundary, moved: an opening a second later leaves the 9:00:01 credit out
UPDATE accounts SET opening_at = '2026-11-01 09:00:01+08' WHERE id = '00000000-0000-4000-8000-0000000001b1';
SELECT is(pg_temp.as_app(:b, $$SELECT balance FROM account_balances WHERE account_id = '00000000-0000-4000-8000-0000000001b1'$$),
  '96950', 'a credit at the opening moment is already in the opening balance');
UPDATE accounts SET opening_at = '2026-11-01 08:59:58+08' WHERE id = '00000000-0000-4000-8000-0000000001b1';
SELECT is(pg_temp.as_app(:b, $$SELECT balance FROM account_balances WHERE account_id = '00000000-0000-4000-8000-0000000001b1'$$),
  '111250', 'an opening two seconds earlier counts the RM50.00 and RM7.00 too');

-- through the view, RLS still holds: nobody reads another's balances
SELECT is(pg_temp.as_app(:a, $$SELECT count(*) FROM account_balances WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  '0', 'Aisyah, the admin, reads none of Ben''s balances');
SELECT is(pg_temp.as_app(:a, $$SELECT count(*) FROM balance_totals WHERE user_id = '00000000-0000-4000-8000-00000000000b'$$),
  '0', 'nor his total');
SELECT is(pg_temp.as_app(NULL, $$SELECT count(*) FROM account_balances$$), '0', 'nobody signed in reads no balances');

-- ── the offline copy's versions (§5) ────────────────────────────────────────────────────────────
SELECT cmp_ok(
  pg_temp.as_app(:b, $$UPDATE user_settings SET own_names = ARRAY['BEN B', 'BEN BIN B'] WHERE user_id = '00000000-0000-4000-8000-00000000000b' RETURNING version$$)::bigint,
  '>', (SELECT max(version) FROM accounts), 'a change to your names takes the next version');

-- ── a person's removal takes their whole ledger (D98's *Remove*) ────────────────────────────────
DELETE FROM auth_user WHERE id = :b;
SELECT is((SELECT count(*)::int FROM accounts WHERE user_id = :b) + (SELECT count(*)::int FROM transactions WHERE user_id = :b)
  + (SELECT count(*)::int FROM categories WHERE user_id = :b) + (SELECT count(*)::int FROM account_names WHERE user_id = :b),
  0, 'removing a person removes their accounts, categories, names and payments');

SELECT * FROM finish();
ROLLBACK;
