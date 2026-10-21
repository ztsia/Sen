# QA report: B05 · Feel (run 1, full)

**VERDICT: fix first**  
37 criteria, 28 pass, 4 fail, 5 not reachable  
phases run: 1-3, 4b, 5, 6 (phase 4 does not apply)  
screenshots: `qa-artifacts/B05_feel/screens/` (35)

Motion, ripple, reduced motion and the six looks work as D140 says, and the lived-in journeys, route sweep and 13 breakage checks are green; but `pnpm typecheck` fails on the branch, sheets never ease to a new height (the hook never attaches), Home from a pushed screen slides back instead of crossfading, and nothing tests the web app's call into the shell's haptic (two probes survived). I had no Agent tool: I ran the sweep and the eyes pass myself.

## Suites

- typecheck: FAIL: apps/web/src/lib/haptics.ts(38,31) TS2345
- lint: clean
- unit (pnpm test): 198/198 pass
- test:db: pass on a rerun with Postgres started (the sweep ran it before the DB was up: exit 2 in 1 s); pgTAP 103 ok, API 78 pass 5 skipped
- e2e (pnpm e2e): 1391 pass, 1 fail (journeys.spec own-transfer, a scripted "covered" check); passes 2/2 alone
- e2e:lived: 24/24 pass
- e2e:server: 4/4 pass on a rerun with the DB up (sweep run: exit 1, DB down)
- mutants: 13/13 killed, none for this slice
- qa-diff: 87 entries, 0 trees changed, 3 entries with pixels changed (<=1/255 anti-aliasing), 21 metrics flags, 0 check findings
- QA specs (qa/e2e/b05feel-*): 25 pass, 3 fail (the findings below)

## Findings, worst first

| # | Severity | What breaks | AC / spec |
|---|---|---|---|
| 1 | Major | `pnpm typecheck` fails on the branch, so CI is red | brief B05-feel.md Done-when (code checks clean); AC-37 |
| 2 | Major | Sheets never ease to a new height: `useSheetResize` never attaches | AC-17, brief §3, patterns.md §8 Change motion |
| 3 | Major | The Home tab, tapped from a pushed screen, slides back instead of crossfading | AC-3, D140, patterns.md §8 A tab switch |
| 4 | Major | Nothing tests the web app calling the shell's `haptic`; two probes on it survived | AC-20, AC-22, brief §4 and Done-when |
| 5 | Minor | Every tap now has a DOM-mutation tail, so 17 of the 21 metrics flags are the ripple, and `step.settleMs` can no longer see real settling under about 430 ms | AC-27, qa/limits.ts, D139 |
| 6 | Minor | Taps are blocked for 400-1280 ms by a tab transition at 4x CPU; patterns says none is longer than 200 ms | AC-7, AC-27, patterns.md §8 Speed |
| 7 | Minor | With motion on and a slow CPU, journeys fail that pass on main (2 of 76 head journey runs, 0 of 76 on main) | AC-30, AC-33, brief Done-when (tests stay reliable) |
| 8 | Minor | No breakage check was added for this slice | D139 |
| 9 | Minor | One functional e2e test failed in the full run: `own-transfer` step 2 `covered` | AC-30 |
| 10 | Note | Small gaps: no ripple on `<summary>` rows; a failed `info()` turns haptics off for the session; `reject` skips an Enter-submitted form | AC-9, AC-22 |
| 11 | Note | Metrics flags other than the ripple: both re-measured, neither is a standing cost | AC-27, D139 |
| 12 | Note | How this run differed from the skill | skill qa |

### 1. [Major] `pnpm typecheck` fails on the branch, so CI is red

`apps/web/src/lib/haptics.ts` line 38: the two `return`s inside `.then((v) => {...})` have different promise types (`Promise<{performed:boolean}|undefined>` and `Promise<void|undefined>`). Vite doesn't typecheck, so the app builds and the e2e passes; the brief's Done-when says the code checks are clean.

**Repro:** cd /home/user/Sen && pnpm --filter @sen/web typecheck

**Output:**

```
apps/web typecheck: src/lib/haptics.ts(38,31): error TS2345: Argument of type '(v: number) => Promise<{ performed: boolean; } | undefined> | Promise<void | undefined> | undefined' is not assignable to parameter of type '(value: number) => { performed: boolean; } | PromiseLike<{ performed: boolean; } | undefined> | undefined'.
 ... Type 'void' is not assignable to type '{ performed: boolean; } | undefined'.
Exit status 2 (twice: in the sweep and on a rerun)
```

### 2. [Major] Sheets never ease to a new height: `useSheetResize` never attaches

The hook runs in `Sheet` on `[area, open]`, but the sheet's content is mounted by Radix's portal after the effect runs, so `area.current` is null and it returns without observing. No `ResizeObserver` is ever attached to a sheet's scroll area and `Element.animate` is never called. The category sheet going from its list (732 px) to *From now on / Just this one* (285 px) jumps; frames sampled every rAF for 500 ms saw only 732 and 285. Brief §3 and patterns §8 (*A sheet whose content changes eases to its new height*) are not met, and no test covers it.

**Repro:** qa/e2e/b05feel-sheet.spec.ts (FLOW-9b) and b05feel-sheet2.spec.ts, against a preview build: open a payment, tap its category, pick a category

**Output:**

```
RO observed: ["","scroll-area min-h-0 flex-1 pb-6","absolute top-0 left-0 w-full", ...] animate calls: []
heights seen [732,285]
sheet ask-sen area class: scroll-area min-h-0 flex-1 px-4 pt-2 pb-[max(1rem,... | observed scroll-areas: []
sheet scan-more ... observed scroll-areas: []
Error: a sheet changing step passes through in-between heights (AC-17)
```

### 3. [Major] The Home tab, tapped from a pushed screen, slides back instead of crossfading

`TabBar.toHome` goes back through history (`history.go(homeIndex - here)`) when Home is behind, so the router sees a screen-to-tab pop and plays `back` (the pushed screen slides out right). patterns §8: *A tab switch crossfades, a tab tapped from a pushed screen too*. The Review tab from a pushed screen does crossfade. The repo's own motion.spec misses it because it opens the pushed screen as history index 0, so `homeIndex` is unset and it takes the replace path. `motion.test.ts` pins `screenChange` only, not this path.

**Repro:** Home, More, Payments, then the Home tab; recorded `document.startViewTransition` types (qa/e2e/b05feel-motion.spec.ts FLOW-2)

**Output:**

```
TABS2 tab tab tab tab tab forward back
HOME-from-pushed: back
REVIEW-from-pushed: tab
Error: Home tab from a pushed screen: Expected "tab" Received "back"
```

### 4. [Major] Nothing tests the web app calling the shell's `haptic`; two probes on it survived

The brief wants haptics proved by an emulator test of the bridge call. `ShellTest` calls the native method, but the web side (`lib/haptics.ts`: check `info().bridge >= 2`, call `SenShell.haptic`, swallow a failure, v1 gets none) has no test: motion.spec's haptics test reads `__senHaptics`, which `haptic()` fills *before* it looks at the shell. Removing the bridge call, or calling it on a bridge-1 shell, leaves every suite green. With a stub shell (FLOW-8) the behaviour is right today: v1 makes 0 calls, v2 makes `toggle-on`/`toggle-off`, a throwing shell is swallowed.  The `FieldError` reject haptic has no test either (its focus guard survived).

**Repro:** Probe in a worktree: delete `if (v >= 2) return SenShell.haptic({ kind: NATIVE[kind] }).catch(() => undefined);`, then `pnpm exec vitest run` and `playwright test motion.spec`

**Output:**

```
### haptic bridge call removed: exit 0 (SURVIVED)  5 passed
### haptic bridge version check dropped (v>=2 -> v>=0): exit 0 (SURVIVED)  Tests 198 passed, 5 passed
### FieldError reject haptic on typing (focus check dropped): exit 0 (SURVIVED)
```

### 5. [Minor] Every tap now has a DOM-mutation tail, so 17 of the 21 metrics flags are the ripple, and `step.settleMs` can no longer see real settling under about 430 ms

`step.settleMs` is the last DOM mutation after the tap. The ripple adds `data-up` about 120 ms after the press and removes its node about 425-440 ms after it, on every tap that stays on its screen. Measured with a MutationObserver on a bare tap: mutations at 22 ms, 141 ms (`press`), 442 ms (`tab on active`) with motion, 425 ms with reduced motion. That matches the flagged steps (422-684 ms against main's 59-248; the ones that navigate show about 120-135 ms because the host is removed). `money-in/2` (+643) and `proposal/3` (+759) are that tail plus a 200-400 ms view transition (inferred from the sum, not separately measured). Recommendation: the metric should ignore `.press` mutations (`apps/web/e2e/metrics.ts`).

**Repro:** qa/e2e/b05feel-settle.spec.ts

**Output:**

```
motion no-preference: mutations (ms after tap): [[22,"attributes","tab on active"],[22,"childList","tab on active"],[24,"attributes","tab on active"],[141,"attributes","press"],[442,"childList","tab on active"]] last at 442
motion reduce: ... last at 425
```

### 6. [Minor] Taps are blocked for 400-1280 ms by a tab transition at 4x CPU; patterns says none is longer than 200 ms

patterns §8 *Speed*: taps are blocked while a screen transition runs, so none is longer than 200 ms. At the metrics' CPU 4x, a tab switch's view transition took 403-509 ms in total (150-200 ms before it even started), and 1277 ms (912 ms to start) for a second visit to Insights. Push: the new screen reaches the DOM 128-199 ms after the tap against 66-137 ms with motion reduced. The metrics' `step.firstChangeMs` doesn't flag it because the ripple answers in the first frame; no flag exists for the screen arriving late. The handoff already names the lever (tabs switch at once). The remaining `step:ask/3` flag (2401 ms against 137 on main) is, I think, this plus the Insights screen's own 2.2-2.7 s settle, but I did not prove that.

**Repro:** qa/e2e/b05feel-vtlen.spec.ts and b05feel-latency.spec.ts

**Output:**

```
home -> insights (tab) [{"types":"tab","readyMs":150,"finMs":403}]
home -> insights again (tab) [{"types":"tab","readyMs":912,"finMs":1277}]
motion no-preference: click -> txn figure in the DOM (ms, 4x CPU): [128,193,167,199,194,173]
motion reduce: [114,137,119,109,77,66]
```

### 7. [Minor] With motion on and a slow CPU, journeys fail that pass on main (2 of 76 head journey runs, 0 of 76 on main)

`metrics-head` failed `subscription` (strict-mode: `getByText('Claude Pro')` matched three elements of the old Insights screen, so the old screen was still in the DOM after the tap returned and `settled` passed) and `film-head` failed `scan-after` (`Reading receipt…` never seen in 20 s). Both fit the new screen's commit being held by the view transition's capture; I reproduced neither in isolation (scan-after passes at 4x CPU with motion on, 11 polls saw the text). The functional suite is safe because it runs reduced; the feel pass is not. `confirm-steps-head` ran 34 journeys with 0 failures.

**Repro:** node scripts/qa-diff.mjs; see qa-artifacts/B05_feel/metrics/logs/metrics-head.log and film-head.log

**Output:**

```
Error: ... Locator: getByText('Claude Pro') ... strict mode violation: resolved to 3 elements: 1) <span> 'Claude Pro · 20 Oct'  2) <td>Claude Pro</td>  3) <p> 'Next: Claude Pro on 20 Oct.'
Locator: getByText('Reading receipt…') Expected: visible Timeout: 20000ms Error: element(s) not found
```

### 8. [Minor] No breakage check was added for this slice

`qa/mutants.ts` has 13 entries, none on motion, ripple or haptics (13/13 killed, all older). My probes found 4 survivors (above) and 8 caught. See the entries named in the report.

**Repro:** node scripts/mutants.mjs

**Output:**

```
13 of 13 killed. A survivor is a finding: a guard no test holds (D139).
```

### 9. [Minor] One functional e2e test failed in the full run: `own-transfer` step 2 `covered`

`journeys.spec.ts:917 own-transfer`: the scripted check says the Public Bank to Ryt Bank row's button is covered by `p.item-description 'Transfer Filled in'`. It passed 2 of 2 alone, so it is a flake in one run of 1392; I can't attribute it to B05 (the functional suite runs reduced). Noted because the brief's goal is a suite motion can't make flaky.

**Repro:** pnpm e2e (full); alone: playwright test journeys.spec --project=preview -g own-transfer

**Output:**

```
Error: own-transfer step 2, one row, filled in ... {"check":"covered","detail":"button \"Public Bank → Ryt BankTransfer\" 390×58 under p.item-description \"TransferFilled in\""}
```

### 10. [Note] Small gaps: no ripple on `<summary>` rows; a failed `info()` turns haptics off for the session; `reject` skips an Enter-submitted form

(a) `TAPPABLE` in `frame/press.ts` has no `summary`, so the two disclosure rows (`settings/email.tsx:65`, `capture/apps.tsx:86`) get no ripple. (b) `bridgeVersion()` caches `0` when `SenShell.info()` rejects once, so haptics stay off until the app restarts. (c) `FieldError` skips the reject haptic when focus is in an input, so an error shown after Enter in a field is silent; tapping a button is felt. Read from code; (a) is also seen in the DOM (12 of 12 tappables on Home had ripples, summaries are not on Home).

**Repro:** read apps/web/src/frame/press.ts, apps/web/src/lib/haptics.ts, apps/web/src/components/ui/field.tsx

**Output:**

```
n/a
```

### 11. [Note] Metrics flags other than the ripple: both re-measured, neither is a standing cost

`screen:insights/year` settle 2184 ms (main 1258): re-measured 5 times a side: head [2106,1303,2067,1347,1495], main [1553,2449,1999,1138,2258]; blocking is the same. `screen:new-look` blocking 703 ms (main 0): re-measured 5 times: head [0,0,568,0,0], main [0,0,0,0,0]. One in five spikes on the branch; I could not find the cause (the screen runs its own view transition, and in isolation under 4x CPU both builds show 240-270 ms of long tasks). Accepted as intermittent; worth a look if it recurs.

**Repro:** QA_ONLY='["new-look","insights/year"]' QA_RUNS=5 playwright test -c e2e/diff.config.ts --project metrics-head metrics.spec

**Output:**

```
see detail
```

### 12. [Note] How this run differed from the skill

The reviewer had no Agent tool, so the sweep was run by me from a script (not a Haiku helper) and the eyes pass was done by me (Sonnet), not `qa-eyes`. The sweep ran `pnpm test:db` and `e2e:server` before Postgres was up (both failed in 1 s and 13 s); I started it and re-ran both: they pass. The qa-diff catalogue shows 3 entries with pixel changes of at most 1/255 (anti-aliasing), so the catalogued screens are unchanged, as the brief says. A unit test (`fake.test.ts` year) timed out once under heavy CPU load during a probe run.

**Repro:** -

**Output:**

```
-
```

## Breakage probes (phase 3)

| Broke | Caught |
|---|---|
| direction rule swapped (forward/back) | yes: motion.test.ts "pushes a step on, and pops a step back" went red |
| tab-to-tab crossfade rule removed from `screenChange` | yes: motion.test.ts "crossfades a tab to a tab" went red |
| router transition ignores reduced motion | yes: motion.spec "reduced motion: every change is at once" went red |
| ripple no longer skips switches | yes: motion.spec "a press shows in the first frame" went red |
| Undo no longer plays its haptic | yes: motion.spec haptics went red |
| Switch no longer plays its haptic | yes: motion.spec haptics went red |
| change motion type `change` replaced by `tab` | yes: motion.spec Review row went red |
| bridge call `SenShell.haptic` removed from haptic() | **no**: unit 198/198 and motion.spec 5/5 stayed green (the played[] list is filled before the shell is checked) |
| haptic called on a bridge-1 shell (v >= 2 -> v >= 0) | **no**: unit and motion.spec green |
| FieldError reject haptic fires while typing (focus check removed) | **no**: unit and motion.spec green |
| ripple on disabled controls (disabled skip removed) | **no**: motion.spec green; my FLOW-7 spec catches it |
| reduced-motion CSS for the ripple removed (it spreads under reduce) | **no**: motion.spec green; my FLOW-6 spec catches it |
| shared amount name left on outside a transition (type guard removed) | **no**: motion.spec green; my FLOW-3 spec (`named after []`) catches it |

Entries worth adding to `qa/mutants.ts` (file, find, replace, suite). The first six are caught today by the named suite and keep it that way; the last five survive until a test is written.

| File | Find | Replace | Suite |
|---|---|---|---|
| `apps/web/src/frame/motion.ts` | `if (b > a) return 'forward';\n  if (b < a) return 'back';` | `if (b > a) return 'back';\n  if (b < a) return 'forward';` | web (unit) |
| `apps/web/src/frame/motion.ts` | `if (TABS.has(from.pathname) && TABS.has(to.pathname)) return 'tab';` | (empty) | web (unit) |
| `apps/web/src/frame/motion.ts` | `if (reducedMotionNow()) return false;\n    const change` | `const change` | motion.spec |
| `apps/web/src/frame/press.ts` | `'[data-slot=switch], [data-slot=checkbox], [data-no-press], input` | `'[data-no-press], input` | motion.spec |
| `apps/web/src/blocks/toast.ts` | `if (action.label === 'Undo') haptic('undo');` | (empty) | motion.spec |
| `apps/web/src/components/ui/switch.tsx` | `haptic(on ? 'toggle-on' : 'toggle-off');` | (empty) | motion.spec |
| `apps/web/src/lib/haptics.ts` | `if (v >= 2) return SenShell.haptic({ kind: NATIVE[kind] }).catch(() => undefined);` | (empty) | needs a stub-shell test (b05feel-motion FLOW-8 is the model) |
| `apps/web/src/lib/haptics.ts` | `if (v >= 2) return` | `if (v >= 0) return` | same |
| `apps/web/src/components/ui/field.tsx` | `if (shown && !document.activeElement?.matches('input, textarea, [contenteditable]')) haptic('reject');` | `if (shown) haptic('reject');` | needs a test |
| `apps/web/src/frame/press.ts` | `if (el.matches(':disabled, [aria-disabled=true], [data-disabled]')) return null;` | (empty) | needs a test (b05feel FLOW-7 is the model) |
| `apps/web/src/styles/motion.css` | the `@media (prefers-reduced-motion: reduce)` block for `.press > span` | (empty) | needs a test (FLOW-6 is the model) |

After finding 2 is fixed, add one for `useSheetResize` too (drop its `sheet.animate(` call) with a test that samples heights.

## Metrics flags (phase 4b)

21 flags after the confirming pass; 315 standing; 0 check findings.

- **17 `step.settleMs` flags** (`fix/3`, `first-run/12`, `split-mine/11,12`, `split-stuck/1`, `balance-check/3`, `claims/2`, `capture-off/1,4`, `export/2,4`, `sign-in expired`, `members/1,7,9,11`): the ripple's DOM mutations, measured (finding 5). Taps that navigate show about 120-135 ms (the `data-up` attribute), taps that stay show 420-690 ms (node removal at about 425-440 ms). Accepted as a tooling artefact; the metric should skip `.press` mutations.
- **`money-in/2` (1897 vs 1254) and `proposal/3` (1371 vs 612):** the same tail plus a 200-400 ms transition; a sum, not a separate measurement.
- **`ask/3` (2401 vs 137):** a guess: tab transition blocked 400-1280 ms at 4x CPU (finding 6) plus Insights' own 2.2-2.7 s settle, which main's window cut at the next tap. Not proved.
- **`insights/year` settle, `new-look` blocking:** re-measured 5x a side, finding 11: not a standing cost.
- The brief's "no transition delays a tap's first visible change past 100 ms" holds for the ripple (no `firstChangeMs` flag) but not for the screen: finding 6.

## Pixels and screens (phase 5)

`qa-diff`: 87 entries, 0 trees changed, 3 entries with pixel changes (txn minted light and dark: 1790 and 1800 differing pixels; account line: about 1100-1250; settings line: about 10500), every one at most 1/255 per channel: anti-aliasing, no visible change. 0 scripted check findings. 1 unexplored screen (`reading`, a transient screen, unchanged). Eyes pass: `qa/B05-feel/eyes.md` (done by me, not `qa-eyes`).

## What I couldn't test, and why

- **The haptics on a real phone (the touch-feedback setting, the constants per Android version):** needs a device; the emulator test (ShellTest) could not run here and is queued in docs/local.md
- **The Kotlin ShellTest on the emulator:** no Android SDK or emulator in this session
- **Motion feel (smoothness, whether 200 ms reads right) and the Sen button during a push:** needs the owner's eyes on the phone; the brief says sign-off is the owner's
- **AC-14 (a failed write), AC-16 (the fade), AC-18 (toasts), AC-22 (reject haptic on typing):** no failing-write path in the fake; no sampling written in time; no screen found that shows an error on mount
- **A forced-reduced-motion switch in Settings:** no switch named reduce/motion found on Appearance

I read the handoff before writing the criteria (the skill says to); it describes what was built, so the criteria on *how* are weaker than a blind run, though every observable comes from the brief, D140 and patterns §8. I had no Agent tool: no Haiku sweep helper and no `qa-eyes` (finding 12).

A full run is warranted after the fixes: the sheet hook (`components`/`blocks/sheet.tsx`) and the tab bar's Home path are shared by every screen.
