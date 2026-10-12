import { useState, type ReactNode } from 'react';
import { moneyParts } from '@sen/core/money';
import type { BalanceCheckView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { EmptyState } from '@/blocks/states';
import { Button } from '@/components/ui/button';
import { useWrite } from '@/data/hooks';

/** A balance as the text a person would type (`1,284.50`), for *Matches*. parseSen reads it back. */
const typed = (sen: number) => {
  const p = moneyParts(sen);
  return `${p.whole}.${p.cents}`;
};

/**
 * The balance check's form (screens.md `balance-check`, D18), once for both of its places: its own
 * screen and step 2 of `payday`. Each account shows what Sen computed beside a box for the bank's
 * figure, *Matches* fills it in with one tap, and *Save* books each difference as Unaccounted (§7).
 * An account left empty isn't checked this time. `extra` sits beside *Save* (payday's *Skip* is in its
 * app bar, so it's unused there).
 */
export function BalanceForm({ v, onSaved, extra }: { v: BalanceCheckView; onSaved: () => void; extra?: ReactNode }) {
  const write = useWrite();
  const [text, setText] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!v.rows.length) return <EmptyState line="Balances show here once Sen is reading your bank apps and wallets." />;

  const save = async () => {
    const next: Record<string, string> = {};
    const checks: { accountId: string; balance: number }[] = [];
    for (const r of v.rows) {
      const t = text[r.id] ?? '';
      if (t.trim() === '') continue;
      const c = checkAmount(t);
      if (c.error !== undefined) next[r.id] = c.error;
      else checks.push({ accountId: r.id, balance: c.sen });
    }
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length) return;
    if (!checks.length) {
      setFormError('Type what a bank app shows, or tap Matches, for at least one account.');
      return;
    }
    setSaving(true);
    const done = await write({ type: 'balance.check', checks });
    setSaving(false);
    if (done) onSaved();
  };

  return (
    <form
      className="flex flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <ul className="flex flex-1 flex-col">
        {v.rows.map((r) => (
          <li key={r.id} className="border-b border-border">
            <div role="group" aria-label={r.name} className="flex flex-col gap-2 px-4 py-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{r.name}</span>
                <span className="text-sm text-muted-foreground">
                  Sen has <Money sen={r.computed} className="font-normal text-foreground" />
                </span>
              </p>
              <MoneyInput
                label="What the bank app shows"
                value={text[r.id] ?? ''}
                error={errors[r.id]}
                onChange={(t) => {
                  setErrors((e) => ({ ...e, [r.id]: '' }));
                  setText((x) => ({ ...x, [r.id]: t }));
                }}
              />
              {/* a negative figure can't be typed (parseSen takes no sign), so it has no one-tap fill */}
              {r.computed >= 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  aria-label={`${r.name} matches`}
                  onClick={() => {
                    setErrors((e) => ({ ...e, [r.id]: '' }));
                    setText((x) => ({ ...x, [r.id]: typed(r.computed) }));
                  }}
                >
                  Matches
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-4">
        {formError ? (
          <p role="alert" className="text-sm">
            {formError}
          </p>
        ) : null}
        <div className="flex gap-2">
          {extra}
          <Button type="submit" size="lg" className="flex-1" disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
