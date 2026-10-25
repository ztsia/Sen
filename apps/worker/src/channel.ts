import { DurableObject } from 'cloudflare:workers';
import type { Hint, Topic } from '@sen/core/realtime';
import type { Env } from './env';

/** Open screens per channel: a person's phone, a browser or two. More is someone misusing a pass. */
const MAX_SOCKETS = 20;

/**
 * One realtime channel (D100): `user:<id>` now, `split:<id>` with splits. It holds the open screens'
 * WebSockets, hibernated between hints so an idle connection costs nothing, and sends each hint to
 * all of them. A hint is `{seq, topics}`: which topics changed, never data. `seq` counts up per
 * channel, so a screen that sees a gap reloads everything. `ping` is answered `pong` without waking.
 */
export class Channel extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /** A screen connecting, its pass already checked by the Worker. */
  override async fetch(): Promise<Response> {
    const open = this.ctx.getWebSockets();
    // the oldest goes first: a screen that reconnects without closing leaves one behind
    for (const ws of open.slice(0, Math.max(0, open.length - MAX_SOCKETS + 1))) ws.close(1013, 'Too many screens');
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async hint(topics: Topic[]): Promise<number> {
    const seq = ((await this.ctx.storage.get<number>('seq')) ?? 0) + 1;
    await this.ctx.storage.put('seq', seq);
    const message = JSON.stringify({ seq, topics } satisfies Hint);
    let sent = 0;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
        sent++;
      } catch {
        // already closing
      }
    }
    return sent;
  }

  // a screen sends nothing but ping, answered above; anything else is ignored
  override async webSocketMessage(): Promise<void> {}

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1005/1006 carry no code to echo; the rest close back as they came
    ws.close(code === 1005 || code === 1006 ? 1000 : code, 'Closed');
  }
}
