import { beforeEach, describe, expect, it, vi } from 'vitest';

// The web app's side of the haptics bridge (B05, QA Feel run 1, 4): a shell with bridge 2 plays each
// moment's own constant; an older shell gets only the long-press's light tick; a failed read of the
// shell's version doesn't turn haptics off for good.
const shell = vi.hoisted(() => ({
  inShell: vi.fn(() => true),
  info: vi.fn(),
  haptic: vi.fn(() => Promise.resolve({ performed: true })),
  impact: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shell/bridge', () => ({
  inShell: shell.inShell,
  SenShell: { info: shell.info, haptic: shell.haptic },
}));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: shell.impact }, ImpactStyle: { Light: 'LIGHT' } }));

const { haptic, resetHaptics } = await import('./haptics');
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetHaptics();
  vi.clearAllMocks();
  shell.inShell.mockReturnValue(true);
});

describe('haptic', () => {
  it("plays each moment's constant on a shell with bridge 2", async () => {
    shell.info.mockResolvedValue({ bridge: 2 });
    haptic('confirm');
    haptic('undo');
    haptic('toggle-off');
    await settle();
    expect(shell.haptic.mock.calls.map((c) => (c as unknown as [{ kind: string }])[0].kind)).toEqual([
      'confirm',
      'tick',
      'toggle-off',
    ]);
    expect(shell.impact).not.toHaveBeenCalled();
  });

  it('gives a shell from before B05 only the long-press tick', async () => {
    shell.info.mockResolvedValue({ bridge: 1 });
    haptic('confirm');
    haptic('long-press');
    await settle();
    expect(shell.haptic).not.toHaveBeenCalled();
    expect(shell.impact).toHaveBeenCalledTimes(1);
  });

  it("tries the shell's version again after a failed read", async () => {
    shell.info.mockRejectedValueOnce(new Error('busy')).mockResolvedValue({ bridge: 2 });
    haptic('confirm');
    await settle();
    expect(shell.haptic).not.toHaveBeenCalled();
    haptic('confirm');
    await settle();
    expect(shell.haptic).toHaveBeenCalledTimes(1);
  });

  it('calls nothing in a browser', async () => {
    shell.inShell.mockReturnValue(false);
    haptic('confirm');
    await settle();
    expect(shell.info).not.toHaveBeenCalled();
  });
});
