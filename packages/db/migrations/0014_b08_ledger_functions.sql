-- B08's grants, triggers, views and functions (spec §7, §8, §15). RLS decides which rows; grants decide
-- which operations and columns exist. Nothing is deleted: accounts and categories are archived, and a
-- transaction gets a `deleted_at` tombstone.

GRANT SELECT, INSERT ON accounts, account_names, categories, transactions TO app_user;
--> statement-breakpoint
-- an account's app and its opening moment never change: archiving frees the app for a new account,
-- and correcting the opening balance keeps the moment it was seen (D145)
GRANT UPDATE (name, notifier_label, opening_balance, archived_at, updated_at) ON accounts TO app_user;
--> statement-breakpoint
GRANT UPDATE (account_id) ON account_names TO app_user;
--> statement-breakpoint
-- a category's kind and system key never change: code relies on them (§15)
GRANT UPDATE (name, is_discretionary, is_meal, is_beverage, position, archived_at, updated_at) ON categories TO app_user;
--> statement-breakpoint
-- what later slices edit on a payment; its id, person, event, source, direction and currency stay
GRANT UPDATE (account_id, occurred_at, amount, kind, merchant_raw, merchant_key, category_id, my_share, status,
              updated_at, deleted_at) ON transactions TO app_user;
--> statement-breakpoint

-- What the phone keeps offline is ordered by B07's one counter (§5): categories, accounts, the names
-- apps print for them, and your names (user_settings).
CREATE TRIGGER accounts_version BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION sync_version_bump();
--> statement-breakpoint
CREATE TRIGGER account_names_version BEFORE INSERT OR UPDATE ON account_names
FOR EACH ROW EXECUTE FUNCTION sync_version_bump();
--> statement-breakpoint
CREATE TRIGGER categories_version BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION sync_version_bump();
--> statement-breakpoint
CREATE TRIGGER user_settings_version BEFORE INSERT OR UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION sync_version_bump();
--> statement-breakpoint

-- *Unaccounted* is a balance check's alone (§7, §8): it can never be picked by hand, and a balance
-- check's adjustment goes nowhere else. Checked here so no route, job or agent tool can get round it.
CREATE FUNCTION transactions_unaccounted_check() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT system_key INTO k FROM categories WHERE user_id = NEW.user_id AND id = NEW.category_id;
  END IF;
  IF k = 'unaccounted' AND NEW.kind <> 'adjustment' THEN
    RAISE EXCEPTION 'Unaccounted can''t be picked: only a balance check books to it' USING ERRCODE = '23514';
  END IF;
  IF NEW.kind = 'adjustment' AND k IS DISTINCT FROM 'unaccounted' THEN
    RAISE EXCEPTION 'a balance check''s adjustment is always Unaccounted' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER transactions_unaccounted_check BEFORE INSERT OR UPDATE OF category_id, kind ON transactions
FOR EACH ROW EXECUTE FUNCTION transactions_unaccounted_check();
--> statement-breakpoint

-- Balance (§7) = opening balance + money in − money out, counting only what moved after the account's
-- `opening_at`: the opening balance already holds everything up to that moment, so a payment captured
-- during setup isn't counted twice. Tracked accounts only; an Elsewhere account shows no balance.
-- `sum` of bigint is numeric, so the casts back fail loudly rather than wrap. Rows still in a phone's
-- outbox are added on the phone (B13).
CREATE VIEW account_balances WITH (security_invoker = true) AS
SELECT
  a.user_id,
  a.id AS account_id,
  a.opening_balance,
  a.opening_at,
  a.archived_at,
  coalesce(sum(t.amount) FILTER (WHERE t.direction = 'in'), 0)::bigint AS money_in,
  coalesce(sum(t.amount) FILTER (WHERE t.direction = 'out'), 0)::bigint AS money_out,
  (a.opening_balance
    + coalesce(sum(t.amount) FILTER (WHERE t.direction = 'in'), 0)
    - coalesce(sum(t.amount) FILTER (WHERE t.direction = 'out'), 0))::bigint AS balance
FROM accounts a
LEFT JOIN transactions t
  ON t.user_id = a.user_id AND t.account_id = a.id AND t.deleted_at IS NULL AND t.occurred_at > a.opening_at
WHERE a.kind = 'tracked'
GROUP BY a.user_id, a.id;
--> statement-breakpoint
-- The total across your live tracked accounts (§7).
CREATE VIEW balance_totals WITH (security_invoker = true) AS
SELECT user_id, sum(balance)::bigint AS total, count(*)::int AS accounts
FROM account_balances
WHERE archived_at IS NULL
GROUP BY user_id;
--> statement-breakpoint
GRANT SELECT ON account_balances, balance_totals TO app_user;
--> statement-breakpoint

-- The starting categories (§8, D33): 18 for spending and 3 for money in, with their flags and system
-- keys, for the person the request runs as. Only once: someone who already has categories (renamed,
-- archived or added) gets nothing new. Two calls at once can both find none; the unique names and
-- system keys make the second insert nothing. Answers how many it added.
CREATE FUNCTION seed_categories() RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := nullif(current_setting('app.user_id', true), '')::uuid;
  n integer;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'nobody is signed in' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM categories WHERE user_id = me) THEN
    RETURN 0;
  END IF;
  INSERT INTO categories (id, user_id, name, kind, is_meal, is_beverage, is_discretionary, system_key, position)
  SELECT gen_random_uuid(), me, s.name, s.kind, s.meal, s.drink, s.disc, s.key, s.pos
  FROM (VALUES
    (1, 'Meals', 'spend', true, false, false, NULL),
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
    (21, 'Other income', 'income', false, false, false, NULL)
  ) AS s(pos, name, kind, meal, drink, disc, key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION seed_categories() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION seed_categories() TO app_user;
