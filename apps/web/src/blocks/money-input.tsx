import { useId, useState } from 'react';
import { parseSen, type ParseResult } from '@sen/core/money';
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
}

/**
 * The amount in a form (patterns.md §7): a number pad, typed as text and parsed straight into sen,
 * shown large as it's typed. It checks itself on blur; the form checks again on submit.
 */
export function MoneyInput({ label, value, onChange, hint, error, autoFocus, onEnter }: MoneyInputProps) {
  const id = useId();
  const [blurError, setBlurError] = useState<string | undefined>();
  const message = error ?? blurError;
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-baseline gap-2 border-b-2 border-input pb-1 focus-within:border-ring">
        <span className="text-xl text-muted-foreground" aria-hidden="true">
          RM
        </span>
        <Input
          id={id}
          className={cn(
            'num h-auto min-w-0 flex-1 border-0 bg-transparent px-0 text-4xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent',
          )}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          placeholder="0.00"
          value={value}
          autoFocus={autoFocus}
          aria-invalid={message ? true : undefined}
          aria-describedby={`${id}-msg`}
          onChange={(e) => {
            setBlurError(undefined);
            onChange(e.target.value);
          }}
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
