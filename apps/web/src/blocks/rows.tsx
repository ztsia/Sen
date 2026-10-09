import { useId, type ComponentType, type ReactNode } from 'react';
import { ChevronRightIcon, CloudOffIcon, InboxIcon, ReceiptTextIcon, SparklesIcon, SplitIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { dayLabel } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Money, type MoneyKind } from './money';
import { toastUndo } from './toast';

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

/** A leading mark: the category's or account's icon, in a disc. */
export function RowMarkIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return (
    <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-muted text-icon" aria-hidden="true">
      <Icon className="size-5" />
    </ItemMedia>
  );
}

interface ListRowProps {
  icon: ComponentType<{ className?: string }>;
  /** The merchant, or the account. It truncates before the amount ever does. */
  title: string;
  /** Category · account. */
  secondary?: string;
  sen: number;
  kind?: MoneyKind;
  marks?: RowMark[];
  onOpen?: () => void;
}

/** A payment, an account or a shared bill: 64 px or more, a stable height, so long lists virtualise. */
export function ListRow({ icon, title, secondary, sen, kind = 'out', marks = [], onOpen }: ListRowProps) {
  return (
    <Item asChild size="sm" className="min-h-16 w-full flex-nowrap rounded-none text-left text-base active:bg-accent">
      <button type="button" onClick={onOpen}>
        <RowMarkIcon icon={icon} />
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle className="block w-full truncate text-base">{title}</ItemTitle>
          {secondary || marks.length ? (
            <ItemDescription className="flex min-w-0 flex-wrap items-center gap-x-2 text-balance">
              {secondary ? <span className="min-w-0 truncate">{secondary}</span> : null}
              <Marks marks={marks} />
            </ItemDescription>
          ) : null}
        </ItemContent>
        <ItemActions className="max-w-[55%] shrink-0 justify-end text-right">
          <Money sen={sen} kind={kind} />
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
  /** Makes the change, and returns what happened, in words, and how to undo it. */
  onSelect: () => { said: string; undo: () => void };
}

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
  onOther: () => void;
}) {
  return (
    <Item size="sm" className="rounded-none text-base">
      <ItemContent className="min-w-0 gap-1">
        <ItemTitle className="w-full text-base text-pretty wrap-anywhere">{question}</ItemTitle>
        <ItemDescription>{knows}</ItemDescription>
      </ItemContent>
      <ItemFooter className="flex-wrap justify-start">
        {answers.slice(0, 3).map((a) => (
          <Button
            key={a.label}
            variant={a.suggested ? 'default' : 'secondary'}
            size="sm"
            onClick={() => {
              const { said, undo } = a.onSelect();
              toastUndo(said, undo);
            }}
          >
            {a.suggested ? <SparklesIcon aria-hidden="true" /> : null}
            {a.label}
            {a.suggested ? <span className="sr-only">, Sen suggests this</span> : null}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onOther}>
          Other…
        </Button>
      </ItemFooter>
    </Item>
  );
}

type SettingsRowProps =
  | {
      label: string;
      value?: string;
      onOpen: () => void;
      checked?: never;
      onCheckedChange?: never;
      media?: never;
      description?: never;
      disabled?: never;
    }
  | {
      label: string;
      value?: never;
      onOpen?: never;
      checked: boolean;
      onCheckedChange: (on: boolean) => void;
      /** A leading mark, such as an app's icon (the picker, B02). */
      media?: ReactNode;
      /** A line under the label; for a disabled switch, why it can't be turned on. */
      description?: string;
      disabled?: boolean;
    };

/** A label, its current value or a switch on the right, and a chevron when it opens a screen. */
export function SettingsRow(props: SettingsRowProps) {
  const id = useId();
  if (props.onCheckedChange) {
    const about = props.description ? `${id}-about` : undefined;
    return (
      // the label stretches over the whole row, so a tap anywhere on it flips the switch (patterns.md §8)
      <Item
        size="sm"
        className={cn(
          'relative min-h-14 flex-nowrap rounded-none py-0 pr-2 text-base',
          props.disabled ? 'opacity-70' : 'active:bg-accent',
        )}
      >
        {props.media ? (
          <ItemMedia className="size-10 shrink-0 overflow-hidden rounded-xl" aria-hidden="true">
            {props.media}
          </ItemMedia>
        ) : null}
        <ItemContent className="min-w-0 gap-0 py-3">
          <label htmlFor={id} className="wrap-anywhere after:absolute after:inset-0">
            {props.label}
          </label>
          {props.description ? (
            <ItemDescription id={about} className="text-sm">
              {props.description}
            </ItemDescription>
          ) : null}
        </ItemContent>
        <ItemActions className="relative">
          <Switch
            id={id}
            checked={props.checked}
            disabled={props.disabled}
            aria-describedby={about}
            onCheckedChange={props.onCheckedChange}
          />
        </ItemActions>
      </Item>
    );
  }
  return (
    <Item asChild size="sm" className="min-h-14 w-full flex-nowrap rounded-none text-left text-base active:bg-accent">
      <button type="button" onClick={props.onOpen}>
        <ItemContent className="min-w-0">
          <ItemTitle className="text-base font-normal">{props.label}</ItemTitle>
        </ItemContent>
        <ItemActions className="max-w-[50%] text-right text-sm text-muted-foreground">
          {props.value ? <span>{props.value}</span> : null}
          <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
        </ItemActions>
      </button>
    </Item>
  );
}
