import { getRequestListener } from '@hono/node-server';
import { createApp, defaultDeps } from './app';

const { api } = createApp(defaultDeps());

/**
 * Vercel's Node launcher calls this with (req, res). Its proxy speaks https to the phone and http to
 * the function, so the request's URL is put back to https: Better Auth compares it with the Origin
 * header, and sets secure cookies.
 */
export default getRequestListener((req) => {
  if (req.headers.get('x-forwarded-proto') !== 'https') return api.fetch(req);
  const url = new URL(req.url);
  if (url.protocol === 'https:') return api.fetch(req);
  url.protocol = 'https:';
  return api.fetch(new Request(url, req));
});
