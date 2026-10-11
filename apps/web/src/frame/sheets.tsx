import { CameraIcon, ImageIcon, PencilLineIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Avatar } from '@/components/look/avatar';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Sheet } from '@/blocks/sheet';
import { useUi } from './ui-store';

/** Sen's sheet: full height, over the screen it opened from. A stand-in until Sen's harness (B27). */
export function SenSheet({ from }: { from: string }) {
  const { senOpen, setSenOpen } = useUi();
  return (
    <Sheet
      open={senOpen}
      onOpenChange={setSenOpen}
      full
      title="Sen"
      head={
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar state="listening" size={40} />
          <div className="flex min-w-0 flex-col">
            <span className="text-lg font-semibold">Sen</span>
            <span className="text-sm text-muted-foreground">Looking at: {from}</span>
          </div>
        </div>
      }
    >
      <p className="py-6 text-muted-foreground">Not built yet. Sen arrives in B27.</p>
    </Sheet>
  );
}

/** Scan's long-press: Scan · From gallery · Add manually (D69). Stand-ins until B15 and B08. */
export function ScanMoreSheet() {
  const { scanMoreOpen, setScanMoreOpen } = useUi();
  const navigate = useNavigate();
  const go = (id: string) => {
    setScanMoreOpen(false);
    // replace the sheet's history step, so back from the next screen returns here, not to the sheet
    void navigate({ to: id === 'scan' ? '/scan' : '/s/$', params: { _splat: id }, replace: true });
  };
  const rows = [
    { id: 'scan', label: 'Scan', icon: CameraIcon },
    // Scan's own screen has the gallery picker in a browser (B15 opens ML Kit's import in the shell)
    { id: 'scan', label: 'From gallery', icon: ImageIcon },
    { id: 'manual', label: 'Add manually', icon: PencilLineIcon },
  ];
  return (
    <Sheet open={scanMoreOpen} onOpenChange={setScanMoreOpen} title="Add a payment">
      <ItemGroup>
        {rows.map((r) => (
          <Item
            key={r.label}
            asChild
            size="sm"
            className="min-h-14 w-full rounded-none text-left text-base active:bg-accent"
          >
            <button type="button" onClick={() => go(r.id)}>
              <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-muted text-icon">
                <r.icon className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-base">{r.label}</ItemTitle>
              </ItemContent>
            </button>
          </Item>
        ))}
      </ItemGroup>
    </Sheet>
  );
}
