# B01 · Acceptance criteria

Written by the QA reviewer from the docs only (brief `docs/briefs/B01-design-system.md`,
`docs/modules.md` B01, `spec_v2.md` §4, §5.1, §9.1, §9.4, §17, `docs/ui/patterns.md`,
`docs/screens.md` *Rules every screen follows*, D42–D44, D57, D58, D75–D84, `CLAUDE.md`
non-negotiables), **before** any app source was opened. Each criterion names an observable, and
each has a sad twin (marked `s`).

This slice has no database or API, so the RLS, dedupe and API phases don't apply (phase 4 is
recorded as having nothing to test).

## Money (`packages/core`)

```
AC-1   Accepted amount text parses into integer sen
       Given  the money module's parse function
       When   it reads "12", "12.5", "12.50", "1,284.50"
       Then   it returns 1200, 1250, 1250, 128450, each a safe integer
       Spec   brief *Money*; CLAUDE.md non-negotiable 1; patterns.md §3, §7 Forms

AC-1s  Everything else is rejected, never coerced
       When   it reads "12.505", "-12", "+12", "1-2", "12-", "abc", "", "  ", "1,28,4.50", "1e3",
              "0x10", "Infinity", "NaN", "12..5", "RM12", "1 284.50", a 400-character digit string
       Then   each is rejected (error result or throw); none returns a number;
              no value above Number.MAX_SAFE_INTEGER sen is ever returned
       Spec   brief *Money* ("three decimals, signs inside the text and anything else are rejected")

AC-2   Format: RM, thousands separators, two decimals
       When   formatting 128450, 0, 5, 100000000
       Then   "RM1,284.50", "RM0.00", "RM0.05", "RM1,000,000.00"
       Spec   patterns.md §3

AC-2s  Format refuses a non-integer
       When   formatting 12.5, NaN, Infinity
       Then   it throws; it never prints "RM0.13" or "RMNaN"
       Spec   CLAUDE.md non-negotiable 1

AC-3   Screen-reader form
       When   formatting 128450 for a screen reader
       Then   "RM 1,284.50" (space after RM), not a string of digits
       Spec   patterns.md §3, §8

AC-4   Apportion by largest remainder
       When   apportioning 100 sen across weights [1,1,1]; 1000 across [1,2]; 1 across [1,1,1]
       Then   [34,33,33]; [333,667]; [1,0,0] (or another largest-remainder-correct split);
              every result sums exactly to the total; every part is an integer
       Spec   brief *Money*; spec §5.1 *Money*

AC-4s  Apportion refuses bad input
       When   total is fractional (10.5), weights are empty, all zero, or contain a negative or NaN
       Then   it throws; it never returns parts that don't sum to the total
       Spec   brief *Money*

AC-5   Property tests exist and pass
       Then   a property test checks format → parse == identity over generated sen,
              and apportion parts sum to the total over generated inputs; `pnpm test` is green
       Spec   brief *Money*, Done-when 6

AC-5s  The property tests have teeth
       When   apportion rounds per item instead of by largest remainder (probe)
       Then   the suite goes red
       Spec   qa-reviewer phase 3

AC-6   No-float check
       Then   a lint rule or test fails when `parseFloat`, `Number(…)` or `toFixed` appears near money
       Spec   brief *Money*, Done-when 6

AC-6s  The no-float check fails on a planted `parseFloat` (probe in money code and in a web block)
       Spec   brief Done-when 6
```

## Repo hygiene and CI

```
AC-7   Hygiene check blocks a tracked `private/` path
       When   a file under private/ is force-added and the check runs
       Then   it exits non-zero and names the path
       Spec   spec §17 *Repo hygiene*; brief Done-when 7

AC-7s  Hygiene with DENYLIST
       When   DENYLIST contains a string planted in a fixture
       Then   it exits non-zero; when DENYLIST is unset it passes the private/ part and
              says plainly that the denylist part was skipped
       Spec   brief *Needs from you*; Done-when 7

AC-8   CI workflow runs typecheck, lint, unit tests and Playwright on every PR
       Spec   brief *The workspace*

AC-8s  No `pull_request_target`; no secret used except DENYLIST in the hygiene job
       Spec   spec §17

AC-9   Local suites green: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `pnpm build`
       Spec   CLAUDE.md § Commands

AC-10  `.gitignore` covers private/, database dumps and generated PDFs
       Spec   spec §17

AC-11  The built bundle contains no secret (grep dist for keys/tokens/private strings)
       Spec   CLAUDE.md non-negotiable 3; qa standing sad path
```

## Looks and theme

```
AC-12  Six looks as DIR objects
       Then   minted, instrument, firefly, line, mercury, copper each export id, name, tokens
              (light/dark), extra, radius, fonts, icons, icon, wordmark, heroFigure, strip,
              avatar.draw, tabs; reveal is empty
       Spec   patterns.md §1; brief *Theme and looks*

AC-13  `data-look` and dark mode switch the tokens
       When   the dev panel switches look and mode
       Then   <html data-look> changes, and computed --background / --primary / --chart-1
              equal the values in directions/assets/<look>/theme.css for that mode
       Spec   brief; patterns.md §2

AC-13s An unknown look id (stored or in the URL) falls back to a valid look, never an unstyled page
       Spec   patterns.md §1 (one of six)

AC-14  Money and chart hues keep meaning: chart-1..3 are blue, orchid, gold in every look;
       no hue outside charts.js
       Spec   patterns.md §3, §4; D83

AC-15  Fonts are self-hosted: no request leaves the origin while every look loads
       Spec   spec §17 CSP; brief

AC-16  Strict CSP, no third-party scripts
       Then   a CSP is served (header or meta) with script-src 'self' (no 'unsafe-eval',
              no third-party host); a planted inline script would be blocked
       Spec   spec §17; brief

AC-16s CSP still lets every look render (WebGL, fonts, workers) with no CSP violation in the console
       Spec   brief Done-when 1

AC-17  Each look's drawing is loaded lazily
       When   the app opens in one look
       Then   the other five looks' modules are not fetched
       Spec   brief *Port the six looks*

AC-18  Mercury and Copper without WebGL
       When   WebGL is unavailable
       Then   a still fallback is drawn; no uncaught error; the tab bar and avatar still render
       Spec   brief

AC-19  lucide icons take each look's stroke, line end and corner tokens
       Then   --icon-stroke / --icon-cap / --icon-join are
              minted 1.5 butt miter · instrument 1.8 square miter · firefly 1.6 round round ·
              line 1.5 round round · mercury 1.6 round round · copper 1.8 butt round;
              --icon-dot-cap is square in minted and copper
       Spec   patterns.md §5

AC-20  System / Light / Dark: System follows prefers-color-scheme live; the choice persists across reload
       Spec   spec §9.4; D44

AC-20s A stored garbage theme value falls back to System, no crash
```

## The frame

```
AC-21  Tab bar: five tabs, Home · Review · Scan · Insights · More, in that order with those labels, in all six looks
       Spec   patterns.md §1, §6

AC-21s Exactly one tab carries aria-current="page", and it's the one for the current route; none
       on a pushed screen's non-matching tabs
       Spec   patterns.md §6; Done-when 3

AC-22  Review's badge: 5 → shows 5, labelled "5 to review"; 120 → shows "99+"; announced politely (aria-live=polite)
       Spec   patterns.md §6; D83

AC-22s 0 → no badge and the label doesn't say "0 to review"; 100 → "99+" (not "100")

AC-23  Scan: a tap goes to the stand-in scanner; a hold of ≥500 ms opens the stand-in `scan-more` sheet
       Spec   patterns.md §6; D69, D83

AC-23s A tap does not open the sheet; a hold of ~300 ms doesn't open the sheet; a long-press
       doesn't also navigate to the scanner
       Spec   brief Done-when 3

AC-24  Sen's button: avatar 60 px, accessible name "Ask Sen", on the five tab screens
       Spec   patterns.md §6

AC-24s Absent on pushed screens and on task screens; the last row on a tab screen isn't covered
       by it (bottom padding)

AC-25  Tab bar hides on task screens: first-run, payday, confirm, manual, balance-check, scan, split-public
       Spec   patterns.md §6; screens.md rules

AC-25s Tab bar shows on pushed screens (e.g. payments, txn)

AC-26  A sheet adds a history step: browser back closes it and stays on the page
       Spec   patterns.md §10

AC-26s Back again (after the sheet is closed) leaves the screen; closing a sheet by Close/scrim
       doesn't leave a dangling history entry that needs an extra back

AC-27  Back on a tab other than Home goes to Home (browser); app bar back on a pushed screen goes back one
       Spec   patterns.md §6; D83
```

## Building blocks (`/dev/gallery`)

```
AC-28  The gallery shows every §7 block: screen frame + app bar, list row, day header, Review row,
       settings row, detail page, Field, money input, sheet, dialog, toast with Undo, status card,
       health warning bar, empty, loading skeleton, error, offline banner, "Updated 2 min ago", chart base
       Spec   brief *The frame and the building blocks*; Done-when 1

AC-28s Each in its states (e.g. row: in/out/pending/warning; field: error)

AC-29  List row ≥64 px; the amount is never truncated, the merchant truncates first
       Spec   patterns.md §7, §3; D83

AC-30  Money in carries "+" and money-in colour; money out no sign; "Not synced yet" in words;
       warning has icon and words
       Spec   patterns.md §3

AC-31  Money input: inputMode=decimal; typing "1,284.50" yields 128450 sen shown as RM1,284.50
       Spec   patterns.md §7 Forms

AC-31s Typing "12.505" or "-5" gives a message under the field on blur/submit; the submit button
       stays enabled and says what's missing; the typed text is kept

AC-32  Field: label above, message below; inputs ≥16 px font
       Spec   patterns.md §7, §10

AC-33  Toast with Undo stays 6 s, sits above the tab bar, doesn't cover Sen's button; Undo reverts
       Spec   patterns.md §7; D83

AC-33s A second change replaces the first toast

AC-34  Dialog only for destructive; uses destructive token on its action
       Spec   patterns.md §7

AC-35  Loading is a skeleton in `muted`, never a full-screen spinner; empty is one line + one action
       Spec   patterns.md §7

AC-36  Chart base: focus+context, separate series ≤3 + Other, sequential ramp, legend for ≥2 series,
       tap shows a tooltip
       Spec   patterns.md §4

AC-36s A fourth series folds into "Other" in chart-context

AC-37  Day header shows the date in Kuala Lumpur time whatever the browser's timezone
       Spec   patterns.md §7; CLAUDE.md conventions
```

## Accessibility

```
AC-38  axe: no contrast or label violations in all 12 combinations (6 looks × light/dark) on the gallery
       Spec   brief Done-when 2; patterns.md §8

AC-39  Every interactive element is ≥48 px in both dimensions (or its hit area is)
       Spec   brief Done-when 2; patterns.md §5, §8

AC-40  At text scale 1.5×, nothing in the gallery clips; amounts wrap rather than truncate
       Spec   brief Done-when 5; patterns.md §8

AC-41  The avatar plays all eight states in each look (resting, new note, listening, working,
       helpers, answering, paused, done)
       Spec   brief Done-when 4; D76

AC-41s Under reduced motion the avatar holds a still frame (two captures 1 s apart are identical)
```

## Web behaviour

```
AC-42  html, body overscroll-behavior none; -webkit-touch-callout none; tap highlight transparent;
       touch-action manipulation; user-select none except text fields
       Spec   patterns.md §10

AC-42s contextmenu is cancelled on non-text, not on inputs

AC-43  Viewport meta is exactly width=device-width, initial-scale=1, viewport-fit=cover,
       interactive-widget=resizes-content; no user-scalable=no in a browser
       Spec   patterns.md §10

AC-44  openInBrowser(url) helper exists and refuses non-https URLs
       Spec   patterns.md §10; spec §17

AC-45  Referrer-Policy: no-referrer is served
       Spec   spec §17
```

## Dev panel, registry, production

```
AC-46  Dev panel appears in a preview build: six looks, System/Light/Dark, reduced motion, text
       scale 1×/1.5×, state switcher, avatar state player
       Spec   brief *Dev panel and gallery*

AC-46s The production build has no dev panel, and /dev/gallery isn't reachable (no gallery code in
       the production bundle)

AC-47  The screen registry lists every screen id in screens.md, each `skeleton`
       Spec   brief

AC-47s In production a skeleton screen shows "Not built yet" and no data

AC-48  Production shows one pinned look, the first in the pool (Minted)
       Spec   brief

AC-49  Offline: context offline shows the offline banner (a banner, not an error) and removes it on reconnect
       Spec   patterns.md §7
```

## Housekeeping

```
AC-50  docs/handoff.md rewritten for the B01 branch; docs/local.md has the Vercel settings and the
       DENYLIST step; docs/cloud.md §5 records versions and /dev/kvm
       Spec   CLAUDE.md *Session rotation*; brief

AC-51  The stack's skills are added (shadcn, vercel-labs agent-skills, capawesome) and copied
       skills keep their licences
       Spec   brief; spec §17

AC-52  Frame times for Mercury and Copper at 390×844 with CPU throttling are measurable (script exists and runs)
       Spec   brief Done-when 9
```
