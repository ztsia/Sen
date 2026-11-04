import { OUTBOX_BRIDGE, SenShell, hasBridge } from './bridge';

/**
 * Tells the shell the web app signed in or out (B07, bridge 4), so it reads the session again: it keeps
 * the token for sync, and clears it at sign-out. Does nothing in a browser or an older shell; every
 * failure is ignored, so signing in or out never waits on it.
 */
export async function sessionChanged(): Promise<void> {
  try {
    if (await hasBridge(OUTBOX_BRIDGE)) await SenShell.sessionChanged();
  } catch {
    // the shell reads the session again at its next launch
  }
}
