// Sen: shadcn/ui's button, changed in place for the phone (CLAUDE.md, shadcn first): every size at least 48 px (min-h-12/14, icon size-12); the look's --radius-btn, a pill where the look sets none (as engine.css draws it); body text size; no hover-only states; destructive text on --background; a `warning` variant on the warn pair, for the health bar's fix.
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

// shadcn's button, cut to a phone: every size is at least 48 px tall (patterns.md §8), the corners are
// the look's button radius, and text is the body size so it scales with the system font.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-btn,999px)] text-base font-medium transition-[color,background-color,box-shadow,opacity] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 active:opacity-80",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-background',
        warning: 'bg-warn-fg text-warn-bg',
        outline: 'border border-border bg-background text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'text-foreground active:bg-accent',
        link: 'text-primary underline underline-offset-4',
      },
      size: {
        default: 'min-h-12 px-5 py-2',
        sm: 'min-h-12 px-4 py-1.5',
        lg: 'min-h-14 px-6 py-3',
        icon: 'size-12 text-icon',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
