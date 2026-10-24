# QA: what Sen adds to the workflow's `qa` skill

The plugin's `qa` skill, `workflow:qa-reviewer` and `workflow:qa-eyes` hold the method. This file
holds what's true of Sen only, and wins where they differ. Moved here from the project's own copies
when Sen took up the plugin.

## The skill (main session)

- **The looks:** pixels are compared in all twelve look-and-mode pairs (six looks, light and dark).
  Behaviour runs once, in Minted light (D137).
- **The trees** are `apps/web/e2e/trees/*.aria.yml`, re-recorded by `pnpm --filter @sen/web e2e:trees`.
- **The sweep's commands**, from the checkout (`/home/user/Sen` in a cloud session), one at a time,
  never two at once (they share ports and `sen_test`):
  `pnpm typecheck; pnpm lint; pnpm test`, then `pnpm test:db`, then
  `E2E_SHOTS=$PWD/qa-artifacts/<branch>/sweep/screens pnpm e2e`, `pnpm --filter @sen/web e2e:lived`,
  `pnpm --filter @sen/web e2e:server`, `node scripts/mutants.mjs`,
  `node scripts/qa-diff.mjs --out qa-artifacts/<branch>/diff`.
- **Security checks:** Sen has no dedicated command yet. Until one exists, the sweep runs
  `pnpm audit --audit-level high` and `pnpm hygiene`, and says the secret scan and the stack's
  security lint rules are missing.
- **Retaking the report's screenshots:** serve the preview builds, then `playwright test` from
  `qa/e2e`, as `qa/e2e/playwright.config.ts`'s header says.
- **A full run** is also due when a fix touches `apps/web/src/components/ui/`, a pattern in
  `docs/ui/patterns.md`, the money module (`packages/core`), or a SQL view or function Sen's agent
  reads.
- **Scoped areas** are named the way the spec names them, such as *the capture path, from a chosen
  app's notification to what's stored (spec §6.2)*.
- **The viewport** is a phone's, 390×844. Tier-1 visual fixes are checked there.
- **Bugs the owner found** are in `qa/escapes.md` (D137). The workflow's retro lessons go to
  `ztsia/workflow`, which replaced the owner's `claude_skills` repo.

## The reviewer

- **Sources of truth:** `spec_v2.md` and `docs/decisions.md`; `docs/flows.md` and `docs/screens.md`;
  `docs/ui/patterns.md`. A slice's scope is its brief in `docs/briefs/` and its entry in
  `docs/modules.md`. The **core** journeys in `docs/flows.md` (D124: `first-run`, `pay-new`,
  `scan-after`) are walked in every run.
- **Criteria name Sen's observables:** a row count in `bank_events` or `transactions`, a rendered
  string, a value in sen.
- **Probes to add, beyond `qa/mutants.ts`:** one apportionment step in floating point, or rounding per
  item instead of by largest remainder; one RLS policy disabled; a forecast row let into a spending
  view; an OTP, or a notification from an app the person didn't choose, let through the listener's
  filter.
- **SQL to check by hand:** balances, per-cycle totals (D14), budget status, the unaccounted gap and
  owed-to-you, each worked out from the fixture rows first.
- **The RLS matrix's columns:** no user id set, user A, user B, admin, split-link function, owner role.
  The admin seeing anyone's money, or a split-link function reaching beyond its one split, is a
  Blocker. Also prove that two requests on one pooled connection never see each other's user id.
- **Routes:** the route table is `apps/api/src/routes.table.ts`; errors are `{ code, message, field? }`.
- **The web app is the real UI** (D42): walk flows in Chromium at 390×844, specs in `qa/e2e/`.
  Native-only parts (the listener, the scanner, notification buttons, widgets) go through the dev
  panel's simulator; what needs the real phone goes under `notTested` and into `docs/local.md`.
- **Timezone:** run once with the browser's timezone other than `Asia/Kuala_Lumpur`.
- **Chromium is preinstalled in cloud sessions: never run `playwright install`** (`docs/cloud.md` §1).
- **What you may write:** `qa/`, `qa-artifacts/`, phone checks in `docs/local.md`, and the trees
  the diff run rewrites in `apps/web/e2e/trees/`.

### Sen's standing sad paths

Add these to the plugin's table; never skip one that applies.

| Sad path | What must happen | Spec |
|---|---|---|
| The same notification is posted twice, or updated with identical text | One transaction | §6.2, §6.5 |
| Two genuine identical payments a few minutes apart | Two transactions: the dedupe key includes the notification's `when` | §6.2 |
| A receipt is scanned for a payment a notification already recorded | It attaches; no second transaction | §6.4 |
| The receipt comes first and the notification later | The receipt waits, then attaches; never a second payment | §6.4 |
| A shared bill with only some items ticked as yours | Shares sum exactly to the total, in sen, with no float anywhere | §6.4, §7 |
| A transfer between your own accounts | Not spending, not income; both balances move | §7 |
| A friend repays you | Spending plus owed-to-you falls by exactly the repayment, whether or not a share was set (D19) | §7 |
| A subscription forecast | Never in spending, budgets or surplus | §11 |
| An OTP or TAC notification, or one from an app the person didn't choose | Never stored, never reaches JavaScript | §6.2 |
| A bank notification in an unknown format | In *Needs attention*, with the raw text kept | §6.2 |
| A payment at 23:30 KL time on the last day of a month | In that calendar month for claims, and in the pay cycle its KL time falls in, whatever the device's timezone | D14 |
| Something captured offline, then the app is killed | The outbox survives and syncs exactly once | §6.2, §18 |
| Asking Sen for a number no tool returned | It says it doesn't know | §12.2 |
| Answering the category prompt | A merchant rule is made, and the next payment there asks nothing | §6.3, §8 |

**Grep the diff for floating-point money:** `parseFloat`, `toFixed` on amounts, `Number(` on amount
strings, and division in money paths outside the money module. Each is a Blocker until shown safe.

## The eyes pass

- **Read first:** `docs/ui/patterns.md` §2 *Sizes* (D129), §3 (money) and §7 *Calm, card-based
  screens* (D130).
- **The default look** is Minted light, then Minted dark.
- **Question 5 is about money:** would I trust this with my money? Figures right and consistent,
  signs and currency as everywhere else.
- **One more question, 10: the right motion** (`patterns.md` §8, D140). A screen opened from a row
  slides in from the right, and back slides it out the same way. A tab crossfades while the tab bar
  plays its look's own switch. A cleared Review row slides out and the rest close up. Is the motion
  the one the change calls for, at about 200 ms, with no blank or see-through frame, and does a
  payment's amount carry into its detail without any number counting up or down? Filmstrips get
  questions 7–10.
