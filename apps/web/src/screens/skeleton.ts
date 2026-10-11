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
      }
    : {};
