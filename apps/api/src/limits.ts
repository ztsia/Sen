import type pg from 'pg';
import { ApiError } from './errors';

/**
 * A fixed-window counter in Better Auth's own rate-limit table (`sen:`-prefixed keys, so they never
 * meet its own), shared by every Vercel instance. Returns false once `key` has been hit more than
 * `max` times in the window that began with its first hit.
 */
export async function withinLimit(pool: pg.Pool, key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const r = await pool.query<{ count: number }>(
    `insert into auth_rate_limit (key, count, last_request) values ($1, 1, $2)
     on conflict (key) do update set
       count = case when auth_rate_limit.last_request < $2 - $3 then 1 else auth_rate_limit.count + 1 end,
       last_request = case when auth_rate_limit.last_request < $2 - $3 then $2 else auth_rate_limit.last_request end
     returning count`,
    [`sen:${key}`, now, windowMs],
  );
  return r.rows[0]!.count <= max;
}

/** The client's address as Vercel reports it (it overwrites x-forwarded-for), or one shared bucket locally. */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local';
}

/**
 * Asking for a code (QA B05 run 1, 6): each one is a Gmail send, so besides Better Auth's limit per
 * address (5 a minute, here), an email gets 5 codes in 10 minutes, and an address may look up 20 emails a
 * minute, whether invited or not.
 */
export const LIMITS = {
  lookupsPerIp: { max: 20, windowMs: 60_000 },
  // Better Auth's own limit on its send route, kept now that Sen sends the code itself (QA B05 run 2, 18)
  codesPerIp: { max: 5, windowMs: 60_000 },
  codesPerEmail: { max: 5, windowMs: 10 * 60_000 },
  // a test push or test job (B06), per person, so the routes can't be used to spam a phone
  testsPerPerson: { max: 3, windowMs: 60_000 },
};

export const tooMany = (message: string) => new ApiError(429, 'too_many', message);
