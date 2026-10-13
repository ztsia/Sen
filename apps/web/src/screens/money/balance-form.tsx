import { useState, type ReactNode } from 'react';
import { CheckIcon, WalletIcon } from 'lucide-react';
import { moneyParts } from '@sen/core/money';
import type { BalanceCheckView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { EmptyState } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWrite } from '@/data/hooks';

/** A balance as the text a person would type (`1,284.50`), for *Matches*. parseSen reads it back. */
const typed = (sen: number) => {
  const p = moneyParts(sen);
  return `${p.whole}.${p.cents}`;
};

/**
 * The balance check's form (screens.md `balance-check`, D18), once for both of its places: its own
 * screen and step 2 of `payday`. One card per account: what Sen computed, a box for the bank's figure,
 * *Matches* to fill it in with one tap, and the difference shown as you type. *Save* books each
 * difference as Unaccounted (§7). An account left empty isn't checked this time. `extra` sits beside
 * *Save* (payday's *Skip* is in its app bar, so it's unused there).
 */
export function BalanceForm({ v, onSaved, extra }: { v: BalanceCheckView; onSaved: () => void; extra?: ReactNode }) {
  const write = useWrite();
  const [text, setText] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!v.rows.length)
    return (
      <EmptyState
        icon={WalletIcon}
        title="No balances yet"
        line="Balances show here once Sen is reading your bank apps and wallets."
      />
    );

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
      <ul className="flex flex-1 flex-col gap-3 px-4 pb-4">
        {v.rows.map((r) => {
          const t = text[r.id] ?? '';
          const parsed = t.trim() === '' ? undefined : checkAmount(t);
          const diff = parsed?.sen === undefined ? undefined : parsed.sen - r.computed;
          return (
            <li key={r.id}>
              <Card>
                <div role="group" aria-label={r.name} className="flex flex-col gap-3 px-4">
                  <div className="flex items-center gap-3">
                    <IconTile icon={WalletIcon} tone="accent" />
                    <p className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-semibold">{r.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Sen has <Money sen={r.computed} className="font-normal text-foreground" />
                      </span>
                    </p>
                  </div>
                  <MoneyInput
                    label="What the bank app shows"
                    value={t}
                    error={errors[r.id]}
                    onChange={(x) => {
                      setErrors((e) => ({ ...e, [r.id]: '' }));
                      setText((y) => ({ ...y, [r.id]: x }));
                    }}
                  />
                  <div className="flex min-h-8 items-center justify-between gap-3">
                    {/* a negative figure can't be typed (parseSen takes no sign), so it has no one-tap fill */}
                    {r.computed >= 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="chip"
                        aria-label={`${r.name} matches`}
                        onClick={() => {
                          setErrors((e) => ({ ...e, [r.id]: '' }));
                          setText((x) => ({ ...x, [r.id]: typed(r.computed) }));
                        }}
                      >
                        <CheckIcon aria-hidden="true" />
                        Matches
                      </Button>
                    ) : (
                      <span />
                    )}
                    {diff === undefined ? null : diff === 0 ? (
                      <Badge variant="accent">
                        <CheckIcon aria-hidden="true" />
                        No difference
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Money sen={Math.abs(diff)} className="font-medium" /> {diff < 0 ? 'less' : 'more'} than Sen has
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-4">
        {formError ? (
          <p role="alert" className="text-sm">
            {formError}
          </p>
        ) : null}
        <div className="flex gap-2">
          {extra}
          <Button type="submit" className="flex-1" disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
