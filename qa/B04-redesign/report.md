# B04 · Redesign: QA report (run 4, full, tier 3, fresh reviewer)

Published: https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa

```
VERDICT   fix first
          36 criteria, 28 pass, 6 fail, 2 not reachable
          53 flows (170 steps, a screenshot each), 11 findings: 1 Major, 6 Minor, 4 Note, no Blocker
          phases run: 1-3, 5, 6 (phase 4 does not apply: no database, API or RLS in this slice)
```

Phases 1 and 2 are the "Run 4" sections of `acceptance.md` and `flows.md`, written from the brief, D129, D130, D132–D136, patterns §7 and the spec's §10/§11/§15 before any source was opened. R4-AC-33 to 36 were added after the code was open (flagged in the file), so they are weaker evidence. The weight is on what is new since run 3: D132 (amounts typed from the right), D133/D134 (goal accounts, add forms), D135 (Sen opens with the message started, avatar buttons), D136 and run 3's fixes. Everything run 3 walked was re-run on this commit.

## Suites

| Suite | Result |
|---|---|
| unit (sweep) | 315/315 |
| typecheck, lint (sweep) | clean. `qa/e2e/b04r-r4-*` is lint-clean (eslint `--max-warnings 0`). `pnpm hygiene` passed |
| e2e, project (sweep) | 825 passed, 0 failed, 1,500 screenshots |
| run 3's specs, re-run on this commit | 45 of 51 pass. The six red are R3-FLOW-8, 14b and C1 (they type amounts the old way, which D132 removed) and C3, C3b and X7 (they look for the scanner at `/scan`, but the Scan tab now opens the camera). Each is replaced by R4-FLOW-1, C1, C3 and C3b |
| run 3's evidence specs EV-1 to EV-6 | all green, so run 3's findings 1, 2, 4, 6 and 8 are fixed |
| run 4's specs (`qa/e2e/b04r-r4-flows{A..L}.spec.ts`) | 33 tests: 28 green and 5 red on purpose, each red one a finding (B goal screen, C avatars, G edit, H title, I USD estimate) |
| run 3's survey, re-run | 48 screens × 5 configurations: 0 external requests, 0 page errors, no NaN/undefined/float text |
| production bundle | 73 files: no key, token or secret pattern, no source maps, no dev panel, the `/dev/gallery` route throws |

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | A foreign-currency subscription added by hand reads `≈ RM0.00` and adds nothing to *Committed each month* | /s/subscriptions, Add a subscription, USD, keys 9 9 9, any date, Save | R4-AC-5, D134, §11 |
| 2 | Minor | Add a scheme (plus icon), Edit (pencil), Teach Sen (nothing) open Sen without its avatar | /s/settings/claims | R4-AC-12, D135 |
| 3 | Minor | The account a goal is kept in is asked for and never shown anywhere | Add a goal, Kept in Public Bank, open it | R4-AC-7, D133 |
| 4 | Minor | Subscriptions' title is cut to `Subscriptio…` by *Add a subscription* in Minted, Instrument and Firefly | /s/subscriptions at 390 px | R4-AC-33, P §2 |
| 5 | Minor | Typing a new amount over an old one appends: 1,200.00 then 1 7 5 gives 1,200,001.75 | /s/budgets, a budget, keys 1 7 5 | R4-AC-34, D132 |
| 6 | Minor | D133's hand tick is built nowhere and sits in no brief, so R4-AC-8 and 9 are not reachable | read `payday.tsx` and `commands.ts`; `grep -rn D133 docs/briefs` | R4-AC-8, 9, 36 |
| 7 | Minor | No test pins a group label's size or "a heading is bigger than what it heads" | probe below | R4-AC-13, 32 |
| 8 | Note | patterns §7 Forms says `inputMode="decimal"` (code uses `numeric`). None of D132 to D136 is in patterns.md or screens.md, and B21 and B30 lack D133 | `grep -n "D13[2-6]" docs/ui/patterns.md docs/screens.md` | R4-AC-36 |
| 9 | Note | Run 3 leftovers: a 2 px overflow at 360 px and 1.5× text on /s/manual (Firefly dark); four 3 to 4 line paragraphs at 390 | run 3's survey | R4-AC-35 |
| 10 | Note | Silent edges: digits past 13 dropped, `1e3` pastes as 0.13, a past *By when* is accepted (shown as *Done by 1 Jan*), an abandoned Sen draft is replaced | R4-FLOW-1, 3, 5b | R4-AC-3, 6 |
| 11 | Note | The Add sheets close without returning focus to their button | Escape, then `document.activeElement` | R4-AC-29 |

### Details and real output

**1. USD subscription reads ≈ RM0.00.** The row's ringgit estimate is `displayFxRate ? fxApprox(...) : 0` (`apps/web/src/data/fake/views.ts:817`). A hand-added subscription has no rate yet. The spec's rate is Bank Negara's, shown as *≈ RM40.88 · BNM 7 Oct* (§11). With no rate the row should say so, and the total should not quietly leave it out.
```
R4-FLOW-2c: row: Spotify US | Next renewal 30 Nov | US$9.99 | a month | ≈ RM0.00 | RM 0.00;
            committed before RM141.90 RM 141.90 after RM141.90 RM 141.90
R4-FLOW-2:  Canva US$12.99 a year -> "≈ RM0.00"; total RM141.90 + RM17.00 (Netflix, MYR) = RM158.90 (the USD one counted as 0)
```
Screenshots: `R4-FLOW-2c-step-1-usd-estimate.png`, `R4-FLOW-2-step-5-usd.png`. Spec: `qa/e2e/b04r-r4-flowsI.spec.ts` (red on purpose).

**2. Buttons that open Sen without its avatar.** D135 says every such button shows Sen's avatar. The existing pin checks only Insights' *Ask Sen about this*. `Teach Sen` and the menu's *Teach again: …* also open Sen with no started message.
```
R4-FLOW-6: /s/settings/claims Add a scheme: canvas.av=0 svg=1
           /s/settings/claims Edit: canvas.av=0 svg=1
           /s/settings/claims Teach Sen: canvas.av=0 svg=0
           /insights Ask Sen about this: canvas.av=1     / (Home) Ask Sen: canvas.av=1
```

**3. A goal's account is never shown.** `GoalSummary` and `GoalView` (packages/core/src/views.ts) carry no account. Neither the goals list nor the goal screen names it, and the payday plan has no *move RM… to …* lines.
```
R4-FLOW-3 step 5: expected the goal screen to contain "Public Bank"; received "0%· New laptop· RM0.00 … Target RM4,500.00 … Median surplus RM1,237.95 over 6 cycles"
```

**4. A cut title.**
```
R4-FLOW-16: minted-light /s/subscriptions: "Subscriptions" 146>141 | instrument-light 144>142 | firefly-light 152>134
            (and the three dark modes). Copper, Line and Mercury fit. Goals, Claims, Budgets, Members fit.
```

**5. Editing appends.**
```
R4-FLOW-15: seed 1,200.00; typing 175 after it -> 1,200,001.75; select-all then 175 -> 1,200,001,751.75
```
`MoneyInput`'s `onKeyUp` collapses the selection to the end, so a keyboard select-all is undone. A long-press select-all on a phone may work; queued in `docs/local.md`.

**6. The hand tick.** `packages/core/src/commands.ts` has `payday.claims`, `payday.skip` and `payday.plan` only. `Plan` in `payday.tsx` is a list with *Use this plan*. B30 says a move ticks when its transfer's notification lands. `grep -rn D133 docs/briefs docs/modules.md` returns nothing.

**7. Unpinned size rule.** `GroupLabel`'s h2 changed from `text-sm font-medium text-muted-foreground` to `text-2xl font-semibold text-foreground` stayed green in blocks.spec, redesign-pins and the first 110 of screens.spec's 195 selected tests (run stopped for time). Run 3's survey measures it, but that survey is not in the project suite.

**8 to 11** are as in the table; output in `results.json`.

## Run 3's findings, re-checked

| Run 3 | Status | Evidence |
|---|---|---|
| 1 Insights slides sideways | fixed | R3-EV-3 shell scrollLeft 0; R3-FLOW-4b green; pin 4 |
| 2 Forget loses two notes | fixed | R3-EV-4 and R3-FLOW-X1 green |
| 3 behaviours the suite can't see | fixed | probes: money in without `+` and "An estimate for payday" reworded turned 2 pins red |
| 4 amount cut off | fixed | R3-EV-1 green |
| 5 1.5× on a 360 px phone | fixed in part | Budgets and Settings pinned; /s/manual "Subscriptions" still 2 px over (Note 9) |
| 6 toast over Next | fixed | R3-EV-6 green |
| 7 blur validation masked | fixed | letters can no longer be typed (D132); empty is the only blur case |
| 8 `history.back()` | fixed | R3-EV-5 and R4-FLOW-17: Back and Delete land on Home |
| 9 label sizes | decided | D136; labels measure 13 px in six looks |
| 10 long paragraphs | still there | four screens at 3 to 4 lines (Note 9) |
| 11 first-cycle strip | unchanged | one strip (R4-FLOW-19) |
| 12 small things | fixed | `1,151 payments`; hawker switches named; the orphan `·` is pinned |

## Probes (phase 3); `git status` clean for `apps/` and `packages/` afterwards

| Broke | Caught |
|---|---|
| `typedSen` lets `.` through (`packages/core/src/money.ts`) | yes: money.test, 6 failed |
| `askSen` stops setting the started message (`ui-store.ts`) | yes: pin "Sen opens with the message started" |
| `SenMark` draws `?` instead of the avatar (`avatar.tsx`) | yes: pin "Ask Sen about this shows Sen's avatar" |
| `goal.add` accepts an unknown account (`apply.ts`) | yes: fake.test |
| `subscription.add` dedupe by id removed (`apply.ts`) | yes: fake.test |
| `parseFloat(…) * 100` in the subscription form's Save | yes, by eslint only. No e2e can see it, because 12.99 rounds right |
| money in loses its `+`; Insights' estimate wording changed | yes: 2 pins red |
| `GroupLabel` drawn as a 24 px foreground heading | **no** (finding 7) |

## What passed, with evidence

- **D132:** 1 2 5 0 reads 0.01, 0.12, 1.25, 12.50 in Add expense, Balance check, Budgets, Add a subscription and Add a goal. Strays are ignored (`. , e - a + space`, Arabic and full-width digits). Backspace runs down to empty. Pastes: `RM 1,234.50` stays 1,234.50, `abc12def` gives 0.12, `NaN` gives empty. 199999 saved as 199,999 sen with the toast `RM1,999.99`. 000 and empty are refused with "Type the amount."
- **Add a subscription and Add a goal:** refusals in words; a double tap adds one row; five hostile goal names stay literal; axe 0 violations, every target 48 px; first field focused; errors are `role=alert`.
- **D135:** Add a scheme starts `I want to add a claim scheme: `, Edit starts `Change my Phone bill scheme: `, both focused with the caret at the end and nothing sent. The floating button opens empty. Five Insights cards ask five different questions. The avatar differs in six looks.
- **Core journeys:** first-run; pay-new; scan-after through the Scan tab (camera chooser, crop, confirm 6413 sen, RM21.38 a person, Attached with Undo); same file twice reads *Already added*; a text file and an empty file say so.
- **Time zones:** Home, Payments and a new subscription's renewal read the same in Los Angeles, Kiritimati and Kuala Lumpur.
- **Offline:** banner, one subscription added once, 0 unsynced after reconnect. Sen offline says it needs a connection.
- **Corrupt storage:** garbage in `sen.look`, `sen.mode` and `sen.lookQuarterly` still opens in Minted, light, with no page error.
- **Float and hygiene:** the diff's float hits are display ratios only. Hygiene passed.

## What couldn't be tested, and why

- **The Android shell:** ML Kit's scanner, a deep link into a pushed screen, TalkBack, the largest font, Remove animations, and long-press select-all in a money field. Four checks added to `docs/local.md` ("device checks from QA run 4").
- **Phase 4:** the slice has no SQL, API or RLS.
- **The hand tick and its matching notification** (R4-AC-8, 9): not built (finding 6).
- **Offline, reload, sync exactly once:** the fake's db is in memory. The real outbox is B07.
- **The 23:59 Kuala Lumpur boundary:** the fake can't place an item there.
- **Delete account, Sign out, ESS sign-in:** stand-ins until B05.
- **Every run-4 flow in every look:** flows ran in Minted, except the avatar and group labels (six looks) and the title check (twelve). The rest rests on the sweep's 1,500 screenshots.

## Running the specs

From `qa/e2e`: `./node_modules/.bin/playwright test -c b04r.config.ts <name>`. Flows A, B, D and E need a dev server on :5291 (they read the fake db as a module); C and F to L a preview build on :5292.

---

# Run 4, scoped re-check of the fixes (tier 2): ship

```
VERDICT   ship (scoped, tier 2; fixes 0110260..4de5471)
          criteria: 45 (36 from run 4 + 9 new S4-AC), 42 pass, 1 fail (R4-AC-36), 2 not reachable
          flows: 41 re-run on the fixed code, 87 steps, all pass; probes: 8, 2 not caught
          No Blocker or Major open.
```

Areas: money entry wherever an amount is typed; subscriptions and goals added by hand; every button
that opens Sen. Also the shared money field on first-run balances and a member's allowance. Run 3's
specs and the project e2e weren't re-run (the main session's 829 passed stands). Dev, preview and
production builds on :5291–:5293; every probe reverted.

## Run 4's findings, re-checked

| # | Was | Now | Evidence |
|---|---|---|---|
| 1 | Major: USD subscription read `≈ RM0.00` | fixed | Six cases match by hand: US$12.99 → RM54.79, S$10.00 → 32.65, €9.99 → 49.26, £0.01 → 0.06, £99,999,999,999.99 → 564,199,999,999.94, €12.99 a year → 64.05 (the month rises by 534). Rows show `rate 4.2180, BNM 17 Oct`; Claude Pro keeps `rate 4.2550, from the last charge`; a ringgit one has no ≈ line |
| 2 | Minor: Sen buttons without the avatar | fixed | Claims' Add, both Edits, Teach Sen and Teach again show it and start their message; 18 more buttons across the app show it (see 12) |
| 3 | Minor: a goal's account never shown | fixed | `RM0.00 of RM4,500.00 · in Public Bank`; goal screen `Kept in \| Public Bank`; clean at 360 px, 1.5× |
| 4 | Minor: Subscriptions title cut | fixed at 390 | No cut in 6 looks × 2 modes; action named in full, 48 px. At 360 px with 1.5× text: 14 |
| 5 | Minor: a new amount appends | fixed | Select all then 1 7 5 reads 1.75 in Add expense, Balance check, Budgets, Add a subscription, Add a goal, first-run and a member allowance; 175 sen saved |
| 6 | Minor: hand tick in no brief | fixed (docs) | B30 carries D133's move and the hand tick; B21 lists D133, D134. R4-AC-8, 9 stay not reachable (B30 builds it) |
| 7 | Minor: group-label size unpinned | fixed | Pin red at 22 px and at 15 px |
| 8 | Note: docs lag | fixed in part | patterns §7 follows D132; `screens.md` has no add forms (left) |
| 9 | Note: run 3 leftovers | open (left) | |
| 10 | Note: past *By when* | fixed | Yesterday and today refused in KL, Kiritimati and Los Angeles (`Pick a day after today.`, nothing stored after two taps); tomorrow and no date store once |
| 11 | Note: focus not returned | open (left) | |

## New findings

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 12 | Minor | Teach Sen and Teach again build their started message from an ESS task name as if it were a claim scheme (*Learn how I submit my Submit claims claim on ESS:*), and no test checks it | `/s/settings/claims`: Teach Sen; More about ESS → Teach again: Fetch payslip | S4-AC-4, D135 |
| 13 | Minor | Nothing in the project suite tests that a goal's past date is refused (probe: check replaced by `false`, 3 pins green) | | S4-AC-3 |
| 14 | Minor | App bar titles are still cut at 360 px with 1.5× text: Subscriptions (Minted, Firefly, Copper), Members (Minted, Firefly, Copper), Budgets (Firefly) | textScale 1.5, 360×740 | S4-AC-5, patterns §8 |
| 15 | Note | The made-up Bank Negara rate is dated Saturday 17 Oct 2026 | any hand-added foreign subscription | §11, D99 |
| 16 | Note | A letter or a dot typed over a full selection wipes the amount | `/s/manual`: 1 2 0 0 0 0, select all, `x` | S4-AC-6, D132 |
| 17 | Note | The Claims empty state's *Describe a scheme to Sen* wasn't reached: the fake has no state without schemes | | S4-AC-4 |

## Probes

| Broke | Caught |
|---|---|
| Money field collapses a selection again | yes: pin, `Expected "1.75" Received "1,200,001.75"` |
| `subscription.add` takes no rate | yes: `fake.test` |
| `keptIn` dropped from the goal summary | yes: `fake.test`, `expected null to be 'Ryt Bank'` |
| Goal's past-date check replaced by `false` | **no** (13) |
| Claims Edit loses its avatar | yes |
| Teach Sen opens Sen with no started message | **no** (12) |
| Subscriptions action reads *Add a subscription* again | yes: title cut |
| `GroupLabel` at 22 px, and at 15 px | yes, both |

Specs: run 4's 33 re-run, 32 green unchanged; R4-FLOW-3 now asserts the refusal. New scoped specs
`b04r-r4-flows{M,N,O,P}.spec.ts`, 17 tests, green. Not reached: long-press Select all on a phone (in
`docs/local.md`), the 00:00 KL boundary for a goal's date (the fake's clock is fixed), finding 17.
