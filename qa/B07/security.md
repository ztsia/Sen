# B07 · Security review

Claude Code's built-in security review (`/security-review`, D144) of `B07/sync` against `main`, 4 Nov,
at 0fcabfd. Claude Security's scan isn't run per slice (D144); it runs once before launch.

**No vulnerabilities at High or Medium confidence.** No finding reached confidence 8 or above, so
there was nothing for the false-positive pass to filter.

## Checked and found sound

- **Sign-in and sessions** (`apps/api/src/auth.ts`, `apps/api/src/app.ts`):
  - the bearer plugin accepts signed tokens only;
  - `set-auth-token` and `access-control-expose-headers` are removed from every `/auth/*` response,
    so page scripts never see the token and the cookie stays HttpOnly;
  - `Set-Cookie` survives the response rewrite.
- **Each person reads only their own rows:**
  - `/sync`, `/sync/changes`, `/captured` and `/capture/health` run through the session middleware
    and `asPerson`, so `app.user_id` is set per transaction and RLS applies;
  - the list routes also filter on the person's id;
  - `/captured`'s cursor is validated as an instant and a UUID before it is cast in SQL;
  - commands go through `runCommand` and keep the admin check, each in one transaction with its
    `outbox_applied` claim.
- **Migrations 0011 and 0012:**
  - every new table has RLS on `user_id`;
  - UPDATE is granted only on named columns of `bank_events` and `capture_apps`;
  - the raw-text trigger holds for every role;
  - the sync functions are SECURITY INVOKER, with a pinned `search_path`, keyed on `app.user_id`;
  - the one SECURITY DEFINER function (`sync_version_bump`) has `PUBLIC` revoked;
  - edits are whitelisted, and `linked_event_id` can't be reached;
  - event ids are UUIDv5 of the person and the server-recomputed dedupe key, so they can't be forged
    across people.
- **The shell:**
  - the token is AES-GCM encrypted with an AndroidKeyStore key, never logged, and sent only to
    `BuildConfig.SEN_URL`, with redirects off;
  - another person's sign-in empties the outbox and the chosen apps first (`SyncRun.claim`);
  - the new bridge methods return no token, and the bridge's own-site check is unchanged;
  - the outbox's SQL uses bound parameters.
- **The web app:** no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in the new code.
- **The watchdog** runs as the person and reads only their rows.

## Below the bar

- `/sync` doesn't recheck an event's app against the never-choosable list. The listener filters in
  native code before anything is stored, and a person can only write their own rows.
- A request with no `Origin` header passes the same-origin check. That predates B07, and the shell's
  sync relies on it. A cross-site page can't use it without already holding a signed token.
