// Sen: shadcn/ui's toggle, changed in place for the phone (CLAUDE.md, shadcn first): every size at least 48 px; the look's --radius-btn, a pill where the look sets none; body text size; the on state in the primary pair, so it reads in every look; no hover-only states.
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Toggle as TogglePrimitive } from 'radix-ui';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn,999px)] text-base font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/40 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: 'bg-transparent text-foreground',
        outline: 'border border-input bg-transparent text-foreground',
      },
      size: {
        default: 'min-h-12 min-w-12 px-3',
        sm: 'min-h-12 min-w-12 px-2.5',
        lg: 'min-h-14 min-w-14 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
  );
}

export { Toggle, toggleVariants };
