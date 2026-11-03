import { toastDone } from '@/blocks/toast';
import { OUTBOX_BRIDGE, SenCapture, hasBridge } from '@/shell/bridge';
import { onResume } from '@/shell/use-bridge';
import { queryClient } from './index';
import { addPending, dropPending, pendingWrites, type PendingWrite } from './pending';
import { onHint } from './realtime';

// The shell's side of pending writes (B07, bridge 4): a write goes into the shell's SQLite outbox and
// shows at once; the shell syncs it when it can, and this file asks what became of it every 2 s while any
// is waiting, when the app comes back to the front, and when the server says Settings changed.

export const POLL_MS = 2000;

/** Writes the shell has accepted (`write` answered): only these are asked about, never one still on its way in. */
const written = new Set<string>();
let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;
let started = false;

const mine = () => pendingWrites().filter((w) => w.via === 'outbox');

/** Puts a write in the outbox and shows it. Throws, with nothing left pending, if the shell won't take it. */
export async function writeToOutbox(w: PendingWrite): Promise<void> {
  addPending(w);
  try {
    await SenCapture.write({ id: w.id, command: w.command, madeAt: w.madeAt });
  } catch (e) {
    dropPending(w.id);
    void queryClient.invalidateQueries({ queryKey: ['settings'] });
    throw e;
  }
  written.add(w.id);
  watch();
}

function watch() {
  timer ??= setInterval(() => void settleOutbox(), POLL_MS);
}

function unwatch() {
  clearInterval(timer);
  timer = undefined;
}

/**
 * Asks the shell what became of the writes waiting here. A write a sync carried (applied, or applied by
 * an earlier try) leaves the store once Settings has been read again with it; one the server refused
 * leaves at once, so the screen goes back to the server's value, and the person is told why.
 */
export async function settleOutbox(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const waiting = mine().filter((w) => written.has(w.id));
    if (!waiting.length) {
      if (!mine().length) unwatch();
      return;
    }
    const state = await SenCapture.pending();
    const byId = new Map(state.commands.map((c) => [c.id, c]));
    for (const w of waiting) {
      const c = byId.get(w.id);
      if (c?.status === null) continue;
      written.delete(w.id);
      if (c?.status === 'refused') {
        dropPending(w.id);
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
        toastDone(`Couldn't save: ${c.said ?? "Sen's server refused it."}`);
      } else {
        // read Settings again with the write still laid over it, then let it go: no flicker between
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
        dropPending(w.id);
      }
    }
    if (!mine().length) unwatch();
  } catch {
    // the shell didn't answer: the next tick asks again
  } finally {
    busy = false;
  }
}

/**
 * At launch, in the shell: picks up writes made before the app was closed that no sync has carried yet,
 * so their fields still show and say *Not synced yet*; then watches them. Does nothing in a browser or an
 * older shell. Safe to call twice.
 */
export async function startOutbox(): Promise<void> {
  if (started || !(await hasBridge(OUTBOX_BRIDGE))) return;
  started = true;
  onResume(() => void settleOutbox());
  onHint((topics) => {
    if (topics.includes('settings')) void settleOutbox();
  });
  try {
    const known = new Set(pendingWrites().map((w) => w.id));
    for (const c of (await SenCapture.pending()).commands) {
      if (c.status !== null || known.has(c.id)) continue;
      written.add(c.id);
      addPending({ id: c.id, command: c.command, madeAt: c.madeAt, via: 'outbox', state: 'queued' });
    }
    if (mine().length) watch();
  } catch {
    // nothing to pick up
  }
}
