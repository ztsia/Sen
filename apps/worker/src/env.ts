import type { Channel } from './channel';
import type { Scheduler } from './scheduler';

/** The Worker's bindings (wrangler.jsonc) and secrets (`wrangler secret put`, never in the repo). */
export interface Env {
  SCHEDULER: DurableObjectNamespace<Scheduler>;
  CHANNEL: DurableObjectNamespace<Channel>;
  /** The Sen site whose API this Worker serves: production's, or the review alias for the preview Worker. */
  API_ORIGIN: string;
  /** Shared with Vercel: the Worker sends it to /jobs/tick, and the API sends it to /schedule. */
  SCHEDULER_SECRET: string;
  /** Shared with Vercel: signs the passes screens connect with, and authorises the API's hints. */
  RELAY_SECRET: string;
}
