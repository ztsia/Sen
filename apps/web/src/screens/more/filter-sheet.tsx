import { CheckIcon } from 'lucide-react';
import { Sheet } from '@/blocks/sheet';
import { Item, ItemActions, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';

export interface FilterOption {
  id: string;
  label: string;
}

/** Chooses one value for a filter, or none (`allLabel`): one tap, then the sheet closes. */
export function FilterSheet({
  open,
  onOpenChange,
  title,
  allLabel,
  options,
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  allLabel: string;
  options: FilterOption[];
  current: string | null;
  onPick: (id: string | null) => void;
}) {
  const all: FilterOption[] = [{ id: '', label: allLabel }, ...options];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <ItemGroup className="-mx-4">
        {all.map((o, i) => {
          const on = (o.id || null) === current;
          return (
            <div key={o.id || 'all'}>
              {i ? <ItemSeparator /> : null}
              <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
                <button
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => {
                    onPick(o.id || null);
                    onOpenChange(false);
                  }}
                >
                  <ItemContent>
                    <ItemTitle className="text-base font-normal">{o.label}</ItemTitle>
                  </ItemContent>
                  {on ? (
                    <ItemActions>
                      <CheckIcon className="size-5 text-icon" aria-label="Chosen" />
                    </ItemActions>
                  ) : null}
                </button>
              </Item>
            </div>
          );
        })}
      </ItemGroup>
    </Sheet>
  );
}
