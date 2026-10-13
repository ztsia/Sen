# B04 · Redesign: QA report (run 1, full)

Published report: https://claude.ai/artifact/X8ErKKAZAXTpBt97iEpxYa

**VERDICT: fix first.** 105 criteria: 87 pass, 5 fail, 13 not reachable. No Blocker.
Phases run: 1-3, 5, 6. Phase 4 does not apply (no database, API or RLS in this slice).
Screenshots: `qa-artifacts/B04-redesign/screens/` (218 named in the report, plus the tour). Rendered report: `qa-artifacts/B04-redesign/report.html`.

Phases 1 and 2 (`acceptance.md`, `flows.md`) were written from the brief, D129/D130, patterns, screens and flows before any redesign source was opened.

Suites: unit 301/301 (re-run), typecheck clean, lint clean, hygiene passed, sweep e2e 720/720 (51 min). My own 119 walk tests: 93 pass, 26 fail; every failure is a finding or note below.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | Four of nine deliberate defects stayed green: chip size, balance-difference sign, txn Delete's Undo, Settings' Appearance state | see Probes | AC-13, 23s, 4s, 5s |
| 2 | Major | Review > Checks > "claim due" opens `/s/claim` with no id: "Not here any more" | Review, tap the Phone bill claim card | AC-29, flows `claims` |
| 3 | Minor | Home scrolls with the capture-off bar (63-80 px) or the Payday card (81-92 px); Sen's button then covers the Gap amount | `/?scenario=capture-off`, `/?scenario=payday` at 390x844 | AC-11s |
| 4 | Minor | Empty states with no title or button: Subscriptions, Goals, Memory, Research; Skipped has no button | `?state=empty` on each | AC-9 |
| 5 | Minor | Information rows carry an icon tile (Data > Last backup, Member > Shell version, Capture connected, txn > No receipt) | open them | AC-3s |
| 6 | Minor | Review chip rows scroll 6 px vertically (scrollHeight 42, clientHeight 36) | `/review` | AC-13 |
| 7 | Minor | Progress bars (Claims month, Members seats) have no `aria-valuenow` | `/s/claims` | patterns §8 |
| 8 | Minor | Rules show no origin line; rules are switch rows in one card; More says "3 open" where the brief says "RM24.40 owed to you"; PaceSpark 72 px not 64 | Settings > Categories > Rules | AC-34 |
| 9 | Minor | The year with no data draws an empty chart and "Heaviest month: Oct, RM0.00" | `/s/insights/year?state=empty` | AC-31s |
| 10 | Minor | Chart text is 10-11 px (below the 12 px caption floor) | `/insights`, `/s/insights/year` | AC-45s |
| 11 | Note | Members list shows unlabelled RM3.40 / RM5.00 (AI credit) | `/s/settings/members` | AC-40s |
| 12 | Note | first-cycle scenario shows "Payday plan · 2 of 3" | `/?scenario=first-cycle` | AC-12s |
| 13 | Note | "Bbq Place" (title case of BBQ); txn "Correct amount..." only toasts; Minted's micro-print band covers the top border of Home's balance card (`zoom-home-bottom.png`) | | D129 |
| 14 | Note | Line look draws cards without an edge, so Review and Claims read as ruled sections | Review in Line | AC-2 |

### Details and real output

**1. Tests do not pin the redesign.** The project suite only asserts targets are at least 48 px (which a bigger chip also passes) and axe. Deliberate defects that stayed green:
```
rows.tsx  size="chip" -> size="default"        : 61 passed (screens, blocks, journeys, edges, minted light)
balance-form.tsx  'less'/'more' swapped         : 2 passed (journeys balance-check, payday)
txn.tsx  write({type:'txn.delete'},{quiet:true}) : 2 passed (fix, manual journeys); no test deletes from the menu
settings.tsx  value="Minted"                    : 12 passed
```
I walked the real behaviour and it is right (Delete shows Undo and restores; difference is exact), so these are test gaps, not product bugs. They are worse than a failure: nobody will be told when they regress. The chip size is the bug D130 started from.

**2. Review > claim due.**
```
claim-due lands on http://127.0.0.1:5291/s/claim | Not here any more / This claim isn't here any more. / See all claims
```
`review.tsx` calls `go('claim')` without an id (same on origin/main); the review item carries no claim id.

**3. Home states.**
```
FIT capture-off minted light main=63 | instrument 72 | firefly 80 | line 65 | mercury 79 | copper 69   (dark identical)
FIT payday copper 81 | firefly 92
wei-ming, before-salary, first-cycle, cap, month: doc=0 main=0
```
The project's `home-fit.spec.ts` covers only the default scenario.

**7. Progress bars.** `September 2026: claimed against caps=null/100 ; Shell seats in use=null/100`.

## Probes (phase 3), `git status` clean afterwards

| Broke | Caught |
|---|---|
| Home PaceSpark box 72 px to 200 px | yes: home-fit red, 96 px over |
| Review chips `chip` to `default` | **no** |
| Apply all: tap guard removed | yes: "Apply all, double-tapped" red |
| Balance difference more/less swapped | **no** |
| txn Delete without Undo | **no** |
| Capture apps: blocked switches not disabled | yes: capture.spec red |
| Appearance row hard-coded | **no** |
| `apportion` floor replaced by float rounding | yes: 7 unit tests red |
| Float arithmetic injected into the balance form | yes: lint x3 |

## What passed, with evidence

Money (integer sen): manual amounts `12.345`, `abc`, empty, `-5`, `0`, a 20-digit number, `1e3`, `12.5.5` all refused in words with no rows written; `0.1` stored as 10 sen, `1,284.50` as 128450; balance difference exact (RM0.10 more/less, RM262.20 less) and Save booked `[10,"in"]`. Splits: shares sum to the bill, Teh ÷3 = 4.67/4.67/4.66, Mei RM22.14 = 6.99 + 2.67 + 12.48; Final only when everyone is done and every item claimed. Review: answer creates a rule, Undo removes it, double tap answers once, Sen's 2 suggestions are 2 marked chips. Offline: banner, answer kept, synced once. Timezone: Home and Payments text identical in KL, Los Angeles, Auckland. Production: no gallery, dev panel or scenario; no key patterns in the bundle. Capture: Messages, WhatsApp, Gmail, Instagram cannot be chosen. Members: no money outside the AI credit card. Core journeys first-run (bad email, wrong code, reload resumes), pay-new (rule made), scan-after (attached, Undo, same file twice says Already added).

## What I couldn't test, and why

- The phone's Chromium webview and TalkBack: needs the device (owner's check of *Sen review*).
- Phase 4: no database, API or RLS in this slice.
- A full flow walk in all six looks: flows walked in Minted, with Copper and Line spot checks; the other looks only through the sweep's 1512 screenshots as contact sheets.
- Not reachable (marked so): AC-7s, 9s, 16s, 17s, 21s, 34s, 37s, 38s, 41s, 49s, 53s, 54, 54s.
- `edges.spec.ts` look tests fail on a clean tree against the dev server (environment); they pass in the sweep on the preview build.

Specs: `qa/e2e/b04r-*.spec.ts` (run with `b04r.config.ts`; `b04r-probe.config.ts` runs the project suite against QA's dev server).
