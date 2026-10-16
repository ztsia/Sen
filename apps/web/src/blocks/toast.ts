import { toast } from 'sonner';

// Every change happens at once, with Undo in a toast (patterns.md §7, spec §6.7). The toast says what
// happened, in words, stays 6 seconds or until the next change, and shows only when the change isn't
// visible on screen. One at a time: a new change replaces the last toast.
export const TOAST_MS = 6000;

// While the last toast is up, a new change replaces it in place. Once it's going (Undo tapped, swiped,
// timed out), a new change takes a fresh id: reusing the id of a toast on its way out lost the new
// toast, so a change right after Undo got no Undo (QA B01, finding 5).
let current: { id: number; up: boolean; undo: boolean } | undefined;
let next = 0;

function show(message: string, action?: { label: string; onClick: () => void }) {
  if (!current?.up) current = { id: ++next, up: true, undo: false };
  current.undo = !!action;
  const mine = current;
  const gone = () => {
    mine.up = false;
  };
  toast(message, {
    id: mine.id,
    duration: TOAST_MS,
    onDismiss: gone,
    onAutoClose: gone,
    action: action && {
      label: action.label,
      onClick: () => {
        gone();
        action.onClick();
      },
    },
  });
}

export function toastUndo(message: string, onUndo: () => void) {
  show(message, { label: 'Undo', onClick: onUndo });
}

/** A change that can't be undone from here, said in words. */
export function toastDone(message: string) {
  show(message);
}

/**
 * A new version of Sen is ready (D138). It stays until tapped or swiped, apart from the one-at-a-time
 * change toasts, so a change's Undo never pushes it away; showing it again updates it in place.
 */
export function toastUpdate(onUpdate: () => void) {
  toast('A new version of Sen is ready.', {
    id: 'sen-update',
    duration: Infinity,
    action: { label: 'Update', onClick: onUpdate },
  });
}

/**
 * Take the last toast down if it only said something: a refusal about a file shouldn't follow the next
 * one onto its screen. A toast with Undo stays its six seconds (QA B04 run 3, 27).
 */
export function dismissToast() {
  if (!current?.up || current.undo) return;
  current.up = false;
  toast.dismiss(current.id);
}
