import { readableName } from '@/lib/names';
import { useState } from 'react';
import { ArchiveIcon, ImageIcon, LinkIcon, ReceiptTextIcon, StickyNoteIcon } from 'lucide-react';
import type { ReceiptView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { NoteSheet } from '@/blocks/note-sheet';
import { FactGrid, HeaderCard, type GridFact } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { IconTile } from '@/blocks/tile';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Card } from '@/components/ui/card';
import { useReceipt, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded, useGo, useScreenSearch } from '../kit';

/**
 * A digitised receipt (screens.md `receipt`): its items with prices (tax and service included, D66),
 * the totals, and the payment it belongs to.
 */
export default function Receipt() {
  const { id } = useScreenSearch();
  const q = useReceipt(id ?? '');
  return (
    <Screen bar={<AppBar title="Receipt" />}>
      {id ? (
        <Loaded q={q} what="this receipt">
          {(r) => (r ? <ReceiptBody r={r} /> : <Gone />)}
        </Loaded>
      ) : (
        <Gone />
      )}
    </Screen>
  );
}

function Gone() {
  const go = useGo();
  return (
    <EmptyState
      icon={ReceiptTextIcon}
      title="Not here any more"
      line="This receipt isn't here any more."
      action={{ label: 'Back to Review', onSelect: () => go('review') }}
    />
  );
}

function ReceiptBody({ r }: { r: ReceiptView }) {
  const go = useGo();
  const write = useWrite();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const rc = r.receipt;
  const evidence = rc.status === 'evidence';

  const facts: GridFact[] = [];
  if (rc.tax > 0) facts.push({ label: 'Tax', value: <Money sen={rc.tax} className="font-normal" /> });
  if (rc.serviceCharge > 0)
    facts.push({ label: 'Service', value: <Money sen={rc.serviceCharge} className="font-normal" /> });
  facts.push({ label: 'Total', value: <Money sen={rc.total} className="font-semibold" /> });
  facts.push({ label: 'People', value: rc.pax });

  return (
    <div className="flex flex-col gap-5 pt-2 pb-8">
      <HeaderCard
        mark={<IconTile size="lg" icon={ReceiptTextIcon} tone="accent" />}
        title={rc.merchantRaw ? readableName(rc.merchantRaw) : 'Receipt'}
        meta={rc.occurredAt ? momentLabel(new Date(rc.occurredAt)) : 'No date on it'}
        source={evidence ? 'Kept as evidence only' : undefined}
      />

      {r.hasPhoto ? (
        <Card className="mx-4 p-0">
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            className="flex min-h-20 items-center gap-3 rounded-[var(--radius-card,16px)] p-3 text-left"
          >
            <span
              className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-muted"
              aria-hidden="true"
            >
              <ImageIcon className="size-5 text-icon" />
            </span>
            <span className="text-base">View photo</span>
          </button>
        </Card>
      ) : null}

      <GroupCard label="Items" footer="Prices include tax and service.">
        {r.items.map((i) => {
          const others = i.kind === 'others';
          return (
            <NavRow
              key={i.id}
              icon={others ? undefined : categoryIcon(i.category)}
              tone={others ? undefined : categoryTone(i.category)}
              title={
                <span className={`wrap-anywhere ${others ? 'text-muted-foreground' : ''}`}>
                  {others ? "Others' items" : `${i.qty > 1 ? `${i.qty} × ` : ''}${i.description}`}
                </span>
              }
              description={
                i.kind === 'item' && (i.who || i.category) ? [i.who, i.category].filter(Boolean).join(' · ') : undefined
              }
              trailing={<Money sen={i.price} className="font-normal text-foreground" />}
            />
          );
        })}
      </GroupCard>

      <FactGrid facts={facts} />

      <GroupCard>
        <NavRow icon={StickyNoteIcon} title="Note" value={rc.note ?? 'Add a note'} onOpen={() => setNoteOpen(true)} />
        {r.payment ? (
          <NavRow
            icon={LinkIcon}
            tone="accent"
            title="Attached to"
            value={r.payment.label}
            onOpen={() => go('txn', { id: r.payment!.id })}
          />
        ) : (
          <NavRow
            icon={LinkIcon}
            title="Payment"
            value={evidence ? 'None, evidence only' : 'Waiting for its payment'}
          />
        )}
        {!evidence ? (
          <NavRow
            icon={ArchiveIcon}
            title="Keep as evidence only"
            onOpen={() => void write({ type: 'receipt.evidence', receiptId: rc.id })}
          />
        ) : null}
      </GroupCard>

      <NoteSheet
        open={noteOpen}
        onOpenChange={setNoteOpen}
        note={rc.note}
        onSave={(note) => void write({ type: 'receipt.note', receiptId: rc.id, note })}
      />
      <Sheet open={photoOpen} onOpenChange={setPhotoOpen} title="The receipt's photo">
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
          <ImageIcon className="size-8 text-icon" aria-hidden="true" />
          <p>The photo shows here</p>
        </div>
      </Sheet>
    </div>
  );
}
