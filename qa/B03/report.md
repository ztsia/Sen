# QA B03 · Skeleton: the five tabs: run 3 (full, fresh reviewer, after run 2's tier-3 fixes)

```
VERDICT   fix first
          37 criteria, 35 pass, 2 fail, 0 not reachable
          phases run: 1-6 (phase 4 on the fake and the shared types only: B03 has no SQL, API route or RLS)
          screenshots: qa-artifacts/B03-skeleton-tabs/screens/ (314)
          published: https://claude.ai/artifact/WfFSai2Hz3RP9Kbe93w88p (the latest run, with every screenshot)
```

Run 1 and 2's fixes mostly hold: of the 23 findings re-checked, **22 are fixed and 1 is still failing** (run 2's
amount that splits at the comma at 1.5x text). One new **Major**: *Mark as…* offers *Refund of…* on a money-out
payment, and spending then falls by twice that payment. Seven new Minors and seven Notes.

Phases 1 and 2 were written from the docs first (a new *Run 3* section in `acceptance.md` and `flows.md`, ids
`R3-n`, before any source or earlier report was opened); the earlier reports were read after. Suites:
`pnpm test` 206/206, typecheck, lint and hygiene clean. QA's earlier specs (`qa/e2e/b03-*`, 412x915): 134 of 141
pass on the first pass; of the 7 reds, 4 pass alone (load), FLOW-44 needs a LAN-address server (passes with one
on :5183), FLOW-43 at 390 is the still-failing finding 23, and AC-41 / FLOW-17b are timing in the specs
themselves (finding 42). New `qa/e2e/b03-r3.spec.ts`: 22 specs, 5 red by design (findings 28, 29, 30, 33, 23).
Production bundle (68 files) grepped: no made-up name, key or token. The browser timezone runs (KL, Los Angeles,
Kiritimati, UTC, Pago Pago) are identical.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 28 | Major | **Mark as… > Refund of…** is offered on a money-out payment; an outgoing RM10.00 marked as a refund lowers spending by RM20.00 | txn of KEDAI MAKAN AH CHOY > Mark as… > Refund of… > ZUS COFFEE; Home | R3-6, §7 D21 |
| 23 | Minor | **Still failing:** at 1.5x text Home's *Spent RM3,873.53 this cycle* splits `RM3,` / `873.53`; at 390 the next line is clipped | root font 24px, Home | run 2 #23, patterns §3, §8 |
| 29 | Minor | By hand, Enter in the Add item price adds the item and then shows *Say what it is.* and *Type the amount.* | txn > No receipt… > Enter the items; type, press Enter | R3-22, patterns §7 Forms |
| 30 | Minor | A failed check doesn't stop *Done*, which commits the items' sum (RM69.13) as the receipt's total, so it misses its RM64.13 payment | scan > fix Nasi impit to 9.50 > Done | R3-3, §6.4 |
| 31 | Minor | While a screen's code loads, the tab bar jumps to y=256 and there is no app bar | preview build, slow network, first open of Payments | patterns §7 Loading |
| 32 | Minor | The D19 repayment clause of `spendingOf` is in no CI test (probe survived 30/30) | drop `- repaid`; `vitest` stays green | R3-5, run 2 #24 |
| 33 | Minor | Sen's note on Home (*Quiet Saturday: RM31.20*, *Drinks RM118*) contradicts the data (RM135.40; RM73.50) | Home vs Payments vs Budgets | §12.2, brief |
| 34 | Minor | Before the first salary the cycle sheet reads *Over by RM1,445.23* while Home avoids a negative | `?scenario=before-salary`, tap the figure | screens.md Home |
| 35-42 | Note | Photos are placeholders everywhere (35); *Correcting arrives with B13* names the wrong slice, B12 builds it (36); `.5` refused with a generic message (37); Home's gap loses its sign and the hero label isn't the spoken form (38); goal dates carry no year (39); Undo is a whole-db snapshot, from the code (40); process: my `pkill` stopped the parent's e2e servers (41); two QA specs are timing-sensitive (42) | see results.json | |

### Real output

28.
```
Home before {"left":"1,931.27","spent":"3,873.53"} after {"left":"1,951.27","spent":"3,853.53"}
refund rows [["KEDAI MAKAN AH CHOY","out",1000,"253a7533-…"],["UNIQLO","in",3990,"3332da66-…"]]
Expected: <= 1000   Received: 2000
```
23. `R3-L: lines the amount takes: 2 (Expected: 1)`; FLOW-43 at 390: `home: clipped amount "RM273.53 more " 97>91`.
`Money` puts a `<wbr>` after each thousands comma and Chrome breaks there even under `white-space: nowrap`.

29. `Teh tarik items: 1 | error shown: true | … Items Teh tarik RM3.50 Add an item Say what it is. Price RM Type the amount.`
Both the price's `onEnter` and the form's submit run `submit()`.

30. `printed total 6413 … Total RM69.13 … Items come to RM5.00 more than the receipt’s total … Done enabled after the check fails: true` then `committed receipt total 6913 status awaiting_payment tx null`.

31. `{"navTop":256,"navBottom":335.39,"ih":915,"hasMain":false,"text":"Loading EVERY SEN COUNTED …"}` (`R3-G-lazy-fallback-payments.png`).

32. With `Math.min(share, t.amount - repaid)` changed to `Math.min(share, t.amount)`: `fake.test.ts Tests 30 passed (30)`; `qa/e2e/b03-money.spec.ts` 1 failed.

33. `note: Sen · Yesterday, 21:00 Quiet Saturday: RM31.20 all day. Drinks are at RM118 of RM150 … | Saturday 17 Oct spending in the data (sen): 13540`.

34. `sheet: … Income received +RM4.80 … Spending RM1,450.03 … Over by RM1,445.23 … An estimate: at this pace, about RM2,565.76 over on payday.`

## Re-checked, runs 1 and 2

Fixed (checked by running): run 1 #1-14 and run 2 #2, #17-22, #24, #25 (22 findings). Still failing: #23. Not
re-checked: run 1's #15 and #16 (by design: 390 vs 412) and run 2's #26, #27 (notes, left as they were).

## Probes (phase 3)

| Broke | Caught |
|---|---|
| `apportion` floors in floating point | yes: `money.test.ts` and `receipt-math.test.ts` red |
| content-hash clause of the duplicate-receipt check dropped | yes: `fake.test.ts` F3 red |
| `spentIn` adds subscription forecasts | yes: F6 'a forecast is never spending' red |
| tap guard always lets the tap through | yes: 2 of 12 `tap-guard.test.tsx` red |
| `klDay` loses `timeZone: KL` | yes: `cycles.test.ts` red, in the default and `TZ=America/Los_Angeles` |
| `spendingOf` drops `- repaid` (D19) | **no**: `fake.test.ts` 30/30 green; only QA's own spec catches it (finding 32) |
| `spendingOf` drops the refund clause (D21) | yes: `fake.test.ts` red |
| `parseFloat` in `formatSen` | yes: eslint `no-restricted-globals`, 2 errors |

Every probe was restored with `git checkout`, and `git status` shows no source change (only `qa/e2e/b03-r3.spec.ts`
and `docs/local.md` differ). The dev server must be restarted after probes: Vite's hot reload gave `db()` a second
module instance and made QA's own reads of the fake stale until it was.

## What I couldn't test, and why

- RLS, SQL views, API routes, pooled-connection ids: none exist in B03 (B05).
- A known merchant's second payment filing itself silently: the capture simulator isn't wired to the fake.
- The shell outbox surviving a kill, sync from the shell: B07 (a reload loses the in-memory fake, by design).
- `first-run`, `sign-in` and the native screens: B04/B08; only the before-the-first-salary landing is here.
- Correcting an amount (`12.345`, `abc`): the row is a stub (finding 36).
- A refund larger than its purchase; a malformed view landing in the error state.
- A real phone (font scale, haptic, back gesture, toast over the system bar): two run 3 checks added to `docs/local.md`.
- The repo's own `pnpm e2e`: it is the parent's. **My `pkill -f vite` briefly stopped its :4173/:4174 servers (I restarted them;
  the VM was later reclaimed), so re-run it before trusting any red in that window** (finding 41).
