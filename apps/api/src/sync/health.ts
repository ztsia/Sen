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
 * Capture's health (§6.2 *Health*), read as the person, against the server's clock (D143 (7)):
 * - the heartbeat that counts is the listener's own, one sent with it connected and access granted; a
 *   daily sync that says the listener is off isn't one;
 * - the newest heartbeat saying access is off is a warning at once: the phone itself says so;
 * - an event counts when the server got it, never by the phone's clock, which may run ahead or behind;
 *   the heartbeat's own last-event time isn't counted either. A phone offline for days is caught by
 *   the heartbeat rule.
 * With no heartbeat yet (the shell has never synced, or a browser-only person), nothing is watched.
 */
export async function captureHealth(db: Db, userId: string, captureOn: boolean, now: Date): Promise<CaptureHealthView> {
  const h = schema.deviceHeartbeats;
  const e = schema.bankEvents;
  const [beat] = await db.select().from(h).where(eq(h.userId, userId)).orderBy(desc(h.createdAt)).limit(1);
  const [listen] = await db
    .select({ at: h.createdAt })
    .from(h)
    .where(and(eq(h.userId, userId), eq(h.listenerConnected, true), eq(h.access, true)))
    .orderBy(desc(h.createdAt))
    .limit(1);
  const [first] = await db
    .select({ at: h.createdAt })
    .from(h)
    .where(eq(h.userId, userId))
    .orderBy(h.createdAt)
    .limit(1);
  const [ev] = await db
    .select({ at: max(e.createdAt) })
    .from(e)
    .where(eq(e.userId, userId));
  const morning = await morningAt(db, userId);
  const t = now.getTime();
  // the events the server holds, not the heartbeat's own last-event time: that's the phone's clock, and
  // every event goes up in the same batch as its heartbeat
  const lastEvent = ev?.at ?? null;
  let silent: CaptureHealthView['silent'] = null;
  if (captureOn && beat) {
    if (!beat.access) silent = 'no-access';
    // never connected since the shell first synced: the clock starts at that first heartbeat
    else if (t - (listen?.at ?? first?.at ?? beat.createdAt).getTime() >= HEARTBEAT_SILENT_MS) silent = 'no-heartbeat';
    // with no event ever, the clock starts at the first heartbeat
    else if (t - (lastEvent ?? first?.at ?? beat.createdAt).getTime() >= EVENTS_SILENT_MS) silent = 'no-events';
  }
  return {
    on: captureOn,
    lastBeatAt: beat?.createdAt.toISOString() ?? null,
    listenerConnected: beat?.listenerConnected ?? null,
    access: beat?.access ?? null,
    lastListenAt: listen?.at.toISOString() ?? null,
    lastEventAt: lastEvent?.toISOString() ?? null,
    silent,
    morningAt: morning?.toISOString() ?? null,
    schedulerLate: morning !== null && t - morning.getTime() > SCHEDULER_LATE_MS,
  };
}
