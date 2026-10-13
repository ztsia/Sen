// Sen: shadcn/ui's progress, changed in place (CLAUDE.md, shadcn first): the track in `muted` and the fill in the look's chart accent (patterns.md §4), or `warning` on the warn colour; corners follow the look; an aria-label is required, so every bar is named.
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Progress as ProgressPrimitive } from 'radix-ui';

function Progress({
  className,
  value,
  tone = 'accent',
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  tone?: 'accent' | 'warning';
  /** What it measures, for screen readers: *Spent of the cap* (axe's aria-progressbar-name). */
  'aria-label': string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full flex-1 rounded-full transition-all',
          tone === 'warning' ? 'bg-money-warning' : 'bg-chart-accent',
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
