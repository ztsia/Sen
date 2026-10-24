import { useEffect, useState } from 'react';
import { UpdatedAgo } from '@/blocks/states';
import { useLive } from '@/data/realtime';
import { now as clockNow } from '@/lib/clock';

/**
 * While the live connection is down, how long since the screen last updated, in muted (patterns.md §7,
 * D100). Shows only then: below the app bar of every screen, from the shared frame.
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
  if (!shown) return null;
  const at = forced ? forced.updatedAt : (real ?? new Date());
  return (
    <div role="status" className="px-4 pt-1 pb-2">
      <UpdatedAgo at={at} now={forced ? clockNow() : new Date()} />
    </div>
  );
}
