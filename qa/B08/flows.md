# B08 · First run, accounts and categories: flows

Run 1, 4 Nov 2026. Written from the docs only, after `acceptance.md`, before reading the
implementation. Phone viewport 390×844, Minted light. Native steps through the dev simulator.

FLOW-1  First run, start to finish                                        (happy)
        Actor  a new person with Shell and Capture (Mei Ling on the preview seed, or the fake's `new`)
        Entry  sign-in, then first run
        Steps  1. sign in with the emailed code  2. *Step 2 of 7*: choose apps (TNG, Ryt, Public
               Bank, Grab ticked)  3. notification access, simulated granted  4. Keep Sen running
               5. accounts: four fields named from the curated list; type 128450, 50000, 0, 2390
               6. name `TAN WEI MING`  7. payday: last working day (default)  8. Home
        Ends   Home shows; four accounts with those opening balances; own_names {TAN WEI MING};
               21 categories; setup_done_at set
        Covers AC-6, AC-20, AC-22, AC-23, AC-24, AC-25, AC-26   Spec §9.5, flows `first-run`

FLOW-2  Closed at step 4, and at step 5 with a balance typed               (sad)
        Entry  first run at step 4
        Steps  1. reload  2. step 4 again  3. go to step 5, type a balance, reload
        Ends   step 5 again, with the typed balance in its field
        Covers AC-21   Spec DW 1, D146 (1)

FLOW-3  A balance left empty                                               (sad)
        Entry  step 5
        Steps  1. leave Ryt empty  2. Continue
        Ends   still step 5, a message names what's missing; nothing saved for the empty one;
               0 then accepted
        Covers AC-22s   Spec D146 (4)

FLOW-4  Access refused                                                     (sad)
        Entry  step 3
        Steps  1. *Skip for now*  2. finish the rest
        Ends   Home shows *Capture is off* with *Fix*
        Covers AC-28   Spec flows `first-run` sad

FLOW-5  Finished means finished                                            (happy)
        Entry  after FLOW-1
        Steps  1. reload  2. sign out and in again
        Ends   Home each time, never a first-run step
        Covers AC-26   Spec D26

FLOW-6  Accounts and an account                                            (happy)
        Entry  More → Accounts
        Steps  1. the list: each account's balance = its opening balance; the total = their sum
               2. open TNG: its opening balance, the app that feeds it  3. Edit the opening balance
               4. Archive, then Undo
        Ends   the new opening balance shows; opening_at unchanged; the account is back after Undo
        Covers AC-31, AC-32, AC-16   Spec screens `accounts`, `account`

FLOW-7  Settings → Categories                                              (happy + sad)
        Entry  More → Settings → Categories
        Steps  1. the list matches §8  2. rename Groceries  3. add `Pets`  4. set Pets discretionary
               5. archive Pets, Undo  6. open Unaccounted
        Ends   each change shows; Unaccounted offers no archive or flags
        Covers AC-6, AC-7, AC-8, AC-18, AC-33   Spec §8, B

FLOW-8  Settings → You                                                     (happy)
        Entry  More → Settings → You
        Steps  1. add a second name  2. set payday to day 25  3. reload
        Ends   both kept after reload, and in user_settings
        Covers AC-24, AC-25, AC-34

FLOW-9  Signed out mid-first-run; someone else signs in                     (sad)
        Entry  first run step 5 with a balance typed
        Steps  1. sign out  2. another person signs in on the same browser
        Ends   none of the first person's typed values shown
        Covers AC-21s   Spec NN real data

FLOW-10 Without Capture                                                    (sad)
        Actor  a person without Capture, in a browser
        Ends   no Accounts entry; `/api/accounts` answers 403 capture_off; first run doesn't ask
               for apps, access or balances
        Covers AC-14, AC-27, AC-31s   Spec D52, D79, D146 (2, 7)

FLOW-11 Device timezone away from KL                                       (sad)
        Entry  FLOW-1 with the browser in America/Los_Angeles
        Ends   the same balances and the same opening dates as in KL
        Covers §15 conventions

## Core journeys (D124), walked every run

FLOW-C1 `first-run` · core: FLOW-1.

FLOW-C2 `pay-new` · core
        Entry  dev panel → simulate a notification from a new merchant (RM9.50 · ROTI BAKAR 88)
        Steps  1. the prompt shows two guesses and *Scan receipt*  2. pick one
        Ends   the payment has that category; a rule exists; a second payment asks nothing.
               Built in B09/B10: walked as far as the build reaches, the rest unreachable

FLOW-C3 `scan-after` · core
        Entry  the Scan tab
        Ends   walked as far as the build reaches (B11+); the rest unreachable

## Added in phase 3, after reading the implementation (weaker evidence: written knowing the code)

FLOW-R  A lost answer while the accounts save                              (sad)
        Entry  step 5, all four typed
        Steps  1. Next; the second `account.add` reaches the server but its answer is lost
               2. Next again
        Ends   step 6, four accounts, no error: a retry is a no-op (NN dedupe)
        Covers AC-17, AC-22

FLOW-12 Offline at the accounts step                                       (sad)
        Steps  1. offline, Next  2. online, Next
        Ends   1: still step 5, a plain-words error, balances kept; 2: step 6, four accounts
        Covers AC-21, P §7 *Error*, D146 (8)

FLOW-13 An app un-chosen after its account was saved                       (sad)
        Steps  back to step 2, Grab off, forward to step 5
        Ends   three fields; what happens to Grab's live account is recorded
        Covers §7 *Accounts follow the apps you chose*

---

# Run 2 (fresh full run, 4 Nov): flows from the docs

All at 390×844, Chromium, Minted light, against the local API on `sen_test` unless marked *preview*
(the fake backend). The shell's native steps are simulated as the dev panel allows.

FLOW-R2-1  First run, the owner's whole way                                  (happy, core)
           Actor  a new person with Shell + Capture, not set up (Mei Ling-like)
           Entry  sign-in → code
           Steps  1. lands at *Step 2 of 7* (apps)  2. choose TNG, Ryt, Public Bank, Grab
                  3. access granted (simulated)  4. Keep Sen running → Continue
                  5. balances: TNG 1,2,5,0 → RM12.50; Ryt 0 → RM0.00; Public Bank 345600 → RM3,456.00;
                     Grab 999 → RM9.99  6. name TAN WEI MING  7. payday: last working day → Finish
           Ends   Home; `user_settings.setup_done_at` set; 4 live accounts with opening 1250, 0, 345600,
                  999; 21 categories; own_names {TAN WEI MING}; Accounts total RM3,478.49
           Covers R2-AC-5, 17, 21, 24, 25, 26, 27   Spec §9.5, brief

FLOW-R2-2  Closed at step 4, and at step 5 mid-typing                         (sad)
           Steps  1. reach step 4, reload → step 4  2. step 5, type a balance, reload → step 5, amount kept
           Ends   no duplicate accounts; continues to Home
           Covers R2-AC-23

FLOW-R2-3  An empty balance, then 0                                          (sad)
           Steps  1. leave one balance empty → Continue  2. type 0
           Ends   1: stays, says what's missing; 2: RM0.00 accepted, account stored with opening 0
           Covers R2-AC-24, 25

FLOW-R2-4  Steps never come back                                             (sad)
           Steps  1. after finishing, open `/first-run` directly  2. reload Home
           Ends   Home each time
           Covers R2-AC-22

FLOW-R2-5  Offline at the name step                                          (sad)
           Steps  1. at step 6 go offline  2. type name, choose payday, Finish  3. back online
           Ends   own_names saved exactly once; nothing lost
           Covers R2-AC-26

FLOW-R2-6  Accounts and Account                                              (happy)
           Entry  More → Accounts
           Steps  1. total and four accounts, each *checked* at its opening  2. open TNG
           Ends   Account shows balance, opening balance, *Touch 'n Go* as its app, an empty payments state
           Covers R2-AC-30, 31

FLOW-R2-7  Archive an account, bring it back                                 (sad)
           Steps  1. archive Grab  2. Bring back  3. archive, create a new Grab account (if possible),
                  then Bring back the old one
           Ends   2: live again; 3: refused in words
           Covers R2-AC-2, 30

FLOW-R2-8  Settings → Categories                                             (happy + sad)
           Steps  1. rename Groceries → Market  2. add *Pets*  3. flag Pets discretionary  4. archive Pets,
                  Bring back  5. try to archive Cash  6. look for Unaccounted in any picker
           Ends   DB matches each step; Cash can't be archived; Unaccounted isn't pickable
           Covers R2-AC-4, 6, 19, 33

FLOW-R2-9  Settings → You                                                    (happy)
           Steps  1. change name to add a second  2. payday → 25
           Ends   own_names has both; expected_payday 25
           Covers R2-AC-18, 34

FLOW-R2-10 Without capture                                                   (sad)
           Actor  a person with capture off
           Ends   short first run (categories, Cash locked on); no Accounts in More; /accounts 403
           Covers R2-AC-13, 29, 32

FLOW-R2-11 In another timezone (America/New_York)                            (sad)
           Ends   Accounts' dates and the total match the KL run
           Covers R2-AC-40

## Core journeys (D124), walked every run

FLOW-R2-C1 `first-run`: FLOW-R2-1 above.
FLOW-R2-C2 `pay-new`: in a preview, simulate a payment at a new merchant (ROTI BAKAR 88, RM9.50), answer the
           category prompt; the payment takes the category and the next one there asks nothing.
FLOW-R2-C3 `scan-after`: in a preview, Scan → reading → confirm → Done; it attaches to the payment.

## Added after reading the source or run 1 (weaker evidence)

FLOW-R2-5b Offline at the accounts step (run 1, finding 10)                (sad)
           Steps  1. offline at step 5, type every balance, Next  2. back online, Next
           Ends   1: stays at step 5, typing kept; 2: step 6 with four accounts, none twice
           Covers R2-AC-16, R2-AC-24

FLOW-R2-12 A category added in a browser before first run                  (sad)
           Actor  a person with Capture, signed in from a plain browser, first run not done (D146 (2))
           Steps  1. Settings → Categories  2. Add a category *Pets*  3. later, first run (/s/first-run)
           Ends   first run still seeds D33's list with Cash, Unaccounted and Salary
           Covers R2-AC-5   (written from the API probe that found `seed_categories()` seeds only for none)

---

# Run 3 (fresh full run, 10 Nov): flows from the docs, before the source

R3-FLOW-1  First run end to end in the shell (owner)                           (happy, core)
           Entry  sign in as a person who hasn't finished, shell + Capture
           Steps  1. Step 2 of 7: apps ticked  2. access (simulated grant)  3. Keep Sen running
                  4. accounts: one per chosen app, type balances (one "1,234.50", one "0")
                  5. name TAN WEI MING  6. payday default  7. Home
           Ends   Home; DB: one account per app with 123450 / 0 sen, own_names set, payday set,
                  21 categories, setup_done_at set; Accounts shows the balances typed
           Covers R3-AC-7, 15–20, 22

R3-FLOW-2  Closed mid-setup                                                    (sad)
           Steps  reach step 4 (Keep Sen running), reload; reach step 5, type a balance, reload
           Ends   reopens at step 4, then at step 5 with the balance still typed
           Covers R3-AC-19

R3-FLOW-3  Bad balances                                                        (sad)
           Steps  type "abc", "12.345", "-5", empty; press Next
           Ends   no account saved; words on screen; Next blocked
           Covers R3-AC-18.s

R3-FLOW-4  A finished person never sees first run again                        (sad)
           Steps  after FLOW-1, open /first-run directly; reload Home
           Ends   Home, not first run
           Covers R3-AC-16, 19.s

R3-FLOW-5  Accounts and an account                                             (happy)
           Steps  open Accounts; open one; back
           Ends   total = sum of tracked; opening balance and the app shown; checked = opening
           Covers R3-AC-22, 23

R3-FLOW-6  Settings → Categories                                               (happy + sad)
           Steps  rename Groceries → "Market"; add "Pets"; flag Pets discretionary; archive Pets;
                  try to archive Cash; try a duplicate name; reload
           Ends   DB matches; Cash not archivable; duplicate refused in words
           Covers R3-AC-9, 24

R3-FLOW-7  Settings → You                                                      (happy)
           Steps  add a second name; set payday to 25; reload
           Ends   user_settings own_names has both, expected_payday 25
           Covers R3-AC-25

R3-FLOW-8  The invited friend's short first run (no capture)                   (happy)
           Steps  sign in; categories with Cash locked on; switch one off; finish
           Ends   Home; no payday question; switched-off category archived
           Covers R3-AC-21

## Core journeys (D124), walked every run
R3-FLOW-9   `first-run` (= R3-FLOW-1, plus the e2e journey spec)
R3-FLOW-10  `pay-new` (dev simulator: a new merchant's prompt, a category, a rule) — in the e2e journeys
R3-FLOW-11  `scan-after` — in the e2e journeys

# Run 4 (fresh full run, 10 Nov): flows from the docs, before the source

At 390×844 in Chromium, Minted light. Native steps through the dev panel's simulator. IDs `R4-FLOW-n`.

R4-FLOW-1  First run on the phone, start to Home                                   (happy, core)
           Entry  a signed-in person before first run, shell with Capture (`?scenario=new` in a preview;
                  Mei Ling on the local API)
           Steps  1. *Step 2 of 7*: apps ticked (TNG, Ryt, Public Bank, Grab)  2. access: simulate granted
                  3. Keep Sen running  4. accounts: one field per app, TNG says *eWallet and GO+ together*;
                  type 1,2,8,4,5,0 → RM1,284.50; type 0 → RM0.00  5. name `TAN WEI MING`
                  6. payday: last working day  7. finish
           Ends   Home; Accounts lists each balance exactly; the total is their sum
           Covers R4-AC-40, 42, 43, 44, 50   Spec §9.5; flows `first-run`

R4-FLOW-2  Closed at step 4, reopened                                              (sad)
           Steps  1. reach step 4  2. reload  3. reach step 5, type a balance, reload
           Ends   step 4 shown after the first reload; step 5's typed balance kept after the second
           Covers R4-AC-41   Spec B DW1; D146 (1)

R4-FLOW-3  An empty balance, then a lost save                                      (sad)
           Steps  1. leave one balance empty, tap continue  2. fill it; the save fails (server down/offline)
           Ends   1: says what's missing, stays  2: error in words, what was typed kept; retry saves once
           Covers R4-AC-42.s, 44.s

R4-FLOW-4  Access refused                                                          (sad)
           Steps  1. at access, *Skip for now*  2. finish the rest
           Ends   Home shows *Capture is off* with *Fix*; the access step never comes back
           Covers R4-AC-45   Spec flows `first-run` *When it goes wrong*

R4-FLOW-5  A finished person never sees first run again                            (sad)
           Steps  1. finish  2. go to `/first-run`  3. reload
           Ends   Home each time
           Covers R4-AC-40.s, 44   Spec D26

R4-FLOW-6  The short first run, no Capture                                         (happy)
           Entry  a person without Capture
           Steps  categories (Cash locked on), switch one off, finish
           Ends   Home with no balances; no Accounts in More; the switched-off category archived
           Covers R4-AC-46, 50.s   Spec §9.6; D79; D147 (5)

R4-FLOW-7  Accounts and an account                                                 (happy)
           Steps  1. More → Accounts  2. open TNG
           Ends   balance, opening balance, *From Touch 'n Go*, checked at opening; figures match the view
           Covers R4-AC-50, 51

R4-FLOW-8  An app chosen later (D148)                                              (happy + sad)
           Steps  1. Settings → Capture → apps: choose another app  2. Accounts: it's under *Not added yet*
                  3. *Add* with empty balance → refused  4. type 0 → RM0.00, save
           Ends   one account for it, RM0.00, listed with the others; *Not added yet* gone
           Covers R4-AC-27   Spec D148

R4-FLOW-9  Categories in Settings                                                  (happy + sad)
           Steps  1. rename Groceries to Market  2. add *Pets*  3. add *pets* again → refused in words
                  4. set *Pets* discretionary  5. archive *Pets*, bring it back  6. try Unaccounted
           Ends   rows match each step in `categories`; Unaccounted can't be edited or picked
           Covers R4-AC-24, 52   Spec §8

R4-FLOW-10 Settings → You                                                          (happy)
           Steps  change name to add `WEI MING TAN`, payday to day 25, reload
           Ends   both kept after reload; `user_settings` holds them
           Covers R4-AC-53

R4-FLOW-11 Another timezone                                                        (sad)
           Steps  the browser in America/New_York; open Accounts and an account
           Ends   same balances and opening date as in KL
           Covers R4-AC-55

## Core journeys (D124), walked every run

R4-FLOW-C1 `first-run`: R4-FLOW-1.
R4-FLOW-C2 `pay-new`: simulate *RM9.50 · ROTI BAKAR 88*; the prompt; tap a category. Ends: the payment
           has it, a rule exists, a second payment there asks nothing. (Transactions are B09's; on a
           preview this runs on the skeleton's fake.)
R4-FLOW-C3 `scan-after`: Scan tab → confirm → *Done* → *Attached to …* with *Undo* (skeleton's fake).

## Added after reading the source (weaker evidence: written knowing the code)

R4-FLOW-12 An app's only account archived                                          (sad)
           Steps  Account → Edit → *Archive this account*; open Accounts
           Ends   one way back for the app, in words that are true
           Covers R4-AC-28, D147 (4), D148
R4-PROD    A production build (SEN_ENV=production) on the real API                 (happy)
           Steps  Settings, Categories, Accounts, an account; the short first run
           Ends   each opens with no page error; the short first run finishes
R4-AC-28.s Bring back over a newer live account: refused in words
R4-AC-41.s Sign out at step 5 with a balance typed: the next person starts at step 2, nothing typed

# Run 4, scoped (tier 2, 10 Nov): flows for the fixes

R4S-FLOW-1 The only account archived, then brought back                                (sad, happy)
           Steps  1. Ryt chosen with its account; Account → Edit → *Archive this account*
                  2. Accounts  3. *Bring back Ryt Bank*
           Ends   2: no total, no *Check balances*, no *Add Ryt Bank*, *Bring back* shown
                  3: "In 1 account", RM50.00, `opening_at` as before
           Covers R4S-AC-1, -2, -2.s
R4S-FLOW-2 One of two archived, and a third app chosen with no account                 (happy)
           Steps  Ryt and TNG with accounts, Grab chosen with none; archive Ryt; Accounts
           Ends   "In 1 account" (TNG); *Add GrabPay Wallet*; no *Add Ryt Bank*; *Bring back Ryt Bank*
           Covers R4S-AC-1.s
R4S-FLOW-3 Typed amounts while an error shows                                          (sad)
           Steps  first run step 5: *Next* empty (four errors), type into Ryt; manual entry: type 0
                  (*Type an amount above zero*); Accounts → *Add*: submit empty, then type
           Ends   every typed amount's colour is the foreground's; labels and messages red; light and dark
           Covers R4S-AC-4, -4.s
