import type { Command, WriteResult } from '@sen/core/commands';
import type { CaptureHealthView, CapturedView } from '@sen/core/sync';
import type { MeView, SettingsCore, SettingsView } from '@sen/core/views';
import { toastDone, toastRetry, toastUndo } from '@/blocks/toast';
import { readStored, writeStored } from '@/lib/storage';
import { newId } from '@/lib/uid';
import { OUTBOX_BRIDGE, hasBridge } from '@/shell/bridge';
import type { Backend } from '../backend';
import { queryClient } from '../index';
import { writeToOutbox } from '../outbox';
import {
  addPending,
  applyPending,
  dropPending,
  localAnswer,
  noteFailed,
  pendingWrites,
  type PendingWrite,
} from '../pending';
import { ApiFailure, apiCall } from './client';

const KEPT = 'sen.api.kept';
/** Whose answers they are: no read is named this. */
const WHO = '__who';

/**
 * The last answer each read had, kept on this device, for when the server can't be reached: Sen
 * opens offline (QA B05 run 2, 23). Only your own reads, and forgotten at sign-out (auth.ts).
 */
async function kept<T>(key: string, load: () => Promise<T>): Promise<T> {
  const all = (): Record<string, unknown> => {
    try {
      return JSON.parse(readStored(KEPT) ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  try {
    const value = await load();
    writeStored(KEPT, JSON.stringify({ ...all(), [key]: value }));
    return value;
  } catch (e) {
    const last = all()[key];
    if (e instanceof ApiFailure && e.status === 0 && last !== undefined) return last as T;
    throw e;
  }
}

/** Forgets every kept answer: at sign-out, so the next person on this device sees nothing of them. */
export function forgetKept() {
  writeStored(KEPT, null);
}

/**
 * Marks the kept answers as `email`'s, once the server has said who is signed in: answers kept for
 * anyone else are forgotten first, so they never reach the wrong person offline (security scan, F4).
 */
export function keepFor(email: string) {
  let who: unknown;
  try {
    who = (JSON.parse(readStored(KEPT) ?? '{}') as Record<string, unknown>)[WHO];
  } catch {
    who = undefined;
  }
  if (who !== email) writeStored(KEPT, JSON.stringify({ [WHO]: email }));
}

/** What a screen whose server isn't built yet gets: production shows *Not built yet* instead. */
const notYet = (): never => {
  throw new Error('Sen’s server doesn’t hold this yet.');
};

/**
 * The browser's backend (B05): each read a route of §16, each command `POST /api/commands`. It holds
 * only what the server holds so far: who you are (`me`), Settings' *You*, and commands on them. Every
 * other read and write goes to `rest`: in a preview, the skeleton's fake, so its screens still show
 * Wei Ming's made-up month around the real parts; in production, nothing, so those screens say *Not
 * built yet*. Each later slice moves its methods from `rest` to here.
 *
 * A `setting.set` is a pending write (B07, pending.ts): in the shell it goes into the outbox, which syncs
 * it; in a browser it shows at once and its request goes straight to the API, reverting with *Retry* if
 * that fails. Either way the answer is the server's own words, worked out here.
 */
export function createApiBackend(rest: Backend | null): Backend {
  const fallback = new Proxy({} as Backend, {
    get: (_t, key: keyof Backend) => (rest ? rest[key] : notYet),
  });
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((fn) => fn());
  const self: Backend = {
    ...bind(fallback),
    me: () => kept('me', () => apiCall<MeView>('/me')),
    async settings(): Promise<SettingsView> {
      const core = await kept('settings', () => apiCall<SettingsCore>('/settings'));
      const view = rest ? { ...(await rest.settings()), ...core } : (core as SettingsView);
      // what the person has just changed and the server hasn't confirmed stays on show
      return applyPending(view, pendingWrites());
    },
    async run(cmd: Command): Promise<WriteResult> {
      if (!servedHere(cmd)) return fallback.run(cmd);
      if (cmd.type !== 'setting.set') {
        const result = await apiCall<WriteResult>('/commands', { body: cmd });
        changed();
        return result;
      }
      return write(self, cmd);
    },
    captured(before) {
      return apiCall<CapturedView>(before ? `/captured?before=${encodeURIComponent(before)}` : '/captured');
    },
    captureHealth: () => apiCall<CaptureHealthView>('/capture/health'),
    subscribe(onChange) {
      listeners.add(onChange);
      const off = rest?.subscribe(onChange);
      return () => {
        listeners.delete(onChange);
        off?.();
      };
    },
  };
  return self;
}

/**
 * Settings as the person sees them now, for the words and undo of a write: the screens' own copy when
 * there is one, so the answer doesn't wait on the network.
 */
async function seen(b: Backend): Promise<SettingsView | null> {
  const shown = queryClient.getQueryData<SettingsView>(['settings']);
  if (shown) return shown;
  try {
    return await b.settings();
  } catch {
    return null;
  }
}

/**
 * A `setting.set`, shown at once (B07). In the shell (bridge 4) it goes into the outbox; in a browser, or
 * an older shell, its request goes straight to the API in the background. Both answer now with the
 * server's own words and an undo that puts back what was there.
 */
async function write(b: Backend, command: Command): Promise<WriteResult> {
  const answer = localAnswer(command, await seen(b));
  const w: PendingWrite = {
    id: newId(),
    command,
    madeAt: new Date().toISOString(),
    via: 'api',
    state: 'sending',
  };
  if (await hasBridge(OUTBOX_BRIDGE)) {
    await writeToOutbox({ ...w, via: 'outbox', state: 'queued' });
  } else {
    addPending(w);
    void send(b, w);
  }
  return answer;
}

/** The browser's request. It leaves the store when it answers: kept if the server took it, undone if not. */
async function send(b: Backend, w: PendingWrite): Promise<void> {
  try {
    await apiCall<WriteResult>('/commands', { body: w.command });
  } catch (e) {
    dropPending(w.id);
    noteFailed(w.command);
    void queryClient.invalidateQueries({ queryKey: ['settings'] });
    const f = e instanceof ApiFailure ? e : null;
    // the session ending sends the person to sign-in by itself
    if (f && (f.code === 'signed_out' || f.code === 'suspended')) return;
    toastRetry(
      !f || f.status === 0 ? "Couldn't save. Check your connection." : `Couldn't save: ${f.message}`,
      () => void again(b, w.command),
    );
    return;
  }
  // read Settings again with the write still laid over it, then let it go: no flicker between
  await queryClient.invalidateQueries({ queryKey: ['settings'] });
  dropPending(w.id);
}

/** *Retry*: the same command again, with the same words and Undo as the first time. */
async function again(b: Backend, command: Command): Promise<void> {
  try {
    const r = await b.run(command);
    const undo = r.undo;
    if (undo) toastUndo(r.said, () => void b.run(undo).then((u) => toastDone(u.said)));
    else toastDone(r.said);
  } catch (e) {
    toastDone(e instanceof Error ? e.message : "That didn't save. Try again.");
  }
}

/** The commands the server carries from B05: *You*'s names and payday, an undo of them, and the admin's. */
function servedHere(cmd: Command): boolean {
  if (cmd.type === 'setting.set') return cmd.key === 'you.bankNames' || cmd.key === 'you.payday';
  return cmd.type.startsWith('member.');
}

/** Every Backend method of `b`, so spreading it keeps them (a Proxy has no own keys to spread). */
function bind(b: Backend): Backend {
  const keys: (keyof Backend)[] = [
    'home',
    'cycle',
    'review',
    'skipped',
    'payments',
    'txn',
    'receipt',
    'insights',
    'budgets',
    'subscriptions',
    'goals',
    'goal',
    'year',
    'me',
    'categories',
    'accounts',
    'split',
    'shared',
    'accountList',
    'account',
    'balanceCheck',
    'claimList',
    'claim',
    'sen',
    'memory',
    'research',
    'usage',
    'settings',
    'payday',
    'upload',
    'byHand',
    'draft',
    'matches',
    'nearDuplicate',
    'captured',
    'captureHealth',
    'run',
    'subscribe',
  ];
  return Object.fromEntries(
    keys.map((k) => [k, (...a: unknown[]) => (b[k] as (...x: unknown[]) => unknown)(...a)]),
  ) as unknown as Backend;
}
