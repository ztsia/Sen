import { useId, useState } from 'react';
import { parseSen, pastedSen, typedSen, type ParseResult } from '@sen/core/money';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MESSAGES: Record<Exclude<ParseResult, { ok: true }>['reason'], string> = {
  empty: 'Type the amount.',
  format: 'Type the amount in ringgit, like 12.50.',
  decimals: 'Two decimals at most, like 12.50.',
  'too-large': 'That amount is too large.',
};

/** What a typed amount means: integer sen, or the words that say what's wrong. */
export function checkAmount(text: string): { sen: number; error?: never } | { sen?: never; error: string } {
  const r = parseSen(text);
  return r.ok ? { sen: r.sen } : { error: MESSAGES[r.reason] };
}

interface MoneyInputProps {
  label: string;
  /** What's typed, kept as text: it becomes sen only through parseSen, never through a float. */
  value: string;
  onChange: (text: string) => void;
  /** Shown under the field when nothing is wrong. */
  hint?: string;
  /** An error from submitting, shown until the text changes. */
  error?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  /** The currency shown before the amount: `RM` unless it's another currency's (a subscription's, D134). */
  prefix?: string;
}

/** The caret stays after the last digit, where the next one enters (D132). */
const toEnd = (el: HTMLInputElement) => {
  const n = el.value.length;
  if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
};

/**
 * The amount in a form (patterns.md §7), typed as a bank app takes it (D132): a number pad, each digit
 * entering from the right with two decimals always shown, the dot and letters ignored. It's kept as
 * text and parsed straight into sen, shown large as it's typed. It checks itself on blur; the form
 * checks again on submit.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  hint,
  error,
  autoFocus,
  onEnter,
  prefix = 'RM',
}: MoneyInputProps) {
  const id = useId();
  const [blurError, setBlurError] = useState<string | undefined>();
  // a form clears its error with '' as you type, so an empty one gives way to the blur check (QA B04 redesign run 3, 7)
  const message = error || blurError;
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-baseline gap-2 border-b-2 border-input pb-1 focus-within:border-ring">
        <span className="text-xl text-muted-foreground" aria-hidden="true">
          {prefix}
        </span>
        <Input
          id={id}
          className={cn(
            'num h-auto min-w-0 flex-1 border-0 bg-transparent px-0 text-4xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent',
          )}
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          placeholder="0.00"
          // a form's own text (`1284.50`, from an amount it already had) shows as typing would show it
          value={typedSen(value)}
          autoFocus={autoFocus}
          aria-invalid={message ? true : undefined}
          aria-describedby={`${id}-msg`}
          onChange={(e) => {
            setBlurError(undefined);
            onChange(typedSen(e.target.value));
            const el = e.target;
            requestAnimationFrame(() => toEnd(el));
          }}
          onPaste={(e) => {
            e.preventDefault();
            setBlurError(undefined);
            onChange(pastedSen(e.clipboardData.getData('text')));
          }}
          onFocus={(e) => toEnd(e.currentTarget)}
          onClick={(e) => toEnd(e.currentTarget)}
          onKeyUp={(e) => toEnd(e.currentTarget)}
          onBlur={() => setBlurError(value.trim() === '' ? undefined : checkAmount(value).error)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.();
          }}
        />
      </div>
      <div id={`${id}-msg`} aria-live="polite">
        {message ? <FieldError>{message}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
      </div>
    </Field>
  );
}
