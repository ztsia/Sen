# B04 · Redesign: QA report (run 2, full)

Published report: https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa (version 2)

**VERDICT: fix first.** 51 new criteria (R2-AC-1 to 51): 42 pass, 9 fail, 0 not reachable. 36 flows walked, 14 findings: **2 Major, 11 Minor, 1 Note, no Blocker.**
Phases run: 1-3, 5, 6. Phase 4 does not apply (no database, API or RLS in this slice).
Screenshots: `qa-artifacts/B04-redesign/screens/` (R2-FLOW-n-step-m-*.png). Rendered page: `qa-artifacts/B04-redesign/report.html`. Contact sheets: `qa-artifacts/B04-redesign/contact/`.

Phases 1 and 2 (the "Run 2" sections of `acceptance.md` and `flows.md`) were written from the brief, D129/D130, patterns, screens and flows before any source was opened. I read the sweep's index for suite results only. I then read run 1's report and ledger, and the implementation.

Run 1's ten fixes hold: its ten pins went red under their breaks, and the 208 of 209 run-1 walk tests that I re-ran pass (the one red is run 1's Note 12, the first-cycle payday strip, left on purpose).

## Suites

| Suite | Result |
|---|---|
| unit | 302/302 (sweep); not re-run in full |
| e2e (sweep, preview + production) | 802/802 pass, 54 min, 1512 screenshots |
| typecheck, lint | clean (sweep) |
| hygiene | passed |
| QA run-1 walks, re-run on this commit | 208/209 |
| QA run-2 flows (`qa/e2e/b04r-r2-*.spec.ts`) | 43 tests: 39 pass, 4 red, each a finding (7, 8, 11, 12) |
| QA surveys | 636 page loads (46 screens x 6 looks x 2 modes) for sizes, overflow and hit-testing; 4 state sweeps; a structure sweep; a scroll-end sweep |

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | The Receipt screen prints raw member ids (UUIDs) as "who had it" | More -> Payments -> Nasi Kandar Abc -> Receipt | R2-AC-16, screens `receipt` |
| 2 | Major | Four behaviours have no test that fails when they break (Review's tap guard, Add expense's validation, the pager's hidden cards, Skipped's guard) | see Probes | R2-AC-8, 9, 13, 14 |
| 3 | Minor | Button and toggle labels render 15 px; patterns say 14 (`text-label` is dropped by tailwind-merge) | any chip | R2-AC-1 |
| 4 | Minor | Inputs are 15 px; patterns say 16 | Payments search | R2-AC-1, P §2, §10 |
| 5 | Minor | Tab labels 11.52 px (Instrument 10.5), under the 12 px floor | any tab screen | R2-AC-1 |
| 6 | Minor | Appearance forgets a pinned look when you leave it | Appearance -> Copper -> Back -> Appearance | R2-AC-30 |
| 7 | Minor | A rule made by answering in Review never shows in Settings -> Rules | prompt -> Meals -> Rules | R2-AC-31 |
| 8 | Minor | Empty, loading and error states drift: Payments, Shared tabs, Add expense | `?state=empty`, `?state=error` | R2-AC-22, 40 |
| 9 | Minor | Information rows still wear icon tiles | Review refund, Add expense When, Received, ESS rows | R2-AC-38 |
| 10 | Minor | Review's third chip is cut off ("Er…"), no cue to swipe | Review, Waiting on others | R2-AC-8 |
| 11 | Minor | An unreadable receipt opens Add expense with no photo and no message | Review -> A receipt Sen couldn't read | R2-AC-51 |
| 12 | Minor | The Insights pager slides under reduced motion | reduced motion, tap Year | R2-AC-50, P §8 |
| 13 | Minor | Subscriptions' four "N matched" disclosures are drawn 48 px | `/s/subscriptions` | D129 |
| 14 | Note | Carried over or left on purpose (list in the finding) | | |

### Details and real output

**1. Receipt UUIDs.** `fake/views.ts` returns `who: db.picks[i.id]`; since D71 `picks` is a comma-joined list of member ids. `receipt.tsx` prints it.
```
Nasi kandar ayam||f3e4e98f-969b-435d-89ac-f5d75e457306 · Meals||RM18.50
Teh o ais (3)||f3e4e98f-969b-435d-89ac-f5d75e457306,33566cc7-fdce-4cec-892b-e4fd7772b6bb,d032a69e-a3a2-41bf-bcc3-17c10f7093d2 · Meals||RM14.00
```
Screenshot: `R2-receipt-uuid.png`. The line exists on main; the screen is the redesign's.

**2. Tests without teeth.** (a) `rows.tsx`: `if (pending.current || !settleTap()) return;` -> `if (false) return;`.
```
project screens.spec "a double tap answers one Review row":  1 passed (4.3s)
QA b04r-r2-tap (tap, wait 150 ms, tap the same spot):          Expected: 11  Received: 10
```
The project test clicks one button twice 20 ms apart, so it never reaches the case the guard exists for (the next row sliding under the finger). (b) `manual.tsx` with the zero-amount and missing-category guards removed: `journeys.spec -g manual` 12 passed, vitest passed; QA FLOW-10 `Expected pattern: /above zero/`. (c) `steps.tsx` without `inert` and `aria-hidden`: `journeys.spec -g insights` 12 passed, B03 axe 1 passed; QA FLOW-5 red (the cards you are not on stay reachable by TalkBack and Tab). (d) `skipped.tsx` without `settled(...)`: no project test taps "This was a payment"; QA FLOW-33 `Expected 2, Received 1`.

**3. Button labels.** `button.tsx` and `toggle.tsx` set `text-label`; `cn()` runs tailwind-merge, which treats it as a colour and drops it next to `text-primary-foreground`.
```
Apply all 15px 40 | Meals 15px 32 | Other… 15px 32 | Save 15px 48
className: "... font-medium transition-[...] ... bg-primary text-primary-foreground min-h-10 px-4 py-1.5"   (no text-label)
```
**4. Inputs.** `/s/payments input 15px`, `/s/sign-in input 15px`, `/s/settings/you textarea 15px`, `/s/split-public?id=demo-new input 15px`.
**5. Tab labels.** `11.52px span "Home"|"Review"|"Insights"|"More"` (five looks), `10.496px` in Instrument; `frame.css` `font-size: 0.72rem`. Not in the redesign diff.
**6. Appearance.**
```
switch initially true | switch after pin false | settings row: Appearance | Copper
switch after return true | desc: ... Change each quarter | | Copper until Fri, 1 Jan 2027
after reload look copper switch true
```
**7. Rules.** After the prompt's Meals, `db.rules` +1 (FLOW-14 step 3 passes), but Settings -> Rules lists only the four seeded rules (`areas/settings.ts` builds the list once).
**8. States.** `payments empty: "0 payments | No payments yet."` (svg in main = 4, all filter chips); `shared Settled: "Open · 3 | Settled · 0 |  | No settled bills yet."` (0 svgs); `manual ?state=error: "Amount | RM | Category | When | Now | More details | Save"`. Screenshots: `R2-state-payments-empty.png`, `R2-state-shared-settled.png`, `R2-state-manual-error.png`.
**9. Tiles on information.** `infoWithTile: review ["Shopee refund…"], manual ["WhenNow"], email ["Received by email3"], set-claims ["Fetch payslip…", "Submit claims…"]`.
**10. Cut chip.** `strips 356/356 ... 496/356` on the waiting-receipt card (`R2-review-bottom.png`).
**11. Unreadable receipt.** `/s/manual?id=<receipt id>`; manual reads the id as a draft (`db.drafts = []`), so the card "Sen couldn't read this one. The photo is kept." never shows. Same on main.
**12. Reduced motion.** `scrollLeft samples under reduced motion 2,50,99,167,251,352`; `StepPager` uses `behavior: "smooth"` unconditionally.
**13.** `BIG ["3 matched · 1 expected","3 matched · 1 expected","4 matched","4 matched"]`.

## Probes (phase 3), `git status` clean afterwards

| Broke | Caught |
|---|---|
| `parseSen` -> `Math.floor(parseFloat(text) * 100)` | yes: money.test 2 failed (sen 29 -> 28); QA FLOW-9 red |
| Capture apps: blocked switches enabled | yes: capture.spec `toBeDisabled` |
| ReviewRow tap guard removed | **no** (project); QA red |
| Cycle sheet "An estimate:" -> "Left on payday:" | yes: journeys.spec |
| names.ts: ZUS no longer kept | yes: names.test |
| Review chips `chip` -> `default` | yes: redesign-pins (h 48) |
| txn Delete without Undo | yes: redesign-pins |
| Progress without `value` | yes: redesign-pins |
| Home pace box h-16 -> h-56 | yes: home-fit (120 px over) |
| Add expense zero/category guards removed | **no** (project); QA red |
| StepPager `inert`/`aria-hidden` removed | **no** (project); QA red |
| Skipped guard removed | **no** (project: untested); QA red |

Float arithmetic: the diff grep found only display ratios (`calc(var(--radius)*0.6)`, a width percentage, `Math.round(scrollLeft / width)`). No money path uses a float.

## What passed, with evidence

Home fits at 390x844 in 12 of 12 look-and-mode combinations, and 24 of 24 with a health bar or the Payday card (FLOW-1, 2). Review: groups with icons and counts, chips 32 px, an answer makes one rule and Undo removes it, Apply all and its Undo, a late second tap answers nothing (FLOW-3). Insights: five named steps, one exposed card. Money: 19.99 stores 1999 and 0.1 stores 10; nine bad amounts refused with nothing saved; balance-check differences exact (RM0.01 more, RM1.00 less) and Save books one adjustment. Scan-after: items sum to the total, RM64.13 / 3 = RM21.38, Attached with Undo, same file twice says Already added with no new row. Capture simulator: 0 captured before apps are chosen, a repost stays 1, an OTP is dropped, a maybe-OTP is stored and says so. Time zones: identical in Kuala Lumpur, Los Angeles and Auckland. Production: no dev panel, six hostile addresses show no stack, 73 bundle files with no key, token or database URL, no source maps, a strict CSP. Axe is clean on every screen in every look and mode (sweep), and in Firefly and Line dark on 8 screens at 1.5x text (FLOW-29).

## What I couldn't test, and why

- The phone's webview, TalkBack, the largest Android font and Remove animations: needs the device. Added to `docs/local.md` as "B04 · Redesign on the real phone".
- Phase 4: the slice has no SQL, API or RLS.
- Delete account's dialog and the real ESS flows: stand-ins that only toast until B05.
- Cancelling the browser file picker; the 23:59 KL cycle boundary (fixed fake clock); reloading offline with a draft (the sweep's production service-worker test covers the reload).
- The Kotlin listener filter: the slice did not touch `apps/shell`. I ran the web stand-in and the picker's disabled switches.
- Every flow in every look: flows walked in Minted (FLOW-1, 2, 26 in all six); the rest through the 636-load survey and the sweep's journey screenshots.

Specs: `qa/e2e/b04r-r2-*.spec.ts` (flows A-G, money, tap, survey, states, structure, bottom), run with `qa/e2e/b04r.config.ts` against a dev server on :5291, a preview build on :5292 and a production build on :5293.
