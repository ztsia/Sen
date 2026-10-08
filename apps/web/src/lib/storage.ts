// The phone keeps a few choices (spec §9.4). Storage can be missing or throw (a private window, a
// cleared WebView), so every read and write is guarded and the app works without it.
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // nothing to do: the choice lasts this session only
  }
}
