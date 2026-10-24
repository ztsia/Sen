import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Frame } from '@sen/core/jobs';
import { klDay } from '@sen/core/cycles';
import { schema } from '@sen/db';
import type { Db } from '../db';
import { once } from './alerts';
import type { Pusher } from './push';
import type { Relay } from './relay';

/** What a job's work gets: who it runs for, when, and a way to run as them (a short transaction each). */
export interface JobCtx {
  userId: string;
  isAdmin: boolean;
  now: Date;
  /** The Kuala Lumpur date the run belongs to. */
  day: string;
  db: <T>(fn: (db: Db) => Promise<T>) => Promise<T>;
  push: Pusher;
  relay: Relay;
}

/** A piece of a frame's work. It must be safe to run twice (`once()` for anything it sends). */
export type Task = (ctx: JobCtx) => Promise<void>;
/** A one-off job's work, with its payload. */
export type OnceTask = (ctx: JobCtx, payload: Record<string, unknown>) => Promise<void>;

/**
 * R2's free storage and where Sen warns (D126): Cloudflare's 10 GB, counted as 10⁹ bytes so Sen's
 * count errs low, and a warning at half. Proposed in B06 for the owner to confirm.
 */
export const R2_ALLOWANCE_BYTES = 10_000_000_000;
export const R2_WARN_BYTES = R2_ALLOWANCE_BYTES / 2;
/** The bucket deletes each dump 30 days after upload (the owner's lifecycle rule, 11 Oct). */
export const BACKUP_KEPT_DAYS = 30;
/** The watchdog's and /health/jobs' limit (spec §18). */
export const BACKUP_LATE_MS = 2 * 86_400_000;

/** The last good backup and the bytes R2 holds in dumps, from the admin's own job_runs (never the bucket). */
export async function backupFacts(db: Db, userId: string, now: Date) {
  const r = schema.jobRuns;
  const [last] = await db
    .select({ at: r.ranAt, bytes: r.bytes })
    .from(r)
    .where(and(eq(r.userId, userId), eq(r.job, 'backup'), eq(r.status, 'ok')))
    .orderBy(desc(r.ranAt))
    .limit(1);
  const since = new Date(now.getTime() - BACKUP_KEPT_DAYS * 86_400_000);
  const [held] = await db
    // read through the column's own mapping (BIGINT as a number), as every bigint column is
    .select({ bytes: sql<number>`coalesce(sum(${r.bytes}), 0)`.mapWith(r.bytes) })
    .from(r)
    .where(and(eq(r.userId, userId), eq(r.job, 'backup'), eq(r.status, 'ok'), gte(r.ranAt, since)));
  return { last: last ?? null, heldBytes: held?.bytes ?? 0 };
}

/**
 * The backup watchdog (spec §18): after 2 days without a backup, a push to the admin, once a day while
 * it lasts. Written by code; it doesn't count against Sen's one push a day.
 */
const backupWatchdog: Task = async (ctx) => {
  if (!ctx.isAdmin) return;
  const { last } = await ctx.db((db) => backupFacts(db, ctx.userId, ctx.now));
  if (last && ctx.now.getTime() - last.at.getTime() < BACKUP_LATE_MS) return;
  await once(ctx.db, ctx.userId, `backup_late:${ctx.day}`, () =>
    ctx.push.send(ctx.userId, {
      title: 'Sen hasn’t backed up for 2 days',
      body: last
        ? `The last backup was on ${klDay(last.at)}. Check the backup workflow in sen_ops.`
        : 'No backup has run yet. Check the backup workflow in sen_ops.',
      data: { open: 'settings/data' },
    }),
  );
};

/** R2's health warning at half the free storage (D126), once a month while it lasts. */
const storageWatch: Task = async (ctx) => {
  if (!ctx.isAdmin) return;
  const { heldBytes } = await ctx.db((db) => backupFacts(db, ctx.userId, ctx.now));
  if (heldBytes < R2_WARN_BYTES) return;
  await once(ctx.db, ctx.userId, `r2_half:${ctx.day.slice(0, 7)}`, () =>
    ctx.push.send(ctx.userId, {
      title: 'Sen’s storage is half full',
      body: 'Backups use half of R2’s free 10 GB. Settings → Data shows how much.',
      data: { open: 'settings/data' },
    }),
  );
};

/**
 * Each frame's work, in order. Later slices add theirs (spec §16: claim reminders, subscription
 * matching, exchange rates, the check-in and the rest); the listener watchdog comes with B07.
 */
export const FRAME_TASKS: Record<Frame, Task[]> = {
  morning: [backupWatchdog, storageWatch],
  evening: [],
};

/** One-off jobs' work, by kind. A kind not here fails its job at once. */
export const ONCE_TASKS: Record<string, OnceTask> = {
  /** The test job (B06 done-when 1): a push saying it ran, and a hint for Settings → Data. */
  test: async (ctx) => {
    await ctx.push.send(ctx.userId, { title: 'Sen’s test job ran', body: 'Scheduled jobs are working.' });
    await ctx.relay.hint(ctx.userId, ['jobs']);
  },
};

/** A frame's run key: once per person and Kuala Lumpur date. */
export const runKey = (frame: Frame, day: string) => `${frame}:${day}`;
