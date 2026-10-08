import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadLook, loadedLook, setReducedMotion, type Look } from '@sen/looks';
import { reducedMotionNow, useTheme } from './store';

// Every look's live drawing (figures, avatars) asks the app whether to settle to a still frame.
setReducedMotion(reducedMotionNow);

const LookContext = createContext<Look | null>(null);

/** Loads the current look's module (and its CSS) and gives it to the frame. Until it arrives, the previous look stays. */
export function LookProvider({ children }: { children: ReactNode }) {
  const id = useTheme((s) => s.look);
  const [look, setLook] = useState<Look | null>(() => loadedLook(id) ?? null);
  useEffect(() => {
    let live = true;
    // the store switches only to a loaded look, so this fails only for the first look, offline
    loadLook(id).then(
      (l) => {
        if (live) setLook(l);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [id]);
  return <LookContext.Provider value={look?.id === id ? look : (look ?? null)}>{children}</LookContext.Provider>;
}

/** The look on show, or null while its module loads. */
export const useLook = () => useContext(LookContext);
