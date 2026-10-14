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
    <header className="@container/bar flex h-14 shrink-0 items-center gap-1 px-2">
      <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack ?? (() => goBack(router))}>
        <ArrowLeftIcon />
      </Button>
      {/*
        Large text (QA B04 redesign run 4, 14): the title grows less than body text, as Android 14 scales large
        fonts (to 1.2× at most), and on a bar narrower than 20rem the action shows its icon only, named in full for screen readers.
      */}
      <h1 className="min-w-0 flex-1 truncate text-[calc(var(--text-2xl)*min(var(--text-scale,1),1.2)/var(--text-scale,1))] leading-tight font-semibold">
        {title}
      </h1>
      {action ? (
        <div className="flex shrink-0 items-center @max-[20rem]/bar:[&_[data-slot=button]]:gap-0 @max-[20rem]/bar:[&_[data-slot=button]]:px-2 @max-[20rem]/bar:[&_[data-slot=button]]:text-[0px]">
          {action}
        </div>
      ) : null}
    </header>
  );
}
