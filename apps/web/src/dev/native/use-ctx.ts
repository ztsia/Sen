import { useMemo } from 'react';
import { toastDone } from '@/blocks/toast';
import { useGo } from '@/screens/kit';
import { useWrite } from '@/data/hooks';
import { useUi } from '@/frame/ui-store';
import { useNative } from './store';
import type { Ctx } from './surfaces';

/**
 * Closes whatever sheet is open, then runs `fn`. A sheet closing pops its history entry (back-close),
 * which would undo a navigation made in the same tick, so the app waits out the sheet's exit first.
 */
export function afterSheets(fn: () => void) {
  const n = useNative.getState();
  const ui = useUi.getState();
  if (n.sheet || ui.senOpen || ui.scanMoreOpen) {
    n.setSheet(null);
    ui.setSenOpen(false);
    ui.setScanMoreOpen(false);
    waiting(1);
    setTimeout(() => {
      fn();
      // a frame later, once the navigation has drawn
      requestAnimationFrame(() => waiting(-1));
    }, 450);
  } else fn();
}

/**
 * `<html data-stand-in-waiting>` while a stand-in's tap waits out a sheet's exit, so a test opens the
 * next sheet after the navigation, not into it (B08's PR: the dev panel opened, then the late
 * navigation closed it).
 */
let pending = 0;
function waiting(by: number) {
  pending += by;
  if (pending > 0) document.documentElement.dataset.standInWaiting = '';
  else delete document.documentElement.dataset.standInWaiting;
}

/** What a stand-in's tap can do, wired to the app: the router, the data layer and the dev panel's switches. */
export function useCtx(): Ctx {
  const go = useGo();
  const write = useWrite();
  return useMemo(
    () => ({
      go: (id, search) => afterSheets(() => go(id, search)),
      write: (cmd) => {
        useNative.getState().setSheet(null);
        void write(cmd);
      },
      openSen: () => afterSheets(() => useUi.getState().setSenOpen(true)),
      scenario: (id) => {
        useUi.getState().setScenario(id);
        toastDone(`Simulated: the “${id}” scenario`);
      },
      dismiss: () => useNative.getState().setShade(null),
    }),
    [go, write],
  );
}
