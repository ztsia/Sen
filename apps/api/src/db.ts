import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { schema } from '@sen/db';

export type Db = NodePgDatabase<typeof schema>;

/**
 * The API's connections: one small pool per role (spec §5, §17). `app_user` for every request's data,
 * `sen_auth` for Better Auth's tables. Small, because each Vercel instance serves one request at a
 * time and Neon's pooler does the pooling. `pg` over the pooled URL has real interactive
 * transactions, which the per-request identity needs.
 */
export function pools(urls: { app_user: string; sen_auth: string }) {
  const opts = { max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 };
  return {
    app: new pg.Pool({ connectionString: urls.app_user, ...opts }),
    auth: new pg.Pool({ connectionString: urls.sen_auth, ...opts }),
  };
}

/**
 * Runs `fn` as `userId` (spec §5, *Every request runs as you*): a short transaction on `app_user`
 * that first sets `app.user_id` with `is_local = true`, so the id ends with the transaction and a
 * pooled connection can't carry it into someone else's request. RLS, not this code, decides which
 * rows `fn` can reach. A long job opens one of these per step, never one across a model call.
 */
export async function asPerson<T>(pool: pg.Pool, userId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(drizzle(client, { schema, casing: 'snake_case' }));
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
