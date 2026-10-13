import { useState } from 'react';
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  CloudOffIcon,
  InboxIcon,
  ListPlusIcon,
  PencilIcon,
  ReceiptTextIcon,
  ScanLineIcon,
  SearchXIcon,
  ShoppingBagIcon,
  SplitIcon,
  StickyNoteIcon,
  Undo2Icon,
} from 'lucide-react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type { TxnView } from '@sen/core/views';
import { CategorySheet } from '@/blocks/category-sheet';
import { ActionBar, FactGrid, HeaderCard, type BarAction, type GridFact, type MenuAction } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { NoteSheet } from '@/blocks/note-sheet';
import { ListRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { toastDone } from '@/blocks/toast';
import { newId } from '@/lib/uid';
import { startDraft, useCategories, useMe, usePayments, useTxn, useWrite } from '@/data/hooks';
import { AppBar, goBack } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { SenMark } from '@/components/look/avatar';
import { useUi } from '@/frame/ui-store';
import { momentLabel } from '@/lib/dates';
import { readableName } from '@/lib/names';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded, useGo, useScreenSearch } from '../kit';
import { settled } from '@/lib/tap-guard';

/**
 * One payment (screens.md `txn`, D130): a header card with the amount and where it came from, its
 * actions in a bar, its facts in a grid, then what's linked to it. Every change happens at once, with
 * Undo (§6.7).
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
      icon={SearchXIcon}
      title="Not here any more"
      line="This payment was deleted, or the link is old."
      action={{ label: 'See all payments', onSelect: () => go('payments') }}
    />
  );
}

/** A category as a chip-like value: its icon, then its name. */
function CategoryValue({ name }: { name: string | null }) {
  const Icon = categoryIcon(name);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-icon" aria-hidden="true" />
      {name ?? 'Choose one'}
    </span>
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
  const when = momentLabel(new Date(t.occurredAt));
  const where = isTransfer && v.account && v.otherAccount ? `${v.account} → ${v.otherAccount}` : v.account;

  const facts: GridFact[] = [];
  if (hasCategory)
    facts.push({
      label: 'Category',
      value: <CategoryValue name={v.category} />,
      muted: !v.category,
      onSelect: () => setCatOpen(true),
    });
  if (spend)
    facts.push({ label: v.spending === t.amount ? 'Your spending' : 'Your share', value: <Money sen={v.spending} /> });
  if (isTransfer && v.otherAccount) facts.push({ label: t.direction === 'in' ? 'From' : 'To', value: v.otherAccount });
  facts.push({
    label: 'Note',
    value: t.note ?? 'Add a note',
    muted: !t.note,
    wide: facts.length % 2 === 0,
    onSelect: () => setNoteOpen(true),
  });

  const scan = () =>
    // Scan is a tab path, so useGo can't pass it the payment: it reads ?id= as the payment (screens.md)
    void navigate({ to: '/scan', search: { id: t.id } as never });
  const split = () => {
    if (v.split) return go('split', { id: v.split.id });
    // an open split for this payment, then its screen (§7); the id is made here, so a retry is a no-op
    const splitId = newId();
    void write({ type: 'split.start', splitId, txnId: t.id }, { quiet: true }).then(
      (r) => r && go('split', { id: splitId }),
    );
  };

  const actions: BarAction[] = [];
  if (v.receipt)
    actions.push({ icon: ReceiptTextIcon, label: 'Receipt', onSelect: () => go('receipt', { id: v.receipt!.id }) });
  else if (spend && !t.noReceipt) actions.push({ icon: ScanLineIcon, label: 'Scan receipt', onSelect: scan });
  if (spend) actions.push({ icon: SplitIcon, label: 'Split', onSelect: split });
  if (me.data?.agent !== false)
    actions.push({ icon: SenMark, label: 'Ask Sen', onSelect: () => useUi.getState().setSenOpen(true) });

  // *These were two payments* (D88) shows only on a payment a pair rule merged; the made-up scenario
  // has none, so it arrives with B11, which merges them.
  const more: MenuAction[] = [];
  if (spend && !v.receipt && !t.noReceipt) more.push({ label: 'No receipt…', onSelect: () => setNoReceiptOpen(true) });
  more.push({ label: 'Mark as…', onSelect: () => setMarkOpen(true) });
  more.push({
    label: 'Delete',
    destructive: true,
    // a double tap deletes once and goes back once (QA B03 run 2, finding 21)
    onSelect: settled(() => {
      void write({ type: 'txn.delete', id: t.id }).then((r) => {
        if (r) goBack(router);
      });
    }),
  });

  const n = v.receipt?.items ?? 0;
  const linked = v.receipt || v.split || (spend && t.noReceipt) || v.provisional;

  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      {!v.synced ? (
        <p className="flex items-center gap-2 px-4 text-sm text-money-pending" role="status">
          <CloudOffIcon className="size-4 shrink-0" aria-hidden="true" />
          Not synced yet. It syncs when you're back online.
        </p>
      ) : null}
      <HeaderCard
        mark={
          <IconTile
            size="lg"
            icon={isTransfer ? ArrowLeftRightIcon : categoryIcon(v.category)}
            tone={isTransfer ? 'neutral' : categoryTone(v.category)}
          />
        }
        title={readableName(v.title)}
        figure={<Money sen={t.amount} kind={t.direction === 'in' ? 'in' : 'out'} />}
        copy={t.amount}
        meta={where ? `${when} · ${where}` : when}
        source={v.sourceLabel}
      />
      <ActionBar actions={actions} more={more} />
      <FactGrid facts={facts} />

      {linked ? (
        <GroupCard>
          {v.provisional ? (
            <NavRow
              icon={InboxIcon}
              tone="warn"
              title="New wording: is this right?"
              description="Answer in Review"
              onOpen={() => go('review')}
            />
          ) : null}
          {v.receipt ? (
            <NavRow
              icon={ReceiptTextIcon}
              tone="accent"
              title="Receipt"
              value={`${n} ${n === 1 ? 'item' : 'items'}`}
              onOpen={() => go('receipt', { id: v.receipt!.id })}
            />
          ) : spend && t.noReceipt ? (
            <NavRow title="No receipt" value="You said so" />
          ) : null}
          {v.split ? (
            <NavRow
              icon={SplitIcon}
              tone="accent"
              title={`Split · ${v.split.state}`}
              description={v.split.detail}
              onOpen={split}
            />
          ) : null}
        </GroupCard>
      ) : null}

      {v.bank ? (
        <GroupCard label="What the bank said">
          <div className="selectable flex flex-col gap-1 px-4 py-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">{v.bank.app}</p>
            <p className="font-medium">{v.bank.title}</p>
            <p className="wrap-anywhere text-muted-foreground">{v.bank.text}</p>
          </div>
          <NavRow
            icon={PencilIcon}
            title="Correct amount, time or account"
            onOpen={() => toastDone('Correcting arrives with B12')}
          />
        </GroupCard>
      ) : null}

      {v.changes.length ? (
        <GroupCard label="Changes">
          <ul className="flex flex-col gap-2 px-4 py-3">
            {v.changes.map((c) => (
              <li key={`${c.at}-${c.what}`} className="text-sm">
                <span className="text-muted-foreground">{momentLabel(new Date(c.at))}</span> · {c.what},{' '}
                {c.by === 'user' ? 'by you' : c.by === 'agent' ? 'by Sen' : 'automatically'}
              </li>
            ))}
          </ul>
        </GroupCard>
      ) : null}

      <CategorySheet
        open={catOpen}
        onOpenChange={setCatOpen}
        title={`${readableName(v.title)}: which category?`}
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
        <div className="-mx-4 flex flex-col">
          <NavRow
            icon={ListPlusIcon}
            title="Enter the items"
            onOpen={() => {
              setNoReceiptOpen(false);
              void (async () => {
                await write({ type: 'txn.no-receipt', id: t.id }, { quiet: true });
                go('confirm', { id: await startDraft(null, t.id, true) });
              })();
            }}
          />
          <NavRow
            icon={StickyNoteIcon}
            title="Just a note"
            onOpen={() => {
              setNoReceiptOpen(false);
              void write({ type: 'txn.no-receipt', id: t.id }).then(() => setNoteOpen(true));
            }}
          />
        </div>
      </Sheet>
      <MarkAsSheet open={markOpen} onOpenChange={setMarkOpen} v={v} />
    </div>
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
        <div className="-mx-4 flex flex-col">
          {t.direction === 'in' ? (
            <NavRow icon={ArrowDownLeftIcon} title="Income" onOpen={() => mark('income')} />
          ) : null}
          <NavRow icon={ArrowLeftRightIcon} title="Transfer" onOpen={() => mark('transfer')} />
          {/* a refund is money in (§7, D21); money out is never one (QA B03 run 3, 28) */}
          {t.direction === 'in' ? (
            <NavRow icon={Undo2Icon} title="Refund of…" onOpen={() => setStep('refund')} />
          ) : null}
          {t.kind !== 'spend' && t.direction === 'out' ? (
            <NavRow icon={ShoppingBagIcon} title="A normal payment" onOpen={() => mark('spend')} />
          ) : null}
        </div>
      ) : (
        <div className="-mx-4 flex flex-col">
          {purchases.slice(0, 30).map((x) => (
            <ListRow
              key={x.id}
              icon={categoryIcon(x.category)}
              tone={categoryTone(x.category)}
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
        </div>
      )}
    </Sheet>
  );
}
