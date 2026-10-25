import { useEffect, useState } from 'react';
import { UpdatedAgo } from '@/blocks/states';
import { useLive } from '@/data/realtime';
import { now as clockNow } from '@/lib/clock';

/**
 * While the live connection is down, how long since the screen last updated, in muted (patterns.md §7,
 * D100). Shows only then, once the screen has loaded: a pill over the top of every screen's content,
 * below its app bar, from the shared frame.
 */
export function LiveStamp() {
  const forced = useLive((s) => s.forced);
  const status = useLive((s) => s.status);
  const real = useLive((s) => s.updatedAt);
  // re-render each 30 s, so "1 min ago" becomes "2 min ago" on its own
  const [, tick] = useState(0);
  const shown = forced !== null || status === 'down';
  useEffect(() => {
    if (!shown) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [shown]);
  // before the first load there's no age to tell (QA B06 run 1, finding 6)
  const at = forced ? forced.updatedAt : real;
  if (!shown || !at) return null;
  // floats over the content's top, so nothing moves under a finger as the relay drops and returns
  // (QA B06 run 1, finding 8)
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-1">
      <div className="rounded-full bg-muted px-3 py-0.5 shadow-sm">
        <UpdatedAgo at={at} now={forced ? clockNow() : new Date()} />
      </div>
    </div>
  );
}
