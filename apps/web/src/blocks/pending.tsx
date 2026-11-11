import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';

/**
 * A button's label while its request is on its way: a spinner and words saying what's happening, so a
 * slow server never looks like a tap that did nothing (qa/escapes.md E2).
 */
export function Pending({ on, label, children }: { on: boolean; label: string; children: ReactNode }) {
  if (!on) return children;
  return (
    <>
      <Spinner aria-hidden />
      {label}
    </>
  );
}
