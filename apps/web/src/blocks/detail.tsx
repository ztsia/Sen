import type { ReactNode } from 'react';
import { CopyIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { Money, type MoneyKind } from './money';
import { toastDone } from './toast';

export interface Fact {
  label: string;
  value: ReactNode;
}
export interface DetailAction {
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}

/**
 * A detail page (patterns.md §7): the amount large at the top, then the facts as label and value rows,
 * then actions as rows at the foot. Where the data came from is always said. The amount gets a Copy
 * button, since amounts aren't selectable (§10).
 */
export function DetailPage({
  sen,
  kind = 'out',
  source,
  facts,
  actions,
}: {
  sen: number;
  kind?: MoneyKind;
  source: string;
  facts: Fact[];
  actions: DetailAction[];
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatSen(sen));
      toastDone('Amount copied');
    } catch {
      toastDone("Couldn't copy here");
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Money sen={sen} kind={kind} className="text-4xl font-semibold" />
          <Button variant="ghost" size="icon" aria-label="Copy the amount" onClick={copy}>
            <CopyIcon />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{source}</p>
      </div>
      <dl className="flex flex-col">
        {facts.map((f) => (
          <div
            key={f.label}
            className="flex min-h-12 items-baseline justify-between gap-4 border-b border-border px-4 py-3"
          >
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="text-right wrap-anywhere">{f.value}</dd>
          </div>
        ))}
      </dl>
      <ItemGroup>
        {actions.map((a, i) => (
          <div key={a.label}>
            {i ? <ItemSeparator /> : null}
            <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
              <button type="button" onClick={a.onSelect}>
                <ItemContent>
                  <ItemTitle className={cn('text-base font-normal', a.destructive && 'text-destructive')}>
                    {a.label}
                  </ItemTitle>
                </ItemContent>
              </button>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </div>
  );
}
