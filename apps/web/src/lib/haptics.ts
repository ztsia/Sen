import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { inShell } from '@/shell/bridge';

// A light tick on commit, never on scroll (uiux skill). In the shell, Capacitor's haptics plugin
// (B02); in a browser, a short vibration where the phone allows it.
export function lightTick() {
  if (inShell()) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    return;
  }
  try {
    navigator.vibrate?.(10);
  } catch {
    // no vibration here; the long-press still works
  }
}
