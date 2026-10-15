import { serve } from '@hono/node-server';
import { z } from 'zod';
import { createApp, defaultDeps } from './app';

/** The API on Node for local development (spec §5.1): `pnpm --filter @sen/api dev`, behind Vite's proxy. */
const { api } = createApp(defaultDeps());
const port = z.coerce
  .number()
  .int()
  .parse(process.env.SEN_API_PORT ?? 8787);
serve({ fetch: api.fetch, port, hostname: '127.0.0.1' }, () => console.log(`api: http://127.0.0.1:${port}/api`));
