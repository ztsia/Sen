import { newId } from '@/lib/uid';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRightIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  StickyNoteIcon,
  TagIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { scaleSen } from '@sen/core/money';
import type { ReceiptDraft } from '@sen/core/views';
import { CategorySheet } from '@/blocks/category-sheet';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { NoteSheet } from '@/blocks/note-sheet';
import { Sheet } from '@/blocks/sheet';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useDraft, useMatches, useMe, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded, Section, useGo, useScreenSearch } from '../kit';
import { ItemSheet } from './item-sheet';
import { optionalSen, priceItems, sharedCategory, type DraftItem } from './receipt-math';
import { MatchSheet, SplitSheet, type PaidBy } from './split-sheets';

/**
 * Confirm (screens.md `confirm`, D66, D67, D89): did Sen read this receipt right? One screen: the
 * category, every item with its price (tax and service spread in), the check that they add up, how many
 * people ate, and Done or Split. By hand (D90) it is the same list, typed in.
 */
export default function Confirm() {
  const go = useGo();
  const { id } = useScreenSearch();
  const q = useDraft(id ?? '');
  // Once committed the draft is gone; keep showing the last one until the screen has moved on.
  const last = useRef<ReceiptDraft | null>(null);
  if (q.data) last.current = q.data;
  const draft = q.data ?? last.current;
  const unknown = (
    <EmptyState
      line="Sen can't find this receipt."
      action={{ label: 'Go Home', onSelect: () => go('home', {}, { replace: true }) }}
    />
  );
  return (
    <Screen bar={<AppBar title="Check the receipt" />} className="flex flex-col pb-0">
      {/* no id: nothing to load, so say so rather than wait for ever (QA B03, F13) */}
      {!id ? (
        unknown
      ) : (
        <Loaded q={q} what="the receipt" skeleton={<ConfirmSkeleton />}>
          {() =>
            !draft ? (
              unknown
            ) : draft.status !== 'read' ? (
              <EmptyState
                line="Sen is still reading this receipt."
                action={{ label: 'See it', onSelect: () => go('reading', { id: draft.id }, { replace: true }) }}
              />
            ) : (
              <ConfirmBody key={draft.id} d={draft} />
            )
          }
        </Loaded>
      )}
    </Screen>
  );
}

function ConfirmSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4" role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ConfirmBody({ d }: { d: ReceiptDraft }) {
  const go = useGo();
  const write = useWrite();
  const me = useMe();
  const cats = useCategories();
  const catLabel = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c.label])), [cats.data]);

  const [raw, setRaw] = useState<DraftItem[]>(d.items);
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const [pax, setPax] = useState(d.pax);
  const [note, setNote] = useState<string | null>(d.note);
  const [merchant, setMerchant] = useState(d.merchant);
  const [taxText, setTaxText] = useState('');
  const [serviceText, setServiceText] = useState('');
  const [sheet, setSheet] = useState<null | 'photo' | 'category' | 'note' | 'item' | 'match' | 'split'>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tax and service: read off the receipt, or typed when by hand (parsed as text, never as a number).
  const taxIn = optionalSen(checkAmount, taxText);
  const serviceIn = optionalSen(checkAmount, serviceText);
  const tax = d.byHand ? taxIn.sen : d.tax;
  const service = d.byHand ? serviceIn.sen : d.service;
  const priced = priceItems(raw, tax, service);
  const items = priced.items;
  const itemsTotal = priced.total;
  const shared = sharedCategory(items);
  const hasPayment = d.byHand && d.forTxnId !== null;
  // What is committed: the payment's own amount when typing against one, else what the items come to.
  const total = hasPayment ? d.total : itemsTotal;
  const difference = d.byHand ? total - itemsTotal : itemsTotal - d.total;

  // Attaching (§6.4): with capture on, a receipt for no named payment looks for one to attach to.
  const looks = !!me.data?.capture && !d.byHand && !d.forTxnId;
  const matches = useMatches(total, d.occurredAt, looks);

  const label = (cid: string | null) => (cid ? (catLabel.get(cid) ?? 'Other') : 'No category');
  const mixedLine = items.map((i) => `${i.description}: ${label(i.categoryId)}`).join(' · ');
  const editingItem = items.find((i) => i.id === editing) ?? null;

  const commit = async (
    action: 'done' | 'mine' | 'evidence',
    paidBy: PaidBy,
    opts: { mine?: string[]; forTxnId?: string | null } = {},
  ) => {
    setSaving(true);
    const r = await write({
      type: 'receipt.commit',
      id: d.id,
      action,
      paidBy,
      merchant: merchant.trim() || 'Receipt',
      occurredAt: d.occurredAt,
      items: items.map(({ id, description, qty, amount, price, categoryId }) => ({
        id,
        description,
        qty,
        amount,
        price,
        categoryId,
      })),
      mine: opts.mine ?? [],
      tax,
      service,
      total,
      pax,
      note,
      forTxnId: opts.forTxnId === undefined ? d.forTxnId : opts.forTxnId,
      contentHash: d.contentHash,
    });
    setSaving(false);
    return r;
  };

  const finish = (said: string | undefined) => {
    // a receipt that waits for its payment is found in Review; anything else is done
    if (said?.startsWith('Waiting')) go('review', {}, { replace: true });
    else go('home', {}, { replace: true });
  };

  // by hand, items can leave some of the payment unitemised (D90), never more than it (QA B03, F8)
  const overshoot = hasPayment && difference < 0;
  const [overTried, setOverTried] = useState(0);
  // a refused Done moves to what's wrong, so it never looks like Done did nothing (QA B03 run 2, finding 20)
  const overRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (overTried) overRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [overTried]);

  const done = async (forTxnId?: string) => {
    if (overshoot) return setOverTried((n) => n + 1);
    if (!forTxnId && looks && (matches.data?.length ?? 0) > 1) return setSheet('match');
    setSheet(null);
    const r = await commit('done', 'me', forTxnId ? { forTxnId } : {});
    if (r) finish(r.said);
  };

  const share = async (paidBy: PaidBy) => {
    setSheet(null);
    const r = await commit('done', paidBy);
    if (r) go('split', { id: d.id });
  };
  const mineOnly = async (paidBy: PaidBy, mine: string[]) => {
    setSheet(null);
    const r = await commit('mine', paidBy, { mine });
    if (r) go('home', {}, { replace: true });
  };
  const evidence = async () => {
    const r = await commit('evidence', 'me');
    if (r) go('home', {}, { replace: true });
  };

  const blocked = raw.length === 0 || taxIn.bad || serviceIn.bad || saving;

  return (
    <>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-1 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {d.byHand && !d.forTxnId ? (
              <Field>
                <FieldLabel htmlFor="merchant">Where was it?</FieldLabel>
                <Input
                  id="merchant"
                  value={merchant}
                  enterKeyHint="next"
                  autoComplete="off"
                  placeholder="Shop or restaurant"
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-pretty">{merchant || 'Receipt'}</h2>
                <p className="text-sm text-muted-foreground">{momentLabel(new Date(d.occurredAt))}</p>
              </>
            )}
          </div>
          {d.byHand ? null : (
            <Button variant="secondary" onClick={() => setSheet('photo')}>
              <ImageIcon aria-hidden="true" />
              View photo
            </Button>
          )}
        </div>

        <Section title="Category">
          <ItemGroup>
            <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
              <button type="button" onClick={() => setSheet('category')} disabled={items.length === 0}>
                <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-muted text-icon">
                  <TagIcon className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-base font-normal">
                    {items.length === 0 ? 'Add items first' : shared ? label(shared) : 'Mixed'}
                  </ItemTitle>
                  {!shared && items.length ? (
                    <ItemDescription className="text-pretty">{mixedLine}</ItemDescription>
                  ) : null}
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
                </ItemActions>
              </button>
            </Item>
          </ItemGroup>
        </Section>

        <Section title="Items">
          {items.length === 0 ? (
            <p className="px-4 py-2 text-muted-foreground">No items yet. Add what you bought below.</p>
          ) : (
            <ItemGroup>
              {items.map((i, n) => (
                <div key={i.id}>
                  {n ? <ItemSeparator /> : null}
                  <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(i.id);
                        setSheet('item');
                      }}
                    >
                      <ItemContent>
                        <ItemTitle className="text-base font-normal text-pretty">{i.description}</ItemTitle>
                        {i.doubtful && !fixed.has(i.id) ? (
                          <ItemDescription className="inline-flex items-center gap-1 text-foreground">
                            <TriangleAlertIcon className="size-4 text-icon" aria-hidden="true" />
                            Check this price
                          </ItemDescription>
                        ) : null}
                      </ItemContent>
                      <ItemActions>
                        <Money sen={i.price} className="font-normal text-foreground" />
                      </ItemActions>
                    </button>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          )}
          {d.byHand ? (
            <AddItem
              onAdd={(description, amount) =>
                setRaw((r) => [
                  ...r,
                  {
                    id: newId(),
                    description,
                    qty: 1,
                    amount,
                    price: amount,
                    categoryId: shared ?? raw[0]?.categoryId ?? cats.data?.[0]?.id ?? null,
                    doubtful: false,
                  },
                ])
              }
            />
          ) : null}
        </Section>

        {d.byHand ? (
          <Section title="Tax and service (optional)">
            <div className="flex flex-col gap-4 px-4 pt-1">
              <MoneyInput label="Service charge" value={serviceText} onChange={setServiceText} />
              <MoneyInput label="Tax" value={taxText} onChange={setTaxText} />
            </div>
          </Section>
        ) : null}

        <div className="mt-2 flex flex-col gap-1 px-4">
          {!d.byHand && (service > 0 || tax > 0) ? (
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {service > 0 ? (
                <Line label="Service charge, spread into the prices">
                  <Money sen={service} className="font-normal text-muted-foreground" />
                </Line>
              ) : null}
              {tax > 0 ? (
                <Line label="Tax, spread into the prices">
                  <Money sen={tax} className="font-normal text-muted-foreground" />
                </Line>
              ) : null}
            </div>
          ) : null}
          <Line label="Total" strong>
            <Money sen={total} className="text-lg font-semibold text-foreground" />
          </Line>
          <Check byHand={d.byHand} hasPayment={hasPayment} difference={difference} empty={raw.length === 0} />
          {overshoot && overTried ? (
            <div ref={overRef} role="alert">
              <FieldError>The items can't come to more than the payment. Fix a price, or remove an item.</FieldError>
            </div>
          ) : null}
        </div>

        <Section title="How many people ate?">
          <div className="flex flex-col gap-2 px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="size-12"
                aria-label="Fewer people"
                disabled={pax <= 1}
                onClick={() => setPax((p) => Math.max(1, p - 1))}
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <span className="num min-w-10 text-center text-2xl font-semibold" aria-live="polite">
                {pax}
              </span>
              <Button
                variant="outline"
                className="size-12"
                aria-label="More people"
                onClick={() => setPax((p) => p + 1)}
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </div>
            <p aria-live="polite">
              <Money sen={total} className="font-normal text-foreground" /> ÷ {pax} ={' '}
              <Money sen={scaleSen(total, 1, pax)} className="text-foreground" /> a person
            </p>
            <p className="text-sm text-muted-foreground">Without a split, the whole bill is your spending.</p>
          </div>
        </Section>

        <ItemGroup className="mt-2">
          <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
            <button type="button" onClick={() => setSheet('note')}>
              <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-transparent text-icon">
                <StickyNoteIcon className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className={note ? 'text-base font-normal' : 'text-base font-normal text-muted-foreground'}>
                  {note ?? 'Add a note'}
                </ItemTitle>
              </ItemContent>
            </button>
          </Item>
        </ItemGroup>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" disabled={blocked} onClick={() => void done()}>
            Done
          </Button>
          <Button size="lg" variant="secondary" disabled={blocked} onClick={() => setSheet('split')}>
            Split
          </Button>
        </div>
        {d.byHand ? null : (
          <Button variant="ghost" size="sm" className="min-h-12" disabled={saving} onClick={() => void evidence()}>
            Not a payment? Keep it as evidence
          </Button>
        )}
      </div>

      <Sheet open={sheet === 'photo'} onOpenChange={(o) => setSheet(o ? 'photo' : null)} title="Receipt photo">
        <div
          className="mx-auto mt-2 flex aspect-[3/4] w-full max-w-72 items-center justify-center rounded-md bg-muted text-muted-foreground"
          role="img"
          aria-label="Your receipt photo"
        >
          <ImageIcon className="size-10 text-icon" aria-hidden="true" />
        </div>
      </Sheet>
      <CategorySheet
        open={sheet === 'category'}
        onOpenChange={(o) => setSheet(o ? 'category' : null)}
        title="Category for the whole receipt"
        choices={cats.data ?? []}
        current={shared}
        onChoose={(cid) => setRaw((r) => r.map((i) => ({ ...i, categoryId: cid })))}
      />
      <NoteSheet
        open={sheet === 'note'}
        onOpenChange={(o) => setSheet(o ? 'note' : null)}
        note={note}
        onSave={setNote}
      />
      <ItemSheet
        open={sheet === 'item'}
        onOpenChange={(o) => setSheet(o ? 'item' : null)}
        item={editingItem}
        onSave={(iid, description, amount) => {
          setRaw((r) => r.map((i) => (i.id === iid ? { ...i, description, amount } : i)));
          setFixed((s) => new Set(s).add(iid));
        }}
        onRemove={(iid) => setRaw((r) => r.filter((i) => i.id !== iid))}
      />
      <MatchSheet
        open={sheet === 'match'}
        onOpenChange={(o) => setSheet(o ? 'match' : null)}
        choices={matches.data ?? []}
        onChoose={(tid) => void done(tid)}
      />
      <SplitSheet
        open={sheet === 'split'}
        onOpenChange={(o) => setSheet(o ? 'split' : null)}
        items={items}
        onShare={(p) => void share(p)}
        onMine={(p, m) => void mineOnly(p, m)}
      />
    </>
  );
}

function Line({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? 'font-medium' : undefined}>{label}</span>
      {children}
    </div>
  );
}

/** The check that the items add up (D66), in words: a tick, or the difference. */
function Check({
  byHand,
  hasPayment,
  difference,
  empty,
}: {
  byHand: boolean;
  hasPayment: boolean;
  difference: number;
  empty: boolean;
}) {
  if (empty || (byHand && !hasPayment)) return null;
  const ok = difference === 0;
  const m = (sen: number) => <Money sen={Math.abs(sen)} className="text-foreground" />;
  let words: React.ReactNode;
  if (ok) words = byHand ? 'Items add up to the payment' : 'Items add up to the total';
  else if (byHand && difference > 0) words = <>{m(difference)} not itemised</>;
  else if (byHand) words = <>Items come to {m(difference)} more than the payment</>;
  else if (difference > 0) words = <>Items come to {m(difference)} more than the receipt&rsquo;s total</>;
  else words = <>Items come to {m(difference)} less than the receipt&rsquo;s total</>;
  return (
    <p className="mt-1 flex items-start gap-2" role="status">
      {ok ? null : <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-icon" aria-hidden="true" />}
      <span>
        {words}
        {ok ? ' ✓' : ''}
      </span>
    </p>
  );
}

/** By hand (D90): add an item with its printed price. */
function AddItem({ onAdd }: { onAdd: (description: string, amount: number) => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});
  const submit = () => {
    const r = checkAmount(amount);
    const e = {
      description: description.trim() ? undefined : 'Say what it is.',
      amount: r.error,
    };
    setErrors(e);
    if (e.description || r.error !== undefined) return;
    onAdd(description.trim(), r.sen);
    setDescription('');
    setAmount('');
  };
  return (
    <form
      className="mx-4 mt-3 flex flex-col gap-4 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field data-invalid={errors.description ? true : undefined}>
        <FieldLabel htmlFor="add-description">Add an item</FieldLabel>
        <Input
          id="add-description"
          value={description}
          placeholder="What it is"
          enterKeyHint="next"
          autoComplete="off"
          aria-invalid={errors.description ? true : undefined}
          onChange={(e) => {
            setErrors((x) => ({ ...x, description: undefined }));
            setDescription(e.target.value);
          }}
        />
        {errors.description ? <FieldError>{errors.description}</FieldError> : null}
      </Field>
      <MoneyInput label="Price" value={amount} error={errors.amount} onChange={setAmount} onEnter={submit} />
      <Button type="submit" size="lg" variant="secondary">
        Add item
      </Button>
    </form>
  );
}
