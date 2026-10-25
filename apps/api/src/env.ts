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
  /** SCHEDULER_SECRET (D99): the Worker's cron sends it to /jobs/tick, and the API to the Worker. */
  scheduler: string | null;
  /** The relay (D100): RELAY_URL, the Worker's address, and RELAY_SECRET, which signs passes and hints. */
  relay: { url: string; secret: string } | null;
  /** FIREBASE_SERVICE_ACCOUNT: the service account's JSON key, for FCM (spec §5.1 Push). */
  firebase: FirebaseAccount | null;
}

export interface FirebaseAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** The B06 services' variables, the same locally and on Vercel; each is off when unset. */
function services(e: NodeJS.ProcessEnv): Pick<ApiEnv, 'scheduler' | 'relay' | 'firebase'> {
  const short = (v: string | undefined) => (v && v.length >= 32 ? v : null);
  const relaySecret = short(e.RELAY_SECRET);
  let firebase: FirebaseAccount | null = null;
  if (e.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const a = JSON.parse(e.FIREBASE_SERVICE_ACCOUNT) as Partial<FirebaseAccount>;
      if (a.project_id && a.client_email && a.private_key)
        firebase = { project_id: a.project_id, client_email: a.client_email, private_key: a.private_key };
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT is not the service account JSON; push is off');
    }
  }
  return {
    // a secret shorter than 32 characters is treated as unset, so a typo can't open the tick
    scheduler: short(e.SCHEDULER_SECRET),
    relay: e.RELAY_URL && relaySecret ? { url: e.RELAY_URL.replace(/\/+$/, ''), secret: relaySecret } : null,
    firebase,
  };
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
    const urls = {
      app_user: e.APP_DATABASE_URL ?? roleUrl(base, 'app_user', null),
      sen_auth: e.AUTH_DATABASE_URL ?? roleUrl(base, 'sen_auth', null),
    };
    // a local server signs in with the fixed preview code: it must never reach a real database
    // (docs/cloud.md §3), so anything but a local one is refused
    for (const u of Object.values(urls))
      if (!['127.0.0.1', 'localhost'].includes(new URL(u).hostname))
        throw new Error('A local API connects only to the local Postgres (scripts/local-db.sh)');
    return { target, secret: e.BETTER_AUTH_SECRET ?? LOCAL_SECRET, urls, gmail, ...services(e) };
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
    ...services(e),
  };
}
