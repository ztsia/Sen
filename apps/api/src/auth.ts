import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import { schema } from '@sen/db';
import { PREVIEW_CODE, type Mailer } from './mail';
import type { Target } from './env';

/** Codes last 10 minutes; three wrong tries end one (Better Auth's default), and *Send a new code* makes another. */
const CODE_SECONDS = 600;

/**
 * Better Auth (D13, D54): a 6-digit code by email, sign-up off, UUIDs made by Postgres, its tables
 * prefixed `auth_` and reached only through `sen_auth`. No admin plugin, which can impersonate people:
 * the admin is a flag on `user_access` (D52). Mounted at /api/auth on the web app's own origin, so
 * its session cookie is first-party.
 */
export function createAuth(opts: { pool: pg.Pool; secret: string; target: Target; mailer: Mailer }) {
  const fixedCode = opts.target !== 'production';
  return betterAuth({
    appName: 'Sen',
    basePath: '/api/auth',
    secret: opts.secret,
    database: drizzleAdapter(drizzle(opts.pool), {
      provider: 'pg',
      schema: {
        auth_user: schema.authUser,
        auth_session: schema.authSession,
        auth_account: schema.authAccount,
        auth_verification: schema.authVerification,
        auth_rate_limit: schema.authRateLimit,
      },
    }),
    user: { modelName: 'auth_user' },
    // a phone signs in rarely (D13): a session lasts 90 days from its last use
    session: { modelName: 'auth_session', expiresIn: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'auth_rate_limit',
      // A code allows 3 tries itself; this limit only stops guessing across codes, so it's looser
      // than 3, or a new code after 3 wrong tries would be refused for a minute (QA B05 run 1, 4)
      customRules: {
        '/sign-in/email-otp': { window: 60, max: 10 },
        '/email-otp/send-verification-otp': { window: 60, max: 5 },
      },
    },
    emailAndPassword: { enabled: false },
    advanced: {
      database: { generateId: 'uuid' },
      // Vercel's proxy answers https; behind it the function sees http
      useSecureCookies: opts.target !== 'local',
    },
    telemetry: { enabled: false },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: CODE_SECONDS,
        disableSignUp: true,
        storeOTP: 'hashed',
        // previews hold only made-up people and have no mail: their code is fixed (dev panel)
        ...(fixedCode ? { generateOTP: () => PREVIEW_CODE } : {}),
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'sign-in') return;
          await opts.mailer.sendCode(email, otp);
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
