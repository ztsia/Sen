import { useMemo } from 'react';
import { toastDone } from '@/blocks/toast';
import { useGo } from '@/screens/kit';
import { useWrite } from '@/data/hooks';
import { useUi } from '@/frame/ui-store';
import { useNative } from './store';
import type { Ctx } from './surfaces';

/** What a stand-in's tap can do, wired to the app: the router, the data layer and the dev panel's switches. */
export function useCtx(): Ctx {
  const go = useGo();
  const write = useWrite();
  return useMemo(
    () => ({
      go: (id, search) => {
        useUi.getState().setSenOpen(false);
        go(id, search);
      },
      write: (cmd) => void write(cmd),
      openSen: () => useUi.getState().setSenOpen(true),
      scenario: (id) => {
        useUi.getState().setScenario(id);
        toastDone(`Simulated: the “${id}” scenario`);
      },
      dismiss: () => {
        useNative.getState().setShade(null);
        useNative.getState().setSheet(null);
      },
    }),
    [go, write],
  );
}
