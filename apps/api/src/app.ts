import { Hono } from 'hono';

/** The one API (spec §16), mounted at /api on the web app's own domain. */
export const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));

// probe (B05): what path the function sees behind the /api route
app.get('/echo/*', (c) => c.json({ path: c.req.path, url: c.req.url }));
