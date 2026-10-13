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

---

# Run 2 flows (written from the docs before the code was read)

Actor is the owner (Wei Ming, made-up) unless said. Entry is the web app at 390x844 on the preview build
with the made-up scenario; screens are named by id (`docs/screens.md`). Each step has an assertion and a
screenshot. "Sad" flows check the failure fails the right way.

R2-FLOW-1  The daily glance fits one screen                      (happy)
        Entry  Home, each of the six looks, light and dark
        Steps  1. load Home  2. measure the scroll container  3. tap the large figure (cycle sheet)
               4. close it  5. tap the payday strip (if shown)
        Ends   no scroll on Home in all 12 combinations; the cycle sheet shows in, spent, left as tiles and a
               labelled estimate
        Covers R2-AC-6, 7, 11, 42   Spec  B home, S home/cycle

R2-FLOW-2  Home still fits when it has more to say               (sad)
        Entry  Home with a health warning, with the payday plan active, with a card to act on
        Steps  1. load each variant  2. measure scroll
        Ends   no scroll, or the overflow is named and justified; nothing clipped
        Covers R2-AC-6   Spec  B home "e2e asserts no scroll in every look"

R2-FLOW-3  Answer a Review question                                (happy)
        Entry  Review tab
        Steps  1. see groups with icon headers and counts  2. tap Sen's pick on a category card
               3. the card clears and a toast offers Undo  4. Undo  5. answer, then double-tap quickly
               6. scroll the answers row sideways  7. Apply all
        Ends   group counts fall by one then return; the badge follows; the double tap answers one item only;
               the answers row is 32 px chips in one line
        Covers R2-AC-8, 2, 4   Spec  S review, P tap guard

R2-FLOW-4  Review with nothing to do and with an item that opens a screen   (sad)
        Entry  Review, empty scenario; Review with a claim due, a balance check due, a skipped payday step
        Steps  1. empty: "Nothing needs you."  2. claim due: tap opens claim  3. balance check opens
               balance-check  4. skipped payday step continues payday
        Ends   each lands on the right screen with Back returning to Review
        Covers R2-AC-8, 12   Spec  S review

R2-FLOW-5  Insights, one card at a time                            (happy)
        Entry  Insights tab
        Steps  1. read named steps and the position  2. tap Budgets  3. swipe to the next  4. keyboard arrow
               5. "Ask Sen about this"  6. open Budgets then Back  7. open The year
        Ends   exactly one card visible at a time, no peek; position text follows; Sen opens with the card's question
        Covers R2-AC-9   Spec  S insights

R2-FLOW-6  Insights with a card that has no data                   (sad)
        Entry  Insights, scenario/state with no subscriptions (or empty)
        Steps  1. load  2. read steps and count
        Ends   the empty card's step is absent and the position count matches the cards shown
        Covers R2-AC-9   Spec  S insights

R2-FLOW-7  Find a payment and fix it (txn)                         (happy)
        Entry  More -> Payments
        Steps  1. search the payee  2. open a row  3. read header, facts, actions  4. change category (chip)
               5. Copy the amount  6. menu -> Mark as... then Undo  7. menu -> Delete, then Undo
        Ends   the row is in its list again after Undo; the payee shown in title case; stored text visible in
               "What the bank said"
        Covers R2-AC-3, 5, 17, 21, 37   Spec  S txn, F fix

R2-FLOW-8  Payments search that finds nothing, and a long merchant   (sad)
        Entry  Payments
        Steps  1. search "zzzz"  2. clear  3. look at a row with a long merchant name at 1.5x text
        Ends   Empty state with an icon; the amount is never truncated
        Covers R2-AC-3, 17, 41   Spec  P §3

R2-FLOW-9  Enter a payment by hand                                  (happy)
        Entry  Scan long-press / Review "Missing a payment?" -> manual
        Steps  1. type 19.99  2. choose a category tile  3. open More details  4. Save  5. Undo
        Ends   a payment of exactly 1999 sen exists, then is gone after Undo; the tab bar was hidden
        Covers R2-AC-14, 43   Spec  S manual

R2-FLOW-10 Bad amounts in manual and balance-check                  (sad)
        Entry  manual; balance-check
        Steps  1. try "", "0", "abc", "1.234", "1e3", "-5", "12.5.5", "9999999999999999999"
        Ends   each is rejected with a message in words or normalised to sen exactly; nothing saved; the form
               keeps what was typed
        Covers R2-AC-14, 20, 44   Spec  P Forms

R2-FLOW-11 Check balances                                           (happy)
        Entry  More -> Accounts -> Check balances (and payday step 2)
        Steps  1. see a card per account  2. type the matching figure  3. see Matches  4. type a different
               figure  5. see the difference  6. Save
        Ends   a difference books as Unaccounted; the accounts list shows "Checked <date>"
        Covers R2-AC-18, 19, 20   Spec  S accounts

R2-FLOW-12 Scan a receipt after paying (core scan-after)            (happy)
        Entry  Scan tab (browser: file picker then crop)
        Steps  1. scan tips + main action  2. choose a file  3. crop (four corners)  4. reading
               5. confirm: items, totals, people stepper  6. Done  7. toast "Attached to ... " with Undo
        Ends   the receipt is attached; items add up to the total; the meal average is exact
        Covers R2-AC-15, 16, 51   Spec  F scan-after

R2-FLOW-13 Receipt sad paths                                         (sad)
        Entry  scan-after variants
        Steps  1. reading fails -> manual with the image  2. the same file twice -> Already added  3. no
               payment yet -> waits in Review  4. total differs  5. missing-receipt states
        Ends   each state uses the Empty block or a toast as specified, and the image is never lost
        Covers R2-AC-16, 40   Spec  F scan-after "When it goes wrong"

R2-FLOW-14 New merchant (core pay-new)                               (happy)
        Entry  dev tools: simulate an incoming "9.50 · ROTI BAKAR 88"
        Steps  1. the category prompt/Review question appears  2. choose a category  3. see the rule created
               4. simulate a second from the same merchant
        Ends   the first is categorised; the second is categorised with no question; one rule exists
               (visible in Settings -> Categories -> Rules, with its origin)
        Covers R2-AC-8, 31, 51   Spec  F pay-new

R2-FLOW-15 New merchant swiped away                                  (sad)
        Entry  as above, ignore the prompt
        Steps  1. ignore  2. open Review
        Ends   the payment waits in Review under Categories, and a second new merchant does not duplicate it
        Covers R2-AC-8, 51   Spec  F pay-new "When it goes wrong"

R2-FLOW-16 First run (core)                                          (happy)
        Entry  first-run
        Steps  1. sign in (email, code)  2. choose apps  3. access  4. keep running  5. accounts
               6. your name  7. payday  8. Home
        Ends   Home reads "Spent since you started"; one field and one main action on each step; no tab bar
        Covers R2-AC-36, 33, 43, 51   Spec  F first-run

R2-FLOW-17 First run sad paths                                       (sad)
        Entry  sign-in, first-run
        Steps  1. a wrong code  2. an expired code  3. an unknown email  4. access refused -> Skip for now
               5. close mid-setup and reopen
        Ends   messages as in S sign-in; Home shows "Capture is off" with Fix; setup reopens at the same step
        Covers R2-AC-36, 51   Spec  F first-run

R2-FLOW-18 Shared bill, from the owner's side                        (happy)
        Entry  More -> Shared bills
        Steps  1. Open/Settled segmented  2. open a bill  3. status card in words  4. people list  5. Share
               sheet shows the QR  6. items  7. mark a friend paid (ticked by you)
        Ends   the status moves toward Final; the QR is not on the page itself
        Covers R2-AC-22, 23   Spec  S split, F split-mine

R2-FLOW-19 Friend's public split                                      (happy+sad)
        Entry  split-public link (no login)
        Steps  1. header with the payer  2. tick my items  3. sticky "I'm done"  4. after the lock: read-only
               5. a closed link
        Ends   "Your share so far" updates; closed link says "This split is closed" only
        Covers R2-AC-24, 43   Spec  S split-public

R2-FLOW-20 Claims                                                      (happy)
        Entry  More -> Claims
        Steps  1. month summary cards with bars  2. open a claim  3. stepper and evidence  4. Copy a value
               5. Submitted  6. Download pack in the app bar
        Ends   the claim moves to Sent; the status icon changes; main action count is one
        Covers R2-AC-25, 26   Spec  S claims

R2-FLOW-21 Claims off / no capture / agent off                         (sad)
        Entry  variants with each switch off
        Steps  1. More  2. Settings
        Ends   the related rows and sections are absent, not disabled
        Covers R2-AC-10, 18, 29   Spec  S rules (D52)

R2-FLOW-22 Budgets, subscriptions, goals, the year                     (happy)
        Entry  Insights steps
        Steps  1. budgets at risk  2. add a budget from the app bar  3. subscriptions' history expand
               4. goals ring, open a goal  5. year
        Ends   each has its primary thing first; progress bars named; at-risk budget says so in words
        Covers R2-AC-27, 41   Spec  S budgets...

R2-FLOW-23 Sen: memory, research, usage                                 (happy+sad)
        Entry  Sen button -> header menu
        Steps  1. What Sen remembers  2. Forget a note, Undo  3. Research cards  4. Usage tiles and bar
               5. offline: "Sen needs a connection"
        Ends   notes restored by Undo; usage figures only from the scenario (no model-made numbers)
        Covers R2-AC-28, 46   Spec  S sen

R2-FLOW-24 Settings tour                                                (happy)
        Entry  More -> Settings
        Steps  1. profile card + groups  2. Appearance: mode, quarter switch, pick a look, reload
               3. Categories/Rules  4. Claims schemes and ESS  5. Capture and its three steps  6. You
               7. Email  8. Sen  9. Members -> a member screen  10. Data  11. Account
        Ends   every row shows its state; choices persist across reload; each screen has a back path
        Covers R2-AC-29..36   Spec  S Settings

R2-FLOW-25 Settings destructive actions                                  (sad)
        Entry  Account, Members, Claims settings
        Steps  1. Sign out  2. Delete account -> dialog, cancel  3. Remove member  4. Forget ESS password
        Ends   destructive actions are in destructive style, behind confirmation or Undo; nothing is deleted
               by one stray tap
        Covers R2-AC-32, 34, 35   Spec  P Sheets and dialogs

R2-FLOW-26 Appearance across looks and modes                             (happy)
        Entry  Settings -> Appearance
        Steps  1. each of six looks  2. light, dark, system  3. quarter switch
        Ends   the whole app (Home, Review, Insights, More) shows the new look; reload keeps it
        Covers R2-AC-30, 42   Spec  S Settings

R2-FLOW-27 Time zone                                                      (sad)
        Entry  Playwright timezone America/Los_Angeles, then Pacific/Auckland
        Steps  1. Home days to go  2. Payments day headers  3. txn time
        Ends   identical to the KL run
        Covers R2-AC-45   Spec  CLAUDE.md conventions

R2-FLOW-28 Offline                                                         (sad)
        Entry  context.setOffline(true)
        Steps  1. banner  2. make a change (answer a Review question)  3. reload  4. back online
        Ends   the change shows as Not synced yet, survives reload, syncs once (or the fake says so)
        Covers R2-AC-46   Spec  F offline

R2-FLOW-29 Text scale and accessibility                                    (sad)
        Entry  font scale 1.5x (CSS zoom on html font-size), axe
        Steps  1. Home, Review, txn, More, Settings  2. axe scan
        Ends   nothing clipped, amounts wrap before truncate, no serious axe issue
        Covers R2-AC-41, 4   Spec  P §8

R2-FLOW-30 Production build hygiene                                        (sad)
        Entry  pnpm build output served; hostile query strings
        Steps  1. no dev panel  2. ?scenario=<script> ?state=../../  3. grep the bundle for secrets
        Ends   no dev tools, no injection, no secret
        Covers R2-AC-47, 48   Spec  CLAUDE.md

## Core journeys (appended every run)

R2-FLOW-C1 first-run (core): same as R2-FLOW-16 and 17.
R2-FLOW-C2 pay-new (core): same as R2-FLOW-14 and 15.
R2-FLOW-C3 scan-after (core): same as R2-FLOW-12 and 13.
