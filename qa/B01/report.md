# QA of B01 · Design system and the six looks (`B01/design-system`, 8 Oct 2026)

The `qa-reviewer`'s report, saved in the repo. Screenshots (102) and the rendered `report.html` were
in `qa-artifacts/B01-design-system/`, which isn't committed.

```
VERDICT   fix first
          76 criteria, 67 pass, 9 fail, 0 not reachable
          phases run: 1-3, 5-6 (phase 4 skipped: B01 has no database or API)
```

The frame, the money module and the six looks mostly hold up. Three Majors need fixing before the
PR: an unknown screen id crashes to the router's default error page; a real touch long-press on Scan
ends up choosing a row in the sheet it just opened; and the no-float lint doesn't guard `Number()`
outside files named `money*`.

**Passed:** the money tests have teeth; tokens match each look's `theme.css` in all 12 look and mode
pairs; axe finds nothing on five screens, the sheets and the gallery; no request leaves the origin;
production is pinned to Minted, shows *Not built yet* and no dev tools; KL dates hold in another
time zone; the real no-WebGL fallbacks draw; 1.5× text grows (16 → 24 px) and nothing clips.

| Suite | Result |
|---|---|
| Unit | 114/114 pass |
| The slice's own e2e | 58/58 pass |
| QA's journeys (412×915, `qa/e2e/`) | 48 specs: 39 pass, 9 fail |
| Typecheck, lint, format | clean |
| `looks.gen.css` | up to date |

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | `/s/<unknown id>` shows TanStack's default "Something went wrong!" with no tab bar and no way back. `AnyScreen` throws `redirect()` inside render; the root route has no `errorComponent` or `notFoundComponent`. `/nope` shows a bare "Not Found". Same in production | Open `/s/does-not-exist` | patterns.md §7 Error; brief Goal |
| 2 | Major | With real touch events, a 650 ms hold on Scan opens *Add a payment*, then lifting the finger clicks the *From gallery* row now under it and navigates to `/s/crop`. The slice's test uses mouse events, which can't show this | QA FLOW-3, `touchHold(…, 650)` | AC-23s; D69, D83; done-when 3 |
| 3 | Major | The no-float lint bans `Number()`, unary `+` and `parseInt` only in `money*`-named files. Planting `Math.round(Number(typed) * 100)` in `blocks/rows.tsx`, `detail.tsx` or `hero.tsx` passes | Plant, run eslint, then `git checkout` | AC-6; CLAUDE.md non-negotiable 1 |
| 4 | Minor | Switching look sets `data-look` before the look's code arrives: the tab bar grows from 79 to 134 px with *More* wrapped. Offline it stays broken, because `loadLook` has no `catch` | Delay the copper chunk 3 s (FLOW-1d); FLOW-12 | patterns.md §1, §6 |
| 5 | Minor | A change made within about 200 ms of tapping Undo gets no toast, so it has no Undo: every toast reuses the id `sen-toast` | Show a toast, Undo, show a toast at once | AC-33s; spec §6.7 |
| 6 | Minor | Review's badge count isn't in any `aria-live` region, so changes aren't announced | FLOW-4 | AC-22; patterns.md §6 |
| 7 | Minor | Home → Review → Home, then back, lands on `/review` instead of leaving | FLOW-2b | AC-27; D83 |
| 8 | Minor | The hygiene check passes a denylisted string that appears only in a file path, or only in an earlier commit of the PR | Plant `qa/B01/QA-PLANTED-EMPLOYER-ZXQ/a.txt`; a scratch repo with a commit-then-delete | spec §17 |
| 9 | Minor | `gallery-*.js` (398 kB) and `dev-panel-*.js` ship in the production build, referenced from the entry chunk and served with 200, though nothing loads them. Any build without `VERCEL_ENV` or `SEN_ENV` set to `production` gets the dev tools | Production build, then `ls assets` | AC-46s |

**Notes:**
- `DIR` objects have no `tokens`, `extra` or `fonts` fields (AC-12); those values live in CSS.
- The offline banner isn't wired to the connection (AC-49); probably B07's.
- Three dev-panel toggles are 35–41 px wide.
- The gallery's money form toasts *Added RM1284.5* from the raw text, not the formatted amount.
- Copper draws an overspent figure in verdigris green, as its design source intends. That conflicts
  with patterns.md §3, "green means money in". For the owner to decide.
- Gaps in the slice's own tests: the WebGL fallback is reached through `?gl=0` (QA checked a browser
  with WebGL really off: both fallbacks draw); the avatar test never checks the eight states differ
  (QA checked: they do); the long-press is driven by mouse only, which is how finding 2 stayed hidden.
- `parseSen` trims a trailing newline or no-break space; documented and safe.

## Evidence for the Majors

- **1:** `errors = ["console: Response"]`;
  `URL http://localhost:4176/s/does-not-exist -> … :: Something went wrong! | Hide Error :: tabs 0`
- **2:** a 650 ms touch hold: `touchstart rect` → `touchend rect` → `click BUTTON.From gallery`;
  `URL after: http://localhost:4173/s/crop`
- **3:** `eslint exit: 0`, then `Tests 13 passed (13)`

## Probes (each reverted with `git checkout`)

| What was broken | Caught? |
|---|---|
| `apportion` rounds per item | Yes: 2 tests red |
| A float inside `parseSen` that still gives the right answers | Yes, by lint and `no-float.test`; behaviour tests stayed green, as expected |
| `Number()` / unary `+` in non-money-named blocks | **No** (finding 3) |
| `DEV_TOOLS` forced on in production | Yes: `production.spec` red |
| Badge threshold moved to `> 100` | Yes: `units.test` red |
| Hygiene stops looking at nested `private/` | Yes: `hygiene.test` red |

## What couldn't be tested, and why

- **Scan's long-press on a real phone**, including Android's *Touch and hold delay* at Medium or
  Long: headless Chromium doesn't time a long-press as a phone does. The check is in `docs/local.md`.
- **CI on GitHub and the Vercel deploys:** CI runs only on a PR or a push to `main`; Vercel isn't
  linked yet.
- **Mercury and Copper on a phone's GPU.** Here, at 4× CPU slowdown on a software renderer, Mercury's
  median frame is 50 ms (92–95% of frames over 33 ms) and Copper's 66.6 ms (99%).
- **Where the toast sits against the tab bar and Sen's button:** no tab screen can raise one yet.
- **Haptics and TalkBack:** both need a device.
- **Core journeys:** `docs/flows.md` marks none as core, and every screen is a placeholder until B03.
- **Phase 4:** no database or API until B05.
