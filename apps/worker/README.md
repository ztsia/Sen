# The Cloudflare Worker

Sen's clock and its realtime relay (D99, D100; B06). It holds no data: it tells the API when to run
jobs, and tells open screens *which topics changed*, never what.

| Route | Who calls it | What it does |
|---|---|---|
| the cron, each minute | Cloudflare | The scheduler (a Durable Object) calls `POST /api/jobs/tick` with the scheduler secret, **only when the API said something would be due**. The tick answers with its next time, so Neon sleeps between (its free compute is counted by the minute) |
| `GET /health` | the outside monitor | `200 {ok:true}`, or `503` with `late: ['cron' \| 'tick']` when the cron has stopped for 5 minutes or ticks have failed for 15. No data |
| `POST /schedule` | the API, with the scheduler secret | `{at}`: tick by then (a one-off job sooner than the next tick) |
| `POST /hint` | the API, with the relay secret | `{channel, topics}`: sends `{seq, topics}` to every open screen on that channel. Topics are `TOPICS` in `packages/core/src/realtime.ts` |
| `GET /connect?pass=…` | a screen, as a WebSocket | The pass (from the API's `/realtime/token`, 5 minutes, one channel) opens its channel. `ping` is answered `pong` |

## Two Workers, one config

`wrangler.jsonc` makes two:

| Worker | Serves | Deploys from |
|---|---|---|
| `sen-worker` | production, `https://sen-my.vercel.app` | `main` (`wrangler deploy`) |
| `sen-worker-preview` | the review alias, `https://sen-review.vercel.app` | every other branch (`wrangler deploy --env preview`) |

**Nothing is deployed by hand (D122).** Cloudflare's Git builds (Workers Builds) watch `ztsia/Sen`, with
root directory `apps/worker`; `ztsia/Sen`'s Actions hold no Cloudflare secret. The steps that set it
up are in `docs/local.md`.

**Secrets** (`wrangler secret put <name>` and `--env preview`, never in the repo), each shared with the
matching Vercel environment: `SCHEDULER_SECRET` and `RELAY_SECRET`. Vercel also holds `RELAY_URL`, the
Worker's `https://` address. Production's and previews' are different values.

## Locally

`apps/worker/.dev.vars` (gitignored) holds `API_ORIGIN=http://127.0.0.1:8787` and two made-up secrets of
32 characters or more; run the API with the same two and `RELAY_URL=http://127.0.0.1:8790`, then
`pnpm exec wrangler dev --port 8790 --test-scheduled` here. `curl http://127.0.0.1:8790/__scheduled`
fires the cron. `src/clock.ts` holds the scheduler's decisions, tested in `src/clock.test.ts`.
