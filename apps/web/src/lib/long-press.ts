import { useRef, type PointerEvent } from 'react';
import { lightTick } from './haptics';

export const LONG_PRESS_MS = 500;

/**
 * Tap and long-press on one control (patterns.md §6, D69): a tap acts at once; holding for 500 ms
 * gives a light haptic and the long-press action, and the tap that follows the release is swallowed.
 * Moving the finger more than a few pixels cancels the hold, so a scroll never long-presses.
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
