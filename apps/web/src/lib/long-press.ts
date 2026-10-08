import { useRef, type PointerEvent } from 'react';
import { lightTick } from './haptics';

export const LONG_PRESS_MS = 500;
/** How long after the finger lifts the click it makes is still swallowed. */
const CLICK_AFTER_LIFT_MS = 400;

/**
 * Swallows the one click that follows a long-press's release, wherever it lands. A long-press opens
 * something over the control (Scan's sheet), so on a touch screen the finger lifts on whatever is
 * now under it, and the browser's click would choose that. Captured on the window, before any
 * handler sees it; given up a moment after the lift if no click comes.
 */
function swallowClickAfterLift() {
  let timer: number | undefined;
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const lifted = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(done, CLICK_AFTER_LIFT_MS);
  };
  const done = () => {
    window.clearTimeout(timer);
    window.removeEventListener('click', stop, true);
    for (const t of LIFTS) window.removeEventListener(t, lifted, true);
  };
  window.addEventListener('click', stop, true);
  for (const t of LIFTS) window.addEventListener(t, lifted, true);
}
const LIFTS = ['pointerup', 'pointercancel', 'touchend', 'touchcancel'] as const;

/**
 * Tap and long-press on one control (patterns.md §6, D69): a tap acts at once; holding for 500 ms
 * gives a light haptic and the long-press action, and the click that follows the release is
 * swallowed wherever it lands. Moving the finger more than a few pixels cancels the hold, so a scroll never long-presses.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef<[number, number] | null>(null);
  const clear = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  };
  return {
    onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = [e.clientX, e.clientY];
      timer.current = window.setTimeout(() => {
        fired.current = true;
        timer.current = undefined;
        swallowClickAfterLift();
        lightTick();
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove(e: PointerEvent) {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s[0], e.clientY - s[1]) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick() {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onTap();
    },
  };
}
