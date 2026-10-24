import { eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import { frameAt, klClock, nextTick, type Frame } from '@sen/core/jobs';
import { schema } from '@sen/db';
import { asPerson, type Db } from '../db';
import { FRAME_TASKS, ONCE_TASKS, runKey, type JobCtx, type OnceTask } from './frames';
import type { Pusher } from './push';
import type { Relay } from './relay';

/** Attempts before a run is given up: a frame's run on one date, or a one-off job. */
export const MAX_ATTEMPTS = 3;
/** A one-off job that failed is tried again this much later, times its attempts. */
const ONCE_BACKOFF_MS = 5 * 60_000;
/** One-off jobs a tick claims per person, so one person's backlog can't use up the function's time. */
const ONCE_BATCH = 20;

export interface TickDeps {
  pool: pg.Pool;
  push: Pusher;
  relay: Relay;
}

export interface TickResult {
  frame: Frame | null;
  /** Runs this tick made: a frame's per person, and each one-off job. */
  ran: number;
  failed: number;
  next: string;
}

const errorText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 500);

/**
 * `/jobs/tick` (spec §16, D99): runs what's due, each job for each person, as that person, under RLS.
 * Who a job is for comes from `jobs_people()`, ids only. A tick that comes twice, or two at once, is a
 * no-op: a frame's run is claimed by its key in `job_runs` (person, frame and Kuala Lumpur date), and a
 * one-off job by its row in `scheduled_jobs`, with `SKIP LOCKED`. Every run is recorded in `job_runs`.
 * Answers when the Worker should tick next, so Neon sleeps between (`nextTick`).
 */
export async function runTick(deps: TickDeps, now = new Date()): Promise<TickResult> {
  const frame = frameAt(now);
  const { day } = klClock(now);
  let ran = 0;
  let failed = 0;
  let unfinished = false;

  const ctxFor = (userId: string, isAdmin: boolean): JobCtx => ({
    userId,
    isAdmin,
    now,
    day,
    db: (fn) => asPerson(deps.pool, userId, fn),
    push: deps.push,
    relay: deps.relay,
  });

  if (frame) {
    for (const userId of await people(deps.pool, 'daily')) {
      const r = await runFrame(deps.pool, frame, day, userId, ctxFor);
      if (r === 'skipped') continue;
      ran++;
      if (r !== 'ok') failed++;
      if (r === 'retry') unfinished = true;
    }
  }

  for (const userId of await people(deps.pool, 'once')) {
    const r = await runOnce(deps.pool, userId, ctxFor);
    ran += r.ran;
    failed += r.failed;
  }

  const nextOnce = await deps.pool.query<{ at: Date | null }>('select jobs_next_once() as at');
  const next = nextTick(now, { unfinished: unfinished ? frame : null, nextOnce: nextOnce.rows[0]?.at ?? null });
  return { frame, ran, failed, next: next.toISOString() };
}

async function people(pool: pg.Pool, job: 'daily' | 'once'): Promise<string[]> {
  const r = await pool.query<{ id: string }>('select id from jobs_people($1) as id', [job]);
  return r.rows.map((p) => p.id);
}

/** One person's run of a frame: claimed by its key, its tasks in order, recorded. */
async function runFrame(
  pool: pg.Pool,
  frame: Frame,
  day: string,
  userId: string,
  ctxFor: (userId: string, isAdmin: boolean) => JobCtx,
): Promise<'ok' | 'retry' | 'failed' | 'skipped'> {
  const key = runKey(frame, day);
  const claim = await asPerson(pool, userId, async (db) => {
    // a second tick finds the key and does nothing, unless the run failed with attempts left or
    // was cut off mid-run (a function stopped at its time limit)
    const r = await db.execute<{ id: string; attempts: number; is_admin: boolean }>(sql`
      insert into job_runs (user_id, job, run_key, status) values (${userId}, ${frame}, ${key}, 'running')
      on conflict (user_id, run_key) do update
        set status = 'running', ran_at = now(), attempts = job_runs.attempts + 1, error = null, duration_ms = null
        where (job_runs.status = 'failed' and job_runs.attempts < ${MAX_ATTEMPTS})
           or (job_runs.status = 'running' and job_runs.ran_at < now() - interval '10 minutes')
      returning id, attempts, coalesce((select is_admin from user_access where user_id = ${userId}), false) as is_admin`);
    return r.rows[0];
  });
  if (!claim) return 'skipped';

  const started = Date.now();
  const ctx = ctxFor(userId, claim.is_admin);
  const errors: string[] = [];
  for (const task of FRAME_TASKS[frame]) {
    try {
      await task(ctx);
    } catch (e) {
      errors.push(errorText(e));
    }
  }
  await finishRun(pool, userId, claim.id, started, errors.length ? errors.join('; ') : null);
  if (!errors.length) return 'ok';
  return claim.attempts < MAX_ATTEMPTS ? 'retry' : 'failed';
}

async function finishRun(pool: pg.Pool, userId: string, id: string, started: number, error: string | null) {
  const r = schema.jobRuns;
  await asPerson(pool, userId, (db) =>
    db
      .update(r)
      .set({ status: error ? 'failed' : 'ok', durationMs: Date.now() - started, error: error?.slice(0, 500) ?? null })
      .where(eq(r.id, id)),
  );
}

/** One person's due one-off jobs: claimed with SKIP LOCKED, run, then done, retried later, or failed. */
async function runOnce(
  pool: pg.Pool,
  userId: string,
  ctxFor: (userId: string, isAdmin: boolean) => JobCtx,
): Promise<{ ran: number; failed: number }> {
  const claimed = await asPerson(pool, userId, async (db: Db) => {
    const r = await db.execute<{ id: string; kind: string; payload: Record<string, unknown>; attempts: number }>(sql`
      update scheduled_jobs set status = 'running', attempts = attempts + 1, started_at = now(), last_error = null
      where id in (
        select id from scheduled_jobs
        where (status = 'due' and run_at <= now())
           or (status = 'running' and started_at < now() - interval '10 minutes')
        order by run_at
        limit ${ONCE_BATCH}
        for update skip locked)
      returning id, kind, payload, attempts`);
    return r.rows;
  });
  let failed = 0;
  const ctx = ctxFor(userId, false);
  for (const job of claimed) {
    const started = Date.now();
    // own keys only: a kind named 'toString' isn't work
    const task: OnceTask | undefined = Object.hasOwn(ONCE_TASKS, job.kind) ? ONCE_TASKS[job.kind] : undefined;
    let error: string | null = task ? null : `no work for the kind '${job.kind}'`;
    if (task) {
      try {
        await task(ctx, job.payload);
      } catch (e) {
        error = errorText(e);
      }
    }
    if (error) failed++;
    const giveUp = !task || job.attempts >= MAX_ATTEMPTS;
    await asPerson(pool, userId, async (db) => {
      const s = schema.scheduledJobs;
      await db
        .update(s)
        .set(
          !error
            ? { status: 'done' }
            : giveUp
              ? { status: 'failed', lastError: error }
              : {
                  status: 'due',
                  lastError: error,
                  runAt: new Date(Date.now() + job.attempts * ONCE_BACKOFF_MS),
                },
        )
        .where(eq(s.id, job.id));
      await db.insert(schema.jobRuns).values({
        userId,
        job: `once:${job.kind}`,
        runKey: `once:${job.id}:${job.attempts}`,
        status: error ? 'failed' : 'ok',
        attempts: job.attempts,
        durationMs: Date.now() - started,
        error,
      });
    });
  }
  return { ran: claimed.length, failed };
}
