import { useState, type ReactNode } from 'react';
import { ChevronRightIcon, CloudOffIcon } from 'lucide-react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type { TxnView } from '@sen/core/views';
import { CategorySheet } from '@/blocks/category-sheet';
import { DetailPage, type DetailAction, type Fact } from '@/blocks/detail';
import { Money } from '@/blocks/money';
import { NoteSheet } from '@/blocks/note-sheet';
import { ListRow, SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { startDraft, useCategories, useMe, usePayments, useTxn, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useUi } from '@/frame/ui-store';
import { momentLabel } from '@/lib/dates';
import { categoryIcon } from '../icons';
import { Loaded, useGo, useScreenSearch } from '../kit';
import { settled } from '@/lib/tap-guard';

/**
 * One payment (screens.md `txn`): the amount, where it came from, and everything you can do to it.
 * Every change happens at once, with Undo (§6.7).
 */
export default function Txn() {
  const { id } = useScreenSearch();
  const q = useTxn(id ?? '');
  return (
    <Screen bar={<AppBar title="Payment" />}>
      {id ? (
        <Loaded q={q} what="this payment">
          {(v) => (v ? <TxnBody v={v} /> : <Gone />)}
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
      line="This payment isn't here any more."
      action={{ label: 'See all payments', onSelect: () => go('payments') }}
    />
  );
}

/** A value in a fact row that opens a sheet or a screen: at least 48 px tall, with a chevron. */
function FactButton({ onClick, muted, children }: { onClick: () => void; muted?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-my-3 inline-flex min-h-12 items-center gap-1 text-right ${muted ? 'text-muted-foreground' : ''}`}
    >
      <span className="wrap-anywhere">{children}</span>
      <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" />
    </button>
  );
}

function TxnBody({ v }: { v: TxnView }) {
  const go = useGo();
  const navigate = useNavigate();
  const router = useRouter();
  const write = useWrite();
  const me = useMe();
  const t = v.txn;
  const cats = useCategories(t.direction === 'in' ? 'income' : 'spend');
  const [catOpen, setCatOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noReceiptOpen, setNoReceiptOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);

  const isTransfer = t.kind === 'transfer';
  const spend = t.kind === 'spend' && t.direction === 'out';
  const hasCategory = !isTransfer && (t.kind === 'spend' || t.kind === 'income' || t.direction === 'in');

  const facts: Fact[] = [
    { label: isTransfer ? 'Transfer' : t.direction === 'in' ? 'From' : 'Merchant', value: v.title },
    { label: 'When', value: momentLabel(new Date(t.occurredAt)) },
    ...(v.account ? [{ label: 'Account', value: v.account }] : []),
    ...(v.otherAccount ? [{ label: 'Other account', value: v.otherAccount }] : []),
    ...(hasCategory
      ? [
          {
            label: 'Category',
            value: (
              <FactButton onClick={() => setCatOpen(true)} muted={!v.category}>
                {v.category ?? 'No category yet'}
              </FactButton>
            ),
          },
        ]
      : []),
    ...(spend
      ? [
          {
            label: 'Your spending',
            value:
              v.spending === t.amount ? (
                <Money sen={v.spending} />
              ) : (
                <>
                  <Money sen={v.spending} /> <span className="text-muted-foreground">your share</span>
                </>
              ),
          },
        ]
      : []),
    {
      label: 'Note',
      value: (
        <FactButton onClick={() => setNoteOpen(true)} muted={!t.note}>
          {t.note ?? 'Add a note'}
        </FactButton>
      ),
    },
    ...(spend && t.noReceipt ? [{ label: 'Receipt', value: 'None, you said so' }] : []),
  ];

  const actions: DetailAction[] = [];
  if (v.receipt) {
    const n = v.receipt.items;
    actions.push({
      label: `Receipt · ${n} ${n === 1 ? 'item' : 'items'}`,
      onSelect: () => go('receipt', { id: v.receipt!.id }),
    });
  } else if (spend && !t.noReceipt) {
    actions.push({
      label: 'Scan the receipt',
      // Scan is a tab path, so useGo can't pass it the payment: it reads ?id= as the payment (screens.md)
      onSelect: () => void navigate({ to: '/scan', search: { id: t.id } as never }),
    });
    actions.push({ label: 'No receipt…', onSelect: () => setNoReceiptOpen(true) });
  }
  if (spend) {
    // "These were two payments" (D88) shows only for a merged payment, and none exists in the scenario.
    actions.push(
      v.split
        ? { label: `Split · ${v.split.state}. ${v.split.detail}`, onSelect: () => go('split', { id: v.split!.id }) }
        : { label: 'Split', onSelect: () => go('split', { id: t.id }) },
    );
  }
  if (v.provisional) actions.push({ label: 'New wording: right? Answer in Review', onSelect: () => go('review') });
  if (me.data?.agent !== false)
    actions.push({ label: 'Ask Sen about this', onSelect: () => useUi.getState().setSenOpen(true) });
  // *These were two payments* (D88) shows only on a payment a pair rule merged; the made-up scenario
  // has none, so it arrives with B11, which merges them.
  actions.push({ label: 'Mark as…', onSelect: () => setMarkOpen(true) });
  actions.push({
    label: 'Delete',
    destructive: true,
    // a double tap deletes once and goes back once (QA B03 run 2, finding 21)
    onSelect: settled(() => {
      void write({ type: 'txn.delete', id: t.id }).then((r) => {
        if (r) router.history.back();
      });
    }),
  });

  return (
    <>
      {!v.synced ? (
        <p className="flex items-center gap-2 px-4 pt-2 text-sm text-money-pending" role="status">
          <CloudOffIcon className="size-4 shrink-0" aria-hidden="true" />
          Not synced yet. It syncs when you're back online.
        </p>
      ) : null}
      <DetailPage
        sen={t.amount}
        kind={t.direction === 'in' ? 'in' : 'out'}
        source={v.sourceLabel}
        facts={facts}
        actions={actions}
      />

      {v.bank ? (
        <section className="flex flex-col gap-2 px-4 pt-6" aria-label="What the bank said">
          <h2 className="text-sm font-semibold text-muted-foreground">What the bank said</h2>
          <div className="selectable flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium">{v.bank.app}</p>
            <p className="text-foreground">{v.bank.title}</p>
            <p className="wrap-anywhere">{v.bank.text}</p>
          </div>
          <div className="-mx-4">
            <SettingsRow
              label="Correct amount, time or account"
              onOpen={() => toastDone('Correcting arrives with B12')}
            />
          </div>
        </section>
      ) : null}

      {v.changes.length ? (
        <section className="flex flex-col gap-1 px-4 pt-6" aria-label="Changes">
          <h2 className="text-sm font-semibold text-muted-foreground">Changes</h2>
          <ul className="flex flex-col gap-2">
            {v.changes.map((c) => (
              <li key={`${c.at}-${c.what}`} className="text-sm">
                <span className="text-muted-foreground">{momentLabel(new Date(c.at))}</span> · {c.what},{' '}
                {c.by === 'user' ? 'by you' : c.by === 'agent' ? 'by Sen' : 'automatically'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CategorySheet
        open={catOpen}
        onOpenChange={setCatOpen}
        title={`${v.title}: which category?`}
        choices={cats.data ?? []}
        current={t.categoryId}
        askScope={v.fromRule}
        merchant={v.title}
        onChoose={(categoryId, scope) => void write({ type: 'txn.category', id: t.id, categoryId, scope })}
      />
      <NoteSheet
        open={noteOpen}
        onOpenChange={setNoteOpen}
        note={t.note}
        onSave={(note) => void write({ type: 'txn.note', id: t.id, note })}
      />
      <Sheet open={noReceiptOpen} onOpenChange={setNoReceiptOpen} title="No receipt?">
        <ItemGroup className="-mx-4">
          <ChoiceRow
            label="Enter the items"
            onSelect={() => {
              setNoReceiptOpen(false);
              void (async () => {
                await write({ type: 'txn.no-receipt', id: t.id }, { quiet: true });
                go('confirm', { id: await startDraft(null, t.id, true) });
              })();
            }}
          />
          <ItemSeparator />
          <ChoiceRow
            label="Just a note"
            onSelect={() => {
              setNoReceiptOpen(false);
              void write({ type: 'txn.no-receipt', id: t.id }).then(() => setNoteOpen(true));
            }}
          />
        </ItemGroup>
      </Sheet>
      <MarkAsSheet open={markOpen} onOpenChange={setMarkOpen} v={v} />
    </>
  );
}

function ChoiceRow({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
      <button type="button" onClick={onSelect}>
        <ItemContent>
          <ItemTitle className="text-base font-normal">{label}</ItemTitle>
        </ItemContent>
      </button>
    </Item>
  );
}

/** *Mark as…*: what else this payment is. *Refund of…* then asks which purchase. */
function MarkAsSheet({ open, onOpenChange, v }: { open: boolean; onOpenChange: (o: boolean) => void; v: TxnView }) {
  const write = useWrite();
  const [step, setStep] = useState<'kind' | 'refund'>('kind');
  const t = v.txn;
  const recent = usePayments({});
  const purchases = (recent.data?.rows ?? []).filter(
    (x) => x.direction === 'out' && x.kind === 'spend' && x.id !== t.id,
  );
  const close = (o: boolean) => {
    if (!o) setStep('kind');
    onOpenChange(o);
  };
  const mark = (kind: 'income' | 'transfer' | 'spend', linked: string | null = null) => {
    void write({ type: 'txn.kind', id: t.id, kind, linkedTransactionId: linked, otherAccountId: null });
    close(false);
  };
  return (
    <Sheet open={open} onOpenChange={close} title={step === 'kind' ? 'Mark this as…' : 'A refund of which payment?'}>
      {step === 'kind' ? (
        <ItemGroup className="-mx-4">
          {t.direction === 'in' ? <ChoiceRow label="Income" onSelect={() => mark('income')} /> : null}
          {t.direction === 'in' ? <ItemSeparator /> : null}
          <ChoiceRow label="Transfer" onSelect={() => mark('transfer')} />
          {/* a refund is money in (§7, D21); money out is never one (QA B03 run 3, 28) */}
          {t.direction === 'in' ? (
            <>
              <ItemSeparator />
              <ChoiceRow label="Refund of…" onSelect={() => setStep('refund')} />
            </>
          ) : null}
          {t.kind !== 'spend' && t.direction === 'out' ? (
            <>
              <ItemSeparator />
              <ChoiceRow label="A normal payment" onSelect={() => mark('spend')} />
            </>
          ) : null}
        </ItemGroup>
      ) : (
        <ItemGroup className="-mx-4">
          {purchases.slice(0, 30).map((x) => (
            <ListRow
              key={x.id}
              icon={categoryIcon(x.category)}
              title={x.title}
              secondary={`${x.category ?? ''} · ${momentLabel(new Date(x.at))}`}
              sen={x.amount}
              onOpen={() => {
                void write({
                  type: 'txn.kind',
                  id: t.id,
                  kind: 'refund',
                  linkedTransactionId: x.id,
                  otherAccountId: null,
                });
                close(false);
              }}
            />
          ))}
        </ItemGroup>
      )}
    </Sheet>
  );
}
