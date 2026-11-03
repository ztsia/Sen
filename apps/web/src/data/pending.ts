import { useEffect, useState, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import type { Command, WriteResult } from '@sen/core/commands';
import type { SettingsView } from '@sen/core/views';
import { queryClient } from './index';

// The one store of pending writes (B07, spec §5 *Writes*). A write the person just made is here from
// the moment they make it until the server has it: in the shell, until a sync has carried it out of the
// outbox; in a browser, until its request has answered. Reads lay the pending writes over what the server
// said (`applyPending`), so a write shows at once and a refetch in between can't take it back; if the
// server refuses it, it leaves the store and the read goes back to the server's value.

export interface PendingWrite {
  id: string;
  command: Command;
  /** An ISO instant: when the person made it, kept through a restart by the shell's outbox. */
  madeAt: string;
  via: 'outbox' | 'api';
  state: 'queued' | 'sending';
}

/** The words after which a still-pending write is marked *Not synced yet* (patterns.md §7). */
export const NOT_SYNCED_AFTER_MS = 5000;

export const usePending = create<{ writes: PendingWrite[] }>(() => ({ writes: [] }));
export const pendingWrites = (): PendingWrite[] => usePending.getState().writes;

/** What a write is about, for marking the field it changes: a setting's own key, else the command's type. */
export const pendingKey = (cmd: Command): string => (cmd.type === 'setting.set' ? cmd.key : cmd.type);

type Payday = SettingsView['you']['payday'];

/**
 * A payday as the server's `Payday` accepts it. Hand-written: a value import of @sen/core/views would
 * pull zod into the app, whose probe for `eval` reports a violation of our content security policy.
 */
export function parsePayday(v: unknown): Payday | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as { kind?: unknown; day?: unknown };
  if (o.kind === 'last-working' || o.kind === 'none') return { kind: o.kind };
  if (o.kind === 'day' && typeof o.day === 'number' && Number.isInteger(o.day) && o.day >= 1 && o.day <= 31)
    return { kind: 'day', day: o.day };
  return null;
}

/** Names as banks print them, one to a line: the server's own rule (`BankNames`, apps/api/src/routes.ts). */
export const parseBankNames = (text: string): string[] =>
  text
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

/** Settings with each pending `setting.set` of *You* laid over it, in the order they were made. */
export function applyPending<T extends Pick<SettingsView, 'you'>>(view: T, writes: readonly PendingWrite[]): T {
  let you = view.you;
  for (const { command: c } of writes) {
    if (c.type !== 'setting.set') continue;
    if (c.key === 'you.bankNames' && typeof c.value === 'string') {
      you = { ...you, bankNames: parseBankNames(c.value) };
    } else if (c.key === 'you.payday') {
      const p = parsePayday(c.value);
      if (p) you = { ...you, payday: p };
    }
  }
  return you === view.you ? view : { ...view, you };
}

/**
 * What the server would answer a `setting.set` (apps/api/src/routes.ts `setYou`), worked out on the
 * phone from Settings as the person sees it now: the same words, and an undo that puts back what was
 * there before. The same value again gets the same words and an undo of itself, as the server gives.
 * With no view to go on there is no undo.
 */
export function localAnswer(cmd: Command, view: Pick<SettingsView, 'you'> | null): WriteResult {
  if (cmd.type !== 'setting.set') return { said: 'Saved', undo: null };
  const names = cmd.key === 'you.bankNames';
  const said = names ? 'Names saved' : 'Payday saved';
  if (!view) return { said, undo: null };
  const value = names ? view.you.bankNames.join('\n') : view.you.payday;
  return { said, undo: { type: 'setting.set', key: cmd.key, value } };
}

const patchCache = (writes: readonly PendingWrite[]) =>
  queryClient.setQueryData<SettingsView>(['settings'], (old) => (old ? applyPending(old, writes) : old));

/** Makes a write pending and shows it on the screens that have Settings in hand. */
export function addPending(w: PendingWrite) {
  usePending.setState((s) => ({ writes: [...s.writes, w] }));
  patchCache([w]);
}

export function dropPending(id: string) {
  usePending.setState((s) => (s.writes.some((w) => w.id === id) ? { writes: s.writes.filter((w) => w.id !== id) } : s));
}

const failed = new Map<string, number>();

/**
 * Notes that a write was refused or never arrived, so a caller still waiting on its answer can leave its
 * "saved" toast out: the *Retry* toast is already up and must not be covered by it.
 */
export function noteFailed(cmd: Command) {
  failed.set(JSON.stringify(cmd), performance.now());
}

/** Whether `cmd` failed since `since` (a `performance.now()`). */
export const failedSince = (cmd: Command, since: number): boolean =>
  (failed.get(JSON.stringify(cmd)) ?? -Infinity) >= since;

/** At sign-out: what was waiting belongs to the person who left. */
export function clearPending() {
  usePending.setState({ writes: [] });
}

const onlineStore = {
  subscribe(fn: () => void) {
    window.addEventListener('online', fn);
    window.addEventListener('offline', fn);
    return () => {
      window.removeEventListener('online', fn);
      window.removeEventListener('offline', fn);
    };
  },
  get: () => navigator.onLine !== false,
};

/** Whether the field behind `key` waits on the server, and whether to say so: after 5 s, or at once offline. */
export function usePendingFor(key: string): { pending: boolean; showNotSynced: boolean } {
  const since = usePending((s) => {
    let oldest: number | null = null;
    for (const w of s.writes) {
      if (pendingKey(w.command) !== key) continue;
      const at = Date.parse(w.madeAt);
      if (oldest === null || at < oldest) oldest = at;
    }
    return oldest;
  });
  const online = useSyncExternalStore(onlineStore.subscribe, onlineStore.get, () => true);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const wait = Math.max(0, since + NOT_SYNCED_AFTER_MS - Date.now());
    const t = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(t);
  }, [since]);
  const pending = since !== null;
  return { pending, showNotSynced: pending && (!online || now - since >= NOT_SYNCED_AFTER_MS) };
}
