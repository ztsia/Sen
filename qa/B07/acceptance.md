# B07 · Sync and the outbox: acceptance criteria

Run 1, 3 Nov 2026. Written from the docs only, before reading the implementation: the brief
(`docs/briefs/B07-sync.md`), `spec_v2.md` §5, §5.1, §6.2, §6.5, §9.6, §15, §16, §18, decisions D22,
D52, D86, D100, D143, `docs/ui/patterns.md` §7, `docs/flows.md` (`capture-off`, `offline`,
`lost-phone`, the core journeys) and `docs/screens.md`. Sources are cited as § (spec), D (decision),
B (brief done-when number), P (patterns).

Every criterion names an observable. *Sad* twins check that the failure fails the right way.

## Ids

AC-1  An event's id is derived, the same in the API and the shell
      Given  one person's id and one dedupe key
      When   the id is derived in TypeScript (`@sen/db`) and in Kotlin (`Ids.kt`)
      Then   both give the identical UUID string, a version-5 UUID
      Spec   §5 *Sync can't duplicate*, §15 *Key decisions*, D143 (1)

AC-1s Two people, one dedupe key
      Given  user A and user B each send an event with the same dedupe key
      When   both sync
      Then   two `bank_events` rows exist, with different ids, one per person; neither is refused
      Spec   D143 (1)

AC-2  A transaction's id comes from its event's id and an index
      Then   index 0 and index 1 give different UUIDs, each stable across calls
      Spec   brief *Ids*, §15

AC-3  The server recomputes the dedupe key and the id
      Given  an event whose `dedupe_key` (or `id`) doesn't match its package, key, `when` and text
      When   it is sent to `/sync`
      Then   it is refused, item by item, with a structured code; no `bank_events` row
      Sad of AC-4. Spec D143 (1)

## /sync: idempotent batches

AC-4  The same event twice (a retry, a replay, a reinstall)
      Given  an event already stored
      When   the same batch is posted again (and again as part of a different batch)
      Then   `bank_events` has exactly one row for it, unchanged
      Spec   §5, §6.5, B2

AC-4s Two genuine identical payments a few minutes apart
      Given  two events identical except for `when`
      Then   two `bank_events` rows
      Spec   §6.2 *Dedupe key*

AC-5  The dedupe key's fields are length-prefixed
      Given  title "ab", text "c" and title "a", text "bc", same package, key and `when`
      Then   two different dedupe keys, two rows
      Spec   §6.2 (D115)

AC-6  Raw columns are immutable
      When   `UPDATE bank_events SET text = …` (and title, big_text, package, notification_key,
             notified_at, posted_at, dedupe_key) is run as the API's role, and as the owner role
      Then   it fails; the row is unchanged
AC-6s Status columns stay writable
      When   `parse_status` (and `parsed`, `parsed_by`, `linked_event_id`) is updated
      Then   it succeeds
      Spec   brief *The server*, §6.2 *Raw text is stored first*, B3

AC-7  A tombstone can't be revived by a stale phone
      Given  a synced row (a `capture_apps` choice) that has been removed (`deleted_at` set)
      When   a stale phone re-sends its upsert under the same id
      Then   the row's `deleted_at` stays set and no live row for it reappears
      Spec   §5, §15, D143 (4), B3

AC-8  A field edit applies only its changed fields
      Given  a row whose field X the server changed after the phone read it
      When   the phone sends an edit of field Y only
      Then   Y has the phone's value and X keeps the server's
      Spec   §5, §6.5, B3

AC-9  A command or an edit applies once, by its id
      Given  edit E (id e1) applied, then a later change from another device
      When   E is re-sent with id e1
      Then   the later change stands; `outbox_applied` has one row for e1
      Spec   D143 (3)

AC-10 One malformed item is refused alone
      Given  a batch of three events, the middle one malformed
      Then   two rows stored; the answer names the bad item with `{ code, message }`
      Spec   D143 (2)

AC-10s A malformed body
      When   the body isn't JSON, isn't an object, or has no batch
      Then   400 with `{ code, message }`, never a 500 or a stack trace
      Spec   `docs/workflow/qa.md` *Routes*

AC-11 The *Capture* switch off
      Given  the person's `capture` feature is off, `shell` on
      When   a batch holding events and other items is synced
      Then   the events are refused with code `capture_off`, no `bank_events` row is added, and the
             non-event items are applied
AC-11s Capture on: the same batch is accepted
      Spec   §9.6, D143 (6), B7

AC-12 `/sync` needs the *Shell* switch: with it off, the call is refused with a structured code and
      nothing is written. Spec D143 (6)

AC-13 Signed out: `/sync` answers 401 with `{ code, message }`; nothing written. Spec §5

## Isolation (D52)

AC-14 Person B reads and writes none of A's sync rows
      Then   with `app.user_id` set to B, zero of A's rows in `bank_events`, `capture_apps`,
             `device_heartbeats`, `outbox_applied`; an insert or update naming A's `user_id` fails;
             B syncing A's event id cannot touch A's row
      Spec   CLAUDE.md non-negotiable, §15

AC-15 No user id set: zero rows from every new table. Spec §5

AC-16 The admin never sees anyone's chosen apps or captured events through the API's role
      Spec   §6.2, §9.6, D86

## The offline copy, synced down

AC-17 One endpoint returns what changed since a version, per kind
      Given  the person's `capture_apps` at version v
      When   the shell asks for changes since v, after one choice and one removal
      Then   exactly those two rows come back (the removal as a tombstone), with a new version;
             asking again with the new version returns none
AC-17s Another person's choices never come back. Spec brief *The server*, §5 *What the phone keeps*

AC-18 `capture_apps` keeps one live choice per app
      Then   a second live row for the same (person, package) is impossible; choosing again after a
             removal is a new row
      Spec   §15 `UNIQUE (user_id, package) WHERE deleted_at IS NULL`, D143 (4)

## Health

AC-19 A heartbeat is recorded on each sync, with the server's clock
      Then   a `device_heartbeats` row with `listener_connected`, `access` and `app_version`, its
             `created_at` the server's time even when the phone's clock is wrong
      Spec   §15, D143 (7)

AC-20 The watchdog, 24 hours without a heartbeat
      Given  capture on, the last heartbeat 25 h ago (a fake clock)
      When   the morning job runs, twice that day
      Then   one push *Capture may be off*; `alerts_sent` has one row for that day
AC-20b The watchdog, 48 hours without a bank event, with fresh heartbeats: the same push
AC-20s No push: capture off; or a shell that has never synced; or heartbeat and an event recent
      Spec   §6.2 *Health*, §18, brief *Health*, D143 (7), B5

AC-20c The listener stopped, as the phone reports it              (added in phase 4, from B5)
      Given  capture on; notification access revoked (or the listener killed) after a payment
             yesterday evening; the shell's daily sync still reports `access: false` /
             `listenerConnected: false`
      When   the next morning's job runs
      Then   one push *Capture may be off* (the brief's phone check: "revoking access for a day")
      Spec   brief *Done when* 5, `docs/local.md` B07 step 3, `flows.md` `capture-off` 1
      Note   Written after reading the shell's heartbeat code, so weaker evidence than the rest: it
             was missed in phase 1, though the brief states it.

AC-21 Each sync returns when the morning job last ran
      Spec   brief *The 26-hour check*, §18

AC-22 The 26-hour check fires: last run 27 h ago → the shell posts its notification and Home warns;
      25 h ago → neither
      Spec   §18, B6

AC-23 Home shows *Capture is off* with *Fix* when the listener isn't connected or access is off,
      as a warning bar at the top; *Fix* opens the right Android setting
AC-23s Capture healthy: no warning on Home
      Spec   brief *Health*, `screens.md` `home` 2, P §7 health warnings, `flows.md` `capture-off`

## The shell's session and the bridge

AC-24 Sign-in never hands page scripts the session token: the sign-in response the browser sees
      carries no `set-auth-token` header. Spec D143 (5)

AC-25 A bearer token works for `/sync`; an unsigned or forged one is refused (401). Spec D143 (5)

AC-26 *Sign out everywhere* from a browser kills the shell's session: the shell's bearer token is
      refused by `/sync` afterwards. Spec brief *The session*, B8

AC-27 The phone's outbox belongs to one person: a second person's session on that phone empties the
      outbox before anything is sent; none of the first person's events reach the second's account
      Spec   D143 (8), D52

## The web app's writes

AC-28 A browser write is optimistic
      When   a setting is changed in a browser
      Then   it shows at once; on the API's failure it reverts and a toast offers *Retry*; *Retry*
             succeeds and the value stays
      Spec   brief *The browser*, D100, B4

AC-29 *Not synced yet* only while offline or after 5 seconds
      Then   a pending write online shows no mark before 5 s; offline it shows at once
      Spec   P §7 *Offline*, §5

AC-30 *Captured on this phone* is a view of the server's `bank_events`: raw text, newest first;
      rows still on the phone first, marked *Not synced yet*; only the person's own
      Spec   brief *The soak's events*, `screens.md` capture screens

AC-31 Times on *Captured on this phone* are Kuala Lumpur's, whatever the browser's timezone
      Spec   CLAUDE.md *Conventions*

## `/match`

AC-32 `/match` exists as an empty frame: signed in, it answers 2xx, twice the same; signed out 401
      Spec   brief *The server*, §16

## Non-negotiables this slice touches

AC-33 No float on any money path in the diff (`parseFloat`, `toFixed`, `Number(` on amounts). Blocker.
AC-34 RLS on every new table from its first migration, keyed on `user_id`; the API's role can't bypass it.
AC-35 Every input has a dedupe key: events (dedupe key), commands and edits (their id), choices
      (their id). A retried sync is a no-op.
AC-36 No real financial data in the diff's fixtures and seeds (anonymised: made-up names, amounts).
AC-37 The built app holds no secret or token.
AC-38 One set of UI patterns: the new warnings and the *Captured* list use the shared blocks.

---

## Run 2 (scoped, 4 Nov 2026): capture's health and *Captured on this phone*'s paging

Area: capture's health, from the shell's heartbeat to the watchdog's push and Home's warning
(spec §6.2 *Health*), and the paging of `GET /captured`. Fixes re-checked: run 1's findings 1–6, and
the eyes pass's `capture-off/3` and `settings/capture/captured`. Commits 683376e..b31cc31. Written by
the resumed run 1 reviewer, after reading the fix commits, so these criteria are the fixes' own claims
plus the sad paths they open.

R2-AC-1  Access off, as the phone reports it
         Given  capture on; the newest heartbeat says `access: false`
         When   Home opens in a browser, and the morning job runs (twice that day)
         Then   Home: *Capture is off*, with words saying the phone reports it; one push whose words
                name access; one `alerts_sent` row
R2-AC-1s Access back: a newer heartbeat with access and the listener connected → no warning, no push
         Spec   §6.2 *Health*, B5, run 1 finding 1

R2-AC-2  The listener off with access on, daily syncs still arriving
         Then   no push at 23 h since the listener's last connected heartbeat; one push at 25 h; the
                push's and Home's words say the listener is off, not that the phone went quiet
         Spec   §6.2, flows.md `capture-off` 1

R2-AC-3  No false alarm after a fix: Capture switched back on after days off, or access granted again
         Given  heartbeats saying the listener is off for the days *Capture* was off
         When   the switch comes back on, and the morning job runs before any payment arrives
         Then   no push saying capture may be off, once the listener has in fact bound
         Spec   §6.2, §9.6 (the switch), D98

R2-AC-4  Each watchdog rule has a test that fails alone: the 24 h heartbeat rule (23 h vs 25 h, an
         event an hour ago) and the 48 h event rule (47 h vs 49 h)
         Spec   run 1 finding 2; the mutant `b07-heartbeat-window` is killed

R2-AC-5  Paging holds every event: 51 events at one posted time → 51 across two pages; events with a
         sub-millisecond posted time → none lost; a malformed cursor → 400 `{ code, message }`
R2-AC-5s An old-style cursor (a bare instant), `_` tricks, an over-long cursor → 400, never a 500
         Spec   run 1 finding 3, brief *The soak's events*

R2-AC-6  The phone's clock can't silence or fake the watchdog
         Then   events stamped a year ahead, 3 quiet days → one push; a phone clock 3 days behind,
                with events arriving daily → no push
         Spec   D143 (7), run 1 finding 4

R2-AC-7  At most one push a day: two ticks in one KL day at different instants → one; the next day
         → one more
         Spec   brief *Health*, run 1 finding 5

R2-AC-8  B07's breakage checks exist and are killed: every `b07-*` entry in `qa/mutants.ts`
         Spec   D139, run 1 finding 6

R2-AC-9  One fact, one wording: the push stand-in, the server's push and Home's banner say the same
         thing for the same state, and the banner's date doesn't break mid-date
         Spec   eyes `capture-off/3` (wrong), `home@capture-off` (look again)

R2-AC-10 *Captured on this phone*'s intro says what the screen shows: amounts visible, other numbers
         hidden; it makes no claim the screen contradicts
         Spec   eyes `settings/capture/captured`, D121
