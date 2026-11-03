import { QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsView } from '@sen/core/views';
import { toastDone, toastRetry, toastUndo } from '@/blocks/toast';
import { queryClient } from '../index';
import { pendingWrites, usePending } from '../pending';
import type { Backend } from '../backend';
import { createApiBackend } from './backend';

// The browser's write path (B07, done-when 4): a write shows at once; if the request fails, the screen
// goes back to the server's value and a toast offers Retry, which makes the write again.

vi.mock('@/blocks/toast', () => ({ toastDone: vi.fn(), toastRetry: vi.fn(), toastUndo: vi.fn() }));

const SERVER = {
  email: 'weiming@example.com',
  admin: true,
  switches: {},
  you: { bankNames: ['TAN WEI MING'], payday: { kind: 'day', day: 25 }, qr: false },
  data: {},
};

/** The API, as a script: reads answer the server's view; a write answers however the test says. */
function api(commands: Array<'ok' | 'offline' | { status: number; message: string; code?: string }>) {
  const calls: string[] = [];
  const hold = { release: () => {}, on: false };
  const held = () => (hold.on ? new Promise<void>((r) => (hold.release = r)) : undefined);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = String(url);
    if (init?.method === 'POST' && path === '/api/commands') {
      calls.push(String(init.body));
      await held();
      const next = commands.shift() ?? 'ok';
      if (next === 'offline') throw new TypeError('Failed to fetch');
      if (next === 'ok') return new Response(JSON.stringify({ said: 'Names saved', undo: null }), { status: 200 });
      return new Response(JSON.stringify({ code: next.code ?? 'server', message: next.message }), {
        status: next.status,
      });
    }
    return new Response(JSON.stringify(SERVER), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock, hold };
}

/** A Settings screen on show: its query is active, so a change to it is read again. */
function screen(b: Backend) {
  const o = new QueryObserver<SettingsView>(queryClient, { queryKey: ['settings'], queryFn: () => b.settings() });
  const off = o.subscribe(() => undefined);
  afterEach(off);
  return () => o.getCurrentResult().data;
}

const NAMES = { type: 'setting.set', key: 'you.bankNames', value: 'LIM KAH HOE\nTAN WEI MING' } as const;
const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
  usePending.setState({ writes: [] });
  queryClient.clear();
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

describe('a write in a browser', () => {
  it('shows at once, answers with the server’s words and an undo, and is kept once the server has it', async () => {
    const { hold } = api(['ok']);
    const b = createApiBackend(null);
    const shown = screen(b);
    await flush();
    hold.on = true;
    const r = await b.run(NAMES);
    expect(r.said).toBe('Names saved');
    expect(r.undo).toEqual({ type: 'setting.set', key: 'you.bankNames', value: 'TAN WEI MING' });
    // pending, and laid over what the server says, on the screen's own copy and on a fresh read
    expect(pendingWrites()).toHaveLength(1);
    expect(pendingWrites()[0]).toMatchObject({ via: 'api', state: 'sending' });
    expect(shown()?.you.bankNames).toEqual(['LIM KAH HOE', 'TAN WEI MING']);
    expect((await b.settings()).you.bankNames).toEqual(['LIM KAH HOE', 'TAN WEI MING']);
    hold.release();
    await flush();
    expect(pendingWrites()).toHaveLength(0);
    expect(toastRetry).not.toHaveBeenCalled();
  });

  it('reverts when the connection fails, and offers Retry', async () => {
    api(['offline']);
    const b = createApiBackend(null);
    const shown = screen(b);
    await flush();
    await b.run(NAMES);
    await flush();
    expect(pendingWrites()).toHaveLength(0);
    expect((await b.settings()).you.bankNames).toEqual(['TAN WEI MING']);
    expect(shown()?.you.bankNames).toEqual(['TAN WEI MING']);
    expect(toastRetry).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toastRetry).mock.calls[0]![0]).toBe("Couldn't save. Check your connection.");
  });

  it('reverts on an error answer too, and says why', async () => {
    api([{ status: 500, message: 'Your settings weren’t saved.' }]);
    const b = createApiBackend(null);
    await b.run(NAMES);
    await flush();
    expect(pendingWrites()).toHaveLength(0);
    expect(toastRetry).toHaveBeenCalledWith("Couldn't save: Your settings weren’t saved.", expect.any(Function));
  });

  it('makes the same write again on Retry, with its Undo', async () => {
    const { calls } = api(['offline', 'ok']);
    const b = createApiBackend(null);
    screen(b);
    await flush();
    await b.run(NAMES);
    await flush();
    const retry = vi.mocked(toastRetry).mock.calls[0]![1];
    retry();
    await flush();
    expect(calls).toEqual([JSON.stringify(NAMES), JSON.stringify(NAMES)]);
    expect(pendingWrites()).toHaveLength(0);
    expect(toastRetry).toHaveBeenCalledTimes(1);
    expect(toastUndo).toHaveBeenCalledWith('Names saved', expect.any(Function));
    expect(toastDone).not.toHaveBeenCalled();
  });

  it('does not tell a person whose session ended that it could not save', async () => {
    api([{ status: 401, code: 'signed_out', message: 'Sign in again.' }]);
    const b = createApiBackend(null);
    await b.run(NAMES);
    await flush();
    expect(pendingWrites()).toHaveLength(0);
    expect(toastRetry).not.toHaveBeenCalled();
  });

  it('keeps a second write on show when the first one fails', async () => {
    api(['offline', 'ok']);
    const b = createApiBackend(null);
    screen(b);
    await flush();
    await b.run(NAMES);
    await b.run({ type: 'setting.set', key: 'you.payday', value: { kind: 'none' } });
    await flush();
    expect(pendingWrites()).toHaveLength(0);
    expect((await b.settings()).you.payday).toEqual({ kind: 'day', day: 25 });
    expect(toastRetry).toHaveBeenCalledTimes(1);
  });
});
