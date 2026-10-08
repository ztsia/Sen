// A light tick on commit, never on scroll (uiux skill). In the shell, the native haptics plugin
// (B02) answers through the bridge; in a browser, a short vibration where the phone allows it.
interface ShellBridge {
  haptic?: (kind: 'light') => void;
  openInBrowser?: (url: string) => void;
}
export const shell = (): ShellBridge | undefined => (window as unknown as { SenShell?: ShellBridge }).SenShell;

export function lightTick() {
  const s = shell();
  if (s?.haptic) return s.haptic('light');
  try {
    navigator.vibrate?.(10);
  } catch {
    // no vibration here; the long-press still works
  }
}
