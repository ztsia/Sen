import { AsyncLocalStorage } from 'node:async_hooks';
import type { MiddlewareHandler } from 'hono';
import type pg from 'pg';

/** One request's database use, added up as its queries finish. */
interface Tally {
  queries: number;
  rows: number;
  dbMs: number;
}

const current = new AsyncLocalStorage<Tally>();

/** One answered request, as QA records it: the route's pattern, never its path's ids or any data. */
export interface Timed {
  method: string;
  route: string;
  status: number;
  appMs: number;
  dbMs: number;
  queries: number;
  rows: number;
  bytes: number;
}
let sink: ((t: Timed) => void) | null = null;
/** QA's tests listen here (apps/api/test/metrics.setup.ts); production never sets it. */
export const onTimed = (fn: typeof sink) => void (sink = fn);
const counted = new WeakSet<pg.Pool>();

/**
 * Counts every query a pool's connections run, for the request they run in (D139). Wraps each new
 * connection's `query` once, so Drizzle's, Better Auth's and our own calls all count; a query outside a
 * request (a test's own setup) counts nowhere.
 */
export function countQueries(pool: pg.Pool): void {
  // two apps on one pool (the tests make several) must not count each query twice
  if (counted.has(pool)) return;
  counted.add(pool);
  pool.on('connect', (client) => {
    const query = client.query.bind(client) as (...args: unknown[]) => unknown;
    (client as { query: unknown }).query = (...args: unknown[]) => {
      const tally = current.getStore();
      if (!tally) return query(...args);
      const t0 = performance.now();
      tally.queries++;
      const count = (r: pg.QueryResult | pg.QueryResult[] | undefined) => {
        tally.dbMs += performance.now() - t0;
        for (const one of Array.isArray(r) ? r : [r]) tally.rows += one?.rows?.length || one?.rowCount || 0;
      };
      // pg's own Pool.query passes a callback; Drizzle and Better Auth take the promise
      const last = args.at(-1);
      if (typeof last === 'function')
        return query(...args.slice(0, -1), (e: unknown, r: pg.QueryResult) => {
          count(r);
          (last as (e: unknown, r: unknown) => void)(e, r);
        });
      const result = query(...args);
      if (!(result instanceof Promise)) return result;
      return result.then(
        (r: pg.QueryResult | pg.QueryResult[]) => {
          count(r);
          return r;
        },
        (e: unknown) => {
          count(undefined);
          throw e;
        },
      );
    };
  });
}

/**
 * Sends `Server-Timing` on every answer, so any client run can split the server's time from the
 * network's: `app;dur=<ms>, db;dur=<ms>, db-queries;dur=<n>, db-rows;dur=<n>`. Numbers only, never data.
 * Read by qa/limits.ts' `serverTiming`. First in the chain, so it times everything after it.
 */
export const serverTiming: MiddlewareHandler = (c, next) => {
  const tally: Tally = { queries: 0, rows: 0, dbMs: 0 };
  const t0 = performance.now();
  return current.run(tally, async () => {
    await next();
    const ms = (n: number) => Math.round(n * 10) / 10;
    const appMs = ms(performance.now() - t0);
    c.header(
      'Server-Timing',
      `app;dur=${appMs}, db;dur=${ms(tally.dbMs)}, db-queries;dur=${tally.queries}, db-rows;dur=${tally.rows}`,
    );
    if (sink) {
      const bytes = c.res.body ? (await c.res.clone().arrayBuffer()).byteLength : 0;
      sink({
        method: c.req.method,
        route: c.req.routePath,
        status: c.res.status,
        appMs,
        ...tally,
        dbMs: ms(tally.dbMs),
        bytes,
      });
    }
  });
};
