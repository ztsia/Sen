import { readableName } from '@/lib/names';
import { useId, type FormEvent, type ReactNode } from 'react';
import { SplitIcon, TriangleAlertIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import { HeaderCard } from '@/blocks/facts';
import { GroupCard, PersonAvatar, PersonRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { IconTile } from '@/blocks/tile';
import { toastDone } from '@/blocks/toast';
import { Sheet } from '@/blocks/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DEV_TOOLS } from '@/lib/env';
import { inShell } from '@/shell/bridge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';

// The pieces `split` and `split-public` share (screens.md: same components and theme). Every one takes
// plain props and reads nothing itself: the person's data must never be one import away from the page a
// friend opens with no login.

export interface PartItem {
  id: string;
  description: string;
  price: number;
  /** Names to show, with the viewer's own as *You*. */
  takers: string[];
  mine: boolean;
  myPart: number | null;
}

/** The merchant, the total and who paid, in a header card with the payer's avatar (or the split mark). */
export function BillHeader({
  merchant,
  total,
  line,
  payer,
}: {
  merchant: string;
  total: number;
  line: string;
  /** The payer's name, for the avatar; without it the split's own mark. */
  payer?: string;
}) {
  return (
    <HeaderCard
      mark={payer ? <PersonAvatar name={payer} size="xl" /> : <IconTile size="lg" icon={SplitIcon} tone="accent" />}
      title={readableName(merchant)}
      figure={<Money sen={total} />}
      meta={line}
    />
  );
}

/** Who is done, as people in one card: a state badge, and a share when the viewer may see it. */
export function Roster({
  label,
  people,
}: {
  label: string;
  people: { name: string; done: boolean; share?: number }[];
}) {
  return (
    <GroupCard label={label}>
      {people.map((p) => (
        <PersonRow
          key={p.name}
          name={p.name}
          state={p.done ? { label: 'Done', tone: 'accent' } : { label: 'Still ticking', tone: 'muted' }}
          sen={p.share}
        />
      ))}
    </GroupCard>
  );
}

/** Who ticked an item: nobody, one name, or *Shared ÷3* with the viewer's part. */
function TakersLine({ item }: { item: PartItem }) {
  const n = item.takers.length;
  if (n === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
        Nobody has ticked this
      </span>
    );
  if (n === 1) return <span>{item.takers[0]}</span>;
  return (
    <span>
      Shared ÷{n}: {item.takers.join(', ')}
      {item.myPart !== null ? (
        <>
          {' · your part '}
          <Money sen={item.myPart} whole className="text-foreground" />
        </>
      ) : null}
    </span>
  );
}

/**
 * The items, each a row you tick (the whole row is the target). Locked, the ticks are read-only.
 * `extra` adds what only one viewer may do to an item, such as the payer's *Everyone*.
 */
export function ItemRows({
  items,
  locked,
  onTick,
  extra,
}: {
  items: PartItem[];
  locked: boolean;
  onTick: (itemId: string, on: boolean) => void;
  extra?: (item: PartItem) => ReactNode;
}) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id}>
          <ItemRow item={item} locked={locked} onTick={onTick} />
          {extra?.(item)}
        </div>
      ))}
    </>
  );
}

function ItemRow({
  item,
  locked,
  onTick,
}: {
  item: PartItem;
  locked: boolean;
  onTick: (itemId: string, on: boolean) => void;
}) {
  const id = useId();
  return (
    <Item asChild size="sm" className={`min-h-14 flex-nowrap rounded-none ${locked ? '' : 'active:bg-accent'}`}>
      <label htmlFor={id}>
        <Checkbox
          id={id}
          checked={item.mine}
          disabled={locked}
          onCheckedChange={(v) => onTick(item.id, v === true)}
          className="shrink-0"
        />
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle className="block w-full text-base font-normal wrap-anywhere">{item.description}</ItemTitle>
          <ItemDescription className="text-sm">
            <TakersLine item={item} />
          </ItemDescription>
        </ItemContent>
        <ItemActions className="shrink-0">
          <Money sen={item.price} />
        </ItemActions>
      </label>
    </Item>
  );
}

/** A square of dark and light cells in a QR's shape: a stand-in until the real code exists (B18, B21). */
export function StandInQr({ seed, title, caption }: { seed: string; title: string; caption: string }) {
  const n = 21;
  let h = 0;
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  const finder = (x: number, y: number) => {
    const corner = [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ].find(([cx, cy]) => x >= cx! && x < cx! + 7 && y >= cy! && y < cy! + 7);
    if (!corner) return null;
    const dx = x - corner[0]!;
    const dy = y - corner[1]!;
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      // the quiet gap around each finder stays light
      const gap =
        (y <= 7 && (x === 7 || x === n - 8)) ||
        (x <= 7 && (y === 7 || y === n - 8)) ||
        (y === 7 && x >= n - 8) ||
        (x === 7 && y >= n - 8);
      const dark = f ?? (!gap && ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ h) >>> 0) % 5 < 2);
      if (dark) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${n} ${n}`}
        role="img"
        aria-label={title}
        className="size-44 rounded-lg bg-white p-2 text-neutral-900"
        shapeRendering="crispEdges"
        fill="currentColor"
      >
        {cells}
      </svg>
      <figcaption className="text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Stand-in</span> · {caption}
      </figcaption>
    </figure>
  );
}

/** A short form in a sheet that asks for one name (patterns.md §7). */
export function NameSheet({
  open,
  onOpenChange,
  title,
  description,
  label,
  action,
  value,
  onChange,
  error,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  action: string;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  busy?: boolean;
  onSubmit: () => void;
}) {
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="given-name"
            enterKeyHint="done"
            maxLength={40}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-msg`}
          />
          <div id={`${id}-msg`} aria-live="polite">
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
        </Field>
        <Button type="submit" disabled={busy}>
          {action}
        </Button>
      </form>
    </Sheet>
  );
}

/** An amount as plain digits for a payment app's box, `24.40`, in integer maths. */
const plainAmount = (sen: number) => formatSen(sen).replace('RM', '').replace(/,/g, '');

async function copyAmount(sen: number): Promise<string> {
  try {
    await navigator.clipboard.writeText(plainAmount(sen));
    return 'amount copied';
  } catch {
    return "couldn't copy here";
  }
}

/**
 * Paying from the same phone (D101). In the shell the buttons open the DuitNow QR in TNG or another
 * app, or save it to the gallery; until B16/B18 give the shell those hand-offs they are stand-ins that
 * copy the amount and say what the shell would do, and only in the shell or a preview. In a browser
 * (`browser`, a friend's page) there is no shell: *Pay with an app* and *Save QR* always show.
 */
export function PayActions({ sen, who, browser = false }: { sen: number; who: string; browser?: boolean }) {
  if (!browser && !inShell() && !DEV_TOOLS) return null;
  const stand = (would: string) => async () => {
    const copied = await copyAmount(sen);
    toastDone(`Simulated: ${would} for ${who}; ${copied}`);
  };
  const buttons = browser
    ? [
        { label: 'Pay with an app', run: stand('Opens your payment app') },
        { label: 'Save QR', run: stand('Saves the QR to your gallery') },
      ]
    : [
        { label: 'Pay with TNG', run: stand('Opens Touch ’n Go') },
        { label: 'Other app…', run: stand('Offers your payment apps') },
        { label: 'Save QR', run: stand('Saves the QR to your gallery') },
      ];
  return (
    <div className="flex w-full flex-wrap justify-center gap-2" role="group" aria-label="Pay from this phone">
      {buttons.map((b) => (
        <Button key={b.label} variant="secondary" size="sm" onClick={() => void b.run()}>
          {b.label}
        </Button>
      ))}
    </div>
  );
}
