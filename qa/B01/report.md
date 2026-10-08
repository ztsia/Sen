# QA B01 · Design system and the six looks: run 2 (fresh full run)

Branch `B01/design-system` at `c03c91a` (code as of `34e0961`; only `docs/handoff.md` moved during the run).
Reviewer run 2, 8 Oct 2026. **Published, with its 130 screenshots:** https://claude.ai/artifact/3tyzFqm3v81jS1GDM4sYSe
(run 1's link couldn't take an update from this session, so run 2 has its own). The local
`qa-artifacts/B01-design-system/` was then discarded; the `qa` skill says how to rebuild it.

```
VERDICT   fix first
          96 criteria, 92 pass, 3 fail, 1 not reachable
          phases run: 1-3, 5-6 (phase 4: B01 has no database or API)
          suites: unit 119/119 · slice e2e 68/68 · QA e2e 74/76 · typecheck, lint, format, looks, hygiene clean
          probes: 9 run, 7 caught, 2 not caught
```

Run 1's nine findings are fixed and hold up: every criterion they failed now passes, re-checked with run 1's
specs and new ones (real touch events, a path that leads nowhere, a slow and an unloadable look, Undo then a
change, back after Home → Review → Home, the production bundle). Two Majors remain, both about the guards
rather than the app: the slice's 48 px test never measures the tab bar, and the hygiene check lets a
denylisted string through in a commit message.

**On method.** Criteria and flows were written from the docs before any source was opened in this run. The
reviewer read run 1's criteria (also docs-only) first and kept their numbering; AC-53 to AC-70 and FLOW-15 to
FLOW-21 are new. Run 1's FLOW-15 is renumbered FLOW-22. `patterns.md` §1 and the brief were amended by the fix
commit (`tokens`, `extra` and `fonts` are CSS, not `DIR` fields); AC-12 is judged against the amended text.

## Findings, worst first

| # | Severity | What breaks | Repro | AC / spec |
|---|---|---|---|---|
| 1 | Major | The slice's 48 px test never measures the tab bar: tabs at 40 px leave all 66 preview tests green | shrink `.tab` in `frame.css`, run `playwright test --project preview` | AC-39, Done-when 2, patterns §8 |
| 2 | Major | Hygiene passes a denylisted string in a commit message, a binary file or a UTF-16 file | scratch repo below | AC-60, spec §17 |
| 3 | Minor | The CSP test passes a third-party script host | add a host to `script-src` in `vercel.json` | AC-16, spec §17 |
| 4 | Minor | The no-float lint bans names, not routes: twelve float paths pass it | ESLint `lintText` on planted snippets | AC-55, CLAUDE.md non-negotiable 1 |
| 5 | Minor | The shared error state is drawn in `destructive` red | `/nowhere`, compare colours | patterns §2, §7 |
| 6 | Minor | The gallery's Review row clears on two of three answers with no Undo | tap *Groceries* | AC-68, patterns §7 |
| 7 | Minor | Targets closer than 8 px; §8 contradicts contiguous rows | gallery spacing scan | AC-64, patterns §8 |
| 8 | Minor | A *Final* status card uses `money-in` green | gallery → Status cards | patterns §3 |
| 9 | Note | For the owner (carried): Copper's overspent figure is verdigris green | Copper, *Over by* | patterns §3 |
| 10 | Note | Hygiene drops a term under 3 characters, then says the secret is not set | `DENYLIST='MY'` | spec §17 |
| 11 | Note | `/s/scan-more` and `/s/sen` open as bare pages, no tab bar, no sheet | open the URLs | patterns §6 |
| 12 | Note | The gallery's chart tables list fewer rows than their charts (source read, not run) | `gallery.tsx` | patterns §4 |
| 13 | Note | The health bar colours its button by `className` at the call site (source read) | `status.tsx` | CLAUDE.md conventions |
| 14 | Note | Copper measures about 10 fps here, not 15 as `cloud.md` §5 says | `frame-times.mjs` | Done-when 9 |
| 15 | Note | The dev panel's handle covers content at the left edge in previews | gallery, Rows | patterns §1 |
| 16 | Note | Production ships source maps | `ls dist/assets` | spec §17 |

### 1 · Major · the tab bar's touch targets are untested

`apps/web/e2e/gallery.spec.ts` measures only `/dev/gallery`. The gallery isn't in the screen registry, so it
has no tab bar, and the most-tapped control in the app is never measured. Today the tabs are 56–59 × 80 px in
every look (QA's `b01-run2.spec.ts` measures them), so the app is right; CI just wouldn't notice a regression.
QA's `qa/e2e/` specs aren't run by CI.

Repro: in `apps/web/src/styles/frame.css` set `.tab` to `min-height: 0; height: 40px; overflow: hidden;`, then
`cd apps/web && pnpm exec playwright test --project preview`.

```
tab heights [ 40, 40, 40, 40, 40 ]
  66 passed (2.3m)
```

### 2 · Major · hygiene misses commit messages, binary and UTF-16 files

Spec §17: *no … employer name … goes in code, fixtures, commits*, and the PR check fails *on any string from a
private denylist*. `scripts/hygiene.mjs` greps contents with `git grep -I` (binary skipped) and reads paths,
but never commit messages, and a UTF-16 file reads as binary.

```
D=$(mktemp -d); cd $D; git init -q; git commit -q --allow-empty -m base; BASE=$(git rev-parse HEAD)
printf 'PNG\x00\x01binary-ish Example-Employer inside\x00' > shot.png
python3 -c "open('notes-utf16.txt','wb').write('host: ess.example-employer.test\n'.encode('utf-16'))"
git add .; git commit -qm 'Add files'
git commit -q --allow-empty -m 'Fix the claim for Example-Employer travel'
cd /home/user/Sen; DENYLIST='example-employer' HYGIENE_BASE=$BASE HYGIENE_HEAD=HEAD node scripts/hygiene.mjs $D
```
```
Checked 2 commit(s) in 6b01733..HEAD.
Hygiene check passed.
exit 0
```

### 3 · Minor · the CSP test has no teeth for hosts

`production.spec.ts` checks for `script-src 'self'` and no `unsafe`. With `script-src 'self' https://cdn.jsdelivr.net`
in `apps/web/vercel.json`, rebuilt and served:
```
  ✓  2 [production] › e2e/production.spec.ts:24:1 › the site sends a strict content security policy and no referrer (97ms)
  ✓  1 [production] › e2e/production.spec.ts:7:1 › production shows Not built yet, the pinned look, and no dev tools (855ms)
  2 passed (2.3s)
```

### 4 · Minor · no-float bypasses

These pass lint in both `apps/web/src/blocks/rows.tsx` and `packages/core/src/money.ts`:
```
MISSED  Number.parseInt
MISSED  window.parseFloat
MISSED  globalThis.parseFloat
MISSED  globalThis.Number()
MISSED  new Number()
MISSED  valueAsNumber
MISSED  implicit coercion t*1
MISSED  JSON.parse
MISSED  divide sen by 100 for display
MISSED  Intl.NumberFormat of sen/100
MISSED  toLocaleString of sen/100
MISSED  Math.round(x*100) of float
CAUGHT  parseFloat (control) no-restricted-globals
```
No current source uses any of them: the grep of `apps/web/src`, `packages/core/src` and `packages/looks/src`
finds only `money.ts`'s own integer division, a budget meter's percentage, and the looks' SVG geometry.

### 5 · Minor · error state in `destructive`

`ErrorState` is shadcn's `Alert variant="destructive"`. patterns.md §2: *`destructive` is for actions that
remove something.* From `qa/e2e/b01-run2.spec.ts › patterns.md §2: the error state is not drawn in the destructive colour`:
```
Expected: not "lab(40.2322 56.7272 44.9831)"
@ error colours {"color":"lab(40.2322 56.7272 44.9831)","destructive":"lab(40.2322 56.7272 44.9831)"}
```
Screenshots: `AC-53-error-colour.png`, `FLOW-15-step-2-unknown-path.png`.

### 6 · Minor · Review answers without Undo

`/dev/gallery`, tap *Groceries* on the ROTI BAKAR 88 row:
```
Error: an Undo toast after answering Groceries
Expected: 1
Received: 0
```
Screenshot: `AC-68-answer-groceries.png`.

### 7 · Minor · spacing under 8 px

```
figure ↔ overlays: 4.0 px | … | AppearanceChanges  ↔ BUTTON: 5.0 px | KOPI KAWANDrinks & ↔ A MERCHANT WITH A : 1.0 px | Mark as a transfer ↔ Delete: 1.0 px
```
The 4 px section links and the 5 px row-to-switch gap are real. Contiguous list and action rows are §7's
design, so §8 needs an exemption: a spec bug to fix in `patterns.md`.

### 8 · Minor · status colours borrow money colours

`apps/web/src/blocks/status.tsx`:
```
const tone: Record<StatusTone, string> = {
  neutral: 'text-icon',
  done: 'text-money-in',
  waiting: 'text-money-pending',
  warning: 'text-money-warning',
};
```

Notes 9–16 are in `results.json` with their repro and output.

## Probes (phase 3)

| Broke | Caught? | How |
|---|---|---|
| `apportion`: per-item rounding instead of largest remainder | yes | fixed-case test and property test red (counterexample `[53739083600,[547861067,1797644279,3782828342]]`) |
| `parseSen` through `Math.round(parseFloat(text) * 100)` | yes, by lint only | `58:26 error Unexpected use of 'parseFloat'`; unit tests stayed 55/55 green |
| no-float: `parseInt` ban removed | yes | `no-float.test.mjs` red |
| hygiene: case-insensitive match dropped | yes | `hygiene.test.mjs` red |
| hygiene: only the range's last commit checked | yes | `hygiene.test.mjs` red |
| dev panel forced into production | yes | `production.spec.ts` red |
| long-press: the lift's click not swallowed | yes | `edges.spec.ts` red, `Received "http://localhost:4173/s/crop"` |
| CSP `script-src` gains a third-party host | **no** | finding 3 |
| tabs 40 px tall | **no** | finding 1 |

`git status` was clean of app source after every probe; every probe was restored with `git checkout`.

## What I couldn't test, and why

- **CI on GitHub and the Vercel deploys (Done-when 8):** no PR is open, and Vercel isn't linked yet (`docs/local.md`).
- **Scan's long-press and its haptic on the phone:** needs the device; the phone check is already in `docs/local.md`.
- **Mercury and Copper on a phone GPU:** WebGL runs on SwiftShader here; 10–15 fps is an upper bound.
- **A toast's placement over the tab bar, clear of Sen's button (AC-33):** no tab screen can raise a toast in B01.
- **"Not synced yet" after 5 s, offline capture syncing once (AC-69):** no outbox or sync until B02/B07.
- **Core journeys:** `docs/flows.md` marks none as core, and every screen is a placeholder until B03.
- **Phase 4 (SQL, RLS matrix, routes, idempotency):** B01 has no database or API.
- **TalkBack speech:** needs the device; axe and the accessibility tree check names, not speech.

## Files

- `qa/B01/acceptance.md`, `qa/B01/flows.md`: criteria and flows (run 2 additions marked).
- `qa/e2e/b01-run2.spec.ts`: run 2's specs (FLOW-15–20, AC-39/62/64/66/67/68/70, the error colour, axe on the lost page and dev panel).
- `qa/B01/results.json`: the full record, rendered by `node scripts/qa-report.mjs qa-artifacts/B01-design-system`.
