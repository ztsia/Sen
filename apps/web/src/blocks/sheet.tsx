import { useRef, type ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useSheetResize } from '@/frame/motion';
import { useBackClose } from '@/lib/back-close';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** One line under the title, for screen readers too. */
  description?: ReactNode;
  /** Full height, over the screen it opened from: Sen's sheet (patterns.md §7). */
  full?: boolean;
  /** Replaces the plain title row, for Sen's sheet and its avatar. */
  head?: ReactNode;
  children: ReactNode;
}

/**
 * A bottom sheet for choices and short forms (patterns.md §7): a grab handle, its title, and Close. It
 * closes by swipe, a tap on the scrim, Close or back, and keeps whatever was typed in it while open.
 */
export function Sheet({ open, onOpenChange, title, description, full, head, children }: SheetProps) {
  useBackClose(open, () => onOpenChange(false));
  const area = useRef<HTMLDivElement>(null);
  useSheetResize(area, open);
  return (
    // repositionInputs off: the page already resizes for the keyboard (interactive-widget=resizes-content,
    // and the shell's adjustResize), and vaul's own resize pinned a sheet at half height when its input
    // lost focus before the keyboard closed (owner's review of B04)
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        // a tap on a toast (its Undo) is outside the sheet, but isn't a tap on the scrim: it keeps the sheet open
        onInteractOutside={(e) => {
          if ((e.target as Element | null)?.closest?.('[data-sonner-toast]')) e.preventDefault();
        }}
        className={cn(
          'mx-auto w-full max-w-[480px] rounded-t-[1.25rem] border-border bg-popover text-popover-foreground',
          full
            ? 'h-[calc(100dvh-2.75rem-var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] max-h-none!'
            : 'max-h-[85dvh]',
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 pt-1 pb-2">
          {head ?? <DrawerTitle className="min-w-0 flex-1 text-xl font-semibold text-pretty">{title}</DrawerTitle>}
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
            <XIcon />
          </Button>
        </div>
        {head ? <DrawerTitle className="sr-only">{title}</DrawerTitle> : null}
        <DrawerDescription className={description ? 'px-4 pt-3 text-sm text-muted-foreground' : 'sr-only'}>
          {description ?? title}
        </DrawerDescription>
        <div
          ref={area}
          className="scroll-area min-h-0 flex-1 px-4 pt-2 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]"
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
