import type { ReactNode } from 'react';
import { CloudOffIcon, TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { updatedAgo } from '@/lib/dates';

// Empty, loading, error, offline and stale (patterns.md §7). No screen invents its own.

/** One line saying what will appear here, and the action that fills it. No illustrations. */
export function EmptyState({ line, action }: { line: string; action?: { label: string; onSelect: () => void } }) {
  return (
    <Empty className="gap-3 border-0 p-6">
      <EmptyHeader>
        <EmptyDescription className="text-base text-muted-foreground">{line}</EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          <Button onClick={action.onSelect}>{action.label}</Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/** A skeleton shaped like a list of rows, in muted, never a spinner over the whole screen. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-2" aria-hidden="true">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** What happened and what to do next, in plain words, with a button that does it. What was typed is kept by the screen. */
export function ErrorState({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
}) {
  return (
    // in the text colour, not destructive red: an error removes nothing (patterns.md §2)
    <Alert className="flex flex-col gap-2 [&>svg]:hidden">
      <AlertTitle className="flex items-center gap-2 text-base font-semibold">
        <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" />
        {title}
      </AlertTitle>
      <AlertDescription className="text-foreground">{detail}</AlertDescription>
      <Button variant="outline" size="sm" className="self-start" onClick={onAction}>
        {action}
      </Button>
    </Alert>
  );
}

/** Offline is a banner, not an error: what works offline still works. */
export function OfflineBanner({ children }: { children?: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 bg-muted px-4 py-2 text-sm text-foreground">
      <CloudOffIcon className="size-4 shrink-0 text-icon" aria-hidden="true" />
      <span>{children ?? "You're offline. What you add is kept and syncs when you're back."}</span>
    </div>
  );
}

/** While the live connection is down, how long since the screen last updated, in muted. */
export function UpdatedAgo({ at, now }: { at: Date; now?: Date }) {
  return <p className="text-sm text-muted-foreground">{updatedAgo(at, now)}</p>;
}
