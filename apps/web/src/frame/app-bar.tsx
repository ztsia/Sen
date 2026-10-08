import type { ReactNode } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useLook } from '@/theme/look';
import { useMode } from '@/theme/store';

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
          {look ? <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: look.wordmark(mode) }} /> : null}
        </h1>
      </header>
    );
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-1">
      <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack ?? (() => router.history.back())}>
        <ArrowLeftIcon />
      </Button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {action}
    </header>
  );
}
