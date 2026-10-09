import { inShell, SenShell } from '@/shell/bridge';

/**
 * Every external link opens in the phone's default browser, never inside the app (spec §17,
 * patterns.md §10). Only https links are ever opened. In the shell, its own openInBrowser sends it to
 * Android's browser (B02); in a browser, a new tab with no opener and no referrer.
 */
export function openInBrowser(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (inShell()) {
    void SenShell.openInBrowser({ url: u.href }).catch(() => undefined);
    return true;
  }
  window.open(u.href, '_blank', 'noopener,noreferrer');
  return true;
}
