# B06 · flows

## Run 1 (25 Oct 2026, full run)

Written from the docs only, before reading the implementation. Phone viewport 390×844, Minted
light (docs/workflow/qa.md).

```
FLOW-1  A change on one device updates an open screen on another          (happy)
        Actor  the owner, two browser contexts signed in as the same person
        Entry  a screen open in context A; a change made in context B
        Steps  1. open the same screen in A and B  2. in B, make a change (or post a hint
               through the relay)  3. watch A, no reload
        Ends   A shows the change within seconds, without a navigation or reload
        Covers AC-28..AC-32   Spec D100, brief done-when 2

FLOW-2  The relay is down                                                   (sad)
        Entry  a screen open, the relay unreachable
        Steps  1. the relay drops  2. wait  3. a change made elsewhere
        Ends   "Updated … ago" shows in muted; the change arrives within 30 s; when the relay
               returns, the stamp goes and polling stops
        Covers AC-34, AC-35   Spec patterns §7, §18

FLOW-3  Return to the app reloads                                          (happy)
        Steps  1. hide the page (visibilitychange)  2. change data  3. show the page
        Ends   the screen has the change
        Covers AC-36

FLOW-4  The admin checks the backup and storage                             (happy)
        Actor  the admin (Wei Ming)
        Entry  /s/settings/data
        Steps  1. open Settings → Data
        Ends   the last successful backup (date and time, KL), storage used of 10 GB, Checks
        Covers AC-41, AC-43

FLOW-5  A friend opens Settings → Data                                      (sad)
        Actor  a non-admin member
        Ends   Export everything only; no backup, storage or Checks
        Covers AC-42

FLOW-6  The admin sends test pushes                                         (happy, then sad)
        Steps  1. Checks → Send a test push, three times  2. a fourth time
        Ends   three accepted; the fourth refused in plain words; the button never takes a
               second tap while its request is on its way
        Covers AC-38

FLOW-7  The admin schedules a test job                                      (happy)
        Steps  1. Checks → Schedule a test job  2. tick the API a minute later (twice, at once)
        Ends   one scheduled_jobs row; done after the tick; one job_runs row
        Covers AC-17, AC-39

FLOW-8  The scheduler's tick, by API                                        (happy + sad)
        Steps  1. no secret → refused  2. with secret at 07:30 KL → morning once  3. again →
               no-op  4. /health/jobs fresh → 2xx  5. morning 27 h old → non-2xx
        Covers AC-13..AC-24
```

### Core journeys (D124), walked every run

```
CORE-1  first-run   sign-in → choose apps → access → keep running → accounts → name → payday → home
CORE-2  pay-new     the category prompt for ROTI BAKAR 88 → a category → a rule; the next payment asks nothing
CORE-3  scan-after  scan → reading → confirm → Done → attached
```
Walked through the project's own e2e journeys in the sweep (they're the regression suite for these),
plus a screenshot walk in `qa/e2e/` where the build lets them run in a browser.
