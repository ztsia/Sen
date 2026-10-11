import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
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
  // a screen opens at its top: React reuses the scroll area from one screen to the next, so without
  // this a screen would open at the last one's offset (QA B03 run 2, finding 18)
  const main = useRef<HTMLElement>(null);
  const at = useRouterState({ select: (s) => s.location.pathname + s.location.searchStr });
  useLayoutEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [at]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {bar}
      {/* focusable, so a keyboard or switch user can scroll a screen that holds nothing else to focus
          (axe: scrollable-region-focusable); its ring shows for keyboard use only */}
      <main ref={main} tabIndex={0} className={cn('scroll-area min-h-0 flex-1', senRoom ? 'pb-24' : 'pb-6', className)}>
        {children}
      </main>
    </div>
  );
}
