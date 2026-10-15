import { getRequestListener } from '@hono/node-server';
import { app } from './app';

/** Vercel's Node launcher calls this with (req, res); Hono answers it as a fetch. */
export default getRequestListener(app.fetch);
