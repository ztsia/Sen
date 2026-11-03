import { and, desc, eq, max } from 'drizzle-orm';
import { EVENTS_SILENT_MS, HEARTBEAT_SILENT_MS, SCHEDULER_LATE_MS, type CaptureHealthView } from '@sen/core/sync';
import { schema } from '@sen/db';
import type { Db } from '../db';

/** When this person's morning job last ran (§18): the shell's and Home's 26-hour check. */
export async function morningAt(db: Db, userId: string): Promise<Date | null> {
  const r = schema.jobRuns;
  const [row] = await db
    .select({ at: max(r.ranAt) })
    .from(r)
    .where(and(eq(r.userId, userId), eq(r.job, 'morning')));
  return row?.at ?? null;
}

/**
 * Capture's health (§6.2 *Health*), read as the person: the newest heartbeat, the newest event, and
 * the watchdog's reading of them against the server's clock. With no heartbeat yet (the shell has
 * never synced, or it's a browser-only person), it isn't silent: there's nothing to watch.
 */
export async function captureHealth(db: Db, userId: string, captureOn: boolean, now: Date): Promise<CaptureHealthView> {
  const h = schema.deviceHeartbeats;
  const e = schema.bankEvents;
  const [beat] = await db.select().from(h).where(eq(h.userId, userId)).orderBy(desc(h.createdAt)).limit(1);
  const [first] = await db
    .select({ at: h.createdAt })
    .from(h)
    .where(eq(h.userId, userId))
    .orderBy(h.createdAt)
    .limit(1);
  const [ev] = await db
    .select({ at: max(e.postedAt) })
    .from(e)
    .where(eq(e.userId, userId));
  const morning = await morningAt(db, userId);
  const seen = [ev?.at ?? null, beat?.lastBankEventAt ?? null].filter((d): d is Date => d !== null);
  const lastEvent = seen.length ? new Date(Math.max(...seen.map((d) => d.getTime()))) : null;
  const t = now.getTime();
  let silent: CaptureHealthView['silent'] = null;
  if (captureOn && beat) {
    if (t - beat.createdAt.getTime() >= HEARTBEAT_SILENT_MS) silent = 'no-heartbeat';
    // with no event ever, the clock starts at the first heartbeat
    else if (t - (lastEvent ?? first?.at ?? beat.createdAt).getTime() >= EVENTS_SILENT_MS) silent = 'no-events';
  }
  return {
    on: captureOn,
    lastBeatAt: beat?.createdAt.toISOString() ?? null,
    listenerConnected: beat?.listenerConnected ?? null,
    access: beat?.access ?? null,
    lastEventAt: lastEvent?.toISOString() ?? null,
    silent,
    morningAt: morning?.toISOString() ?? null,
    schedulerLate: morning !== null && t - morning.getTime() > SCHEDULER_LATE_MS,
  };
}
