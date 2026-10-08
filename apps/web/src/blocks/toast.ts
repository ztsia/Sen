import { toast } from 'sonner';

// Every change happens at once, with Undo in a toast (patterns.md §7, spec §6.7). The toast says what
// happened, in words, stays 6 seconds or until the next change, and shows only when the change isn't
// visible on screen. One at a time: a new change replaces the last toast.
export const TOAST_MS = 6000;

// Each toast has its own id, and the last is dismissed first. Reusing one id lost a toast raised
// while the last was still leaving (QA B01, finding 5): a change right after Undo got no Undo.
let last: string | number | undefined;
const show = (message: string, action?: { label: string; onClick: () => void }) => {
  if (last !== undefined) toast.dismiss(last);
  last = toast(message, { duration: TOAST_MS, action });
};

export function toastUndo(message: string, onUndo: () => void) {
  show(message, { label: 'Undo', onClick: onUndo });
}

/** A change that can't be undone from here, said in words. */
export function toastDone(message: string) {
  show(message);
}
