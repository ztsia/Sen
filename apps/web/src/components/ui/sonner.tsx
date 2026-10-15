// Sen: shadcn/ui's sonner, changed in place for the phone (CLAUDE.md, shadcn first): light and dark from Sen's theme store (src/theme/store.ts) instead of next-themes; a toast stays tappable over an open sheet, so Undo works from Sen's; on a phone the toast keeps to the toaster's offsets, which sonner's own width rule ignores on the right.
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useMode } from '@/theme/store';

// shadcn's Toaster, following Sen's own light and dark (src/theme/store.ts) instead of next-themes.
const Toaster = ({ ...props }: ToasterProps) => {
  const mode = useMode();
  return (
    <Sonner
      theme={mode}
      // sonner's phone rule sets the toaster 100% wide, so the right offset that keeps a toast clear of
      // Sen's button did nothing, and Undo sat on top of it (the cover check, D137)
      className="toaster group max-[600px]:w-auto!"
      // an open sheet makes the page behind it inert (pointer-events: none on <body>), and a toast
      // raised from inside Sen's sheet would inherit that: Undo could not be tapped
      toastOptions={{ classNames: { toast: 'pointer-events-auto max-[600px]:w-full!' } }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
