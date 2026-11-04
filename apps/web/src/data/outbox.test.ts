import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingCommand } from '@/shell/bridge';
import { toastDone } from '@/blocks/toast';
import { queryClient } from './index';
import { settleOutbox, writeToOutbox } from './outbox';
import { pendingWrites, usePending, type PendingWrite } from './pending';

// The shell's side of pending writes (B07, bridge 4): a write shows at once, and leaves the store when a
// sync has carried it; a refusal puts the screen back and says why.

const shell = vi.hoisted(() => ({
  write: vi.fn(async () => ({ queued: true as const })),
  pending: vi.fn(),
}));
vi.mock('@/shell/bridge', () => ({
  SenCapture: shell,
  OUTBOX_BRIDGE: 4,
  hasBridge: async () => true,
  inShell: () => true,
}));
vi.mock('@/blocks/toast', () => ({ toastDone: vi.fn(), toastRetry: vi.fn(), toastUndo: vi.fn() }));

const w = (id: string, value = 'LIM KAH HOE'): PendingWrite => ({
  id,
  command: { type: 'setting.set', key: 'you.bankNames', value },
  madeAt: new Date().toISOString(),
  via: 'outbox',
  state: 'queued',
});
const answer = (commands: Partial<PendingCommand>[]) =>
  shell.pending.mockResolvedValue({
    commands: commands.map((c) => ({ madeAt: new Date().toISOString(), command: {}, said: null, ...c })),
    events: 0,
    lastSyncAt: null,
    morningAt: null,
    serverNow: null,
    capture: true,
    signedIn: true,
  });

beforeEach(() => {
  usePending.setState({ writes: [] });
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe('the shell’s outbox', () => {
  it('shows a write at once and hands it to the shell with its own id', async () => {
    const one = w('a');
    await writeToOutbox(one);
    expect(shell.write).toHaveBeenCalledWith({ id: 'a', command: one.command, madeAt: one.madeAt });
    expect(pendingWrites()).toEqual([one]);
  });

  it('keeps a write waiting while no sync has carried it', async () => {
    await writeToOutbox(w('a'));
    answer([{ id: 'a', status: null }]);
    await settleOutbox();
    expect(pendingWrites()).toHaveLength(1);
  });

  it('lets a write go, and reads Settings again, once it is applied or was applied before', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await writeToOutbox(w('a'));
    await writeToOutbox(w('b', 'TAN WEI MING'));
    answer([
      { id: 'a', status: 'applied' },
      { id: 'b', status: 'already' },
    ]);
    await settleOutbox();
    expect(pendingWrites()).toHaveLength(0);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['settings'] });
    expect(toastDone).not.toHaveBeenCalled();
  });

  it('puts the screen back and says why when the server refuses', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await writeToOutbox(w('a'));
    answer([{ id: 'a', status: 'refused', said: 'Your names are too long.' }]);
    await settleOutbox();
    expect(pendingWrites()).toHaveLength(0);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['settings'] });
    expect(toastDone).toHaveBeenCalledWith("Couldn't save: Your names are too long.");
  });

  it('settles each write on its own', async () => {
    await writeToOutbox(w('a'));
    await writeToOutbox(w('b'));
    answer([
      { id: 'a', status: 'applied' },
      { id: 'b', status: null },
    ]);
    await settleOutbox();
    expect(pendingWrites().map((x) => x.id)).toEqual(['b']);
  });

  it('shows nothing, and keeps nothing, if the shell will not take the write', async () => {
    shell.write.mockRejectedValueOnce(new Error('BAD_ID'));
    await expect(writeToOutbox(w('a'))).rejects.toThrow('BAD_ID');
    expect(pendingWrites()).toHaveLength(0);
  });

  it('asks again later when the shell does not answer', async () => {
    await writeToOutbox(w('a'));
    shell.pending.mockRejectedValueOnce(new Error('gone'));
    await settleOutbox();
    expect(pendingWrites()).toHaveLength(1);
  });
});
