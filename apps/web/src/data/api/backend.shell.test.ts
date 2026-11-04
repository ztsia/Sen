import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../index';
import { usePending } from '../pending';
import { createApiBackend } from './backend';

// In the shell with the outbox (bridge 4), a served write goes to the outbox and not to the API, and is
// answered at once with the server's words and undo (B07).

const outbox = vi.hoisted(() => ({ writeToOutbox: vi.fn(async () => undefined) }));
vi.mock('../outbox', () => outbox);
vi.mock('@/shell/bridge', () => ({ OUTBOX_BRIDGE: 4, hasBridge: async () => true }));
vi.mock('@/blocks/toast', () => ({ toastDone: vi.fn(), toastRetry: vi.fn(), toastUndo: vi.fn() }));

beforeEach(() => {
  usePending.setState({ writes: [] });
  queryClient.clear();
  vi.clearAllMocks();
});

describe('a write in the shell', () => {
  it('goes into the outbox with an id and a time, never to the API, and answers at once', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    queryClient.setQueryData(['settings'], {
      you: { bankNames: ['TAN WEI MING'], payday: { kind: 'last-working' }, qr: false },
    });
    const r = await createApiBackend(null).run({ type: 'setting.set', key: 'you.payday', value: { kind: 'none' } });
    expect(r).toEqual({
      said: 'Payday saved',
      undo: { type: 'setting.set', key: 'you.payday', value: { kind: 'last-working' } },
    });
    expect(outbox.writeToOutbox).toHaveBeenCalledTimes(1);
    const w = (
      outbox.writeToOutbox.mock.calls[0] as unknown as [{ id: string; madeAt: string; via: string; state: string }]
    )[0];
    expect(w).toMatchObject({ via: 'outbox', state: 'queued', command: { key: 'you.payday' } });
    expect(w.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(w.madeAt))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
