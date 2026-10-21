import { flushSync } from 'react-dom';
import { reducedMotionNow } from '@/theme/store';

// Sen's motion (patterns.md §8, D140): one push at 200 ms for every look. Screens change through the
// View Transitions API, which the router starts on every navigation, the back gesture included; this
// module says which kind of change each one is. The CSS is in styles/motion.css.

/** Which motion a navigation gets; null for none. */
export type ScreenChange = 'forward' | 'back' | 'tab' | null;

interface Loc {
  pathname: string;
  href: string;
  state?: unknown;
}

const TABS = new Set(['/', '/review', '/insights', '/more']);
const index = (l: Loc) => (l.state as { __TSR_index?: number } | undefined)?.__TSR_index ?? 0;

/**
 * The direction rule. A tab to a tab crossfades. Otherwise the history index says: a step on pushes,
 * a step back pops. Nothing moves on the first load, when the address is unchanged (a sheet's own
 * history step, lib/back-close.ts), or on a replace within one screen (a filter).
 */
export function screenChange(from: Loc | undefined, to: Loc): ScreenChange {
  if (!from || from.href === to.href) return null;
  if (TABS.has(from.pathname) && TABS.has(to.pathname)) return 'tab';
  const a = index(from);
  const b = index(to);
  if (b > a) return 'forward';
  if (b < a) return 'back';
  // a replace: a screen giving way to another (Home from a tab by back, a redirect) crossfades
  return from.pathname === to.pathname ? null : 'tab';
}

/** Whether this browser can name the kind of a view transition; without it, nothing moves. */
export const canTransition = (): boolean =>
  typeof document !== 'undefined' &&
  typeof (document as { startViewTransition?: unknown }).startViewTransition === 'function' &&
  !!window.CSS?.supports?.('selector(:active-view-transition-type(a))');

// The one shared element: a payment's amount, from its row into its detail's figure and back. The row
// tapped last is remembered; going back, the figure on show names the payment.
let tapped: string | null = null;
const shareStyle = () => {
  let el = document.getElementById('sen-share') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'sen-share';
    document.head.append(el);
  }
  return el;
};
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const row = (e.target as Element | null)?.closest?.('[data-share]:not([data-share-figure])');
      tapped = row?.getAttribute('data-share') ?? null;
    },
    { capture: true, passive: true },
  );
}

function nameShared(change: ScreenChange) {
  let id: string | null = null;
  if (change === 'forward') id = tapped;
  else if (change === 'back') id = document.querySelector('[data-share-figure]')?.getAttribute('data-share') ?? null;
  tapped = null;
  // the name applies only while a forward or back transition runs (motion.css's :active-view-transition-type)
  shareStyle().textContent =
    id && /^[\w-]+$/.test(id)
      ? `html:active-view-transition-type(forward, back) [data-share="${id}"] [data-sen] { view-transition-name: amount; }`
      : '';
}

/**
 * The router's `defaultViewTransition`: the kind of each navigation, or false for none. Under reduced
 * motion, every change is at once.
 */
export const routerTransition = {
  types: ({ fromLocation, toLocation }: { fromLocation?: Loc; toLocation: Loc }): string[] | false => {
    if (reducedMotionNow()) return false;
    const change = screenChange(fromLocation, toLocation);
    if (!change) return false;
    nameShared(change);
    return [change];
  },
};

type VT = { finished: Promise<void>; updateCallbackDone: Promise<void> };
type DocVT = Document & {
  startViewTransition?: (o: { update: () => Promise<void> | void; types?: string[] }) => VT;
};

/**
 * Change motion within a screen (patterns.md §8): rows marked `data-motion-row` with a
 * `--row` name slide out and in while `change` runs. `change` may update a query cache, whose
 * listeners run a moment later, so the new state is captured after the next task. Under reduced
 * motion, or without view transitions, the change is at once.
 */
export function changeMotion(change: () => void): Promise<void> {
  const doc = document as DocVT;
  if (reducedMotionNow() || !canTransition() || !doc.startViewTransition) {
    change();
    return Promise.resolve();
  }
  const t = doc.startViewTransition({
    update: async () => {
      flushSync(change);
      await new Promise((r) => setTimeout(r, 0));
    },
    types: ['change'],
  });
  return t.finished.catch(() => undefined);
}
