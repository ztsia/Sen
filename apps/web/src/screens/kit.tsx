import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ErrorState, ListSkeleton } from '@/blocks/states';
import type { ScreenSearch } from '@/router';

// What every skeleton screen shares: how it opens another screen, what it's about, and its loading and
// error states (patterns.md §7), so no screen invents its own.

const TAB_PATHS: Record<string, '/' | '/review' | '/insights' | '/more' | '/scan'> = {
  home: '/',
  review: '/review',
  insights: '/insights',
  more: '/more',
  scan: '/scan',
};

/** Opens a screen by its id in docs/screens.md, with what it's about. */
export function useGo() {
  const navigate = useNavigate();
  return (id: string, search: ScreenSearch = {}, opts: { replace?: boolean } = {}) => {
    const tab = TAB_PATHS[id];
    if (tab) void navigate({ to: tab, replace: opts.replace });
    else void navigate({ to: '/s/$', params: { _splat: id }, search, replace: opts.replace });
  };
}

/** The search of the screen on show. */
export const useScreenSearch = (): ScreenSearch => useSearch({ strict: false });

/**
 * A query's three states: a skeleton shaped like the content while it loads, the error in words with
 * Try again, then the content. What was typed elsewhere on the screen is kept.
 */
export function Loaded<T>({
  q,
  skeleton,
  what,
  children,
}: {
  q: UseQueryResult<T>;
  skeleton?: ReactNode;
  /** What couldn't load, for the error: "your payments". */
  what: string;
  children: (data: T) => ReactNode;
}) {
  if (q.isPending) return <>{skeleton ?? <ListSkeleton />}</>;
  if (q.isError)
    return (
      <div className="p-4">
        <ErrorState
          title={`Couldn't load ${what}`}
          detail="Check your connection, then try again. Nothing you've added is lost."
          action="Try again"
          onAction={() => void q.refetch()}
        />
      </div>
    );
  return <>{children(q.data)}</>;
}

/** A section's heading inside a screen. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col pt-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-4 pb-1">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
