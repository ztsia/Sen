import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { ChevronRightIcon, CopyIcon, EllipsisIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toastDone } from './toast';

// A detail screen's parts (patterns.md §7, D130): a header card that says what this is, facts in a grid,
// and actions in a bar. Facts and actions never look alike.

/**
 * The top of a detail: its mark, what it is, the one large figure, one meta line, and where it came
 * from (*From Ryt Bank's notification*), which is always said. `copy` adds a Copy button for the figure,
 * since amounts aren't selectable (§10).
 */
export function HeaderCard({
  mark,
  title,
  figure,
  meta,
  source,
  badge,
  copy,
  shareId,
}: {
  mark?: ReactNode;
  title: ReactNode;
  figure?: ReactNode;
  meta?: ReactNode;
  source?: ReactNode;
  badge?: ReactNode;
  /** The figure as text, for its Copy button. */
  copy?: number;
  /** The payment's id: its row's amount carries into this figure (patterns.md §8). */
  shareId?: string;
}) {
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatSen(copy!));
      toastDone('Amount copied');
    } catch {
      toastDone("Couldn't copy here");
    }
  };
  return (
    <Card className="mx-4 items-center gap-1 px-4 pt-5 pb-4 text-center">
      {mark ? <div className="pb-2">{mark}</div> : null}
      <p className="max-w-full text-base font-medium text-pretty wrap-anywhere">{title}</p>
      {figure !== undefined ? (
        <div className="relative flex items-center justify-center">
          <div className="text-4xl font-semibold" data-share={shareId} data-share-figure={shareId ? '' : undefined}>
            {figure}
          </div>
          {copy !== undefined ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy the amount"
              onClick={doCopy}
              className="absolute left-full ml-1"
            >
              <CopyIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
      {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
      {badge ? <div className="pt-1">{badge}</div> : null}
      {source ? <p className="pt-2 text-xs text-muted-foreground">{source}</p> : null}
    </Card>
  );
}

export interface GridFact {
  label: string;
  value: ReactNode;
  /** The value opens a sheet or a screen: it's drawn as a control, with a chevron. */
  onSelect?: () => void;
  /** Muted, for a value that isn't there yet (*Add a note*). */
  muted?: boolean;
  /** Spans both columns, for a long value. */
  wide?: boolean;
}

/** Facts as label above value, two columns, in a card. A tappable value is a control, with a chevron. */
export function FactGrid({ facts, className }: { facts: GridFact[]; className?: string }) {
  return (
    <Card className={cn('mx-4 py-0', className)}>
      <dl className="grid grid-cols-2 gap-x-4 px-4 py-1">
        {facts.map((f) => (
          <div key={f.label} className={cn('flex min-w-0 flex-col gap-0.5 py-2.5', f.wide && 'col-span-2')}>
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className={cn('min-w-0 text-base', f.muted && 'text-muted-foreground')}>
              {f.onSelect ? (
                <button
                  type="button"
                  onClick={f.onSelect}
                  className="relative tap -mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 text-left"
                >
                  <span className="min-w-0 wrap-anywhere">{f.value}</span>
                  <ChevronRightIcon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                </button>
              ) : (
                <span className="wrap-anywhere">{f.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export interface BarAction {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}
export interface MenuAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/**
 * A detail's actions: up to four round icon buttons with a caption under each. Rare and destructive
 * ones go behind the last, ⋯ (*More*); they still offer Undo.
 */
export function ActionBar({ actions, more = [] }: { actions: BarAction[]; more?: MenuAction[] }) {
  const cols = actions.length + (more.length ? 1 : 0);
  return (
    <div className="grid gap-2 px-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {actions.map((a) => (
        <BarButton key={a.label} icon={a.icon} label={a.label} onClick={a.onSelect} disabled={a.disabled} />
      ))}
      {more.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <BarButton icon={EllipsisIcon} label="More" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {more.map((m, i) => (
              <div key={m.label}>
                {m.destructive && i ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem variant={m.destructive ? 'destructive' : 'default'} onSelect={m.onSelect}>
                  {m.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function BarButton({
  icon: Icon,
  label,
  ...props
}: { icon: ComponentType<{ className?: string }>; label: string } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="group flex min-h-16 flex-col items-center gap-1.5 rounded-xl py-1 text-xs font-medium text-foreground disabled:opacity-50"
      {...props}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </span>
      <span className="max-w-full text-center leading-tight text-balance">{label}</span>
    </button>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
  /** The one that matters: tinted, so it's read first. */
  emphasis?: boolean;
}

/**
 * Two or three figures, each with its caption: two across at most, so a figure never breaks over lines;
 * a third takes the next row whole (owner, 13 Oct).
 */
export function StatTiles({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn('grid gap-2 px-4', className)}
      style={{ gridTemplateColumns: `repeat(${Math.min(2, stats.length)}, minmax(0, 1fr))` }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-card,16px)] border px-3 py-3',
            // the emphasised tile is tinted, not a card: a look's card material would repaint it (Line)
            s.emphasis ? 'border-primary/25 bg-primary/10' : 'card bg-card',
            stats.length > 2 && stats.length % 2 === 1 && i === stats.length - 1 && 'col-span-2',
          )}
        >
          <span className="text-xs text-foreground">{s.label}</span>
          {/* two across leaves room for a whole figure; it breaks only if even that is too narrow (very large text) */}
          <span className="text-lg font-semibold wrap-break-word">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
