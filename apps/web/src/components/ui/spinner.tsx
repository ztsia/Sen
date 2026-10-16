// Sen: shadcn/ui's spinner, its `cn` import pointed at our utils; inside a button it's aria-hidden, the label saying what's happening.
import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <Loader2Icon role="status" aria-label="Loading" className={cn('size-4 animate-spin', className)} {...props} />;
}

export { Spinner };
