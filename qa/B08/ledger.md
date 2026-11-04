# B08 · QA ledger

## The security review (D144): low note, fixed (tier 1)

- **What:** first run's draft (`sen.firstRun`: balances typed but not saved, the name, the payday) wasn't
  tied to a person and outlived sign-out, so on a shared device the next person would see it.
- **Tier 1:** one source change (`forgetKept`, `keepFor` in `apps/web/src/data/api/backend.ts`) and its
  test; no other behaviour changes; not a Blocker.
- **Red** (`pnpm exec vitest run apps/web/src/data/auth.test.ts`, before the fix):
  `× take first run’s unsaved draft with them`, `× take first run’s draft when someone else signs in`,
  `Tests 2 failed | 20 passed (22)`.
- **Green** (after): `Tests 22 passed (22)`; typecheck and lint clean.
