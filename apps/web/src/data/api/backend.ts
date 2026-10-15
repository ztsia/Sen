import type { Command, WriteResult } from '@sen/core/commands';
import type { MeView, SettingsCore, SettingsView } from '@sen/core/views';
import type { Backend } from '../backend';
import { apiCall } from './client';

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
 */
export function createApiBackend(rest: Backend | null): Backend {
  const fallback = new Proxy({} as Backend, {
    get: (_t, key: keyof Backend) => (rest ? rest[key] : notYet),
  });
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((fn) => fn());
  return {
    ...bind(fallback),
    me: () => apiCall<MeView>('/me'),
    async settings(): Promise<SettingsView> {
      const core = await apiCall<SettingsCore>('/settings');
      if (!rest) return core as SettingsView;
      return { ...(await rest.settings()), ...core };
    },
    async run(cmd: Command): Promise<WriteResult> {
      if (!servedHere(cmd)) return fallback.run(cmd);
      const result = await apiCall<WriteResult>('/commands', { body: cmd });
      changed();
      return result;
    },
    subscribe(onChange) {
      listeners.add(onChange);
      const off = rest?.subscribe(onChange);
      return () => {
        listeners.delete(onChange);
        off?.();
      };
    },
  };
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
    'run',
    'subscribe',
  ];
  return Object.fromEntries(
    keys.map((k) => [k, (...a: unknown[]) => (b[k] as (...x: unknown[]) => unknown)(...a)]),
  ) as unknown as Backend;
}
