import { timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type pg from 'pg';
import { z } from 'zod';
import { schema } from '@sen/db';
import type { Env } from '../context';
import { ApiError, forbidden, parse, readJson } from '../errors';
import { LIMITS, tooMany, withinLimit } from '../limits';
import { BACKUP_LATE_MS } from './frames';
import { runTick, type TickDeps } from './tick';

/** The morning job's limit before /health/jobs fails (spec §18): a day and two hours' slack. */
const MORNING_LATE_MS = 26 * 3_600_000;

const sameSecret = (given: string, want: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * The routes no person calls (spec §16): the Worker's tick, with the scheduler secret, and the outside
 * monitor's health check, which answers with no data. Mounted before the session and same-origin
 * checks, which are for people's requests.
 */
export function schedulerRoutes(deps: TickDeps & { scheduler: string | null; pool: pg.Pool }) {
  const r = new Hono();

  r.post('/jobs/tick', async (c) => {
    if (!deps.scheduler) throw new ApiError(503, 'not_configured', 'The scheduler isn’t set up here.');
    const header = c.req.header('authorization') ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!sameSecret(given, deps.scheduler)) throw new ApiError(401, 'signed_out', 'That isn’t the scheduler.');
    return c.json(await runTick(deps));
  });

  r.get('/health/jobs', async (c) => {
    const row = (
      await deps.pool.query<{ morning_at: Date | null; backup_at: Date | null }>('select * from jobs_health()')
    ).rows[0];
    const now = Date.now();
    const late: string[] = [];
    if (!row?.morning_at || now - row.morning_at.getTime() > MORNING_LATE_MS) late.push('morning');
    if (!row?.backup_at || now - row.backup_at.getTime() > BACKUP_LATE_MS) late.push('backup');
    if (late.length) return c.json({ code: 'late', message: `Late: ${late.join(', ')}.`, late }, 503);
    return c.json({ ok: true });
  });

  return r;
}

const Token = z.object({ token: z.string().trim().min(1).max(4096) });
/** The routes that take nothing still read their body, so a bad one is refused like anywhere else. */
const Nothing = z.object({});

const withinTests = (pool: pg.Pool, what: string, person: string) =>
  withinLimit(pool, `${what}:${person}`, LIMITS.testsPerPerson.max, LIMITS.testsPerPerson.windowMs);

/**
 * A signed-in person's B06 routes: their phone's push token and a pass to their realtime channel; and
 * the admin's checks, a test push and a test job a minute ahead (Settings → Data, D142 (4)).
 */
export function personJobRoutes(pool: { auth: pg.Pool }) {
  const r = new Hono<Env>();

  r.put('/push/token', async (c) => {
    const { token } = parse(Token, await readJson(c));
    await c.var.db((db) => db.execute(sql`select push_token_claim(${token})`));
    return c.json({ ok: true });
  });

  // on sign-out, so the next person's phone doesn't get this person's notifications
  r.delete('/push/token', async (c) => {
    const { token } = parse(Token, await readJson(c));
    const t = schema.pushTokens;
    await c.var.db((db) => db.delete(t).where(sql`${t.userId} = ${c.var.person.id} and ${t.fcmToken} = ${token}`));
    return c.json({ ok: true });
  });

  r.post('/push/test', async (c) => {
    parse(Nothing, await readJson(c));
    const { person, svc } = c.var;
    if (!c.var.access.isAdmin) throw forbidden();
    if (!(await withinTests(pool.auth, 'push-test', person.id)))
      throw tooMany('That’s a few tests already. Wait a minute.');
    if (!svc.push.on) throw new ApiError(503, 'not_configured', 'Push isn’t set up here.');
    const sent = await svc.push.send(person.id, {
      title: 'A test from Sen',
      body: 'Push notifications reach this phone.',
    });
    return c.json({ sent });
  });

  r.post('/realtime/token', async (c) => {
    parse(Nothing, await readJson(c));
    const pass = await c.var.svc.relay.pass(c.var.person.id);
    if (!pass) throw new ApiError(503, 'not_configured', 'Live updates aren’t set up here.');
    return c.json(pass);
  });

  r.post('/jobs/test', async (c) => {
    parse(Nothing, await readJson(c));
    const { person, svc } = c.var;
    if (!c.var.access.isAdmin) throw forbidden();
    if (!(await withinTests(pool.auth, 'job-test', person.id)))
      throw tooMany('That’s a few tests already. Wait a minute.');
    // a minute ahead, to the minute: tapping twice in that minute schedules one job
    const runAt = new Date(Math.ceil((Date.now() + 60_000) / 60_000) * 60_000);
    const s = schema.scheduledJobs;
    await c.var.db((db) =>
      db
        .insert(s)
        .values({ userId: person.id, kind: 'test', runAt, dedupeKey: `test:${runAt.toISOString()}` })
        .onConflictDoNothing(),
    );
    await svc.relay.wake(runAt);
    // whether its push can go, so the screen promises only what will happen (QA B06 run 1, finding 7)
    return c.json({ runAt: runAt.toISOString(), push: svc.push.on });
  });

  return r;
}
