import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

// shadcn's switch, with a 48 px touch target around its track (patterns.md §8): the button is the
// target, and the track and thumb are drawn inside it.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch relative inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-full outline-none',
        'before:absolute before:h-7 before:w-12 before:rounded-full before:border before:border-input before:bg-muted before:transition-colors',
        'data-[state=checked]:before:border-primary data-[state=checked]:before:bg-primary',
        'focus-visible:before:ring-[3px] focus-visible:before:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none relative block size-5 -translate-x-2.5 rounded-full bg-foreground shadow-sm transition-transform data-[state=checked]:translate-x-2.5 data-[state=checked]:bg-primary-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
