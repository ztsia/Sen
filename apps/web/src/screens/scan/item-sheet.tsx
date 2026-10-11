import { useId, useState } from 'react';
import { formatSen } from '@sen/core/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { Sheet } from '@/blocks/sheet';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { DraftItem } from './receipt-math';

/** Fixing one item: its words and its printed amount. Tax and service are spread in again afterwards. */
export function ItemSheet({
  open,
  onOpenChange,
  item,
  onSave,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DraftItem | null;
  onSave: (id: string, description: string, amount: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Fix this item">
      {item ? <ItemForm item={item} onSave={onSave} onRemove={onRemove} done={() => onOpenChange(false)} /> : null}
    </Sheet>
  );
}

function ItemForm({
  item,
  onSave,
  onRemove,
  done,
}: {
  item: DraftItem;
  onSave: (id: string, description: string, amount: number) => void;
  onRemove: (id: string) => void;
  done: () => void;
}) {
  const id = useId();
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(formatSen(item.amount).replace('RM', '').replaceAll(',', ''));
  const [error, setError] = useState<string | undefined>();
  const submit = () => {
    const r = checkAmount(amount);
    if (r.error !== undefined) return setError(r.error);
    onSave(item.id, description.trim() || item.description, r.sen);
    done();
  };
  return (
    <form
      className="flex flex-col gap-4 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>What it is</FieldLabel>
        <Input
          id={id}
          value={description}
          enterKeyHint="next"
          autoComplete="off"
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <MoneyInput
        label="Price printed on the receipt"
        value={amount}
        error={error}
        onChange={(t) => {
          setError(undefined);
          setAmount(t);
        }}
        onEnter={submit}
        hint="Before tax and service."
      />
      <Button type="submit" size="lg">
        Save
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        onClick={() => {
          onRemove(item.id);
          done();
        }}
      >
        Remove this item
      </Button>
    </form>
  );
}
