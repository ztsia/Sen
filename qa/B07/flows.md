# B07 · Sync and the outbox: flows

Run 1, 3 Nov 2026. From the docs only (see `acceptance.md`). The phone's own parts (the listener,
WorkManager, Keystore) can't run in a cloud session; their flows are walked through the API (as the
shell calls it) and through the dev panel's simulator in the web app at 390×844, in Minted light.

FLOW-1  A captured event syncs once, through a retry and a replay            (happy + sad)
        Actor  the shell, as the owner (bearer session)
        Entry  `POST /api/sync` with one event
        Steps  1. post the batch  2. post the identical batch again (a lost answer)
               3. post it inside a batch with a second, genuinely new event (a reinstall's replay)
        Ends   `bank_events` holds 2 rows for the person; the first unchanged
        Covers AC-1, AC-4, AC-4s, AC-35   Spec §5, §6.5

FLOW-2  A malformed and a mismatched item in one batch                        (sad)
        Entry  `POST /api/sync`: a good event, an event with a wrong dedupe key, a broken item
        Ends   one row stored; two items refused, each named with `{ code, message }`
        Covers AC-3, AC-10, AC-10s   Spec D143 (1), (2)

FLOW-3  *Capture* off, then on                                               (sad → happy)
        Entry  the owner's `capture` feature off, `/sync` with an event and a chosen app
        Steps  1. sync: events refused `capture_off`, the app choice applied
               2. switch capture on; sync the same batch
        Ends   one `bank_events` row only after step 2; one live `capture_apps` row
        Covers AC-11, AC-11s, AC-12   Spec §9.6

FLOW-4  Choosing, removing and re-choosing an app, with a stale phone          (sad)
        Entry  `/sync` with capture-app items, then the pull-down endpoint
        Steps  1. choose TNG (id c1)  2. remove c1  3. a stale phone re-sends c1's choice
               4. choose TNG again (id c2)  5. pull changes since the first version
        Ends   c1 stays a tombstone; c2 is the only live row; the pull returns c1's tombstone and c2
        Covers AC-7, AC-17, AC-18   Spec §15, D143 (4)

FLOW-5  Person B's sync never touches person A's rows                          (sad)
        Entry  two signed-in people
        Steps  1. A syncs an event  2. B syncs the same text  3. B pulls; B lists *Captured*
        Ends   two rows, one each; B sees only B's
        Covers AC-1s, AC-14, AC-17s, AC-30   Spec D52

FLOW-6  The watchdog with a fake clock                                         (sad)
        Entry  the morning job, run through `/jobs/tick` or its function, with a set clock
        Steps  1. heartbeat 25 h old, capture on → tick  2. tick again the same day
               3. capture off → tick the next day  4. never-synced person → tick
        Ends   exactly one *Capture may be off* push and one `alerts_sent` row, for step 1 only
        Covers AC-19, AC-20, AC-20b, AC-20s   Spec §6.2 *Health*, §18

FLOW-7  Home's *Capture is off*                                               (sad)
        Entry  web app, dev panel: the listener disconnected (or `?state=` for it)
        Steps  1. open Home  2. read the warning  3. tap *Fix*
        Ends   the warning bar at Home's top reads *Capture is off* with *Fix*; *Fix* asks the
               shell (simulated) to open notification access
        Covers AC-23, AC-23s, AC-38   Spec `screens.md` `home`, `flows.md` `capture-off`

FLOW-8  A setting changed in a browser, failing then retried                   (sad → happy)
        Entry  web app against the API (or the fake with a failing write)
        Steps  1. change a setting  2. the API refuses  3. tap *Retry* on the toast
        Ends   the value reverts at step 2 and stands after step 3; the database holds it
        Covers AC-28, AC-29   Spec D100, B4

FLOW-9  *Captured on this phone* from the server                               (happy)
        Entry  Settings → Capture → *Captured on this phone*
        Steps  1. open with server events  2. simulate a capture not yet synced  3. wait 5 s
        Ends   the server's events, newest first, raw text; the outbox's row first, marked *Not
               synced yet* only after 5 s; times in KL in another browser timezone
        Covers AC-29, AC-30, AC-31

FLOW-10 *Sign out everywhere* from a browser signs the shell out              (sad)
        Entry  a bearer session (the shell) and a cookie session (the browser), one person
        Steps  1. the bearer syncs  2. the browser signs out everywhere  3. the bearer syncs again
        Ends   step 3 answers 401
        Covers AC-24, AC-25, AC-26   Spec brief *The session*, B8

## Core journeys (D124), walked every run

CORE-first-run  `first-run`: sign in, choose your apps, notification access, Keep Sen running,
                accounts, name, payday, Home (flows.md *First run*)
CORE-pay-new    `pay-new`: the category prompt for a new merchant, a category, a rule
CORE-scan-after `scan-after`: scan, reading, confirm, Done, attached
