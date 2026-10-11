import { ChevronRightIcon, SplitIcon } from 'lucide-react';
import type { SharedView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { RowMarkIcon } from '@/blocks/rows';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useShared } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { dayOfInstant, shortDay } from '@/lib/dates';
import { Loaded, Section, useGo } from '../kit';

/** `shared` (screens.md): every split, open ones first. A row opens `split`. */
export default function Shared() {
  const q = useShared();
  const go = useGo();
  return (
    <Screen bar={<AppBar title="Shared bills" />}>
      <Loaded q={q} what="your shared bills">
        {(v) =>
          v.rows.length ? (
            <Lists rows={v.rows} />
          ) : (
            <EmptyState
              line="No shared bills yet. Open a payment and tap Split to share it."
              action={{ label: 'See all payments', onSelect: () => go('payments') }}
            />
          )
        }
      </Loaded>
    </Screen>
  );
}

function Lists({ rows }: { rows: SharedView['rows'] }) {
  const open = rows.filter((r) => r.open);
  const settled = rows.filter((r) => !r.open);
  return (
    <div className="flex flex-col pb-4">
      {open.length ? (
        <Section title="Open">
          <Rows rows={open} />
        </Section>
      ) : null}
      {settled.length ? (
        <Section title="Settled">
          <Rows rows={settled} />
        </Section>
      ) : null}
    </div>
  );
}

function Rows({ rows }: { rows: SharedView['rows'] }) {
  const go = useGo();
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        // a list row (blocks/rows.tsx) without an amount: what is owed is in its second line
        <Item
          key={r.id}
          asChild
          size="sm"
          className="min-h-16 w-full flex-nowrap rounded-none text-left text-base active:bg-accent"
        >
          <button type="button" onClick={() => go('split', { id: r.id })}>
            <RowMarkIcon icon={SplitIcon} />
            <ItemContent className="min-w-0 gap-0">
              <ItemTitle className="block w-full truncate text-base">{r.merchant}</ItemTitle>
              <ItemDescription className="text-sm text-pretty">{r.line}</ItemDescription>
            </ItemContent>
            <ItemActions className="shrink-0 text-sm text-muted-foreground">
              {shortDay(dayOfInstant(r.at))}
              <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
            </ItemActions>
          </button>
        </Item>
      ))}
    </div>
  );
}
