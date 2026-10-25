import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { authUser } from './auth';
import { ownRows } from './rls';

/**
 * §15's tables that B06 brings: the scheduler's one-off jobs and its record of every run (D99),
 * reminders sent once (`alerts_sent`), and the phones push goes to. Each person's own, under RLS.
 * Nothing else reads across people: the tick lists who a job is for through `jobs_people()`, and
 * `/health/jobs` reads only two timestamps through `jobs_health()` (migration 0007).
 */
const at = (name: string) => timestamp(name, { withTimezone: true });
const person = () =>
  uuid('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' });

/**
 * A one-off job the tick runs at its time (D99): a split's reminder an hour later (D65), an agent
 * run's continuation, the test job. Later slices add kinds. `dedupe_key` makes scheduling it twice a
 * no-op. A tick claims a due job (`due` → `running`, `attempts` + 1) with `SKIP LOCKED`, so two ticks
 * never run it both; a failure goes back to `due` later, and to `failed` after the last attempt. A
 * job `running` for longer than a function can run (10 minutes) was cut off, and is due again.
 */
export const scheduledJobs = pgTable(
  'scheduled_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: person(),
    kind: text('kind').notNull(),
    runAt: at('run_at').notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    dedupeKey: text('dedupe_key').notNull(),
    status: text('status', { enum: ['due', 'running', 'done', 'failed'] })
      .notNull()
      .default('due'),
    attempts: integer('attempts').notNull().default(0),
    startedAt: at('started_at'),
    lastError: text('last_error'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('scheduled_jobs_dedupe_key').on(t.userId, t.dedupeKey),
    // what the tick looks for across people, through jobs_people('once') and jobs_next_once()
    index('scheduled_jobs_due_idx')
      .on(t.runAt)
      .where(sql`${t.status} in ('due', 'running')`),
    check('scheduled_jobs_status_check', sql`${t.status} in ('due', 'running', 'done', 'failed')`),
    check('scheduled_jobs_attempts_check', sql`${t.attempts} >= 0`),
    ...ownRows('scheduled_jobs', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/**
 * Every run (§15, §18): the morning and evening jobs, each one-off job, and each nightly backup.
 * `run_key` is what makes a run once: `morning:2026-10-24` per person and Kuala Lumpur date,
 * `once:<scheduled job>:<attempt>`, `backup:<workflow run>`. A tick claims a daily run by inserting
 * its key; a second tick finds it and does nothing, unless the first failed (retried up to
 * `attempts` 3) or was cut off. `bytes` is a backup's dump size, Sen's own count of what R2 holds
 * (D126): never a listing of the bucket.
 */
export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: person(),
    job: text('job').notNull(),
    runKey: text('run_key').notNull(),
    ranAt: at('ran_at').notNull().defaultNow(),
    status: text('status', { enum: ['running', 'ok', 'failed'] }).notNull(),
    attempts: integer('attempts').notNull().default(1),
    durationMs: integer('duration_ms'),
    error: text('error'),
    bytes: bigint('bytes', { mode: 'number' }),
  },
  (t) => [
    uniqueIndex('job_runs_run_key').on(t.userId, t.runKey),
    index('job_runs_job_idx').on(t.job, t.status, t.ranAt),
    check('job_runs_status_check', sql`${t.status} in ('running', 'ok', 'failed')`),
    check('job_runs_numbers_check', sql`${t.durationMs} >= 0 and ${t.bytes} >= 0 and ${t.attempts} >= 1`),
    ...ownRows('job_runs', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/**
 * A reminder or check-in sent once (§15): its key (`backup_late:2026-10-24`, `sen_push:2026-10-24`)
 * is claimed before it's sent, so a job run twice sends nothing twice. A send that fails releases its
 * claim, so the next run tries again.
 */
export const alertsSent = pgTable(
  'alerts_sent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: person(),
    alertKey: text('alert_key').notNull(),
    sentAt: at('sent_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('alerts_sent_alert_key').on(t.userId, t.alertKey),
    ...ownRows('alerts_sent', t.userId, ['select', 'insert', 'delete']),
  ],
).enableRLS();

/**
 * The phones push goes to (§15). One person per token: a phone signed in as someone else moves its
 * token to them through `push_token_claim()`, so the last person's notifications never reach it.
 * A token FCM says is gone is deleted when a send finds it.
 */
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: person(),
    fcmToken: text('fcm_token').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('push_tokens_fcm_token').on(t.userId, t.fcmToken),
    index('push_tokens_token_idx').on(t.fcmToken),
    check('push_tokens_fcm_token_check', sql`length(${t.fcmToken}) between 1 and 4096`),
    ...ownRows('push_tokens', t.userId, ['select', 'delete']),
  ],
).enableRLS();
