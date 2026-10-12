import { toastDone } from '@/blocks/toast';
import { useUi } from '@/frame/ui-store';
import { useNative } from './store';
import type { Ctx } from './surfaces';

// The simulator drives the skeleton (B04): the things the phone does that a browser can't. It uses the
// fake's controls through the dev panel's own switches (connect.ts rebuilds the fake when they change).

export const simulator = {
  /** A notification arrives: its prompt shows, and unanswered it waits in Review (D22). */
  arrives() {
    useNative.getState().setSheet(null);
    useNative.getState().setShade('prompt-category');
  },
  /** Payday: the scenario where Home shows the card (D60). */
  payday(ctx: Ctx) {
    const ui = useUi.getState();
    ui.setScenario('payday');
    ui.setDevState('normal');
    ctx.go('home');
    toastDone('Simulated: your salary landed');
  },
  /** Capture off: Home's warning, and the widgets gone dark with Fix. */
  captureOff(ctx: Ctx) {
    const ui = useUi.getState();
    ui.setScenario('capture-off');
    ui.setDevState('normal');
    ctx.go('home');
    useNative.getState().setSheet('widgets');
  },
  /** Offline: the screens' offline state. A second press comes back online. */
  toggleOffline() {
    const ui = useUi.getState();
    ui.setDevState(ui.devState === 'offline' ? 'normal' : 'offline');
  },
};
