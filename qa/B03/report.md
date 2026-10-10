# QA B03 · Skeleton: the five tabs: run 1 (full)

```
VERDICT   fix first
          118 criteria, 100 pass, 11 fail, 7 not reachable
          phases run: 1-6      screenshots: qa-artifacts/B03-skeleton-tabs/screens/ (181)
```

The slice has screens, a fake in-browser backend and shared types: no SQL, API route or RLS. Phase 4 ran
against the fake's read and write functions and the shared types, with raw-row oracles. The run stopped once at
an API limit and carried on; nothing was lost. Phases 1 and 2 were written before any B03 source was opened
(`qa/B03/acceptance.md`, `qa/B03/flows.md`). Specs: `qa/e2e/b03-*.spec.ts`, config `qa/e2e/b03.config.ts`.

Suites: unit 190/190, typecheck and lint clean, repo e2e 320/320 (390x844). This run: 412x915, all 13 screens ×
6 looks × light/dark clean on axe and 48 px targets, KL/LA/Kiritimati/UTC/Pago Pago identical, production bundle
clean.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Real offline freezes every screen: an offline write is applied and toasted but not shown until reconnect | `context.setOffline(true)`, answer ROTI BAKAR 88 on Review | AC-12, AC-70, §5 |
| 2 | Major | A double tap on a Review answer applies it twice; one Undo then does nothing | dblclick `Public Bank` on the transfer-missing row | AC-18s, AC-63, §6.5 |
| 3 | Major | The same receipt file twice becomes a second waiting receipt, not "Already added" | scan the same file twice, Done each time | AC-31, §6.5 |
| 4 | Major | A payment added just now is not at the top of Payments (mixed `+08:00` / `Z` string sort) | add RM1,234.56, open Payments | AC-52b, screens.md payments |
| 5 | Major | Add expense from a first page (launcher shortcut / deep link) ends on about:blank after Save | open /s/manual, Save | AC-36b, §9.1 |
| 6 | Major | Probes on the prediction-vs-fact rule, receipt idempotency and the small-things boundary stayed green | see probes | CLAUDE.md, phase 3 |
| 7 | Minor | Scan-more "From gallery" lands on "Pick a photo first." with no picker | hold Scan, From gallery | D69 |
| 8 | Minor | By hand, items of RM1,009 on a RM64.13 payment still save | No receipt… > Enter the items | D90 |
| 9 | Minor | *Changes* names no actor | add a note, read Changes | §6.7 |
| 10 | Minor | "Sen suggested 2 answers, marked below" marks and applies 1 (`pbb` is not a button key) | Review > Apply all | screens.md review |
| 11 | Minor | Over-budget reads "At risk: 107% spent", not "Over by RM20.30" | Insights > budgets | patterns §3 |
| 12 | Minor | *Attach to a payment…* is newest-first, not same merchant / close amount | Review > MR DIY | flows.md receipt-first |
| 13 | Minor | /s/confirm without an id is a skeleton forever | open /s/confirm | patterns §7 |
| 14 | Minor | Made-up data slips: a 30 Oct goal contribution counts as saved on 18 Oct; month scenario's Review mentions Public Bank; Payments' day headers have no year | see results.json | D11 |
| 15 | Note | By-design gaps: no email receipt view (D91), delete doesn't dismiss an event, reload loses the fake, pay-new's second payment and first-run unreachable | | |
| 16 | Note | Repo e2e runs at 390x844, this review at 412x915; both pass | | |

### Real output

1. `OFFLINE: toast= "ROTI BAKAR 88 is Meals from now on\nUndo" | row still on screen = 1 | heading = Needs you · 12 | fake db = {"cat":"27a1…","review":11,"u":1}` then `back online: row on screen = 0`. Cause: TanStack Query's default `networkMode: 'online'` pauses refetch once `navigator.onLine` is false. The dev panel's offline state never cuts the connection, so the repo's checks miss it.
2. `double-tap on Public Bank: {"before":{"n":1199,"inferred":12},"after":{"n":1201,"inferred":14}}` and `after one Undo following a double tap, the row is back: false`.
3. `second identical file -> toast: "Waiting for its payment. It’s in Review\nUndo" receipts 46 -> 47 waiting 2`.
4. `[ 'Sun, 18 Oct | Spent RM1,432.19', 'SATE KAJANG HJ SAMURI … RM64.13', 'GRABFOOD … RM32.50', "Nando's … RM83.50", 'A VERY LONG MERCHANT NAME … RM1,234.56' ]` (saved 20:40 KL, rows are 19:30-19:58 KL). Cause: `rows.sort((a, b) => b.at.localeCompare(a.at))`, also in Review and the last-account default.
5. `after Save when manual was the first page: about:blank` (`router.history.back()`).
6. With the forecast probe in place: `Tests 190 passed (190)` and `4 passed` for `daily|subscription|insights|budget in minted, light`.
8. `Items come to RM944.87 more than the payment` then toast `Attached to RM64.13 on Ryt Bank`.

## Probes

| Broke | Caught |
|---|---|
| `apportion`: leftover sen never handed out | yes: money.test (largest remainder, property), fake.test |
| `parseSen` through `parseFloat` | yes: two property tests, no-float test |
| `spentIn` adds subscription forecasts to spending | **no**: 190 unit and 4 e2e journeys green; only qa/e2e/b03-home.spec.ts red |
| `txn.create` duplicate-id guard removed | yes: fake.test |
| `receipt.commit` duplicate-id guard removed | **no** |
| `dates.ts` `timeZone: KL` removed | yes: 3 unit tests |
| small things `<` → `<=` RM15.00 | **no** (one unrelated timing flake in the no-float planted test, green on re-run) |

`git status` is clean of source changes; every probe reverted with `git checkout --`.

## Passed, with evidence

Home figures equal an independent computation from raw rows (income 580480 − spent 387353 = 193127); the cycle
sheet equals Home; RM0.00 left vs Over by RM0.01; all scenarios; D19 table, refund and non-spend kinds on
`spendingOf`; largest remainder for 1-7 parties over −3000..30000 sen; amount parsing against 24 hostile inputs;
day totals on 18 days equal the oracle; 14 of 14 Insights questions with takeaways equal to raw rows; the year by
KL month; five browser time zones identical with payments at 23:59, 23:30 and 00:00 KL; production on 20 paths.

## What I couldn't test, and why

- RLS matrix, SQL views, API routes, pooled-connection user ids: none exist in B03 (B05).
- The shell outbox surviving a kill, sync exactly once: B07. The fake is in memory, so a reload loses it.
- The second payment at a known merchant asking nothing, and first-run's setup steps: B02's simulator isn't wired to the fake ledger; first-run is B04/B08.
- A failed receipt read end to end, a per-item category change on confirm, an email receipt view: no control or fixture reaches them.
- Real device checks (haptic, toast over the nav bar, WebView back, airplane mode): queued in `docs/local.md`.
