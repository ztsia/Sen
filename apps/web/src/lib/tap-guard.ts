// One change per double tap (patterns.md §7, QA B03 run 2). After a tap that changes something, the
// next tap within the settle time is ignored, wherever it lands: a double tap on a Review answer would
// otherwise answer the row that slides into its place, and a double tap on Delete would go back twice.

/** Long enough for any double tap, short enough that a deliberate second change never waits. */
export const SETTLE_MS = 500;
let last = -Infinity;

/** True if this tap may change something; false while the last change is still settling. */
export function settleTap(now: () => number = () => performance.now()): boolean {
  const t = now();
  if (t - last < SETTLE_MS) return false;
  last = t;
  return true;
}

/** Wraps a handler so it runs at most once per settle time. */
export const settled =
  <A extends unknown[]>(fn: (...args: A) => void) =>
  (...args: A) => {
    if (settleTap()) fn(...args);
  };

/** Tests only: forget the last change. */
export const resetTapGuard = () => {
  last = -Infinity;
};
