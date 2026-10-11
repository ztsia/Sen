import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator } from '@/components/ui/item';
import type { MemoryView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { useMemory, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `agent/memory` (screens.md, spec §12.2 rule 2): the notes Sen keeps about you, each with *Forget*.
 * Forgetting happens at once, with Undo.
 */
export default function Memory() {
  const q = useMemory();
  return (
    <Screen bar={<AppBar title="What Sen remembers" />}>
      <Loaded q={q} what="what Sen remembers">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: MemoryView }) {
  const write = useWrite();
  if (!v.notes.length)
    return (
      <EmptyState line="Sen hasn't kept any notes about you yet. When you tell it something worth remembering, it shows here." />
    );
  return (
    <div className="flex flex-col pb-4">
      <p className="px-4 pt-1 pb-2 text-sm text-muted-foreground">
        Notes Sen keeps to help you. It never keeps an amount, and forgetting one takes it away.
      </p>
      <ItemGroup>
        {v.notes.map((n, i) => (
          <div key={n.id}>
            {i ? <ItemSeparator /> : null}
            <Item size="sm" className="min-h-16 flex-nowrap rounded-none text-base">
              <ItemContent className="min-w-0 gap-0.5">
                <p className="text-base text-pretty wrap-anywhere select-text">{n.text}</p>
                <ItemDescription>Noted {shortDay(dayOfInstant(n.at))}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Forget: ${n.text}`}
                  onClick={() => void write({ type: 'memory.forget', id: n.id })}
                >
                  Forget
                </Button>
              </ItemActions>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </div>
  );
}
