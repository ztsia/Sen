import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type pg from 'pg';
import { z } from 'zod';
import type { MemberSwitches } from '@sen/core/views';
import { schema } from '@sen/db';
import { createAuth, type Auth } from './auth';
import { NO_SWITCHES, type Env } from './context';
import { asPerson, pools } from './db';
import { readEnv, type ApiEnv } from './env';
import { ApiError, onError, signedOut, suspended } from './errors';
import { clientIp, LIMITS, tooMany, withinLimit } from './limits';
import { gmailMailer, noMail, type Mailer } from './mail';
import { adminRoutes, personRoutes } from './routes';

export interface Deps {
  env: ApiEnv;
  app: pg.Pool;
  auth: pg.Pool;
  mailer: Mailer;
}

/** The real dependencies, from the environment (env.ts). */
export function defaultDeps(): Deps {
  const env = readEnv();
  const p = pools(env.urls);
  return { env, app: p.app, auth: p.auth, mailer: env.gmail ? gmailMailer(env.gmail) : noMail };
}

/**
 * The one API (spec §16), at /api on the web app's own origin. Every request after sign-in runs as
 * its person under RLS (db.ts); Better Auth reaches only its own tables, as `sen_auth`.
 */
export function createApp(deps: Deps) {
  const auth: Auth = createAuth({
    pool: deps.auth,
    secret: deps.env.secret,
    target: deps.env.target,
    mailer: deps.mailer,
  });
  const api = new Hono<Env>().basePath('/api');
  api.onError(onError);
  api.notFound((c) => c.json({ code: 'not_found', message: 'No such route.' }, 404));

  // nothing Sen serves is for search engines (D127); vercel.json says so on Vercel, this says it everywhere
  api.use('*', async (c, next) => {
    await next();
    c.header('X-Robots-Tag', 'noindex');
    c.header('Cache-Control', 'no-store');
  });

  api.get('/health', (c) => c.json({ ok: true }));

  // Sen is invitation-only (D52). Better Auth answers success for an unknown email and sends nothing,
  // so the screen couldn't tell; this says so before a code is asked for, and says when someone's
  // access is paused. It reveals whether an email has an account, which an invitation-only app of
  // friends accepts, behind a limit on lookups per address and on codes per email.
  api.post('/auth/email-otp/send-verification-otp', async (c, next) => {
    const body = await c.req.raw
      .clone()
      .json()
      .catch(() => null);
    const parsed = z.object({ email: z.string().max(254) }).safeParse(body);
    if (parsed.success) {
      const email = parsed.data.email.trim().toLowerCase();
      const { lookupsPerIp, codesPerEmail } = LIMITS;
      if (
        !(await withinLimit(
          deps.auth,
          `lookup:${clientIp(c.req.raw.headers)}`,
          lookupsPerIp.max,
          lookupsPerIp.windowMs,
        ))
      )
        throw tooMany('Too many tries. Wait a minute, then try again.');
      const r = await deps.auth.query<{ check: string }>('select auth_sign_in_check($1) as check', [email]);
      const check = r.rows[0]?.check;
      if (check === 'not_invited') throw new ApiError(403, 'not_invited', 'Sen is invitation-only.', 'email');
      if (check === 'suspended') throw suspended();
      if (!(await withinLimit(deps.auth, `codes:${email}`, codesPerEmail.max, codesPerEmail.windowMs)))
        throw tooMany('Too many codes asked for. Wait a few minutes, then try again.');
    }
    await next();
  });
  api.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

  // everything else needs a session, and runs as its person
  api.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw signedOut();
    const person = { id: session.user.id, email: session.user.email, name: session.user.name };
    const db: Env['Variables']['db'] = (fn) => asPerson(deps.app, person.id, fn);
    const row = await db(async (tx) => {
      const [a] = await tx.select().from(schema.userAccess).where(eq(schema.userAccess.userId, person.id));
      return a;
    });
    if (row?.suspendedAt) throw suspended();
    c.set('person', person);
    c.set('access', {
      isAdmin: row?.isAdmin ?? false,
      features: { ...NO_SWITCHES, ...(row?.features as Partial<MemberSwitches> | undefined) },
      suspended: false,
    });
    c.set('db', db);
    await next();
  });

  api.route('/', personRoutes());
  api.route('/admin', adminRoutes());
  return { api, auth };
}
