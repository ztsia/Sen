# B04 · Redesign: QA report (run 3, full, fresh reviewer)

Saved by the main session from the reviewer's final message (a subagent can't write a report `.md`).

```
VERDICT   fix first
          57 criteria, 49 pass, 7 fail, 1 not reachable
          35 flows (134 steps, a screenshot each), 12 findings: 3 Major, 5 Minor, 4 Note, no Blocker
          phases run: 1-3, 5, 6 (phase 4 does not apply: no database, API or RLS in this slice)
```

Phases 1 and 2 (the "Run 3" sections of `acceptance.md` and `flows.md`) were written from the brief,
D129, D130, patterns, screens and flows before any source was opened. R3-AC-54 to 57 were added after
the code was open (flagged in the file), so they are weaker evidence by the ordering rule. The sweep's
index was read only for suite results, and runs 1 and 2's reports only after writing the criteria.

Runs 1 and 2's fixes hold: every one of their specs was re-run on this commit: 232 of 233 pass (the one
red is run 1's Note 12, carried as Note 11). The sweep's typecheck error (`ReceiptDraft`, at c60cc48)
is fixed at HEAD: typecheck is clean.

## Suites

| Suite | Result |
|---|---|
| unit (`pnpm test`) | 307/307; also 307/307 under `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland` |
| typecheck, lint, hygiene | clean at HEAD 1ec88b7, lint including `qa/e2e/b04r-r3-*`; hygiene passed |
| e2e, project (sweep) | 811 pass, 0 fail; 1512 screenshots |
| QA run 1 and 2 specs, rerun | 232 of 233 pass (Note 11) |
| QA run 3 specs (`qa/e2e/b04r-r3-*`) | 46 tests, 37 pass, 9 red, each a finding (FLOW-4b, X1, 14b, EV-1 to 6) |
| QA run 3 survey | 48 screens × 5 configurations (390 at 1x in Minted light and Copper dark; 360 and 320 at 1.5x text): 0 external requests, 0 page errors, no NaN/undefined/float text |

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Insights: choosing **Goals** or **Year** (or swiping there) slides the whole screen sideways; the cards' left edge and the tab bar are cut off | /insights, tap Goals, then Year | R3-AC-7, brief insights |
| 2 | Major | Sen's memory: a double tap on **Forget** forgets two notes; Undo restores one | /s/agent/memory, tap Forget twice 150 ms apart, Undo | R3-AC-24, patterns §7 |
| 3 | Major | Three behaviours break with every test green: the tab bar on task screens, "An estimate" worded as a fact, money in without its `+` | see Probes | R3-AC-57, patterns §3, §6 |
| 4 | Minor | Review > Waiting on others cuts `of RM97.60` off with an ellipsis at 390 px | /review, scroll to Waiting on others | R3-AC-40, patterns §3 |
| 5 | Minor | 1.5x text on a 360 px phone: Budgets runs past the edge, Settings cuts its amount, the title becomes `B…` | textScale 1.5, 360×740: /s/budgets, /s/settings | R3-AC-43, patterns §8 |
| 6 | Minor | Payday: the toast after Skip covers the next main button and takes the tap | /s/payday?scenario=payday, Next, Skip, Next | R3-AC-55, patterns §7 |
| 7 | Minor | Balance check and first-run's accounts step don't validate on blur | /s/balance-check, type `14,65O.87`, Tab | R3-AC-54, patterns §7 Forms |
| 8 | Minor | Delete and the app bar's Back call `history.back()` with nothing behind when a payment is opened from a link | /s/txn?id=… loaded directly, ⋯, Delete | R3-AC-56 (not reachable), screens rules |
| 9 | Note | D129 and patterns §7 disagree on small labels over cards (13 px over 15 px rows) | /review, /s/accounts, /s/subscriptions | D129, §7 |
| 10 | Note | Four screens have a 3 to 4 line paragraph where the brief says one line | survey | brief rule 7 |
| 11 | Note | Carried from run 1: first-cycle shows the Payday plan strip | /?scenario=first-cycle | brief home |
| 12 | Note | Small things: `1151 payments` vs `1,151`; an orphan `·` on the Split row; a rule's switch is named by its sentence | see below | patterns §3, §5 |

### Details and real output

**1. Insights slides sideways.** `StepPager` (`apps/web/src/blocks/steps.tsx:90`) calls
`names.current?.children[at]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior })` on the
chosen step name. `scrollIntoView` scrolls every scrollable ancestor, and the app shell
(`div.safe-top`, `overflow: hidden`, scrollWidth 1917) is one, so it moves until the name is centred in
the screen too. The first two steps need no shift; the later ones do, and it stays until you leave
Insights. It is one of the owner's starred screens.
```
shell scrollLeft after each step: {"Budgets":0,"Subscriptions":0,"Goals":36,"Year":97}
at 360 px: 0, 0, 21, 82    at 412 px: 0, 0, 47, 108    at 430 px: 0, 0, 56, 117
R3-EV-3: shell scrollLeft 97, tab bar left edge -97
```
Screenshots: `R3-EV-3-insights-year-shifted.png`, `R3-FLOW-4-step-8-year-shifted.png` (the title reads
`ghts`). Specs: `b04r-r3-flowsA.spec.ts` R3-FLOW-4b, `b04r-r3-evidence.spec.ts` R3-EV-3. Scrolling
only the names' own row (`names.current.scrollTo`) would leave the shell alone.

**2. Forget loses two notes.** `screens/sen/memory.tsx:59` calls `write({ type: 'memory.forget' })`
from `onClick` with no tap guard; txn Delete, Skipped and Review all use `settled()`/`settleTap()`, and
patterns §7 says every destructive or list-changing action does. The list closes up under the finger,
the second tap forgets the next note, and the second toast replaces the first.
```
R3-EV-4: 4 notes, 2 after a double tap, 3 after Undo
toasts after the double tap: [ 'Forgotten\nUndo' ]   (one)
```
Screenshots: `R3-EV-4-memory-two-forgotten.png`, `R3-EV-4-memory-after-undo.png`.

**3. Behaviours the suite can't see.** One-line breaks against the project's own suites (apps/web e2e,
Minted, 239 tests on a dev server). Eight tests are red on every run, with or without a break
(`edges.spec` look loading and `production.spec`, which can't pass on a dev server):
```
a) showsTabBar -> !!d:                                          53 passed, 1 failed: frame.spec.ts:174 (it asserts /scan only)
   payday, manual, confirm, balance-check 'task' -> 'pushed':   231 passed, 8 failed (the same 8): nothing noticed
b) Insights "An estimate for payday:" -> "Left at payday:",
   Usage "Estimated cost" / "About RM" / "The cost is an estimate…" -> "Cost" / "RM" / "The cost.":   231 passed, 8 failed (the same 8)
c) blocks/money.tsx  const plus = false:                        231 passed, 9 failed: the same 8 plus blocks.spec.ts:29
   (a toast-timing test; with the break in place on a quiet machine it passed 3 of 3, and 5 of 5 on clean source)
   grep '+RM' apps/web/e2e  -> no assertion
```
Only the cycle sheet's `An estimate` is asserted (`journeys.spec.ts:64`). Each is a rule the contract
states (P §6, P §3, CLAUDE.md "a prediction never shares a table with a fact").

**4. Amount cut off.** `1 of 2 paid you back · RM48.80 of RM97.60` is `truncate`d in a 196 px column.
```
R3-EV-1: ["1 of 2 paid you back · RM48.80 of RM97.60 | scrollWidth 252 > clientWidth 196","0 of 2 paid you back · RM0.00 of RM28.93 | scrollWidth 250 > clientWidth 196"]
```
Screenshot: `R3-EV-1-review-waiting-amount-cut.png`.

**5. 1.5x text on 360 px.** The project's own check runs at 390, where it passes.
```
R3-EV-2: budgets past the right edge: ["RM0.00 of RM150.00 right=399 of 360"]
R3-EV-2: settings truncated: ["~RM3.80 this month scrollW 181 > 83"]
survey 360-1.5x: /s/settings/sen truncated "About RM3.80"; /s/manual "Subscriptions" right=362 (Firefly)
```
Screenshots: `R3-EV-2-budgets-1.5x-360.png`, `R3-EV-2-settings-1.5x-360.png`.

**6. Toast over Next.** On a task screen there is no tab bar, so the 6-second toast lands where the
main button is.
```
R3-EV-6: Next {"y":"756-804","topmostIsToast":true}
R3-EV-6: a real tap on Next: Step 3 of 4 -> Step 3 of 4
```
Screenshot: `R3-EV-6-payday-toast-over-next.png`.

**7. Blur validation masked.** `balance-form.tsx` and `first-run.tsx:222` set a field's error to `''`
on each keystroke; `MoneyInput` shows `error ?? blurError`, and `''` is not nullish. Add expense passes
`undefined` and works.
```
R3-FLOW-14: typo "14,65O.87": messages on blur [], on Save ["Type the amount in ringgit, like 12.50."]
FIRSTRUN blur []    (first-run accounts, "12x", Tab)
```

**8. history.back().** `txn.tsx` Delete ends with `router.history.back()` and `AppBar` Back is
`router.history.back()`; `manual.tsx` and `balance-check.tsx` check `router.history.canGoBack()` first.
```
R3-EV-5: history.length 2; after Delete the page is about:blank
```
(The harness adds an `about:blank` entry and the Android shell couldn't be tried, so R3-AC-56 is "not
reachable".)

**9 to 12.** The survey measured `Categories · 2` (Review), `Elsewhere` (Accounts) and `Declared`
(Subscriptions) at 13 px over 15 px rows: D129 says a heading is always bigger than what it heads;
patterns §7 gives a `GroupCard` its label in secondary text, and the code follows §7 (the owner should
say which wins). Four 3 to 4 line paragraphs at 390 px: Balance check, Capture > Your apps, Keep Sen
running, Captured on this phone (footnotes, not how-tos). Run 1's first-cycle strip:
`Locator getByRole('button', { name: /Payday plan/ })  Expected: 0  Received: 1`. Small things:
Payments' status reads `1151 payments` while More reads `1,151`; the Split row on a payment wraps to
`· RM0.00 of RM28.93`; a rule's switch is `switch "When the payee has “Warung Pak Hamid” → Meals"`
rather than saying *hawker*.

## Probes (phase 3); `git status` is clean afterwards (only `qa/` and `docs/local.md` changed)

| Broke | Caught |
|---|---|
| Review tap guard `if (false) return;` (blocks/rows.tsx) | yes: redesign-pins `Expected 11, Received 10` (the first attempt passed only because Vite hadn't served the edit; checked by curl on the retry) |
| `scaleSen` floors instead of rounding | yes: money.test, 3 failed (`expected 150 to be 151`) |
| split shares by `Math.floor(price / n)` instead of `apportion` | yes: splits.test, 2 failed (`expected 5828 to be 5830`) |
| `.tap` 48 px extension removed | yes: screens.spec targets |
| `DEV_TOOLS = true` in a production build | yes: production.spec |
| `txn.create` dedupe removed | yes: fake.test, `expected length 1, got 2` |
| listener stand-in lets an OTP through | yes: capture.spec (outside this slice's diff) |
| `Number(t)` planted in money.ts | yes: eslint, "Money is integer sen: parse typed text with parseSen, never Number()" |
| tab bar shown on every screen | only frame.spec's /scan check |
| payday, manual, confirm, balance-check marked `pushed` | **no** |
| estimate words dropped in Insights and Usage | **no** |
| money in loses its `+` | **no** |

The float-arithmetic diff grep found only display ratios (`Math.round(scrollLeft / width)`, bar widths,
`elapsedPct`). No money path uses a float.

## What passed, with evidence

- Home fits at 390×844 in 42 of 42 loads (seven scenarios, six looks, two modes); income minus spending
  equals left to the sen (5,804.80 − 3,873.53 = 1,931.27); the estimate sits outside the three tiles.
- Review: groups 2+2+7+1 = the header 12 = the badge; one answer per double tap, two taps 900 ms apart
  answer two; Undo; Apply all.
- Manual: seven valid amounts stored as exact sen (including `99,999,999,999.99` = 9999999999999),
  fifteen malformed refused (full-width and Arabic digits, `12,50`, `RM 12.50`, `.5`, `1_000`, `NaN`,
  40 nines, markup) with nothing saved; a double-click on Save adds one payment.
- Scan-after: items sum to 6413 sen, three people is RM21.38, Attached with Undo, the same file says
  Already added.
- Shared bills: shares plus the unclaimed item equal the bill to the sen at every tick; the public link
  shows only "This split is closed" for a bad token (hostile and 2,000-letter ones too).
- Members: only AI credit amounts on the member screen, the admin sees no payments or balances; a friend
  gets "Admin only" at the URL.
- Balance check: differences by sign; a double-click books two Unaccounted payments, not four.
- Offline: a banner, `Not synced yet`, one row. Time zones: Kuala Lumpur, Los Angeles and Auckland read
  word for word the same.
- Production: no key, token or fixture in 73 files, no source maps, no gallery, no `?scenario=`.

## What couldn't be tested, and why

- The Android shell: a deep link into a pushed screen (finding 8), TalkBack, the largest Android font,
  Remove animations. Four checks are added to `docs/local.md` ("B04 · Redesign, device checks from QA
  run 3").
- Phase 4: the slice has no SQL, API or RLS.
- The Kotlin capture core and the real listener's filters: the slice doesn't touch `apps/shell`, and
  `gradle -p apps/shell/core test --offline` could not resolve its dependencies in this VM.
- Delete account, Sign out and ESS sign-in: stand-ins that only toast until B05.
- The payday strip with every move ticked, and the 23:59 Kuala Lumpur boundary: the fake has no way to
  do either.
- R3-FLOW-13 (capture simulator) and R3-FLOW-17 (every screen's empty state): only through the
  project's and runs 1 and 2's specs, which pass.
- Every flow in every look: the reviewer's ran in Minted (Home fit in six looks, Appearance previews in
  six); the rest comes from the sweep's 1512 screenshots and its axe pass.

## Files

- `qa/B04-redesign/acceptance.md` and `flows.md` (new "Run 3" sections), `results.json`, `docs/local.md`
  (one device-check entry), `qa/e2e/b04r-r3-*.spec.ts`, `b04r-r3-lib.ts`, `b04r3-proj.config.ts` (all
  pass `pnpm lint`).
- Specs ran with `qa/e2e/b04r.config.ts` against a dev server on :5291 (flows C, D, F), a preview build
  on :5292 (A, B, E, survey) and a production build on :5293 (R3-FLOW-21). `b04r3-proj.config.ts` runs
  the project's own specs against a dev server for break-and-check probes.
- No app source was changed.
