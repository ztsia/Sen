// Sen: shadcn/ui's skeleton, changed in place for the phone (CLAUDE.md, shadcn first): bg-muted, as patterns.md §7 says.
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
