import { App } from '@capacitor/app';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
type Router = (typeof import('@/router'))['router'];
import { resolveMode, useTheme } from '@/theme/store';
import { inShell } from './bridge';

const TAB_ROOTS = new Set(['/review', '/insights', '/more']);

/**
 * Android's back, inside the shell (patterns.md §6): an open sheet closes first (each sheet holds a
 * history step, lib/back-close.ts); then a pushed screen goes back; a tab other than Home goes Home;
 * and back on Home leaves the app, to the background as Android's own apps do.
 */
export function backAction(path: string, sheetOpen: boolean, canGoBack: boolean): 'back' | 'home' | 'leave' {
  if (sheetOpen) return 'back';
  if (path === '/' || path === '') return 'leave';
  if (TAB_ROOTS.has(path)) return 'home';
  return canGoBack ? 'back' : 'home';
}

/** Wires the shell's back button and system bars to the web app. Does nothing in a browser. */
export function initShell(router: Router) {
  if (!inShell()) return;

  void App.addListener('backButton', ({ canGoBack }) => {
    const { location } = router.history;
    const sheetOpen = Boolean((location.state as { senSheet?: string }).senSheet);
    const action = backAction(location.pathname, sheetOpen, canGoBack);
    if (action === 'back') router.history.back();
    else if (action === 'home') void router.navigate({ to: '/', replace: true });
    else void App.minimizeApp();
  });

  // The status and navigation bars follow the app's own light or dark, which can differ from the
  // phone's (Settings → Appearance), so their icons stay readable.
  const bars = () =>
    void SystemBars.setStyle({
      style: resolveMode(useTheme.getState()) === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  bars();
  useTheme.subscribe(bars);
}
