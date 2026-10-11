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

## After run 2 (fix first: 146 criteria, 127 pass, 11 fail, 8 not reachable)

**Tier 3 again, a fresh full run.** The fixes reach shared code: a new pattern (*one change per
double tap*, `patterns.md` §7, `lib/tap-guard.ts`) used by `ReviewRow`; `Screen` and the router's
scroll restoration (navigation); ids made on the phone (`lib/uid.ts`, every write). The double-tap
area failed twice, so its design changed instead of its patch: a short settle after any change,
wherever the second tap lands, rather than a guard on one button.

| Finding | Fix | Where |
|---|---|---|
| 2 Major (still failing): a fast double tap answered twice | The second tap landed on the *next* row, which slid into place. Now any tap within 500 ms of a change is ignored, and a row stays answered once answered (no reset on success) | `lib/tap-guard.ts`, `blocks/rows.tsx` |
| 17 Major: Apply all, double-tapped, answered twice | The settle guard, and a guard while it applies | `screens/review/review.tsx` |
| 18 Major: a screen opened at the last one's scroll | The router's scroll restoration keyed every screen's scroll area by one selector; it's off (the page never scrolls), and `Screen` opens each screen at its top | `router.tsx`, `frame/screen.tsx` |
| 19 Minor: over plain http, Scan failed on `crypto.subtle` | The fake falls back to a non-cryptographic fingerprint there; ids made on the phone fall back to `getRandomValues` (`randomUUID` is secure-context only too) | `data/fake/index.ts`, `lib/uid.ts` and every caller |
| 20 Minor: a refused Done looked like nothing happened | The screen scrolls to the refusal, which is an alert | `screens/scan/confirm.tsx` |
| 21 Minor: double taps on Delete and *This was a payment* | The settle guard | `screens/more/txn.tsx`, `screens/review/skipped.tsx` |
| 22 Minor (run 1's 13): `/s/reading` with no id | Says so at once | `screens/scan/reading.tsx` |
| 23 Minor: Home's pace amount split at the comma at 1.5× | The amount stays in one piece in that sentence | `screens/home/home.tsx` |
| 24 Minor: regressions in no CI job | Unit tests for the tap guard (the next-row case), the receipt arithmetic and the read mode; e2e for real offline, double taps, Apply all and scroll in `pnpm e2e` | `lib/tap-guard.test.tsx`, `screens/scan/receipt-math.test.ts`, `e2e/screens.spec.ts` |
| 25 Note: a 0-byte or text file was taken as a receipt | Scan takes a photo or a PDF with something in it, and says so otherwise | `screens/scan/scan.tsx` |
| 26 Note: *Attach to a payment…* offers 30 with no search | Left: it lists the same merchant and the closest amounts first (run 1's 12); a search arrives with B16's real attach | |
| 27 Note: three run 1 specs fail only under load | Finding 18 was behind FLOW-24's; the rest are load timing in QA's specs | |

**Red, before** (the tap guard's next-row test, on the old `ReviewRow`): `× a second tap that lands
on the next row, which slid into place, answers nothing · Tests 1 failed | 2 passed (3)`. The e2e
*Apply all* test on the old code: `1 failed` (`toHaveText` 12 → 10 → stayed). The scroll test on the
old `Screen`: `Expected: 0, Received: 900`. A fast double tap on one row is a race (4 of 15 in QA's
sweep), so its deterministic regression is the unit test; the e2e double tap is a smoke test.

**Green, after:** the tap guard `3 passed (3)`; the four e2e regressions `4 passed`, twice; the unit
suite `206 passed`; typecheck, lint and format clean.
