import { newId } from '@/lib/uid';
import { nowIso } from '@/lib/clock';
import { useMemo, useState } from 'react';
import { ChevronRightIcon, ClockIcon, ImageIcon, TriangleAlertIcon, WalletIcon } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { CategorySheet } from '@/blocks/category-sheet';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAccounts, useCategories, useDraft, useNearDuplicate, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useScreenSearch } from '../kit';

/**
 * Add expense (screens.md `manual`, §6.8): a payment Sen didn't see. The amount, large, typed as text and
 * kept in sen; the category in one tap; the account (the last used) and the time (now); *More* for the
 * merchant and a note. What's typed is kept while a sheet is open.
 */
export default function Manual() {
  const router = useRouter();
  const write = useWrite();
  const { id } = useScreenSearch();
  const draft = useDraft(id ?? '');
  const cats = useCategories();
  const accts = useAccounts();
  // when the form was opened: the payment's time, and the key of the near-duplicate check
  const at = useMemo(() => nowIso(), []);

  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});
  const [saving, setSaving] = useState(false);

  const parsed = amountText.trim() === '' ? null : checkAmount(amountText);
  const amount = parsed && parsed.sen !== undefined && parsed.sen > 0 ? parsed.sen : null;
  const near = useNearDuplicate(amount, at);

  const accounts = accts.data?.accounts ?? [];
  const account = accounts.find((a) => a.id === (accountId ?? accts.data?.last));
  const unreadable = draft.data && draft.data.status !== 'reading' && !draft.data.byHand ? draft.data : null;

  const save = async () => {
    const r = checkAmount(amountText);
    const e = {
      amount: r.error ?? (r.sen === 0 ? 'Type an amount above zero.' : undefined),
      category: categoryId ? undefined : 'Pick a category.',
    };
    setErrors(e);
    if (e.amount || e.category || r.sen === undefined) return;
    setSaving(true);
    const done = await write({
      type: 'txn.create',
      txn: {
        id: newId(),
        occurredAt: nowIso(),
        amount: r.sen,
        categoryId,
        accountId: account?.id ?? null,
        merchantRaw: merchant.trim() || null,
        note: note.trim() || null,
      },
    });
    setSaving(false);
    // back to where it was opened from; opened first (the launcher's Add expense), Home (QA B03, F5)
    if (done) {
      if (router.history.canGoBack()) router.history.back();
      else void router.navigate({ to: '/', replace: true });
    }
  };

  return (
    <Screen bar={<AppBar title="Add expense" />} className="flex flex-col pb-0">
      <form
        className="flex flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-1 flex-col gap-5 px-4 pt-2 pb-4">
          {unreadable ? (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div
                className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-muted"
                role="img"
                aria-label="Your receipt photo"
              >
                <ImageIcon className="size-6 text-icon" aria-hidden="true" />
              </div>
              <p className="text-sm">Sen couldn&rsquo;t read this one. The photo is kept.</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <MoneyInput
              label="Amount"
              value={amountText}
              onChange={(t) => {
                setErrors((x) => ({ ...x, amount: undefined }));
                setAmountText(t);
              }}
              error={errors.amount}
              autoFocus
              onEnter={() => void save()}
            />
            {near.data ? (
              <p className="flex items-start gap-2 text-sm" role="status">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />
                <span>Looks like {near.data}, which Sen already has.</span>
              </p>
            ) : null}
          </div>

          <Field data-invalid={errors.category ? true : undefined}>
            <FieldLabel id="category-label">Category</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={2}
              aria-labelledby="category-label"
              value={categoryId}
              onValueChange={(v) => {
                if (v) {
                  setCategoryId(v);
                  setErrors((x) => ({ ...x, category: undefined }));
                }
              }}
            >
              {(cats.data ?? []).map((c) => (
                <ToggleGroupItem key={c.id} value={c.id}>
                  {c.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {errors.category ? <FieldError>{errors.category}</FieldError> : null}
          </Field>

          <ItemGroup className="-mx-4">
            {account ? (
              <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
                <button type="button" onClick={() => setAccountOpen(true)}>
                  <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-muted text-icon">
                    <WalletIcon className="size-5" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-base font-normal">Paid from {account.label}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
                  </ItemActions>
                </button>
              </Item>
            ) : null}
            <div className="flex min-h-12 items-center gap-3 px-4 text-muted-foreground">
              <ClockIcon className="mx-2.5 size-5 text-icon" aria-hidden="true" />
              <span>Now</span>
            </div>
          </ItemGroup>

          {more ? (
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="merchant">Merchant</FieldLabel>
                <Input
                  id="merchant"
                  value={merchant}
                  enterKeyHint="next"
                  autoComplete="off"
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="note">Note</FieldLabel>
                <Textarea
                  id="note"
                  value={note}
                  enterKeyHint="done"
                  className="selectable"
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="min-h-12 self-start" onClick={() => setMore(true)}>
              More
            </Button>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3 pb-4">
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            Save
          </Button>
        </div>
      </form>
      <CategorySheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title="Paid from"
        choices={accounts}
        current={account?.id}
        onChoose={(aid) => setAccountId(aid)}
      />
    </Screen>
  );
}
