import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Command } from '@sen/core/commands';
import { toastDone, toastUndo } from '@/blocks/toast';
import { runCommand, useWrite } from './hooks';
import { noteFailed } from './pending';

// A write in a browser answers at once and may already have failed by the time its caller hears back
// (B07): the caller must not cover the Retry toast with a "saved" one.

const control = vi.hoisted(() => ({ fails: false, onRun: (_cmd: unknown) => {} }));
vi.mock('@/blocks/toast', () => ({ toastDone: vi.fn(), toastRetry: vi.fn(), toastUndo: vi.fn() }));
vi.mock('./index', () => ({
  queryClient: { invalidateQueries: async () => undefined },
  backend: async () => ({
    run: async (cmd: Command) => {
      control.onRun(cmd);
      return { said: 'Names saved', undo: { type: 'setting.set', key: 'you.bankNames', value: '' } };
    },
  }),
}));

const cmd: Command = { type: 'setting.set', key: 'you.bankNames', value: 'A' };

beforeEach(() => {
  vi.clearAllMocks();
  control.fails = false;
  control.onRun = (c) => {
    if (control.fails) noteFailed(c as Command);
  };
});

describe('a write that has already failed when its caller hears back', () => {
  it('says so, so the caller can leave out its saved toast', async () => {
    control.fails = true;
    expect((await runCommand(cmd)).failed).toBe(true);
    control.fails = false;
    expect((await runCommand({ ...cmd, value: 'B' })).failed).toBe(false);
  });

  it('is not blamed for an earlier failure of the same command', async () => {
    noteFailed({ ...cmd, value: 'C' });
    expect((await runCommand({ ...cmd, value: 'C' })).failed).toBe(false);
  });

  it('shows Undo for a write that went through, and nothing for one that failed', async () => {
    const { result } = renderHook(() => useWrite());
    await result.current({ ...cmd, value: 'D' });
    expect(toastUndo).toHaveBeenCalledWith('Names saved', expect.any(Function));
    vi.clearAllMocks();
    control.fails = true;
    await result.current({ ...cmd, value: 'E' });
    expect(toastUndo).not.toHaveBeenCalled();
    expect(toastDone).not.toHaveBeenCalled();
  });
});
