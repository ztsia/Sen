import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * The walking skeleton's screens (B03, D84), on made-up data, by id. Previews and the dev server only:
 * production shows *Not built yet* for every screen whose data isn't real (modules.md rule 6), and a
 * production build leaves these chunks out. A slice that makes a screen real moves it to real.ts.
 */
type Screens = Record<string, LazyExoticComponent<ComponentType>>;

// compared in place, so a production build leaves every chunk out (sen-env.d.ts)
export const SKELETON: Screens =
  __SEN_ENV__ !== 'production'
    ? {
        home: lazy(() => import('./home/home')),
        review: lazy(() => import('./review/review')),
        skipped: lazy(() => import('./review/skipped')),
        scan: lazy(() => import('./scan/scan')),
        crop: lazy(() => import('./scan/crop')),
        reading: lazy(() => import('./scan/reading')),
        confirm: lazy(() => import('./scan/confirm')),
        manual: lazy(() => import('./scan/manual')),
        insights: lazy(() => import('./insights/insights')),
        budgets: lazy(() => import('./insights/budgets')),
        subscriptions: lazy(() => import('./insights/subscriptions')),
        goals: lazy(() => import('./insights/goals')),
        goal: lazy(() => import('./insights/goal')),
        'insights/year': lazy(() => import('./insights/year')),
        more: lazy(() => import('./more/more')),
        payments: lazy(() => import('./more/payments')),
        txn: lazy(() => import('./more/txn')),
        receipt: lazy(() => import('./more/receipt')),
        // B04
        split: lazy(() => import('./shared/split')),
        shared: lazy(() => import('./shared/shared')),
        'split-public': lazy(() => import('./shared/split-public')),
        'agent/memory': lazy(() => import('./sen/memory')),
        'agent/research': lazy(() => import('./sen/research')),
        'agent/usage': lazy(() => import('./sen/usage')),
        accounts: lazy(() => import('./money/accounts')),
        account: lazy(() => import('./money/account')),
        'balance-check': lazy(() => import('./money/balance-check')),
        claims: lazy(() => import('./money/claims')),
        claim: lazy(() => import('./money/claim')),
        payday: lazy(() => import('./money/payday')),
        settings: lazy(() => import('./settings/settings')),
        'settings/appearance': lazy(() => import('./settings/appearance')),
        'settings/you': lazy(() => import('./settings/you')),
        'settings/categories': lazy(() => import('./settings/categories')),
        'settings/email': lazy(() => import('./settings/email')),
        'settings/claims': lazy(() => import('./settings/claims')),
        'settings/sen': lazy(() => import('./settings/sen')),
        'settings/members': lazy(() => import('./settings/members')),
        'sign-in': lazy(() => import('./outside/sign-in')),
        'first-run': lazy(() => import('./outside/first-run')),
        'new-look': lazy(() => import('./outside/new-look')),
      }
    : {};
