import { lazy, Suspense } from 'react';
import { CameraIcon, EllipsisIcon, ImageIcon, PencilLineIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Avatar } from '@/components/look/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSen } from '@/data/hooks';
import { ListSkeleton } from '@/blocks/states';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Sheet } from '@/blocks/sheet';
import { useUi } from './ui-store';

// compared in place, so a production build leaves the conversation's chunk out (sen-env.d.ts)
const Conversation = __SEN_ENV__ !== 'production' ? lazy(() => import('@/screens/sen/conversation')) : null;

/** Sen's avatar in the sheet's header: speaking while it answers, paused at the cap (D76, §9.6). */
function HeadAvatar({ from }: { from: string }) {
  const { data } = useSen(from);
  const state =
    data?.state === 'paused' ? 'paused' : data?.messages.some((m) => m.streaming) ? 'speaking' : 'listening';
  return <Avatar state={state} size={40} />;
}

/** The ⋯ menu: the three screens about Sen. Each closes the sheet first, replacing its history step. */
function SenMenu() {
  const setSenOpen = useUi((s) => s.setSenOpen);
  const navigate = useNavigate();
  const go = (id: string) => {
    setSenOpen(false);
    void navigate({ to: '/s/$', params: { _splat: id }, replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More about Sen">
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[var(--z-index-toast,100)]">
        <DropdownMenuItem className="min-h-12 text-base" onSelect={() => go('agent/memory')}>
          What Sen remembers
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-12 text-base" onSelect={() => go('agent/research')}>
          Research
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-12 text-base" onSelect={() => go('agent/usage')}>
          Usage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sen's sheet: full height, over the screen it opened from (screens.md `sen`). In previews and the dev
 * server it holds the conversation on made-up data; production stays *Not built yet* until Sen's
 * harness (B27), with no chunk shipped.
 */
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
          {Conversation ? <HeadAvatar from={from} /> : <Avatar state="listening" size={40} />}
          <div className="flex min-w-0 flex-col">
            <span className="text-xl font-semibold">Sen</span>
            <span className="text-sm text-muted-foreground">Looking at: {from}</span>
          </div>
          {Conversation ? (
            <div className="ml-auto">
              <SenMenu />
            </div>
          ) : null}
        </div>
      }
    >
      {Conversation ? (
        <Suspense fallback={<ListSkeleton rows={3} />}>
          <Conversation from={from} />
        </Suspense>
      ) : (
        <p className="py-6 text-muted-foreground">Not built yet. Sen arrives in B27.</p>
      )}
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
              <ItemMedia variant="icon" className="size-8 rounded-full border-0 bg-muted text-icon">
                <r.icon className="size-4" />
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
