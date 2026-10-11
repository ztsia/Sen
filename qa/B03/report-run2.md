**Published report (run 2, same link as run 1):** https://claude.ai/artifact/WfFSai2Hz3RP9Kbe93w88p

# QA B03 · Skeleton: the five tabs: run 2 (full, after run 1's tier-3 fixes)

```
VERDICT   fix first
          146 criteria, 127 pass, 11 fail, 8 not reachable
          phases run: 1-6 (phase 4 on the fake and the shared types only: B03 has no SQL, API route or RLS)
          screenshots: qa-artifacts/B03-skeleton-tabs/screens/ (227)
```

Run 1's fixes mostly hold: of its 14 findings, 12 are **fixed** and 2 are **still failing** (the double tap, and
`/s/…` with no id, which was fixed for `confirm` only). Two new Majors turned up. Phases 1 and 2 were written
before any source was opened, as a new *Run 2* section of `qa/B03/acceptance.md` and `flows.md` (the reviewer
had read run 1's report and ledger first, which name the fixes). Four criteria (R2-20..23) were added in phase
5, after the screens were open: weaker evidence, flagged in the file.

Suites: `pnpm test` 197/197, typecheck and lint clean. QA's run 1 specs, re-run at 412x915: 100 passed and 5
failed; 3 of those pass alone (load timing) and 2 expected the behaviour from before fixes 8 and 12 (updated).
New `qa/e2e/b03-r2.spec.ts`: 36 tests, 25 pass, 11 fail (the findings below). Production bundle: no made-up
data and no secret (grepped); `pnpm hygiene` passes. The repo's own `pnpm e2e` was running in the parent session
on :4173/:4174, so it was not run here (QA used :5180-:5183).

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 17 | Major | **Apply all**, double-tapped, answers twice; one Undo leaves one of two rows answered | Review > `click({clickCount:2})` Apply all > Undo | R2-3, §6.5, AC-63 |
| 18 | Major | A screen opens scrolled to the previous screen's offset (Insights, Payments revisited) | Review scroll 900 > Insights tab | R2-20, patterns §10 |
| 2 | Major | **Still failing:** a fast double tap on a Review answer applies it twice in ~4 of 15 tries | 2-3 clicks 10-40 ms apart on ROTI BAKAR 88 / Meals | R2-3, AC-18s, §6.5 |
| 19 | Minor | Over plain http, Scan toasts `Cannot read properties of undefined (reading 'digest')` | open the preview by LAN IP, choose a file | R2-17 |
| 20 | Minor | By hand, the refusal of Done is below the fold with no toast | No receipt… > Big 999.00 > Done | R2-21, D90 |
| 21 | Minor | txn Delete double-tapped goes back twice; Skipped double tap restores two notifications | double-click Delete; double-click the first *This was a payment* | R2-22 |
| 22 | Minor | `/s/reading` with no id: skeleton for ever (13 fixed for confirm only) | open `/s/reading` | R2-11 |
| 23 | Minor | At 1.5x text Home's pace card splits "RM3,873.53" at the comma | root font 24 px | R2-23, patterns §8 |
| 24 | Minor | The regressions for fixes 1, 2 and the receipt maths are in no CI job; `receipt-math.ts` has no unit test | see probes P8, P9 | phase 3 |
| 25 | Note | An empty file and a text file are taken as a receipt | `/scan` > 0-byte file | R2-4s |
| 26 | Note | *Attach to a payment…* offers 30 payments and no search | Review > Waiting on others | flows.md receipt-first |
| 27 | Note | Three run 1 specs fail only under load; two expectations were stale | `--workers=2` sweep | - |

Run 1 findings, re-checked: **1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14 fixed; 2 and 13 still failing.** 15 and 16
(by-design gaps; 390 vs 412) are unchanged.

### Real output

17. Apply all, two clicks, then one Undo; the single-tap control:
```
Apply all x2 {"review":12,"n":1199,"changes":0} -> {"review":10,"n":1200,"changes":3}
after one Undo {"review":11,"n":1200,"changes":1}
Apply all x1 {"review":12,"n":1199,"changes":0} -> {"review":10,"n":1200,"changes":2} -> Undo -> {"review":12,"n":1199,"changes":0}
```
`applyAll` in `screens/review/review.tsx` has no guard; the run 1 fix lives inside `ReviewRow`.

18. Scroll:
```
Insights revisited after Review at 900: scrollTop 900
Payments 2nd open: scrollTop 900 | first rendered: GRABFOOD | Meals · GrabPay Wallet | RM32.50
(first visit of either: review scrolled to 900 -> Insights scrollTop 0)
```
Every screen's `<main>` is the same element, so React keeps its scrollTop; `scrollRestoration: true` handles
`window`. A short screen (More) clamps back to 0, which hides it. Screenshots `R2-S3-insights-revisited-scrolled.png`,
`R2-S2-payments-opened-scrolled.png`.

2. Fifteen attempts, `RESULT clicks x delay: change lines, review, after Undo rules/review`:
```
2x0ms: 1 / 11 / 0 / 12   (x3 clean)       2x100ms: 1 / 11 / 0 / 12   (x3 clean)
2x10ms: 2 / 11 / 1 / 11  (x2 doubled)     2x40ms: 2 / 11 / 1 / 11    (x1 doubled)
3x10ms: 2 / 11 / 1 / 11  (x1 doubled)
```
The guard resets in `.finally`, as soon as the write resolves and before the row has left the screen.

19. `isSecureContext false | crypto.subtle undefined`, toast `Cannot read properties of undefined (reading 'digest')`.
20. `refusal text in the viewport after tapping Done: false | toasts 0`.
21. `after delete x2: url http://127.0.0.1:5180/more?look=minted&mode=light` (was `/s/txn?id=…`, from Payments);
    `skipped x2 { n0: 1199, n1: 1199, ev0: 3, ev1: 1 }` (two events restored).
22. `reading id=: skeleton=1 buttons=0 | Loading` after 2.5 s.
23. 1.5x, 412 and 390 wide: the screenshot reads `Spent / RM3, / 873.53 / this cycle`; no screen overflows or
    clips an amount (12 screens × 2 widths).

## Probes (phase 3)

| Broke | Caught |
|---|---|
| P1 `commitReceipt` content-hash clause dropped | yes: `fake.test.ts` F3 red |
| P2 `spentIn` adds unpaid subscription forecasts | yes: "a forecast is never spending" red |
| P3 small things `<` -> `<=` | yes: "under RM15.00, not at it" red |
| P4 `newestFirst` back to a string sort | yes: F4 red |
| P5 retried-transfer guard in `txn.kind` removed | yes: F2 red |
| P6 receipt-id guard removed | yes: "committed twice with one id" red |
| P7 `ReviewRow` one-at-a-time guard removed | **only in qa/e2e** (b03-review AC-18s x2, b03-r2 FLOW-35); `pnpm test` and the repo journeys have no double-tap test |
| P8 `networkMode: 'always'` removed | **only in qa/e2e** (FLOW-34 red); apps/web unit 57/57 green |
| P9 `priceItems` rounds each item in floating point | **no unit test**: `pnpm test` 197 passed; qa b03-scan and b03-split 5 red |
| P10 `dayKey` loses `timeZone: KL` | yes: `units.test` "turns over at midnight in Kuala Lumpur" and qa b03-tz red |

Also: the grep of the whole B03 diff for `parseFloat`, `toFixed`, `Number(`, `/` and `Math.round` finds only
ratios, percentages and chart coordinates, never an amount. `git status` is clean of source changes.

## Walked, with a screenshot per step

FLOW-34 offline for real (pass; the run 1 finding 1 repro), 34b offline on the preview build with its service
worker (pass), 34c/34d offline budget and note (pass), 35 double taps (fail), 36 same receipt (duplicate refused,
empty and text file not), 37 newest first (pass), 38 launcher shortcut and Back (pass), 39 budgets at and over
the cap (pass), 40 Apply all and Attach (pass), 41 bad addresses (fail: `reading`), 43 text 1.5x (fail), 44 plain
http (fail), 45 scroll (fail), 17b/17c by-hand overshoot and equal (visibility fail; equal pass). Run 1's flows
FLOW-1..33 and the core journeys were re-run by its specs: tab tour, Scan long-press, Home states, Review,
Scan after paying (core), receipt-first, split, Insights, budgets, subscriptions, goals, year, Payments,
txn, receipt, shared bills (D19), timezone (KL, Los Angeles, Kiritimati, UTC, Pago Pago identical), states,
looks (axe and 48 px, six looks, light and dark) and production. The core journey **first-run** is not
reachable (B04/B08), **pay-new**'s second silent payment is not reachable (the capture simulator is not wired
to the fake).

## What I couldn't test, and why

- RLS, SQL views, API routes, pooled-connection user ids: none exist in B03 (B05).
- The shell outbox surviving a kill, sync exactly once from the shell: B07; the fake is in memory.
- The repo's own `pnpm e2e` (390x844, twelve looks): it was running in the parent session on :4173/:4174.
- A failed receipt read end to end, a per-item category change, an email receipt view, a back-dated payment:
  no control or fixture reaches them in B03.
- A real phone: font scale, haptic, back gesture, toast over the real navigation bar. Queued in `docs/local.md`
  (three run 2 checks added to B03's item).
- Run 2's flows were walked in Minted only; run 1's looks sweep passed in all six looks.
