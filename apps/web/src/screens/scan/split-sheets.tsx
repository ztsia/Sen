import { useState } from 'react';
import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { sumSen, type DraftItem } from './receipt-math';

export type PaidBy = 'me' | 'other';

/** Which payment is it, when several match (§6.4). */
export function MatchSheet({
  open,
  onOpenChange,
  choices,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choices: { id: string; label: string }[];
  onChoose: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Which payment is this?">
      <ItemGroup className="-mx-4">
        {choices.map((c, i) => (
          <div key={c.id}>
            {i ? <ItemSeparator /> : null}
            <Item asChild size="sm" className="min-h-14 w-full rounded-none text-left text-base active:bg-accent">
              <button type="button" onClick={() => onChoose(c.id)}>
                <ItemContent>
                  <ItemTitle className="text-base font-normal">{c.label}</ItemTitle>
                </ItemContent>
              </button>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </Sheet>
  );
}

/** *Split*: who paid, then a link for the table or just your part (D92). */
export function SplitSheet({
  open,
  onOpenChange,
  items,
  onShare,
  onMine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DraftItem[];
  onShare: (paidBy: PaidBy) => void;
  onMine: (paidBy: PaidBy, mine: string[]) => void;
}) {
  const [step, setStep] = useState<'who' | 'how' | 'mine'>('who');
  const [paidBy, setPaidBy] = useState<PaidBy>('me');
  const title = step === 'who' ? 'Who paid?' : step === 'how' ? 'How do you split it?' : 'Tick what you had';
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setStep('who');
        onOpenChange(o);
      }}
      title={title}
    >
      {step === 'who' ? (
        <div className="flex flex-col gap-3 pt-2">
          {(
            [
              ['me', 'I paid'],
              ['other', 'A friend paid'],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              size="lg"
              variant="secondary"
              onClick={() => {
                setPaidBy(v);
                setStep('how');
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : step === 'how' ? (
        <div className="flex flex-col gap-3 pt-2">
          <Button size="lg" onClick={() => onShare(paidBy)}>
            Share a link
          </Button>
          <p className="text-sm text-muted-foreground">Everyone ticks their own items on their phone.</p>
          <Button size="lg" variant="secondary" onClick={() => setStep('mine')}>
            Just my part
          </Button>
          <p className="text-sm text-muted-foreground">You tick yours; the rest becomes Others&rsquo; items.</p>
        </div>
      ) : (
        <MinePicker items={items} onDone={(mine) => onMine(paidBy, mine)} />
      )}
    </Sheet>
  );
}

function MinePicker({ items, onDone }: { items: DraftItem[]; onDone: (mine: string[]) => void }) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const mine = sumSen(items.filter((i) => ticked.has(i.id)).map((i) => i.price));
  const others = sumSen(items.filter((i) => !ticked.has(i.id)).map((i) => i.price));
  const toggle = (id: string, on: boolean) =>
    setTicked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  return (
    <div className="flex flex-col gap-3 pt-2">
      <ul className="-mx-4 flex flex-col">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 active:bg-accent">
              <Checkbox checked={ticked.has(i.id)} onCheckedChange={(c) => toggle(i.id, c === true)} />
              <span className="min-w-0 flex-1">{i.description}</span>
              <Money sen={i.price} className="font-normal text-foreground" />
            </label>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Your part <Money sen={mine} className="text-foreground" /> · Others&rsquo; items{' '}
        <Money sen={others} className="text-foreground" />
      </p>
      <Button size="lg" disabled={ticked.size === 0} onClick={() => onDone([...ticked])}>
        Done
      </Button>
    </div>
  );
}
