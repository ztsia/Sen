# B04 · Redesign: flows

Run 1. Written from the brief, `docs/flows.md`, `docs/screens.md` and `patterns.md` before source was
read. Viewport 390x844 (and 412x915 for one pass). The app runs on the in-browser fake; native parts go
through the dev panel. Each step is asserted, then screenshotted.

FLOW-1  Home fits (happy)
        Actor owner   Entry  `/` in each of the six looks, light and dark
        Steps 1. open Home  2. measure scroll height vs viewport  3. tap Sen's note "More"
              4. tap the payday strip (if shown)
        Ends  no document scroll in all 12 combinations; note expands; strip opens `payday`
        Covers AC-11, AC-12, AC-45   Spec brief `home`

FLOW-2  Home under pressure (sad)
        Entry `/?scenario=...` with the payday plan active, a health warning, long note
        Steps 1. open Home  2. measure  3. look for clipped text
        Ends  still fits, or the overflow is only the allowed extra; nothing clipped
        Covers AC-11s, AC-12s

FLOW-3  Review: answer, undo, double tap (happy + sad)
        Entry  Review tab
        Steps 1. grouped headers with counts  2. chips are 32 px, one sideways row  3. tap Sen's pick
              4. toast + Undo  5. Undo -> item returns, badge count back  6. double-tap a chip within 300 ms
        Ends  one answer recorded; badge = sum of Needs-you items
        Covers AC-13, AC-13s, AC-1  Spec patterns "One change per double tap"

FLOW-4  Insights pager (happy / sad)
        Entry  Insights tab
        Steps 1. steps on top, "1 of N"  2. tap "Budgets"  3. swipe sideways  4. keyboard Tab/arrow to a step
              5. empty-data variant: a no-data card is absent and N shrinks
        Ends  the page and the step marker always agree
        Covers AC-14, AC-14s

FLOW-5  Settings tour (happy)
        Entry  More -> Settings
        Steps 1. profile card, GroupCards with states  2. open Appearance  3. pick another look
              4. switch Mode to Dark  5. back to Settings: Appearance row state shows the new look
        Ends  exactly one look chosen; state on the row follows
        Covers AC-2, AC-3, AC-5, AC-5s, AC-6, AC-6s, AC-33

FLOW-6  Payment detail and its actions (happy / sad)
        Entry  Payments -> a row
        Steps 1. HeaderCard, FactGrid, ActionBar  2. Category chip -> sheet -> choose "Just this one"
              3. ⋯ -> Delete  4. toast Undo  5. Undo -> same payment returns
        Ends  payment restored, totals unchanged
        Covers AC-4, AC-4s, AC-24, AC-24s

FLOW-7  More hub states (happy)
        Entry  More tab
        Steps 1. NavRows with states  2. log a manual payment  3. return: Payments count +1
        Ends  state derived, not static
        Covers AC-5, AC-5s

FLOW-8  Manual entry (happy / sad)
        Entry  Review -> Missing a payment?
        Steps 1. type 0.1  2. type 12.345  3. type abc  4. pick a category tile  5. open Paid from
              6. Save
        Ends  row exists in sen exactly; bad inputs are refused in words
        Covers AC-18, AC-18s, AC-47

FLOW-9  Split a bill (happy / sad)
        Entry  Scan -> confirm -> Split (or Shared -> a bill)
        Steps 1. PersonRows, status card  2. Share sheet holds the QR  3. tick items as the payer
              4. tick the 3-way item -> 7.00/7.00/6.99  5. split-public: tick, I'm done
        Ends  split Final only when everyone is done and every item is claimed
        Covers AC-25, AC-26, AC-26s, AC-27, AC-27s

FLOW-10 Claims (happy / sad)
        Entry  More -> Claims
        Steps 1. month summary card with bar  2. open a claim  3. stepper + evidence grid
              4. Send to ESS  5. Settings -> Claims -> ESS card -> ⋯ -> Forget password
        Ends  one main action; no real claim values anywhere
        Covers AC-28, AC-29, AC-35, AC-35s

FLOW-11 Members and the admin's blindness (happy / sad)
        Entry  Settings -> Members
        Steps 1. seats meter, PersonRows  2. open a member (pushed screen)  3. flip an access switch
              4. Back  5. Remove -> Undo
        Ends  nothing about the member's money anywhere
        Covers AC-8, AC-8s, AC-40, AC-40s

FLOW-12 Categories and rules (happy)
        Entry  Settings -> Categories
        Steps 1. grid of hue tiles  2. tap a tile -> sheet  3. Segmented -> Rules  4. sentence cards
        Ends  category names present on every tile; rules show their origin
        Covers AC-10, AC-34, AC-34s

FLOW-13 Capture setup (happy / sad)
        Entry  Settings -> Capture
        Steps 1. status card + 3-step checklist  2. Your apps  3. search a messaging app (cannot be chosen)
              4. Access  5. Keep running
        Ends  no messaging/SMS/email app selectable
        Covers AC-36, AC-36s

FLOW-14 Balance check (happy / sad)
        Entry  Accounts -> Check balances
        Steps 1. cards per account  2. type 100.10 vs Sen has 100.00  3. Matches on another  4. Save
        Ends  difference shown exactly in sen
        Covers AC-22, AC-23, AC-23s

FLOW-15 Budgets, subscriptions, goals, year (happy / sad)
        Entry  Insights steps / More
        Steps 1. budget cards  2. over-budget bar + words  3. subscriptions history expand
              4. goal ring  5. year savings tile with no-income variant
        Ends  no NaN/Infinity; warning has words
        Covers AC-30, AC-30s, AC-31, AC-31s

FLOW-16 Sen's memory / research / usage (happy)
        Entry  Sen sheet -> Memory
        Steps 1. note cards  2. Forget (labelled) -> Undo  3. usage stacked bar  4. research badges
        Ends  Forget undone
        Covers AC-32, AC-32s

FLOW-17 Empty states (sad)
        Entry  `?state=empty` on lists
        Steps 1. each empty list/receipt screen  2. check icon/title/line/button
        Ends  EmptyState everywhere; button works
        Covers AC-9, AC-9s, AC-20s, AC-21s

FLOW-18 Offline (sad)
        Entry  Review
        Steps 1. context offline  2. answer an item  3. wait 6 s: "Not synced yet" + banner
              4. reload  5. online
        Ends  synced exactly once
        Covers AC-51, AC-51s

FLOW-19 Timezone (sad)
        Entry  Home/Payments with tz America/Los_Angeles, Pacific/Auckland
        Ends  same totals and day headers as KL
        Covers AC-50, AC-50s

FLOW-20 Sizes and accessibility sweep (sad)
        Entry  all redesigned routes
        Steps 1. unnamed buttons  2. targets < 48  3. horizontal overflow  4. text scaled 1.5x
        Ends  none, or listed as findings
        Covers AC-44, AC-45, AC-46, AC-54

FLOW-21 Production build (sad)
        Entry  `pnpm build` output, previewed
        Steps 1. grep for secrets/dev  2. `/dev/gallery` and `?scenario=`
        Ends  none reachable
        Covers AC-52

## Core journeys (docs/flows.md, D124)

FLOW-C1 First run (`first-run`) · core   (happy)
        Entry  fresh storage, sign-in
        Steps 1. sign-in: email, 6-digit code  2. choose apps  3. notification access  4. keep running
              5. accounts  6. name  7. payday rule  8. Home
        Ends  Home shown; "Spent since you started"
        Covers AC-42, AC-37, AC-36, AC-49   Spec docs/flows.md `first-run`

FLOW-C1s First run, wrong code (sad)
        Steps 1. wrong code  2. "Send a new code"  3. close mid-setup and reopen
        Ends  message in words; same step on reopen

FLOW-C2 New merchant (`pay-new`) · core   (happy)
        Entry  dev panel: simulate a payment at a new merchant
        Steps 1. category prompt: two guesses + Scan receipt  2. choose a category  3. a rule is made
        Ends  payment categorised; rule visible in Settings -> Categories -> Rules
        Covers AC-34, AC-49

FLOW-C2s New merchant: swiped away
        Steps 1. dismiss the prompt  2. it waits in Review  3. a second new merchant replaces the first
        Ends  first waits in Review

FLOW-C3 Scan after paying (`scan-after`) · core   (happy)
        Entry  Scan tab
        Steps 1. scan: tips, Take a photo  2. crop  3. reading  4. confirm: items, totals, people +/-
              5. Done  6. "Attached to ... on Ryt" + Undo
        Ends  receipt attached; totals in sen
        Covers AC-19, AC-20, AC-49

FLOW-C3s Scan: reading fails / same file twice
        Ends  manual with the image kept; "Already added"
