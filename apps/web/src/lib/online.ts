import { useSyncExternalStore } from 'react';

// Whether the phone has a connection, followed live: the frame's offline banner reads it (patterns.md
// §7). A WebView's navigator.onLine is the phone's own network state.
const subscribe = (on: () => void) => {
  window.addEventListener('online', on);
  window.addEventListener('offline', on);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', on);
  };
};

export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
