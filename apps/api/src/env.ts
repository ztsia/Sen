import { rolePassword, roleUrl, type LoginRole } from '@sen/db';

/** Where the API runs: Vercel's production or a preview, or a local server and the tests. */
export type Target = 'production' | 'preview' | 'local';

export interface ApiEnv {
  target: Target;
  /** BETTER_AUTH_SECRET: signs sessions, and the database roles' passwords derive from it. */
  secret: string;
  /** The URL each role connects with. */
  urls: Record<LoginRole, string>;
  /** Sen's Gmail (D54): production sends every code through it. */
  gmail: { user: string; password: string } | null;
}

const LOCAL_SECRET = 'sen-local-development-secret-not-for-any-deploy';

/**
 * Reads the environment once. On Vercel, each role's URL is the owner's pooled URL (DATABASE_URL,
 * from the Neon integration) with the role and its derived password put in place of the owner's, so
 * the owner's credentials never open a connection here (spec §17). Locally, APP_DATABASE_URL and
 * AUTH_DATABASE_URL name the local Postgres, where trust authentication needs no password.
 */
export function readEnv(e: NodeJS.ProcessEnv = process.env): ApiEnv {
  const vercel = e.VERCEL_ENV;
  const target: Target = vercel === 'production' ? 'production' : vercel === 'preview' ? 'preview' : 'local';
  const gmail = e.GMAIL_USER && e.GMAIL_APP_PASSWORD ? { user: e.GMAIL_USER, password: e.GMAIL_APP_PASSWORD } : null;
  if (target === 'local') {
    const base = e.SEN_LOCAL_DATABASE ?? 'postgres://127.0.0.1:5432/sen_dev';
    return {
      target,
      secret: e.BETTER_AUTH_SECRET ?? LOCAL_SECRET,
      urls: {
        app_user: e.APP_DATABASE_URL ?? roleUrl(base, 'app_user', null),
        sen_auth: e.AUTH_DATABASE_URL ?? roleUrl(base, 'sen_auth', null),
      },
      gmail,
    };
  }
  const secret = e.BETTER_AUTH_SECRET;
  const pooled = e.DATABASE_URL;
  if (!secret || !pooled) throw new Error('BETTER_AUTH_SECRET and DATABASE_URL must be set');
  // production signs in only by a real email; it never starts without one (previews show their codes)
  if (target === 'production' && !gmail) throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in production');
  return {
    target,
    secret,
    urls: {
      app_user: roleUrl(pooled, 'app_user', rolePassword(secret, 'app_user')),
      sen_auth: roleUrl(pooled, 'sen_auth', rolePassword(secret, 'sen_auth')),
    },
    gmail,
  };
}
