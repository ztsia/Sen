import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { inShell } from './bridge';

/**
 * Calls the shell, and calls again whenever the app comes back to the front: after Android's own
 * settings page, notification access or the battery dialog, what the screen shows is stale.
 */
export function useBridge<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const seq = useRef(0);
  const reload = useCallback(() => {
    const n = ++seq.current;
    setLoading(true);
    loadRef.current().then(
      (d) => {
        if (n !== seq.current) return;
        setData(d);
        setError(undefined);
        setLoading(false);
      },
      (e: unknown) => {
        if (n !== seq.current) return;
        setError(e);
        setLoading(false);
      },
    );
  }, []);
  useEffect(() => {
    reload();
    return onResume(reload);
  }, [reload]);
  return { data, error, loading, reload };
}

/** A window event that asks every screen to read the shell again: the simulator sends it on a change. */
export const REFRESH = 'sen:refresh';

/** Runs `fn` each time the app returns to the front: the shell's resume, or the page becoming visible. */
export function onResume(fn: () => void): () => void {
  const visible = () => {
    if (document.visibilityState === 'visible') fn();
  };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener(REFRESH, fn);
  const sub = inShell() ? App.addListener('resume', fn) : null;
  return () => {
    document.removeEventListener('visibilitychange', visible);
    window.removeEventListener(REFRESH, fn);
    void sub?.then((s) => s.remove());
  };
}
