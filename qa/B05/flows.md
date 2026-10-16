# B05 · Server, database and sign-in: flows

## Run 1 (full, 15 Oct)

Written from the docs only, before any source. Walked in Chromium at 390×844, Minted light, against the
local API on QA's own database (`sen_qa`) unless a flow says otherwise.

```
FLOW-1  The owner signs in by code                                         (happy)
        Actor  the owner (seeded, admin)
        Entry  `/` with no session
        Steps  1. `sign-in` shows (not home)  2. type the email, continue
               3. the code step  4. type the right code
        Ends   `home` shows; one auth_session row for the owner; Settings → Account shows the email
        Covers AC-40, AC-43, AC-47   Spec  screens.md `sign-in`, D13

FLOW-2  A wrong code, then a right one                                     (sad)
        Entry  `sign-in`, code step
        Steps  1. type 000000  2. the wrong-code message shows, still on the code step
               3. type the right code
        Ends   signed in; no session row made by the wrong attempt
        Covers AC-40s   Spec  flows.md first-run (*Wrong or expired code*)

FLOW-3  An email nobody invited                                            (sad)
        Entry  `sign-in`
        Steps  1. type stranger@example.com, continue
        Ends   *Sen is invitation-only*; auth_user count unchanged
        Covers AC-41   Spec  flows.md `invited`, §5.1

FLOW-4  An expired / used-up code, then *Send a new code*                  (sad)
        Entry  `sign-in`, code step
        Steps  1. exhaust the tries with wrong codes (or expire the code in the database)
               2. the right code is refused with a message  3. *Send a new code*  4. the new code works
        Ends   signed in
        Covers AC-42, AC-42s   Spec  screens.md `sign-in`

FLOW-5  Deep link while signed out                                         (sad)
        Entry  `/settings/account`, `/more`, `/insights` with no session
        Ends   `sign-in` each time; no RM figure rendered
        Covers AC-43

FLOW-6  Sign out                                                           (happy)
        Entry  Settings → Account, signed in
        Steps  1. *Sign out*
        Ends   `sign-in`; reload stays there; this session's row deleted; a second browser still signed in
        Covers AC-44, AC-44s

FLOW-7  A lost phone: sign out everywhere from another browser             (happy)
        Actor  the owner with two browser contexts signed in
        Entry  browser 1: Settings → Account
        Steps  1. *Sign out everywhere*  2. the confirm dialog  3. confirm
               4. browser 2 navigates / reloads
        Ends   both on `sign-in`; auth_session rows for the owner = 0; member B's sessions unchanged
        Covers AC-45, AC-45s, AC-46   Spec  flows.md `lost-phone`, §17 Login

FLOW-8  Sign out everywhere, cancelled                                     (sad)
        Steps  1. *Sign out everywhere*  2. *Cancel*
        Ends   still signed in; session count unchanged
        Covers AC-46s

FLOW-9  A member is refused the admin's routes                             (sad)
        Actor  member B, signed in by code
        Entry  the API with B's cookie
        Steps  1. GET /api/admin/members  2. a member.* command
        Ends   403 `{code,message}` both; owner gets 200 on the first
        Covers AC-25

FLOW-10 Offline on the sign-in screen                                      (sad)
        Steps  1. go offline  2. ask for a code
        Ends   a message saying a connection is needed; nothing crashes; online again works
        Covers AC-63s   Spec  flows.md `offline` (*signing in needs a connection, and say so*)

FLOW-11 A different timezone                                               (sad)
        Entry  browser timezone America/Los_Angeles, signed in
        Ends   sign-in and Account work the same (B05 has no dated money; noted)
```

## Core journeys (docs/flows.md, D124)

```
CORE-1  first-run                                                          (happy)
        Entry  a fresh app, signed out
        Steps  1. sign-in by code (real since B05)  2. the rest of first run is B08's: walk as far as the
               app offers it
        Ends   `home` after sign-in; the remaining steps noted as not built

CORE-2  pay-new                                                            (happy)
        Entry  dev panel → simulate a payment at a new merchant (preview build, fake capture)
        Steps  1. the category prompt / Review row  2. pick a category
        Ends   the payment takes the category; noted where it's still the skeleton's fake

CORE-3  scan-after                                                         (happy)
        Entry  Scan tab
        Steps  1. scan (dev stand-in)  2. reading → confirm  3. Done
        Ends   attached to a payment, on the skeleton's fake
```

## Added during phase 5

```
FLOW-4b An expired code, then *Send a new code*                            (sad)   Covers AC-42
FLOW-10b A signed-in browser reloaded offline (service worker blocked)      (sad)   Covers AC-64
FLOW-10c Signed in, the app opened offline with the service worker on       (sad)   Covers AC-64
        Ends   the asked-for screen (Review), not `sign-in`
FLOW-12 Settings → You saved on the server, with its audit row             (happy) Covers AC-21, AC-24
FLOW-13 The production build with the API: sign in, Account, nothing made up (happy) Covers AC-40, AC-52
FLOW-14 A session expired on the server                                     (sad)   Covers AC-43s
FLOW-15 A suspended person signs in                                         (sad)   Covers AC-65
FLOW-16 Signed in, the `sign-in` address                                    (note)
FLOW-17 *Sign out* while offline                                            (sad)   Covers AC-63s
```

## Run 2 (full, tier 3, 15 Oct)

Docs only, before any source in this run. Run 1's flows (FLOW-1 to FLOW-17 and the core journeys)
are walked again through QA's committed specs `qa/e2e/b05-*.spec.ts`; these are added.

```
FLOW-20 A mixed-case email signs in to the same person                     (sad)
        Entry  `sign-in`, signed out
        Steps  1. type WeiMing@Example.COM, continue  2. the code step  3. the right code
        Ends   `home`; auth_user count unchanged; Account shows the one email
        Covers AC-71

FLOW-21 A suspended person with a live session                              (sad)
        Actor  member B, signed in; then suspended in the database
        Steps  1. B reloads `home`  2. B is told their access is paused  3. B asks for a code again
        Ends   no screen of B's data; sign-in says paused; no new session row
        Covers AC-72   Spec  §9.6

FLOW-22 Undo a change in Settings → You                                     (happy)
        Steps  1. change the payday  2. the toast's *Undo*
        Ends   the payday as before, in the database; two audit rows (the change, the undo)
        Covers AC-74   Spec  §6.7

FLOW-23 Signed in, offline, then online                                      (sad)
        Steps  1. signed in at `home`  2. offline, reload  3. home or the offline shell, not sign-in
               4. online, Settings → Account still shows the email
        Covers AC-77
```

### Added during run 2's phase 5

```
FLOW-24 A browser offline on Settings → You                                 (sad)   Covers AC-77
        Ends   the loaded payday still shows, read-only (flows.md offline: in a browser, offline is read-only)
FLOW-25 The sign-in form, as patterns.md §7 Forms says                       (sad)   Covers AC-47
        Ends   the email field is focused on open
FLOW-26 A long email on Settings → Account                                   (sad)   Covers AC-80
        Ends   the whole 70-character address readable inside the card
```
