import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { ReceiptView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { NoteSheet } from '@/blocks/note-sheet';
import { SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { useReceipt, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded, Section, useGo, useScreenSearch } from '../kit';

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
      line="This receipt isn't here any more."
      action={{ label: 'Back to Review', onSelect: () => go('review') }}
    />
  );
}

function Line({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-h-12 items-baseline justify-between gap-4 border-b border-border px-4 py-3">
      <dt className={strong ? 'font-semibold' : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'font-semibold' : undefined}>{children}</dd>
    </div>
  );
}

function ReceiptBody({ r }: { r: ReceiptView }) {
  const go = useGo();
  const write = useWrite();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const rc = r.receipt;
  const evidence = rc.status === 'evidence';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 px-4 pt-2">
        <h2 className="text-xl font-semibold wrap-anywhere">{rc.merchantRaw ?? 'Receipt'}</h2>
        <p className="text-sm text-muted-foreground">
          {rc.occurredAt ? momentLabel(new Date(rc.occurredAt)) : 'No date on it'}
          {evidence ? ' · Kept as evidence only' : ''}
        </p>
      </div>

      <Section title="Items">
        <ItemGroup>
          {r.items.map((i, n) => (
            <div key={i.id}>
              {n ? <ItemSeparator /> : null}
              <Item size="sm" className="min-h-14 flex-nowrap rounded-none text-base">
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle
                    className={`text-base wrap-anywhere ${i.kind === 'others' ? 'text-muted-foreground' : ''}`}
                  >
                    {i.kind === 'others' ? "Others' items" : `${i.qty > 1 ? `${i.qty} × ` : ''}${i.description}`}
                  </ItemTitle>
                  {i.kind === 'item' && (i.who || i.category) ? (
                    <ItemDescription>{[i.who, i.category].filter(Boolean).join(' · ')}</ItemDescription>
                  ) : null}
                </ItemContent>
                <Money sen={i.price} className="shrink-0" />
              </Item>
            </div>
          ))}
        </ItemGroup>
        <p className="px-4 pt-1 text-sm text-muted-foreground">Prices include tax and service.</p>
      </Section>

      <dl className="flex flex-col">
        {rc.tax > 0 ? (
          <Line label="Tax">
            <Money sen={rc.tax} />
          </Line>
        ) : null}
        {rc.serviceCharge > 0 ? (
          <Line label="Service">
            <Money sen={rc.serviceCharge} />
          </Line>
        ) : null}
        <Line label="Total" strong>
          <Money sen={rc.total} />
        </Line>
        <Line label="People">{rc.pax}</Line>
      </dl>

      <ItemGroup>
        <SettingsRow label="Note" value={rc.note ?? 'Add a note'} onOpen={() => setNoteOpen(true)} />
        <ItemSeparator />
        {r.payment ? (
          <SettingsRow label="Attached to" value={r.payment.label} onOpen={() => go('txn', { id: r.payment!.id })} />
        ) : (
          <SettingsRow label="Payment" value={evidence ? 'None, evidence only' : 'Waiting for its payment'} />
        )}
        {r.hasPhoto ? (
          <>
            <ItemSeparator />
            <SettingsRow label="View photo" onOpen={() => setPhotoOpen(true)} />
          </>
        ) : null}
        {!evidence ? (
          <>
            <ItemSeparator />
            <SettingsRow
              label="Keep as evidence only"
              onOpen={() => void write({ type: 'receipt.evidence', receiptId: rc.id })}
            />
          </>
        ) : null}
      </ItemGroup>

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
