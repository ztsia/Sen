# B08 · Security review

Claude Code's built-in security review of `git diff origin/main...HEAD` on `B08/first-run-accounts`
(D144), 4 Nov 2026, at commit `cc8cf43`. One finding pass on Opus; no candidate reached the
false-positive filter's bar (confidence 8 of 10), so none is reported.

## Findings

**None at High or Medium.**

## What was checked

- **RLS on the four new tables** (`accounts`, `account_names`, `categories`, `transactions`): on, with
  select, insert and update policies for `app_user` keyed on `app.user_id`, `WITH CHECK` on writes; no
  delete grant or policy; no other role granted. The admin has no path to anyone's money (D52).
- **References stay within one person:** every foreign key between them is `(user_id, …)` into a
  `(user_id, id)` key, `bank_events` included, so a row can't name another person's row.
- **Column grants:** `user_id`, `id`, `kind`, `system_key`, `notifier_package`, `opening_at`,
  `source`, `direction` and `currency` can't be updated by `app_user`.
- **Triggers and functions:** `sync_version_bump()` (B07's `SECURITY DEFINER`) only takes a number;
  `transactions_unaccounted_check()` and `seed_categories()` are `SECURITY INVOKER` with a pinned
  `search_path`; the seed refuses with no person set; `EXECUTE` revoked from `PUBLIC`.
- **Views:** `account_balances` and `balance_totals` are `security_invoker`, select-only.
- **API** (`apps/api/src/ledger.ts`, `routes.ts`, `sync/routes.ts`): behind the session, every
  query parameterised (no `sql.raw`), every edit locks `(me, id)` and answers 404 otherwise, an
  `onConflictDoNothing` on another's id creates only the caller's row, `/sync/changes` filtered by
  person under RLS, every input checked by zod.
- **Money:** `senFromDb` reads whole sen only, capped at MAX_SEN.
- **Preview seed:** parameterised, table names a fixed list, previews only.
- **Shell:** parameterised SQLite writes; sign-out empties the offline copy.
- **Web:** no `dangerouslySetInnerHTML`; the first-run redirect is routing only.

## Below the bar

- **Low (confidence 3):** first run's draft (`sen.firstRun` in localStorage: the balances typed but
  not saved, the name, the payday) isn't tied to a person and isn't cleared at sign-out, so on a shared
  device the next person to sign in mid-first-run would see the last one's half-typed balances. Fixed
  on the branch: `forgetSession()` clears it (see `qa/B08/ledger.md`).

## Re-review for QA run 4 (10 Nov, at `627048c`)

D144's review of what changed since `8731661` in `apps/api/src`, `packages/core/src` and the migrations (QA runs
1–3's fixes; no migration changed). **No High or Medium.**

- **The access middleware** now reads `setup_done_at` with the access row: one `LEFT JOIN user_settings` on
  `user_id`, inside `asPerson`, so RLS still bounds it; the value only feeds `/me`'s `setupDone` and the
  first-run redirect, which is routing, not a permission.
- **`GET /accounts`'s archived list:** parameterised, filtered by `(user_id = me)` under RLS, behind
  `needsCapture`; returns id and name only.
- **`account.add` on a retried id:** the name it answers with is read by `(me, id)` under RLS, so a conflict on
  an id someone else holds can't reveal their account's name.
- **`category.add`** calls `seed_categories()` first: `SECURITY INVOKER`, pinned `search_path`, refuses with no
  person set (unchanged).
- **`Name`** now refuses control and bidi-override characters: hardening, not a hole closed. Zero-width
  characters still pass (QA run 4, note 9): a look-alike name in one person's own list, no cross-person reach.
- **Money:** `typedSen` and `pastedSen` change text formatting only; amounts still reach sen through `parseSen`.
