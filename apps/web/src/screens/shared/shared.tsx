import { SplitIcon } from 'lucide-react';
import type { SharedView } from '@sen/core/views';
import { EmptyState } from '@/blocks/states';
import { ListRow } from '@/blocks/rows';
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
        <ListRow
          key={r.id}
          icon={SplitIcon}
          title={r.merchant}
          secondary={`${shortDay(dayOfInstant(r.at))} · ${r.line}`}
          sen={r.sen}
          onOpen={() => go('split', { id: r.id })}
        />
      ))}
    </div>
  );
}
