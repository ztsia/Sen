import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Sheet } from './sheet';

/**
 * *Add a note* (D90): a small sheet with one field, on any payment or receipt. Searchable, marked in
 * lists, and it never changes a rule. What's typed stays while the sheet is open.
 */
export function NoteSheet({
  open,
  onOpenChange,
  note,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string | null;
  onSave: (note: string | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(note ?? '');
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setText(note ?? '');
        onOpenChange(o);
      }}
      title={note ? 'Edit the note' : 'Add a note'}
    >
      <form
        className="flex flex-col gap-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(text.trim() ? text.trim() : null);
          onOpenChange(false);
        }}
      >
        <Field>
          <FieldLabel htmlFor={id}>Note</FieldLabel>
          <Textarea
            id={id}
            autoFocus
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Waiting for the receipt by email"
            className="selectable"
          />
          <FieldDescription>Only you see it. Search finds it.</FieldDescription>
        </Field>
        <Button type="submit" size="lg">
          Save
        </Button>
      </form>
    </Sheet>
  );
}
