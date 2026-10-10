import type { ReactNode } from 'react';

/**
 * Home's own material (B03 ports it from each look's design page): the look's `decorate` behind the
 * figure, and its `paydayFx` on payday. Until then, a plain wrapper.
 */
export function HomeMaterial({ payday, children }: { payday: boolean; children: ReactNode }) {
  return (
    <div className="home-material relative" data-payday={payday ? '' : undefined}>
      {children}
    </div>
  );
}
