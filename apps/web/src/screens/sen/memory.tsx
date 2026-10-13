import { useUi } from '@/frame/ui-store';
import { BrainIcon, Trash2Icon } from 'lucide-react';
import type { MemoryView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMemory, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * `agent/memory` (screens.md, spec §12.2 rule 2): the notes Sen keeps about you, one card each, with a
 * Forget button. Forgetting happens at once, with Undo.
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
      <EmptyState
        icon={BrainIcon}
        title="No notes yet"
        line="When you tell Sen something worth remembering, it shows here."
        action={{ label: 'Ask Sen', onSelect: () => useUi.getState().setSenOpen(true) }}
      />
    );
  return (
    <div className="flex flex-col gap-4 pt-1 pb-4">
      <p className="px-4 text-sm text-muted-foreground">
        Notes Sen keeps to help you. It never keeps an amount, and forgetting one takes it away.
      </p>
      <ul className="flex flex-col gap-2 px-4">
        {v.notes.map((n) => (
          <li key={n.id}>
            <Card className="gap-0 py-0">
              <div className="flex min-h-16 items-center gap-3 py-2 pr-2 pl-4">
                <IconTile icon={BrainIcon} tone="accent" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-base text-pretty wrap-anywhere select-text">{n.text}</p>
                  <p className="text-sm text-muted-foreground">Noted {shortDay(dayOfInstant(n.at))}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Forget: ${n.text}`}
                  onClick={() => void write({ type: 'memory.forget', id: n.id })}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
