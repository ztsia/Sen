import type { ComponentType, ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

// Choices shown as what they are (patterns.md §7, D130): a segmented control with an icon per option,
// and cards that show a preview of each choice.

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

/** Two to four options in one row, one always chosen: the chosen one a raised card on a muted track. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** What's being chosen, for screen readers: *Mode*. */
  label: string;
  options: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('px-4', className)}>
      <ToggleGroup
        type="single"
        variant="segment"
        spacing={1}
        aria-label={label}
        className="w-full flex-nowrap rounded-[var(--radius-btn,999px)] bg-muted p-1"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as T);
        }}
      >
        {options.map(({ value: v, label: l, icon: Icon }) => (
          <ToggleGroupItem key={v} value={v} className="min-w-0 flex-1">
            {Icon ? <Icon className="size-4" /> : null}
            <span className="truncate">{l}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  /** What the choice looks like: a look's mini preview, a calendar. */
  preview?: ReactNode;
}

/** A grid of cards, one chosen: a ring and a ✓ mark it. A radio group to screen readers. */
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  className,
}: {
  label: string;
  options: Choice<T>[];
  /** Nothing chosen when null, such as a look while the look changes each quarter. */
  value: T | null;
  onChange: (v: T) => void;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-3 px-4', columns === 2 ? 'grid-cols-2' : 'grid-cols-1', className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'card relative flex min-h-14 flex-col gap-2 overflow-hidden rounded-[var(--radius-card,16px)] border bg-card p-2 text-left transition-shadow active:opacity-80',
              on ? 'border-primary ring-2 ring-primary' : 'border-border',
              !o.preview && 'justify-center px-4 py-3',
            )}
          >
            {o.preview}
            <span className={cn('flex min-w-0 flex-col', o.preview && 'px-1 pb-1')}>
              <span className="truncate text-base font-medium">{o.label}</span>
              {o.description ? <span className="text-sm text-muted-foreground">{o.description}</span> : null}
            </span>
            {on ? (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <CheckIcon className="size-4" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
