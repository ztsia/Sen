import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemTitle } from '@/components/ui/item';
import { checkAmount, MoneyInput } from '@/blocks/money-input';

/**
 * A row that is information with something to do under it (patterns.md §7): a title and a line, then
 * its buttons. Not a SettingsRow, which is one control.
 */
export function ActionRow({
  title,
  line,
  value,
  children,
}: {
  title: string;
  line?: ReactNode;
  /** The state on the right, in words. */
  value?: string;
  children?: ReactNode;
}) {
  return (
    <Item size="sm" className="min-h-14 rounded-none text-base">
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="text-base font-normal wrap-anywhere">{title}</ItemTitle>
        {line ? <ItemDescription className="text-sm">{line}</ItemDescription> : null}
      </ItemContent>
      {value ? (
        <ItemActions className="max-w-[45%] text-right text-sm text-muted-foreground">{value}</ItemActions>
      ) : null}
      {children ? <ItemFooter className="flex-wrap justify-start">{children}</ItemFooter> : null}
    </Item>
  );
}

/** An amount typed as text, with the button that saves it: parsed to sen only by parseSen (money rule). */
export function AmountEditor({
  label,
  initial,
  action,
  hint,
  onSave,
}: {
  label: string;
  /** Ringgit as text, such as "2.00". */
  initial: string;
  action: string;
  hint?: string;
  onSave: (sen: number) => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const save = () => {
    const r = checkAmount(text);
    if (r.error !== undefined) return setError(r.error);
    setError(undefined);
    onSave(r.sen);
  };
  return (
    <div className="flex flex-col gap-2">
      <MoneyInput
        label={label}
        value={text}
        onChange={(t) => {
          setError(undefined);
          setText(t);
        }}
        error={error}
        hint={hint}
        onEnter={save}
      />
      <Button variant="secondary" className="self-start" onClick={save}>
        {action}
      </Button>
    </div>
  );
}
