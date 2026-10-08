import { shell } from './haptics';

/**
 * Every external link opens in the phone's default browser, never inside the app (spec §17,
 * patterns.md §10). Only https links are ever opened. The shell implements it natively (B02); in a
 * browser it opens a new tab with no opener and no referrer.
 */
export function openInBrowser(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const s = shell();
  if (s?.openInBrowser) {
    s.openInBrowser(u.href);
    return true;
  }
  window.open(u.href, '_blank', 'noopener,noreferrer');
  return true;
}
