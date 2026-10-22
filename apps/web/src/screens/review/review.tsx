import { readableName } from '@/lib/names';
import { useState } from 'react';
import {
  BellOffIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SparklesIcon,
  SplitIcon,
  TagsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Command } from '@sen/core/commands';
import type { ReviewItem, ReviewView } from '@sen/core/views';
import { CategorySheet } from '@/blocks/category-sheet';
import { Money } from '@/blocks/money';
import { GroupCard, NavRow } from '@/blocks/group';
import { ListRow, ReviewRow, type ReviewAnswer } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { toastUndo } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { runCommand, useCategories, usePayments, useReview } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { longDay, momentLabel } from '@/lib/dates';
import { categoryIcon, categoryTone } from '../icons';
import { Loaded, Section, useGo } from '../kit';
import { settleTap } from '@/lib/tap-guard';
import { rowMotion, useChangeMotion } from '@/frame/motion';

/**
 * Review (screens.md, D72, §6.6): what needs me, and what am I waiting for? *Needs you* is counted in
 * the tab's badge; *Waiting on others* isn't, because there's nothing to do yet.
 */
export default function Review() {
  const q = useReview();
  return (
    <Screen bar={<AppBar title="Review" />} senRoom>
      <Loaded q={q} what="Review">
        {(r) => <ReviewBody r={r} />}
      </Loaded>
    </Screen>
  );
}

const run = (cmd: Command) => runCommand(cmd);

function ReviewBody({ r: data }: { r: ReviewView }) {
  // a cleared row slides out and the rest close up (patterns.md §8)
  const r = useChangeMotion(data);
  const go = useGo();
  const [other, setOther] = useState<{ txnId: string; merchant: string } | null>(null);
  const [refundFor, setRefundFor] = useState<{ txnId: string; from: string } | null>(null);
  const [attach, setAttach] = useState<{ receiptId: string; merchant: string; total: number } | null>(null);
  const cats = useCategories();
  const suggested = r.needsYou.filter((i) => i.suggested);

  const [applying, setApplying] = useState(false);
  const applyAll = async () => {
    // once per double tap, and not again while it's applying (QA B03 run 2, finding 17)
    if (applying || !settleTap()) return;
    setApplying(true);
    const undos: (() => void)[] = [];
    for (const i of suggested) {
      const a = answersFor(i, { go, setOther, setRefundFor }).find((x) => x.key === i.suggested);
      const res = a ? await Promise.resolve(a.onSelect()) : null;
      if (res) undos.push(res.undo);
    }
    setApplying(false);
    toastUndo(`Applied ${undos.length} of Sen's answers`, () => undos.reverse().forEach((u) => u()));
  };

  const kinds = KINDS.map((k) => ({ ...k, items: r.needsYou.filter((i) => k.of.includes(i.kind)) })).filter(
    (k) => k.items.length,
  );
  const hasWaiting = r.waiting.splits.length || r.waiting.receipts.length || r.waiting.refunds.length;

  return (
    <>
      {suggested.length ? (
        <div
          className="mx-4 mt-2 flex flex-wrap items-center gap-3 rounded-[var(--radius-card,16px)] bg-primary/10 py-2 pr-2 pl-3"
          role="status"
        >
          <SparklesIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {/* 10rem of words first: at large text the button wraps below instead of over them (lived-in, 200%) */}
          <p className="min-w-0 flex-1 basis-40 text-sm">
            Sen suggested {suggested.length === 1 ? 'an answer' : `${suggested.length} answers`}, marked below.
          </p>
          <Button size="sm" className="ml-auto" aria-disabled={applying || undefined} onClick={() => void applyAll()}>
            Apply all
          </Button>
        </div>
      ) : null}

      <Section title={`Needs you · ${r.needsYou.length}`}>
        {r.needsYou.length ? (
          <div className="flex flex-col gap-5 px-4">
            {kinds.map((k) => (
              <div key={k.title} className="flex flex-col gap-2">
                <h3
                  className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground"
                  {...rowMotion(`kind-${k.title}`)}
                >
                  <k.icon className="size-4 text-icon" aria-hidden="true" />
                  {k.title} · {k.items.length}
                </h3>
                {k.items.map((i) => (
                  <div key={i.id} data-review={i.kind} {...rowMotion(i.id)}>
                    <ReviewEntry item={i} go={go} setOther={setOther} setRefundFor={setRefundFor} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCheckIcon} title="All clear" line="Nothing needs you." />
        )}
      </Section>

      {hasWaiting ? (
        <Section title="Waiting on others">
          <div className="flex flex-col gap-2 px-4">
            {r.waiting.splits.length || r.waiting.refunds.length ? (
              <Card className="gap-0 divide-y divide-border overflow-hidden py-0">
                {r.waiting.splits.map((s) => (
                  <ListRow
                    key={s.splitId}
                    icon={SplitIcon}
                    title={s.bill}
                    // what's still to come is the row's amount, so the line under it fits (QA B04 redesign run 3, 4)
                    secondary={s.people}
                    sen={s.of - s.back}
                    onOpen={() => go('split', { id: s.splitId })}
                  />
                ))}
                {r.waiting.refunds.map((x) => (
                  <Item key={x.id} size="sm" className="min-h-16 flex-nowrap gap-3 rounded-none">
                    <ItemContent className="min-w-0">
                      <ItemTitle className="text-base">{readableName(x.counterparty)} refund</ItemTitle>
                      <ItemDescription>Sen is watching for it, by {longDay(x.by)}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Money sen={x.amount} kind="in" />
                    </ItemActions>
                  </Item>
                ))}
              </Card>
            ) : null}
            {r.waiting.receipts.map((x) => (
              <ReviewRow
                key={x.receiptId}
                question={
                  <>
                    <Money sen={x.total} className="font-semibold" /> · {readableName(x.merchant)} receipt
                  </>
                }
                knows={`Waiting for its payment · ${momentLabel(new Date(x.at))}`}
                answers={[
                  {
                    label: 'Attach to a payment…',
                    onSelect: () => setAttach({ receiptId: x.receiptId, merchant: x.merchant, total: x.total }),
                  },
                  { label: 'Evidence only', onSelect: () => run({ type: 'receipt.evidence', receiptId: x.receiptId }) },
                  { label: 'Enter the payment', onSelect: () => go('manual', { id: x.receiptId }) },
                ]}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <div className="mt-6">
        <GroupCard>
          <NavRow icon={PlusIcon} tone="accent" title="Missing a payment?" value="Add it" onOpen={() => go('manual')} />
          {r.capture ? (
            <NavRow
              icon={BellOffIcon}
              title="Skipped notifications"
              value={String(r.skipped)}
              onOpen={() => go('skipped')}
            />
          ) : null}
        </GroupCard>
      </div>

      <CategorySheet
        open={!!other}
        onOpenChange={(o) => !o && setOther(null)}
        title={other ? `${other.merchant}: which category?` : 'Category'}
        choices={cats.data ?? []}
        onChoose={(categoryId) => {
          if (!other) return;
          void run({ type: 'txn.category', id: other.txnId, categoryId, scope: 'rule' }).then((x) =>
            toastUndo(x.said, x.undo),
          );
        }}
      />
      <PaymentPicker
        open={!!refundFor}
        title="A refund of which payment?"
        merchant={refundFor?.from}
        onClose={() => setRefundFor(null)}
        onPick={(id) => {
          if (!refundFor) return;
          void run({
            type: 'txn.kind',
            id: refundFor.txnId,
            kind: 'refund',
            linkedTransactionId: id,
            otherAccountId: null,
          }).then((x) => toastUndo(x.said, x.undo));
        }}
      />
      <PaymentPicker
        open={!!attach}
        title="Attach to which payment?"
        merchant={attach?.merchant}
        amount={attach?.total}
        onClose={() => setAttach(null)}
        onPick={(id) => {
          if (!attach) return;
          void run({ type: 'receipt.attach', receiptId: attach.receiptId, txnId: id }).then((x) =>
            toastUndo(x.said, x.undo),
          );
        }}
      />
    </>
  );
}

/** The kinds of question, in the order they're asked (D130): a header with an icon, then a card each. */
const KINDS: { title: string; icon: LucideIcon; of: ReviewItem['kind'][] }[] = [
  { title: 'Categories', icon: TagsIcon, of: ['new-merchant'] },
  { title: 'Splits', icon: SplitIcon, of: ['money-in-share', 'owe-share'] },
  {
    title: 'Checks',
    icon: ListChecksIcon,
    of: [
      'money-in',
      'transfer-missing',
      'proposal',
      'receipt-waiting',
      'receipt-unread',
      'balance-check',
      'claim-due',
      'payday-step',
    ],
  },
  { title: 'New wording', icon: MessageSquareTextIcon, of: ['new-wording'] },
];

type Go = ReturnType<typeof useGo>;
interface Ctx {
  go: Go;
  setOther: (x: { txnId: string; merchant: string }) => void;
  setRefundFor: (x: { txnId: string; from: string }) => void;
}

/** Each kind's answers, keyed so Sen's suggestion can name one (§12.1). */
function answersFor(
  i: ReviewItem,
  { setRefundFor, go }: Pick<Ctx, 'setRefundFor' | 'go'> & Partial<Ctx>,
): (ReviewAnswer & { key: string })[] {
  switch (i.kind) {
    case 'new-merchant':
      return i.guesses.map((g) => ({
        key: g.id,
        label: g.label,
        onSelect: () => run({ type: 'txn.category', id: i.txnId, categoryId: g.id, scope: 'rule' }),
      }));
    case 'money-in-share':
      return [
        ...i.shares.slice(0, 2).map((s) => ({
          key: s.memberId,
          label: `${s.name} · ${s.bill}`,
          onSelect: () => run({ type: 'share.paid', memberId: s.memberId, byTransactionId: i.txnId }),
        })),
        { key: 'none', label: 'Not a split', onSelect: () => run({ type: 'share.not-a-split', txnId: i.txnId }) },
      ];
    case 'money-in':
      return [
        {
          key: 'income',
          label: 'Income',
          onSelect: () =>
            run({ type: 'txn.kind', id: i.txnId, kind: 'income', linkedTransactionId: null, otherAccountId: null }),
        },
        {
          key: 'transfer',
          label: 'Transfer',
          onSelect: () =>
            run({ type: 'txn.kind', id: i.txnId, kind: 'transfer', linkedTransactionId: null, otherAccountId: null }),
        },
        { key: 'refund', label: 'Refund of…', onSelect: () => setRefundFor({ txnId: i.txnId, from: i.from }) },
      ];
    case 'owe-share':
      return [
        {
          key: 'paid',
          label: "I've paid",
          onSelect: () => run({ type: 'share.paid', memberId: i.memberId, byTransactionId: null }),
        },
        { key: 'open', label: 'Open the split', onSelect: () => go('split', { id: i.splitId }) },
      ];
    case 'new-wording':
      return [
        {
          key: 'yes',
          label: 'Yes',
          onSelect: () => run({ type: 'template.answer', templateId: i.templateId, answer: 'yes' }),
        },
        {
          key: 'no',
          label: 'No',
          onSelect: () => run({ type: 'template.answer', templateId: i.templateId, answer: 'no' }),
        },
      ];
    case 'transfer-missing':
      return [
        ...i.accounts.slice(0, 2).map((a) => ({
          key: a.id,
          label: a.label,
          onSelect: () =>
            run({ type: 'txn.kind', id: i.txnId, kind: 'transfer', linkedTransactionId: null, otherAccountId: a.id }),
        })),
        {
          key: 'elsewhere',
          label: 'Elsewhere',
          onSelect: () =>
            run({ type: 'txn.kind', id: i.txnId, kind: 'transfer', linkedTransactionId: null, otherAccountId: null }),
        },
      ];
    case 'proposal':
      return [
        { key: 'apply', label: 'Apply', onSelect: () => run({ type: 'review.answer', itemId: i.id, answer: 'apply' }) },
        {
          key: 'dismiss',
          label: 'Dismiss',
          onSelect: () => run({ type: 'review.answer', itemId: i.id, answer: 'dismiss' }),
        },
      ];
    default:
      return [];
  }
}

/** A Needs you item that opens a screen to clear it, rather than answering in place. */
function OpensRow({ title, detail, onOpen }: { title: React.ReactNode; detail: string; onOpen: () => void }) {
  return (
    <Card className="p-0">
      <Item asChild size="sm" className="min-h-16 w-full flex-nowrap rounded-[inherit] text-left text-base">
        <button type="button" onClick={onOpen}>
          <ItemContent className="min-w-0 gap-0.5">
            <ItemTitle className="text-base font-semibold text-pretty">{title}</ItemTitle>
            <ItemDescription>{detail}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
          </ItemActions>
        </button>
      </Item>
    </Card>
  );
}

function ReviewEntry({ item: i, go, setOther, setRefundFor }: { item: ReviewItem } & Ctx) {
  const when = momentLabel(new Date(i.at));
  const answers = answersFor(i, { go, setRefundFor }).map((a) => ({ ...a, suggested: a.key === i.suggested }));
  switch (i.kind) {
    case 'new-merchant':
      return (
        <ReviewRow
          question={
            <>
              <Money sen={i.amount} className="font-semibold" /> · {readableName(i.merchant)}
            </>
          }
          knows={`New on ${i.account} · ${when}`}
          answers={answers}
          onOther={() => setOther({ txnId: i.txnId, merchant: i.merchant })}
        />
      );
    case 'money-in-share':
      return (
        <ReviewRow
          question={
            <>
              <Money sen={i.amount} className="font-semibold" kind="in" /> from {readableName(i.from)}
            </>
          }
          knows={`Whose split share is it? · ${when}`}
          answers={answers}
        />
      );
    case 'money-in':
      return (
        <ReviewRow
          question={
            <>
              <Money sen={i.amount} className="font-semibold" kind="in" /> from {readableName(i.from)}
            </>
          }
          knows={`Into ${i.account} · ${when}${i.suggested ? '. Your note says it’s a gift' : ''}`}
          answers={answers}
        />
      );
    case 'owe-share':
      return (
        <ReviewRow
          question={
            <>
              You owe {i.to} <Money sen={i.amount} className="font-semibold" />
            </>
          }
          knows={`${i.bill} · If you've paid already, tick it: Sen can't see every payment`}
          answers={answers}
        />
      );
    case 'new-wording':
      return (
        <ReviewRow question={i.said} knows={`New wording from ${i.app}, already booked · ${when}`} answers={answers} />
      );
    case 'transfer-missing':
      return (
        <ReviewRow
          question={
            <>
              <Money sen={i.amount} className="font-semibold" kind="in" /> into {i.to} from your own name
            </>
          }
          knows="Where did it come from? Sen will remember next time"
          answers={answers}
        />
      );
    case 'proposal':
      return <ReviewRow question={i.title} knows={`Sen proposes · ${i.detail}`} answers={answers} />;
    case 'receipt-waiting':
      return (
        <OpensRow
          title={
            <>
              <Money sen={i.total} className="font-semibold" /> · {readableName(i.merchant)} receipt
            </>
          }
          detail="Read and waiting for you to check it"
          onOpen={() => go('confirm', { id: i.receiptId })}
        />
      );
    case 'receipt-unread':
      return (
        <OpensRow
          title="A receipt Sen couldn't read"
          detail={`Enter it by hand; the photo is kept · ${when}`}
          onOpen={() => go('manual', { id: i.receiptId })}
        />
      );
    case 'balance-check':
      return (
        <OpensRow
          title="A balance check is due"
          detail={i.lastOn ? `The last one was ${longDay(i.lastOn)}` : 'Your first one'}
          onOpen={() => go('balance-check')}
        />
      );
    case 'claim-due':
      return (
        <OpensRow
          title={
            <>
              {i.name} claim · <Money sen={i.amount} className="font-semibold" />
            </>
          }
          detail={`Due ${longDay(i.deadline)}`}
          onOpen={() => go('claim', { id: i.claimId })}
        />
      );
    case 'payday-step':
      return <OpensRow title="A payday step you skipped" detail={i.step} onOpen={() => go('payday')} />;
  }
}

/** Recent payments to choose from: a refund's purchase, or the payment a receipt belongs to. */
function PaymentPicker({
  open,
  title,
  merchant,
  amount,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  /** A refund lists recent payments to its merchant first (flows.md `refund`). */
  merchant?: string;
  /** A receipt lists payments of its amount first, then the closest (flows.md `receipt-first`, QA B03 F12). */
  amount?: number;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const q = usePayments({});
  const spends = (q.data?.rows ?? []).filter((x) => x.direction === 'out' && x.kind === 'spend');
  const theirs = merchant ? spends.filter((x) => x.title === merchant) : [];
  const rest = spends.filter((x) => !theirs.includes(x));
  // closest amount first; equally close, the newer (the list arrives newest first, and sort is stable)
  if (amount !== undefined) rest.sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount));
  const rows = [...theirs, ...rest].slice(0, 30);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={title}>
      <ItemGroup className="-mx-4">
        {rows.map((x) => (
          <ListRow
            key={x.id}
            icon={categoryIcon(x.category)}
            tone={categoryTone(x.category)}
            title={x.title}
            secondary={`${x.category ?? ''} · ${momentLabel(new Date(x.at))}`}
            sen={x.amount}
            onOpen={() => {
              onPick(x.id);
              onClose();
            }}
          />
        ))}
      </ItemGroup>
    </Sheet>
  );
}
