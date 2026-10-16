# B05 · Server, database and sign-in: QA report (run 1, full, tier 3, Opus)

Published: https://claude.ai/artifact/AzAyheGoaGbcR68PSDJWdz (screenshots for FLOW-4, 8 and 15 were retaken after the fixes, when QA's specs re-ran)

```
VERDICT   fix first
          78 criteria, 69 pass, 9 fail, 0 not reachable
          phases run: 1-6      screenshots: 61
```

The database holds: every RLS attack was refused; sign-in, sign out and sign out everywhere work end
to end. Four Majors stand (no test pins production's random codes; pgTAP can't see a weak UPDATE
`WITH CHECK`; a signed-in person opening Sen offline lands on sign-in; three wrong codes lock a
person into a *Send a new code* loop), and a fifth: malformed JSON gets a 500, not a 400.
AC-64 and AC-65 were added in phase 5, after the code was read, and are marked so.

## Suites

| Suite | Result |
|---|---|
| unit | 320/320 |
| database | pgTAP 98/98, API 18/18 |
| typecheck, lint, hygiene | clean (DENYLIST unset in a session) |
| `e2e:server` | 1/1 |
| `pnpm e2e` | 1386/1387: `redesign-pins.spec.ts:208` (tap guard) failed under QA's own CPU load, 5/5 alone |
| `qa/e2e/b05-*.spec.ts` | 23 run, 20 pass; the 3 red are findings 3, 4 and 10 |

Diff report: one changed screen, `settings/account` (the email row and *Sign out everywhere*). No
check findings. `reading` unexplored, unchanged since B04.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Nothing tests that production refuses the fixed code 123456 | `fixedCode = true` in `apps/api/src/auth.ts`, `pnpm test:db`: all green | AC-52, §17 |
| 2 | Major | pgTAP can't see a weak UPDATE `WITH CHECK` | `user_settings_own_update` `WITH CHECK (user_id is not null)`: `rls.sql` green | AC-4, Done-when 2 |
| 3 | Major | Signed in but offline, opening Sen lands on sign-in | FLOW-10c, `b05-offline.spec.ts` | AC-64, §5.1 |
| 4 | Major | After 3 wrong codes, the new code is refused with *Send a new code* again | FLOW-4 | AC-42, screens.md |
| 5 | Major | Malformed JSON, an empty body or `PATCH {}` returns 500 | `--data-binary 'not json'` | AC-21s, §16 |
| 6 | Minor | Code sends limited per IP only; the 429 has no `code`; invitation lookups unthrottled | 12 sends a minute on the preview | AC-28s, §17 |
| 7 | Minor | A retried write adds an audit row and moves `updated_at` | the same `setting.set` twice | AC-23 |
| 8 | Minor | `/api/admin/members` returns stored partial switches, not MemberRow's seven | GET as the admin | brief |
| 9 | Minor | Account and sign-in drift from patterns.md | Account; sign-in offline | AC-63, patterns §7 |
| 10 | Minor | A suspended person signs in and nothing says so | FLOW-15 | AC-65, §9.6 |
| 11 | Note | Audit before/after use Drizzle's camelCase keys, not column names | `select before from audit_log` | §15 |
| 12 | Note | first-run, opened signed in, asks to sign in again (B08's) | CORE-1 | flows.md |
| 13 | Note | Every signed-out load calls `/api/me` and logs a 401 | console | — |
| 14 | Note | Any preview's admin is one public email and code away (made-up data) | `weiming@example.com` / `123456` | §17 |
| 15 | Note | Emails unique case-sensitively in pending invitations | `PEND@` beside `pend@` | §15 |
| 16 | Note | The function's runtime holds the owner's `DATABASE_URL` (used only to build role URLs) | `env.ts` | §17 |
| 17 | Note | The switch is `email`, not `email_receipts`; nothing checks the keys | `user_access.features` | §15 |

### Detail

1. `createAuth` sends `123456` unless `target === 'production'`. The API tests run as production but
   their mailer records whatever is sent, so a server always sending `123456` passes. Today's code is
   right (a production-target app sent 221323, 800570, 937721).
2. *Can't give its own row to someone else* uses `UPDATE … WHERE user_id = me`; a WHERE naming a
   column makes Postgres check the new row against the SELECT policy, which refuses it whatever the
   UPDATE policy's `WITH CHECK` says. `update user_settings set user_id=C` with no WHERE succeeds
   under the weak policy. Fix the test: move the row with an UPDATE whose WHERE names no owner column.
3. The gate in `router.tsx` treats a failed `get-session` as signed out. Back online the person stays
   on sign-in; two offline banners stack and disagree. Screenshot `FLOW-10c-step-1-offline-open.png`.
4. Better Auth allows 3 sign-in attempts a minute per client; every 429 shows *That code has had too
   many tries. Send a new code.*, and the new code is refused the same way for the rest of the
   minute, while each send uses the 3-a-minute send limit.
5. `POST /api/commands` with `not json` or an empty body → 500 (`SyntaxError`); resource `PATCH {}` on
   a table without `updated_at` → 500 (`No values to set`). No stack leaks.
6. Through the session's rotating egress, 12 code requests to one address in a minute all got 200 on
   the preview; locally 200 200 200 429 429, body without `code`. Behind Vite's proxy Better Auth
   warned it couldn't find a client IP and fell back to one shared bucket.
7. Audit rows 4 → 6 after two identical commands; `updated_at` moved.
8. `[{"switches":{"capture":true}}, …]`: `/settings` fills all seven, this passes stored JSON through.
9. Account's Email row (information) leads with an icon tile; Sign out and Sign out everywhere are
   actions drawn as chevron rows; sign-in's submit is disabled offline (patterns: enabled, say what's
   missing); two banners offline; the dialog's cancel reads *Keep it*. Eyes pass: `settings/account`
   *wrong* for this drift.
10. The API answers 403 `suspended`; the web app ignores it and shows its (made-up) screens.

## Probes (phase 3)

| What was broken | Caught? |
|---|---|
| `auth.ts`: `fixedCode = true` | **No** (finding 1) |
| UPDATE `WITH CHECK (true)` | Yes: catalogue.sql |
| UPDATE `WITH CHECK (user_id is not null)` | **No** (finding 2) |
| `db.ts`: `set_config(…, false)` | Yes: api.test.ts |
| user_access: UPDATE grant + own-row policy | Yes: rls.sql |
| `admin_members()` without its admin check | Yes: admin.sql |
| the invitation-only guard removed | Yes: api.test.ts |
| `member.*`'s admin check removed | Yes: api.test.ts |

## The RLS matrix (QA's database, every cell queried)

| Table | No user id | A (admin) | B | sen_auth | Owner |
|---|---|---|---|---|---|
| user_access, user_settings, invitations, audit_log | 0 rows | a only | b only | denied | a,b |
| auth_user, auth_session, auth_verification, auth_rate_limit | denied | denied | denied | all | all |
| `admin_members()` | 42501 | 2 rows | 42501 | denied | — |

Self-escalation on `user_access` denied; audit update/delete denied; `row_security = off` errors;
`DISABLE RLS` *must be owner*; `SET ROLE` to any other role denied; on one pooled `app_user`
connection the setting reads empty between transactions.

## Not tested, and why
- Sign-in in production and `X-Robots-Tag` on a production response: production deploys only from
  `main`. Proved on the live preview and a local production-target API.
- Q14: needs the owner's mailboxes (queued in docs/local.md).
- That no preview can reach production: Vercel's environment scoping isn't visible from a session.
- Spoofing `x-forwarded-for` past the per-IP limit: the session's egress IP rotates.
- The sweep and eyes pass as separate helpers: the reviewer had no Agent tool, ran the sweep as a
  script and the eyes pass itself on 4 of 12 look-and-mode pairs. A later run should repeat it.
- A long email in Account's value slot. The shell's session (B07).
