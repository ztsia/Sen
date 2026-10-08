import { toast } from 'sonner';

// Every change happens at once, with Undo in a toast (patterns.md §7, spec §6.7). The toast says what
// happened, in words, stays 6 seconds or until the next change, and shows only when the change isn't
// visible on screen. One at a time: a new change replaces the last toast.
export const TOAST_MS = 6000;
const ID = 'sen-toast';

export function toastUndo(message: string, onUndo: () => void) {
  toast(message, { id: ID, duration: TOAST_MS, action: { label: 'Undo', onClick: onUndo } });
}

/** A change that can't be undone from here, said in words. */
export function toastDone(message: string) {
  toast(message, { id: ID, duration: TOAST_MS });
}
