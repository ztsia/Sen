import { useRef, useState, type ComponentType, type ReactNode } from 'react';
import { CloudOffIcon, InboxIcon, ReceiptTextIcon, SparklesIcon, SplitIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { dayLabel } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { readableName } from '@/lib/names';
import { Money, type MoneyKind } from './money';
import { settleTap } from '@/lib/tap-guard';
import { toastUndo } from './toast';
import { IconTile, type TileTone } from './tile';

// The rows every list is made of (patterns.md §7), composed from shadcn's Item. A row is one control:
// the whole row opens its detail, and nothing inside it is a button.

export type RowMark = 'receipt' | 'split' | 'review' | 'pending' | 'filled';
const MARKS: Record<RowMark, [ComponentType<{ className?: string }>, string]> = {
  receipt: [ReceiptTextIcon, 'Receipt'],
  split: [SplitIcon, 'Split'],
  review: [InboxIcon, 'In Review'],
  pending: [CloudOffIcon, 'Not synced yet'],
  filled: [SparklesIcon, 'Filled in'],
};

export function Marks({ marks }: { marks: RowMark[] }) {
  if (!marks.length) return null;
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      {marks.map((m) => {
        const [Icon, label] = MARKS[m];
        return (
          <span
            key={m}
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              m === 'pending' ? 'text-money-pending' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </span>
        );
      })}
    </span>
  );
}

/** A leading mark: the category's or account's icon tile, tinted by its category (D130). */
export function RowMarkIcon({ icon, tone }: { icon: ComponentType<{ className?: string }>; tone?: TileTone }) {
  return <IconTile icon={icon} tone={tone} />;
}

interface ListRowProps {
  icon: ComponentType<{ className?: string }>;
  /** The category's tint: `categoryTone(category)`. */
  tone?: TileTone;
  /** The merchant, or the account. It truncates before the amount ever does. */
  title: string;
  /** Category · account. */
  secondary?: string;
  sen: number;
  kind?: MoneyKind;
  marks?: RowMark[];
  onOpen?: () => void;
}

/** A payment, an account or a shared bill: 56 px or more, a stable height, so long lists virtualise. */
export function ListRow({ icon, tone, title, secondary, sen, kind = 'out', marks = [], onOpen }: ListRowProps) {
  return (
    <Item
      asChild
      size="sm"
      className="min-h-14 w-full flex-nowrap gap-3 rounded-none py-2 text-left text-base active:bg-accent"
    >
      <button type="button" onClick={onOpen}>
        <RowMarkIcon icon={icon} tone={tone} />
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle className="block w-full truncate text-base">{readableName(title)}</ItemTitle>
          {secondary || marks.length ? (
            <ItemDescription className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-balance">
              {secondary ? <span className="min-w-0 truncate">{secondary}</span> : null}
              <Marks marks={marks} />
            </ItemDescription>
          ) : null}
        </ItemContent>
        <ItemActions className="max-w-[55%] shrink-0 justify-end text-right">
          <Money sen={sen} kind={kind} className="font-normal" />
        </ItemActions>
      </button>
    </Item>
  );
}

/** The date in Kuala Lumpur time and the day's spending, sticky while its rows scroll. */
export function DayHeader({ date, spentSen }: { date: Date; spentSen: number }) {
  return (
    <div className="sticky top-0 z-[var(--z-index-sticky)] flex items-baseline justify-between gap-3 bg-background/95 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
      <h3 className="font-medium text-foreground">{dayLabel(date)}</h3>
      <span>
        Spent <Money sen={spentSen} className="text-foreground" />
      </span>
    </div>
  );
}

export interface ReviewAnswer {
  label: string;
  /** Sen suggests this one: marked on the button (patterns.md §7). */
  suggested?: boolean;
  /**
   * Makes the change, and returns what happened, in words, and how to undo it; or opens what answers
   * it (a sheet, a screen) and returns nothing.
   */
  onSelect: () => Answered | Promise<Answered | null> | void;
}
type Answered = { said: string; undo: () => void };

/**
 * A question that needs you: on one line, what Sen knows on the next, then at most three answers plus
 * Other…. Answering clears it with Undo (patterns.md §7): the row raises the toast itself, so no
 * answer can skip it.
 */
export function ReviewRow({
  question,
  knows,
  answers,
  onOther,
}: {
  question: ReactNode;
  knows: ReactNode;
  answers: ReviewAnswer[];
  /** Other…: the full set of choices. Left out where the buttons are every choice there is. */
  onOther?: () => void;
}) {
  // one answer at a time: a double tap applies it once (QA B03, F2)
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return (
    <Card className="gap-2 p-3 text-base">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="w-full text-base font-semibold text-pretty wrap-anywhere">{question}</p>
        <p className="text-sm text-muted-foreground">{knows}</p>
      </div>
      {/* the padding holds the chips' 48 px tap extension inside the scroller, so the row never scrolls up and down (QA B04 redesign, 6) */}
      <div className="[scrollbar-width:none] -mx-3 -my-1.5 flex gap-2 overflow-x-auto overflow-y-hidden px-3 py-2">
        {answers.slice(0, 3).map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="chip"
            className={cn(
              'shrink-0 whitespace-nowrap',
              a.suggested && 'border-primary text-primary ring-2 ring-primary/40',
            )}
            aria-disabled={busy || undefined}
            onClick={() => {
              // one answer per row, and none while the last change settles: the next row slides into
              // this place, so a double tap would answer it too (patterns.md §7, QA B03 run 2)
              if (pending.current || !settleTap()) return;
              pending.current = true;
              setBusy(true);
              const release = () => {
                pending.current = false;
                setBusy(false);
              };
              void Promise.resolve(a.onSelect()).then((r) => {
                // answered: the row is on its way out, so it stays answered; opened a sheet: free again
                if (r) toastUndo(r.said, r.undo);
                else release();
              }, release);
            }}
          >
            {a.suggested ? <SparklesIcon aria-hidden="true" /> : null}
            {a.label}
            {a.suggested ? <span className="sr-only">, Sen suggests this</span> : null}
          </Button>
        ))}
        {onOther ? (
          <Button variant="ghost" size="chip" className="shrink-0 whitespace-nowrap" onClick={onOther}>
            Other…
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
