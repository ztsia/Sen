import { DEV_TOOLS } from '@/lib/env';
import { inShell } from '@/shell/bridge';

/**
 * *Send to ESS* is the shell's: the adapter signs in and submits from the phone (D96, D105). A browser
 * never shows it; a preview shows it as a stand-in, said so under the button (QA B04 run 2, 15).
 */
export const essHere = (): boolean => inShell() || DEV_TOOLS;

export function EssStandIn() {
  if (inShell()) return null;
  return <p className="text-sm text-muted-foreground">A stand-in here: in the app, Sen sends it from your phone.</p>;
}
