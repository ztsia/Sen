import { TOPICS, verifyPass, type Topic } from '@sen/core/realtime';
import type { Env } from './env';

export { Channel } from './channel';
export { Scheduler } from './scheduler';

/**
 * Sen's Cloudflare Worker (D99, D100): it keeps time for the API and relays "something changed" hints
 * to open screens, never data.
 * - the cron, each minute → the scheduler, which calls `/jobs/tick` when something is due
 * - `GET /health`: the outside monitor's check that the cron runs and ticks succeed; no data
 * - `POST /schedule` (the scheduler secret): the API asks for a tick by a time
 * - `POST /hint` (the relay secret): the API names a channel's changed topics
 * - `GET /connect?pass=…`: a screen's WebSocket, with a pass from the API's `/realtime/token`
 */
export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(scheduler(env).cron());
  },

  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /health') {
        const h = await scheduler(env).health();
        return h.ok
          ? json({ ok: true })
          : json({ code: 'late', message: `Late: ${h.late.join(', ')}.`, late: h.late }, 503);
      }
      if (route === 'POST /schedule') {
        if (!(await bearer(req, env.SCHEDULER_SECRET))) return refused();
        const at = Date.parse(String((await body(req))?.at));
        if (!Number.isFinite(at)) return json({ code: 'invalid', message: 'Say when.' }, 400);
        await scheduler(env).wake(at);
        return json({ ok: true });
      }
      if (route === 'POST /hint') {
        if (!(await bearer(req, env.RELAY_SECRET))) return refused();
        const b = await body(req);
        const channel = typeof b?.channel === 'string' ? b.channel : '';
        const topics = Array.isArray(b?.topics) ? b.topics : [];
        if (!CHANNEL_RE.test(channel) || !topics.length || !topics.every(isTopic))
          return json({ code: 'invalid', message: 'Name a channel and its topics.' }, 400);
        const sent = await env.CHANNEL.get(env.CHANNEL.idFromName(channel)).hint(topics);
        return json({ sent });
      }
      if (route === 'GET /connect') {
        if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket')
          return json({ code: 'invalid', message: 'Connect with a WebSocket.' }, 426);
        const channel = await verifyPass(env.RELAY_SECRET, url.searchParams.get('pass') ?? '');
        if (!channel || !CHANNEL_RE.test(channel)) return refused();
        return env.CHANNEL.get(env.CHANNEL.idFromName(channel)).fetch(req);
      }
      return json({ code: 'not_found', message: 'No such route.' }, 404);
    } catch (e) {
      console.error(route, e instanceof Error ? e.name : e);
      return json({ code: 'server', message: 'Something went wrong.' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

/** A person's channel; a split's arrives with splits. */
const CHANNEL_RE = /^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isTopic = (t: unknown): t is Topic => typeof t === 'string' && (TOPICS as readonly string[]).includes(t);

const scheduler = (env: Env) => env.SCHEDULER.get(env.SCHEDULER.idFromName('scheduler'));

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const refused = () => json({ code: 'signed_out', message: 'That isn’t Sen.' }, 401);

/** At most a small JSON object: hints and wakes are tiny. */
async function body(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > 4096) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Compares the bearer token with the secret in constant time, by comparing their digests. */
async function bearer(req: Request, secret: string | undefined): Promise<boolean> {
  const header = req.headers.get('authorization') ?? '';
  if (!secret || secret.length < 32 || !header.startsWith('Bearer ')) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(header.slice(7))),
    crypto.subtle.digest('SHA-256', enc.encode(secret)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}
