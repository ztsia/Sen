import type { ReactNode } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useRouter, type AnyRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LookMarkup } from '@/components/look/look-markup';
import { useLook } from '@/theme/look';
import { useMode } from '@/theme/store';

/**
 * Back one step, or Home when nothing is behind this screen (opened from a link, a notification or a
 * widget), so Back and Delete never leave the app (QA B04 redesign run 3, 8).
 */
export function goBack(router: AnyRouter) {
  if (router.history.canGoBack()) router.history.back();
  else void router.navigate({ to: '/', replace: true });
}

/**
 * The app bar (patterns.md §7): the wordmark on Home; on any other screen, back, the screen's title,
 * and at most one action on the right.
 */
export function AppBar({
  title,
  home,
  action,
  onBack,
}: {
  title: string;
  home?: boolean;
  action?: ReactNode;
  onBack?: () => void;
}) {
  const look = useLook();
  const mode = useMode();
  const router = useRouter();
  if (home)
    return (
      <header className="flex h-14 shrink-0 items-center px-5">
        <h1 className="flex items-center">
          <span className="sr-only">Sen</span>
          {/* through LookMarkup, so a look that draws its wordmark live (Mercury, Line) mounts it */}
          {look ? <LookMarkup html={look.wordmark(mode)} /> : null}
        </h1>
      </header>
    );
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2">
      <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack ?? (() => goBack(router))}>
        <ArrowLeftIcon />
      </Button>
      <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{title}</h1>
      {action}
    </header>
  );
}
