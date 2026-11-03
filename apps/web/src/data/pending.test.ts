import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsView } from '@sen/core/views';
import {
  NOT_SYNCED_AFTER_MS,
  applyPending,
  localAnswer,
  pendingKey,
  usePending,
  usePendingFor,
  type PendingWrite,
} from './pending';

// Pending writes (B07): what lies over the server's Settings while a write is on its way, the words and
// undo the person gets at once, and when the field says *Not synced yet* (patterns.md §7).

const view = (you: Partial<SettingsView['you']> = {}) =>
  ({
    email: 'weiming@example.com',
    you: { bankNames: ['TAN WEI MING'], payday: { kind: 'day', day: 25 }, qr: false, ...you },
  }) as Pick<SettingsView, 'email' | 'you'>;

const names = (value: string, id = 'n'): PendingWrite => ({
  id,
  command: { type: 'setting.set', key: 'you.bankNames', value },
  madeAt: new Date().toISOString(),
  via: 'outbox',
  state: 'queued',
});
const payday = (value: Record<string, string | number>, id = 'p'): PendingWrite => ({
  id,
  command: { type: 'setting.set', key: 'you.payday', value },
  madeAt: new Date().toISOString(),
  via: 'api',
  state: 'sending',
});

describe('the settings overlay', () => {
  it('lays bank names over what the server said: one to a line, trimmed, blanks dropped', () => {
    const out = applyPending(view(), [names('  LIM KAH HOE \n\n  \nTAN WEI MING\n')]);
    expect(out.you.bankNames).toEqual(['LIM KAH HOE', 'TAN WEI MING']);
  });

  it('lays a payday over it, and keeps the rest of the view', () => {
    const out = applyPending(view(), [payday({ kind: 'last-working' })]);
    expect(out.you.payday).toEqual({ kind: 'last-working' });
    expect(out.you.bankNames).toEqual(['TAN WEI MING']);
    expect(out.email).toBe('weiming@example.com');
  });

  it('applies writes in the order they were made, so the last one shows', () => {
    const out = applyPending(view(), [names('A', 'a'), names('B', 'b'), payday({ kind: 'none' })]);
    expect(out.you.bankNames).toEqual(['B']);
    expect(out.you.payday).toEqual({ kind: 'none' });
  });

  it('ignores what it does not carry, and a payday that is not one', () => {
    const v = view();
    const other: PendingWrite = { ...names('x'), command: { type: 'setting.set', key: 'you.qr', value: true } };
    expect(applyPending(v, [other, payday({ kind: 'day', day: 99 })])).toBe(v);
    expect(applyPending(v, [])).toBe(v);
  });

  it('keeps the server view untouched', () => {
    const v = view();
    applyPending(v, [names('Z')]);
    expect(v.you.bankNames).toEqual(['TAN WEI MING']);
  });
});

describe('the answer a write gets at once', () => {
  it('says what the server says, with an undo that puts the names back', () => {
    const r = localAnswer({ type: 'setting.set', key: 'you.bankNames', value: 'LIM KAH HOE' }, view());
    expect(r.said).toBe('Names saved');
    expect(r.undo).toEqual({ type: 'setting.set', key: 'you.bankNames', value: 'TAN WEI MING' });
  });

  it('says Payday saved, and undoes to the payday that was there', () => {
    const r = localAnswer({ type: 'setting.set', key: 'you.payday', value: { kind: 'none' } }, view());
    expect(r.said).toBe('Payday saved');
    expect(r.undo).toEqual({ type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 25 } });
  });

  it('answers the same value again as the server does: the same words, and an undo of itself that changes nothing', () => {
    const v = view({ bankNames: ['A', 'B'] });
    const r = localAnswer({ type: 'setting.set', key: 'you.bankNames', value: 'A\nB' }, v);
    expect(r.said).toBe('Names saved');
    expect(applyPending(v, [{ ...names('x'), command: r.undo! }]).you.bankNames).toEqual(['A', 'B']);
  });

  it('undoes to what the person saw, after a write still pending', () => {
    const shown = applyPending(view(), [names('FIRST')]);
    const r = localAnswer({ type: 'setting.set', key: 'you.bankNames', value: 'SECOND' }, shown);
    expect(r.undo).toEqual({ type: 'setting.set', key: 'you.bankNames', value: 'FIRST' });
  });

  it('has no undo without a view to go on', () => {
    expect(localAnswer({ type: 'setting.set', key: 'you.payday', value: { kind: 'none' } }, null).undo).toBeNull();
  });
});

describe('what a write is about', () => {
  it('is the setting it changes', () => {
    expect(pendingKey(names('x').command)).toBe('you.bankNames');
  });
});

describe('when a field says Not synced yet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePending.setState({ writes: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const online = (on: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(on);

  it('says nothing for a write that has not been made', () => {
    online(true);
    const { result } = renderHook(() => usePendingFor('you.bankNames'));
    expect(result.current).toEqual({ pending: false, showNotSynced: false });
  });

  it('waits 5 s, so a normal sync never flickers', () => {
    online(true);
    const { result } = renderHook(() => usePendingFor('you.bankNames'));
    act(() => usePending.setState({ writes: [names('x')] }));
    expect(result.current).toEqual({ pending: true, showNotSynced: false });
    act(() => void vi.advanceTimersByTime(NOT_SYNCED_AFTER_MS - 1));
    expect(result.current.showNotSynced).toBe(false);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.showNotSynced).toBe(true);
  });

  it('says it at once while offline', () => {
    online(false);
    const { result } = renderHook(() => usePendingFor('you.bankNames'));
    act(() => usePending.setState({ writes: [names('x')] }));
    expect(result.current).toEqual({ pending: true, showNotSynced: true });
  });

  it('marks only the field the write changes, and clears when it is gone', () => {
    online(false);
    const { result } = renderHook(() => usePendingFor('you.payday'));
    act(() => usePending.setState({ writes: [names('x')] }));
    expect(result.current.pending).toBe(false);
    act(() => usePending.setState({ writes: [names('x'), payday({ kind: 'none' })] }));
    expect(result.current.showNotSynced).toBe(true);
    act(() => usePending.setState({ writes: [] }));
    expect(result.current).toEqual({ pending: false, showNotSynced: false });
  });

  it('counts from when the write was made, so one picked up after a restart shows at once', () => {
    online(true);
    const old = { ...names('x'), madeAt: new Date(Date.now() - 60_000).toISOString() };
    usePending.setState({ writes: [old] });
    const { result } = renderHook(() => usePendingFor('you.bankNames'));
    act(() => void vi.advanceTimersByTime(0));
    expect(result.current.showNotSynced).toBe(true);
  });
});
