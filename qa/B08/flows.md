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
