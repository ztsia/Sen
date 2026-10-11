import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { Sheet } from './sheet';

export interface CategoryChoice {
  id: string;
  label: string;
}

/**
 * The category sheet (§6.4, D89): every category, most used first, one tap to choose. Review's
 * *Other…*, a payment's category row and `confirm`'s category row all open this one. When the category
 * came from a merchant's rule, it then asks *Just this one* or *From now on* (D25); a first answer
 * makes the rule and doesn't ask.
 */
export function CategorySheet({
  open,
  onOpenChange,
  title,
  choices,
  current,
  askScope,
  merchant,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  choices: CategoryChoice[];
  current?: string | null;
  askScope?: boolean;
  merchant?: string | null;
  onChoose: (id: string, scope: 'once' | 'rule') => void;
}) {
  const [picked, setPicked] = useState<CategoryChoice | null>(null);
  const close = (o: boolean) => {
    if (!o) setPicked(null);
    onOpenChange(o);
  };
  const choose = (c: CategoryChoice) => {
    if (askScope && c.id !== current) setPicked(c);
    else {
      onChoose(c.id, askScope ? 'once' : 'rule');
      close(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={close} title={picked ? `${picked.label}: just this one?` : title}>
      {picked ? (
        <div className="flex flex-col gap-3 pt-2 pb-2">
          <p className="text-muted-foreground">
            {merchant ?? 'This merchant'} is filed by a rule. Change only this payment, or every one from now on? Past
            payments stay as they are.
          </p>
          <Button
            size="lg"
            onClick={() => {
              onChoose(picked.id, 'rule');
              close(false);
            }}
          >
            From now on
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              onChoose(picked.id, 'once');
              close(false);
            }}
          >
            Just this one
          </Button>
        </div>
      ) : (
        <ItemGroup className="-mx-4">
          {choices.map((c, i) => (
            <div key={c.id}>
              {i ? <ItemSeparator /> : null}
              <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
                <button type="button" onClick={() => choose(c)} aria-current={c.id === current ? 'true' : undefined}>
                  <ItemContent>
                    <ItemTitle className="text-base font-normal">{c.label}</ItemTitle>
                  </ItemContent>
                  {c.id === current ? (
                    <ItemActions>
                      <CheckIcon className="size-5 text-icon" aria-label="Current" />
                    </ItemActions>
                  ) : null}
                </button>
              </Item>
            </div>
          ))}
        </ItemGroup>
      )}
    </Sheet>
  );
}
