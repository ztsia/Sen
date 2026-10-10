import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The frame of every screen: its app bar, then its content, which scrolls inside the page (patterns.md
 * §10). A screen with Sen's button keeps room at the bottom so the button never covers its last row.
 */
export function Screen({
  bar,
  children,
  senRoom,
  className,
}: {
  bar: ReactNode;
  children: ReactNode;
  senRoom?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {bar}
      {/* focusable, so a keyboard or switch user can scroll a screen that holds nothing else to focus
          (axe: scrollable-region-focusable); its ring shows for keyboard use only */}
      <main tabIndex={0} className={cn('scroll-area min-h-0 flex-1', senRoom ? 'pb-24' : 'pb-6', className)}>
        {children}
      </main>
    </div>
  );
}
