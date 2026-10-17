import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type pg from 'pg';
import { z } from 'zod';
import type { MemberSwitches } from '@sen/core/views';
import { schema } from '@sen/db';
import { createAuth, type Auth } from './auth';
import { NO_SWITCHES, type Env } from './context';
import { asPerson, pools } from './db';
import { readEnv, type ApiEnv } from './env';
import { ApiError, checkBody, onError, readJson, sameOrigin, signedOut, suspended } from './errors';
import { clientIp, LIMITS, tooMany, withinLimit } from './limits';
import { gmailMailer, noMail, type Mailer } from './mail';
import { countQueries, serverTiming } from './timing';
import { adminRoutes, personRoutes } from './routes';

/** The largest request body the API reads, in bytes. */
export const MAX_BODY = 256 * 1024;

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
  countQueries(deps.app);
  countQueries(deps.auth);
  const api = new Hono<Env>().basePath('/api');
  api.onError(onError);
  api.use('*', serverTiming);
  api.notFound((c) => c.json({ code: 'not_found', message: 'No such route.' }, 404));

  // nothing Sen serves is for search engines (D127); vercel.json says so on Vercel, this says it everywhere
  api.use('*', async (c, next) => {
    await next();
    c.header('X-Robots-Tag', 'noindex');
    c.header('Cache-Control', 'no-store');
  });
  // no body Sen takes comes near this; a bigger one is refused before anything reads it (the sweep)
  api.use(
    '*',
    bodyLimit({
      maxSize: MAX_BODY,
      onError: (c) => c.json({ code: 'too_large', message: 'That’s too big for Sen.' }, 413),
    }),
  );

  api.get('/health', (c) => c.json({ ok: true }));

  // A write comes only from Sen's own pages, as JSON (QA B05 run 2, 26): another site's form or
  // script can't post here, whatever the cookie's SameSite does. Better Auth checks its own routes.
  api.use('*', async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && !c.req.path.startsWith('/api/auth/')) {
      if (!sameOrigin(c)) throw new ApiError(403, 'forbidden', 'That came from another site.');
      if (
        c.req.header('content-length') !== '0' &&
        !c.req.header('content-type')?.startsWith('application/json') &&
        c.req.method !== 'DELETE'
      )
        throw new ApiError(415, 'invalid', 'Sen takes JSON.');
    }
    await next();
  });

  // Sen is invitation-only (D52). Better Auth answers success for an unknown email and sends nothing,
  // so the screen couldn't tell; this says so before a code is asked for, and says when someone's
  // access is paused. It reveals whether an email has an account, which an invitation-only app of
  // friends accepts, behind a limit on lookups per address and on codes per email.
  // Better Auth's routes get no NUL either: it answers one with an empty 500 (QA B05 run 3, 31)
  api.post('/auth/*', async (c, next) => {
    const body = await c.req.raw
      .clone()
      .json()
      .catch(() => null);
    checkBody(body);
    // and only from Sen's own pages: Better Auth's own check lets `Origin: null` through (run 4, 38)
    if (!sameOrigin(c)) throw new ApiError(403, 'forbidden', 'That came from another site.');
    await next();
  });

  api.post('/auth/email-otp/send-verification-otp', async (c) => {
    // this route is Sen's now, so it checks what Better Auth would have (run 3, 36)
    if (!c.req.header('content-type')?.startsWith('application/json'))
      throw new ApiError(415, 'invalid', 'Sen takes JSON.');
    const parsed = z
      .object({ email: z.string().trim().min(1).max(254), type: z.literal('sign-in') })
      .safeParse(await readJson(c));
    if (!parsed.success) throw new ApiError(400, 'invalid', 'Type your email.', 'email');
    const email = parsed.data.email.trim().toLowerCase();
    const { lookupsPerIp, codesPerIp, codesPerEmail } = LIMITS;
    if (
      !(await withinLimit(deps.auth, `lookup:${clientIp(c.req.raw.headers)}`, lookupsPerIp.max, lookupsPerIp.windowMs))
    )
      throw tooMany('Too many tries. Wait a minute, then try again.');
    const r = await deps.auth.query<{ check: string }>('select auth_sign_in_check($1) as check', [email]);
    const check = r.rows[0]?.check;
    if (check === 'not_invited') throw new ApiError(403, 'not_invited', 'Sen is invitation-only.', 'email');
    if (check === 'suspended') throw suspended();
    if (!(await withinLimit(deps.auth, `codes-ip:${clientIp(c.req.raw.headers)}`, codesPerIp.max, codesPerIp.windowMs)))
      throw tooMany('Too many codes asked for. Wait a minute, then try again.');
    if (!(await withinLimit(deps.auth, `codes:${email}`, codesPerEmail.max, codesPerEmail.windowMs)))
      throw tooMany('Too many codes asked for. Wait a few minutes, then try again.');
    // The code is made by Better Auth and sent here, awaited: its own route sends in the background
    // and answers success even when Gmail fails, so a code never sent would look like one in spam
    // (QA B05 run 2, 18). The previous code for this address is replaced, as its route would.
    await deps.auth.query('delete from auth_verification where identifier = $1', [`sign-in-otp-${email}`]);
    const otp = await auth.api.createVerificationOTP({ body: { email, type: 'sign-in' } });
    try {
      await deps.mailer.sendCode(email, otp);
    } catch (e) {
      console.error('sign-in code not sent', e);
      await deps.auth.query('delete from auth_verification where identifier = $1', [`sign-in-otp-${email}`]);
      throw new ApiError(502, 'mail_failed', 'Sen couldn’t send the email. Try again in a minute.');
    }
    return c.json({ success: true });
  });
  api.on(['GET', 'POST'], '/auth/*', async (c) => {
    const res = await auth.handler(c.req.raw);
    // an unknown path under /auth: the error shape, as everywhere else (QA B05 run 2, 25)
    if (res.status === 404 && !res.headers.get('content-length') && !(await res.clone().text()))
      return c.json({ code: 'not_found', message: 'No such route.' }, 404);
    return res;
  });

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
