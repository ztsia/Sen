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

## Run 2 (25 Oct 2026, full run at 3c7005a)

Written from the docs before reading the implementation. Walked at 390×844 in Chromium, Minted light.

```
FLOW-R2-1  A one-off test job, a minute ahead, two ticks at once            (happy + sad)
           Actor  the owner (admin)   Entry  POST /api/jobs/test, then POST /api/jobs/tick x2 at once
           Steps  1. schedule the test job  2. before run_at, tick: nothing runs
                  3. after run_at, two ticks at once  4. a third tick
           Ends   exactly one job_runs row for the test job, status ok; scheduled_jobs status done,
                  attempts 1
           Covers R2-AC-14..17, R2-AC-38   Spec  done-when 1, D99, D141

FLOW-R2-2  An open screen updates from another device                          (happy)
           Actor  the owner on two devices   Entry  the same screen open in two browser contexts
           Steps  1. both open Home  2. device B makes a change through the API
           Ends   device A shows the change with no reload and no navigation
           Covers R2-AC-28, R2-AC-29   Spec  done-when 2, D100

FLOW-R2-3  The relay is down                                                   (sad)
           Actor  the owner   Entry  Home with the relay unreachable
           Steps  1. the relay is stopped  2. wait  3. a change on another device  4. relay back
           Ends   "Updated N min ago" in muted while down; the change shows within 30 s; the stamp
                  goes once the relay is back
           Covers R2-AC-31..33   Spec  D100, patterns §7

FLOW-R2-4  The admin's Settings > Data                                         (happy)
           Actor  the owner (admin)   Entry  /s/settings/data
           Steps  1. open Data  2. read the last backup and storage  3. Send a test push
                  4. Schedule a test job
           Ends   the last backup time and storage used of 10 GB shown; each check confirms in words
           Covers R2-AC-45, R2-AC-46, R2-AC-38   Spec  screens.md Data, D142 (3)-(4)

FLOW-R2-5  A member's Settings > Data                                          (sad)
           Actor  a member (not admin)   Entry  /s/settings/data
           Ends   no backup, storage or Checks section; the test routes answer 403
           Covers R2-AC-38, R2-AC-45, R2-AC-53

FLOW-R2-6  A lost phone                                                        (sad)
           Actor  the owner from another browser   Entry  Settings > Account
           Steps  1. two phones registered push tokens  2. Sign out everywhere
           Ends   push_tokens has none of the owner's rows; the lost phone's session is revoked
           Covers R2-AC-35, R2-AC-36   Spec  flows.md lost-phone, D142 (5)

FLOW-R2-7  The scheduler stops                                                 (sad)
           Actor  the outside monitor   Entry  GET /api/health/jobs
           Steps  1. a fresh morning run and backup: 200  2. the morning run 27 h old: fails
                  3. the backup 3 days old (a failed one yesterday): fails
           Ends   non-2xx with no data in the body
           Covers R2-AC-39..43   Spec  done-when 5, §18

Core journeys (D124), walked once in the preview build through the dev panel:
FLOW-R2-8   first-run   (core)  sign-in to home, through the dev panel's first run
FLOW-R2-9   pay-new     (core)  a new merchant's prompt; a category; a rule; the next asks nothing
FLOW-R2-10  scan-after  (core)  scan, reading, confirm, Done, attached
```
