import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { inShell, SenShell } from '@/shell/bridge';

// Haptics on a few moments only (patterns.md §8, B05): a change confirmed, Undo, an error, a
// long-press, a toggle, a pull past a limit. Never on scroll or on every tap. In the shell, the
// bridge's `haptic` plays Android's own constant for the moment through the WebView, so it follows
// the phone's touch-feedback setting. A shell from before B05 (bridge 1) gets the long-press's light
// tick only, as it had; a browser has no haptics, but a long-press may vibrate where the phone allows.

export type Haptic = 'confirm' | 'undo' | 'reject' | 'long-press' | 'toggle-on' | 'toggle-off' | 'threshold';

// Undo is a light tick rather than a second confirm: a step back, not a new change
const NATIVE: Record<Haptic, string> = {
  confirm: 'confirm',
  undo: 'tick',
  reject: 'reject',
  'long-press': 'long-press',
  'toggle-on': 'toggle-on',
  'toggle-off': 'toggle-off',
  threshold: 'threshold',
};

// the shell's bridge version, read once; a failed read is tried again at the next moment
let bridge: Promise<number> | null = null;
const bridgeVersion = () =>
  (bridge ??= SenShell.info().then(
    (i) => i.bridge,
    () => {
      bridge = null;
      return 0;
    },
  ));

/** Tests only: forget the shell's version. */
export const resetHaptics = () => {
  bridge = null;
  played.length = 0;
};

/** The moments played, in development and previews, so a journey can check them in a browser. */
export const played: Haptic[] = [];
if (__SEN_ENV__ !== 'production' && typeof window !== 'undefined')
  (window as unknown as { __senHaptics: Haptic[] }).__senHaptics = played;

export function haptic(kind: Haptic) {
  if (__SEN_ENV__ !== 'production') played.push(kind);
  if (inShell()) {
    void bridgeVersion().then(async (v) => {
      if (v >= 2) await SenShell.haptic({ kind: NATIVE[kind] }).catch(() => undefined);
      else if (kind === 'long-press') await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    });
    return;
  }
  if (kind !== 'long-press') return;
  try {
    navigator.vibrate?.(10);
  } catch {
    // no vibration here; the long-press still works
  }
}
