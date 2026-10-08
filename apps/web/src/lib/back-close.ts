import { useEffect, useId, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';

// A reload keeps the history entries, sheet steps included, and React's ids repeat from one load to
// the next. So each sheet's step is marked with this load's own token too: a step left from an earlier
// load never passes for a sheet open now.
const LOAD = Math.random().toString(36).slice(2, 8);

/**
 * A sheet adds a history step while it's open, so the back gesture (or the browser's back) closes it
 * before it leaves the screen (patterns.md §6, §10). Closing it any other way takes the step back off.
 */
export function useBackClose(open: boolean, close: () => void) {
  const { history } = useRouter();
  const id = `${LOAD}${useId()}`;
  const pushed = useRef(false);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (open && !pushed.current) {
      pushed.current = true;
      history.push(history.location.href, { ...history.location.state, senSheet: id });
    } else if (!open && pushed.current) {
      pushed.current = false;
      if ((history.location.state as { senSheet?: string }).senSheet === id) history.back();
    }
  }, [open, history, id]);

  useEffect(
    () =>
      history.subscribe(() => {
        if (pushed.current && (history.location.state as { senSheet?: string }).senSheet !== id) {
          pushed.current = false;
          closeRef.current();
        }
      }),
    [history, id],
  );
}
