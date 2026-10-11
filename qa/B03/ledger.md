# B03 · QA ledger

Every fix after a QA run, its tier and why (the `qa` skill), with its evidence.

## After run 1 (fix first: 118 criteria, 100 pass, 11 fail, 7 not reachable)

**The batch is tier 3, a fresh full run.** Several fixes reach code every journey passes through: the
query client's network mode (`data/index.ts`, every read), `ReviewRow` (a `patterns.md` building
block), `BudgetMeter` (a chart block), the shared types (`Receipt.contentHash`, `TxnView.changes.by`,
the `receipt.commit` command) and `lib/dates.ts`. So no fix here is self-verified alone; run 2
re-checks them all. Red-then-green unit tests were still written for the data findings.

| Finding | Fix | Where |
|---|---|---|
| 1 Major: real offline froze the screens | Queries and mutations run with `networkMode: 'always'`: the backend works offline (the fake now, the outbox from B07), so a read never waits for the network | `apps/web/src/data/index.ts` |
| 2 Major: a double tap applied an answer twice | `ReviewRow` takes one answer at a time (a ref guard and `aria-disabled` while it's applied); the fake's `txn.kind` transfer is a no-op once the transfer has its other side, as a retried sync must be (§6.5) | `blocks/rows.tsx`, `data/fake/apply.ts` |
| 3 Major: the same file twice made a second receipt | Upload hashes the file (SHA-256); `receipts.contentHash` (§15's `content_hash`) and `receipt.commit` carry it; a second commit of the same file, or of the same id, is *Already added* | `packages/core/src/{schema,views,commands}.ts`, `data/fake/{index,apply}.ts`, `screens/scan/confirm.tsx` |
| 4 Major: a new payment wasn't at the top | Instants sort by time (`Date.parse`), never by text: `+08:00` and `Z` don't compare as strings; balances' opening check too | `data/fake/views.ts` |
| 5 Major: Add expense opened first ended on `about:blank` | Save goes back only when there's a page to go back to, else Home | `screens/scan/manual.tsx` |
| 6 Major: three probes went uncaught | Tests that catch each: forecasts change no figure, a receipt committed twice is one, the small things stop below RM15.00 | `data/fake/fake.test.ts` |
| 7 Minor: From gallery led nowhere | Scan-more's *From gallery* opens Scan, which has the gallery picker in a browser | `frame/sheets.tsx` |
| 8 Minor: by hand, items over the payment saved | *Done* refuses it and says why, under the check | `screens/scan/confirm.tsx` |
| 9 Minor: Changes named no actor | Each change says who: *by you*, *by Sen*, or *automatically* (`audit_log.actor`) | `views.ts`, `data/fake/{apply,views}.ts`, `screens/more/txn.tsx` |
| 10 Minor: one of two suggestions marked | The scenario's suggestion names the button's key, the account's id | `data/fake/scenario.ts` |
| 11 Minor: over budget read as *At risk* | Over its cap, a meter says *Over by RM20.30* (patterns §3) | `blocks/charts.tsx` |
| 12 Minor: *Attach to a payment…* was newest first | Same merchant first, then the closest amount | `screens/review/review.tsx` |
| 13 Minor: `/s/confirm` with no id loaded for ever | No id says so at once, with the way home | `screens/scan/confirm.tsx` |
| 14 Minor: scenario slips | Goal contributions end in September; owing Mei no longer names Public Bank; a day header from another year carries its year | `scenario.ts`, `review.tsx`, `lib/dates.ts` |

**Red, before the fixes** (`npx vitest run --project web apps/web/src/data`):

```
× F4: a payment added now is the newest row, whatever offset its time was written in
× F2: a transfer answered twice still has one filled-in side
× F3: the same file twice is Already added (§6.5), by its content hash
Tests  3 failed | 27 passed (30)
```

The three F6 tests passed on the code as it was: they're the regression tests the probes lacked,
and each fails with its probe put back (checked by hand for the forecast probe).

**Green, after:** `Tests 30 passed (30)`; the whole unit suite `197 passed`; typecheck and lint clean.

**QA's own specs after the fixes** (`qa/e2e/b03.config.ts`, at 412×915): 102 passed, 3 failed, none
a defect: AC-6 needs a production build on :5182, which this check didn't serve; FLOW-12 picks
GRABFOOD from *Attach to a payment…*, which finding 12 reorders by amount; FLOW-17 waits for a toast
after an overshoot that finding 8 now refuses. Run 2 judges both against the spec.

**Lint on QA's specs:** `qa/e2e/**` may use `any` (they probe the fake through untyped handles,
`eslint.config.js`); unused imports were removed and the files formatted. No assertion changed.

**The repo's `pnpm e2e` after the fixes:** 319 of 320. The one red was B02's long-press test, which
expected *From gallery* to open `crop`; finding 7 sends it to `scan`, so the assertion now says so
(`e2e/edges.spec.ts`). Re-run alone: green.
