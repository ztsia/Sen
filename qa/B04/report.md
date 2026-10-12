# B04 · QA report, run 2 (scoped re-check)

**VERDICT: fix first (small)**

Area: the fixes in commit `851cbd0` for run 1's findings 1, 2, 3, 5, 6, 9, 10, 11, 12 (welcome credit and email only), 15, 17 and 19. Left out on purpose and not re-checked: findings 4, 7, 8, 13, 14, 16, 18 and the rest of 12. Run 1 is in `report-run1.md` and `results-run1.json`. Nothing here reaches beyond the area; the fixes touch `useWrite` (every write), so I also ran the journeys: no full run needed.

Suites: unit 289/289, typecheck clean, lint clean (after I fixed two unused names in my own new specs), e2e on the preview build 131 passed (journeys and the guided journeys, minted light and dark).

## Re-check

| # | Finding | Status |
|---|---|---|
| 1 | A double tap on any B04 action replaces the toast with the no-op's message, and Undo then does nothing | **fixed** |
| 2 | Nothing tests that a split must not lock while an item is unclaimed on the public page, and the app-side rule is caught only by a browser journey | **fixed** |
| 3 | A closed public link returning the real merchant and total is not caught by any test | **fixed** |
| 5 | With the agent switch off, Sen's button still shows | **fixed** |
| 6 | The friend scenario (`month`) shows owner-only things, and a switched-off feature still opens by URL | **fixed** |
| 9 | Made-up claims and payday data contradict each other | **fixed** |
| 10 | `claim` and `account` with no id hang on Loading | **fixed** |
| 11 | The shared command schemas (`packages/core/src/commands.ts`) accept hostile input, and `balance.check` can double-book | **fixed** |
| 12 | Members: invite and member sheets lack what §9.6 lists | **open** (email half still loose) |
| 15 | *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard | **open** (half) |
| 17 | Canned Sen replies sound like analysis | **fixed** |
| 19 | Scanning the same file twice does not say Already added | **fixed** |

New findings: 20 (Minor), 21 (Minor), 22 (Note).

## Evidence per finding

### 1 · fixed · A double tap on any B04 action replaces the toast with the no-op's message, and Undo then does nothing

Re-run: double-tap "I've paid" gives one toast "Marked as paid to Mei\nUndo", paid 1, Undo -> paid 0 and "You owe" shows again; Submitted dbl -> "Phone bill marked as submitted\nUndo", status after Undo to_submit; Everyone, Lock without waiting and Sen Apply: one toast each, Undo reverts (Final -> Still changing; Apply visible again). A deliberate repeat after the settle time still goes through.

### 2 · fixed · Nothing tests that a split must not lock while an item is unclaimed on the public page, and the app-side rule is caught only by a browser journey

Probes re-run: public `lockIfReady` without the claimed check -> 1 failed (everyone done with an item nobody ticked stays still changing (D71): expected 'final' to be 'changing'); app `maybeLock` without it -> 1 failed (same test, in the app). Both were green in run 1.

### 3 · fixed · A closed public link returning the real merchant and total is not caught by any test

Probes re-run: closed view with real merchant/total -> red; with real payer -> red; with a non-zero yourShare -> red. Leftover: the closed view still returns `at` (the bill's date), untested and hidden by the screen (finding 22).

### 5 · fixed · With the agent switch off, Sen's button still shows

A scenario with the agent off (made by rewriting the served variants.ts so `month` builds with db.agent = false, no source edit): Ask Sen buttons on Home, Review, Insights, More = 0; Settings has no Sen row; control with the agent on: 1.

### 6 · fixed · The friend scenario (`month`) shows owner-only things, and a switched-off feature still opens by URL

Friend scenario: Settings lists no Members, Data shows no Last backup, Settings -> Sen shows Balance RM6.40 and allowance RM1.10 of RM2.00; /s/settings/members says "Only the admin sees Members."; /s/claims shows the empty state; /s/claim?id=<real id> says "This claim isn't here any more."; owner scenario unchanged (Members, Claims, full list). Leftovers in findings 22.

### 9 · fixed · Made-up claims and payday data contradict each other

Settings -> Claims: Phone bill "up to RM100.00, by day 25", Parking "up to RM100.00, by day 20", matching the claims' caps and "Submit by 25 Oct / 20 Oct". Payday scenario: September claims are Approved, so "Sen split RM152.00" is coherent. Leftovers in findings 21.

### 10 · fixed · `claim` and `account` with no id hang on Loading

19 routes with a missing, empty or wrong id: claim, account, split, txn, receipt, goal, confirm, reading all say it's gone (or a pick-one line); none hang; split-public says "This split is closed".

### 11 · fixed · The shared command schemas (`packages/core/src/commands.ts`) accept hostile input, and `balance.check` can double-book

Schema probes: 255+ char email, 4001-char Sen text, 61-char friend name, balance.check with 0, 51 or duplicate rows, a grant of 9e15, a 65-char essRef, a 101-char key, a 2001-char setting string: all rejected; boundaries (254, 4000, 60) accepted. The fake refuses a duplicate balance check ("Each account once.", 0 adjustments, balance unchanged) and a second grant past the range (balance 9000000000340, safe). Leftovers in finding 20.

### 12 · open · Members: invite and member sheets lack what §9.6 lists

Only the welcome credit and the email check were in scope. Welcome credit now defaults to 10.00 (fixed). `<script>@x.co` and `a@b.c` are refused (fixed). Still accepted: `a..b@x.co`, `a@-b.co`, and a 312-char email (finding 20). The rest of this finding (Unlimited at invite, Resend/Revoke, export offer) is left open on purpose.

### 15 · open · *Send to ESS* is offered with no shell check, and *Copy* puts `RM88.00` on the clipboard

Copy is fixed: the Amount row is now "Amount (RM)" and copies 88.00, 64.00, 88.00, 72.00 (and 1284.50-style amounts have no comma or RM). The other half, Send to ESS offered with no shell check, is not changed: /s/claims in a browser preview still shows Send to ESS. Status: half fixed.

### 17 · fixed · Canned Sen replies sound like analysis

The default reply now reads "That's a made-up answer: Sen's real replies arrive in B27." for "What is my salary?", "Hello" and the savings question. Leftovers: any text with "rate" or "card" ("Is my savings rate good?") still gets "I can look that up for you. It would take a minute, and I'd show you every source.", and "Ask about a category or a day to see how one reads" returns the same made-up text.

### 19 · fixed · Scanning the same file twice does not say Already added

Choosing the same bytes again (same name, renamed, or from the gallery) stays on Scan with the toast "Already added" at once; different bytes go to confirm; an unfinished draft can be re-scanned; after Undo of Done the same file is accepted again.

### New

#### 20 · Minor · Fixed schemas leave gaps, and the UI takes what they now refuse

`setting.set` still accepts a 50,000-key record, and `sen.answer` (askId, answer), `proposal.answer` id, `memory.forget` id and `research.confirm` messageId accept 100k-character strings. The Sen composer takes 5000 characters (the schema stops at 4000) and the invite sheet takes a 312-character email (the schema stops at 254), so once B05 parses these, the person gets a raw refusal; the fake doesn't parse, so nothing shows today. Emails `a..b@x.co` and `a@-b.co` pass the UI check.

**Repro:** qa/e2e/b04-r2-cmd.spec.ts, b04-r2-fake.spec.ts

```
setting.set huge record: ACCEPTED ; sen.answer 100k answer: ACCEPTED ; proposal.answer 100k id: ACCEPTED ; memory.forget 100k id: ACCEPTED ; research.confirm 100k: ACCEPTED
composer value length after fill(5000): 5000
EMAIL "xxxxxxxxxxxxxxxx" (len 312) => ACCEPTED ; EMAIL "a..b@x.co" => ACCEPTED
```

#### 21 · Minor · Payday scenario: an Approved claim still says its evidence is missing, and Send to ESS stays

In the payday scenario both September claims are Approved, but Parking still reads "Receipt for 21 Sep not added yet", the page still says "A claim with evidence missing waits until you've added it" and offers Send to ESS with nothing left to send. Home also still reads Left until payday RM5,800.00 although the payday card says RM152.00 of claims was split out of the salary (D45).

**Repro:** /s/claims?scenario=payday ; /?scenario=payday

```
CLAIMS in payday scenario: Claims | September 2026 | Approved | Phone bill | RM88.00 | ... | Approved | Parking | RM64.00 | 4 files · capped at RM100.00 | Receipt for 21 Sep not added yet | Open the claim | Download claim pack | Send to ESS | A claim with evidence missing waits until you've added it.
```

#### 22 · Note · Small leftovers from the friend and closed-link fixes

The closed `split-public` view still returns `at` (the bill's date and time) for any token, and no test asserts it. A friend's Settings -> Account still shows `weiming@example.com`. A friend with claims off who opens /s/claims by URL is told "Add a scheme in Settings → Claims", where Claims says "Claims are off for you". The fake's member.* commands have no admin check (B05's API must). A stale toast ("Already added") carries onto the next screen when a different file is chosen straight after.

**Repro:** readPublicSplit('demo-closed'); /s/settings/account?scenario=month; /s/claims?scenario=month

```
closed view: at: s.at ; friend Settings: Account | weiming@example.com ; claims (friend): "Each scheme's claim drafts itself on the 1st. Add a scheme in Settings → Claims."
```

## Probes

| Broke | Caught | Note |
|---|---|---|
| Run 2: public `lockIfReady` ignores unclaimed items | yes | splits.test.ts: 'everyone done with an item nobody ticked stays still changing (D71)' failed; was green in run 1 |
| Run 2: app `maybeLock` ignores unclaimed items | yes | splits.test.ts 'the lock (D71)' failed in the unit suite itself; in run 1 only e2e caught it |
| Run 2: closed link leaks merchant+total, or payer, or yourShare | yes | 'a closed or unknown link shows nothing' failed for each of the three |
| Run 2: closed link's `at` (not asserted) | **no** | `at` is still returned and no test checks it (finding 22) |

`git status` was clean of source changes after each probe.

## Method notes

- Finding 5: judged through `me`, as a scenario would set it. A direct `db.agent` flip from my helper changed nothing in the app (the helper's copy of the fake is separate), so I rewrote the served `variants.ts` response so the `month` scenario builds with the agent off. No source was edited.
- Finding 19: my first rescans used a page load, which rebuilds the in-memory fake; I redid them with client-side navigation.
- The run-2 specs are `qa/e2e/b04-r2-*.spec.ts`.

## What I couldn't test, and why

- Findings left open on purpose (4, 7, 8, 13, 14, 16, 18, rest of 12): not re-checked.
- The full 703-test suite: 131 affected tests only.
- The device: queued in `docs/local.md`.
