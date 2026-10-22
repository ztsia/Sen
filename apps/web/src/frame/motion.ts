import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

// the tab bar says when a navigation is a tab tapped: Home from a pushed screen goes back through
// history (frame/tab-bar.tsx), but it's still a tab change, not a pop
let tabTapped = -Infinity;
/** Marks the next navigation, within a second, as a tab tapped, so it crossfades whichever way history goes. */
export const tabChangeNext = () => {
  tabTapped = performance.now();
};

/**
 * The router's `defaultViewTransition`: the kind of each navigation, or false for none. Under reduced
 * motion, every change is at once.
 */
export const routerTransition = {
  types: ({ fromLocation, toLocation }: { fromLocation?: Loc; toLocation: Loc }): string[] | false => {
    const tab = performance.now() - tabTapped < 1000;
    tabTapped = -Infinity;
    if (reducedMotionNow()) return false;
    const change =
      tab && fromLocation && fromLocation.href !== toLocation.href ? 'tab' : screenChange(fromLocation, toLocation);
    if (!change) return false;
    nameShared(change);
    return [change];
  },
};

type DocVT = Document & {
  startViewTransition?: (o: { update: () => void; types?: string[] }) => { finished: Promise<void> };
};

/**
 * Change motion within a screen (patterns.md §8): rows marked by `rowMotion` slide out and in, and
 * the rest move to their new places, while `change` runs. Under reduced motion, or without view
 * transitions, the change is at once.
 */
export function changeMotion(change: () => void) {
  const doc = document as DocVT;
  if (reducedMotionNow() || !canTransition() || !doc.startViewTransition) return change();
  markHidden();
  doc.startViewTransition({
    update: () => {
      flushSync(change);
      markHidden();
    },
    types: ['change'],
  });
}

/**
 * A moving row is drawn above the screen, so one scrolled partly out of view would show over the app
 * bar: only rows wholly in their scroll area move, and the rest change in place.
 */
function markHidden() {
  for (const row of document.querySelectorAll<HTMLElement>('[data-motion-row]')) {
    const area = scrollArea(row);
    const r = row.getBoundingClientRect();
    const a = area?.getBoundingClientRect() ?? { top: 0, bottom: innerHeight };
    if (r.top >= a.top && r.bottom <= a.bottom) delete row.dataset.motionOff;
    else row.dataset.motionOff = '';
  }
}
function scrollArea(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if (y === 'auto' || y === 'scroll') return p;
  }
  return null;
}

/**
 * A list's data, shown through change motion: when `value` changes (an answer cleared a row, a sync
 * added one), the screen moves to it by `changeMotion`, at the moment the data arrives, so a write
 * waiting on the network never holds the screen still.
 */
export function useChangeMotion<T>(value: T): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (value === shown) return;
    changeMotion(() => setShown(latest.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new value starts a change
  }, [value]);
  return shown;
}

/** Marks a row for change motion: its own name while a change runs (motion.css). */
export const rowMotion = (id: string) =>
  ({ 'data-motion-row': '', style: { '--row': `row-${id.replace(/[^\w-]/g, '_')}` } }) as {
    'data-motion-row': string;
    style: CSSProperties;
  };

/**
 * A sheet's content resizing (a step, an error under a field) eases the sheet to its new height,
 * rather than jumping (patterns.md §8). Pass the returned ref to the sheet's scroll area; the sheet
 * is its parent. A callback ref, since the sheet's content mounts after the sheet's own effects run.
 */
export function useSheetResize(): (el: HTMLElement | null) => void {
  const [area, setArea] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const sheet = area?.parentElement;
    if (!area || !sheet || typeof ResizeObserver === 'undefined') return;
    // the first report, as the observer starts, is the baseline: no measuring while the sheet opens
    let last = 0;
    // the animation itself resizes the area, so the observer ignores it while it runs, and compares
    // the next change with where the last one ended (QA B05 Feel run 2, 1)
    let running: Animation | null = null;
    const ro = new ResizeObserver(() => {
      if (running) return;
      const now = sheet.getBoundingClientRect().height;
      const from = last;
      last = now;
      if (!from || Math.abs(now - from) < 2 || reducedMotionNow()) return;
      running = sheet.animate(
        [
          { height: `${from}px`, overflow: 'hidden' },
          { height: `${now}px`, overflow: 'hidden' },
        ],
        { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
      const done = () => {
        running = null;
        last = sheet.getBoundingClientRect().height;
      };
      running.onfinish = done;
      running.oncancel = done;
    });
    ro.observe(area);
    return () => ro.disconnect();
  }, [area]);
  return setArea;
}
