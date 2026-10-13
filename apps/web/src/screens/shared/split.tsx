import { useState } from 'react';
import { CheckCircle2Icon, HourglassIcon, LockIcon, ShareIcon, SplitIcon, WalletIcon } from 'lucide-react';
import type { SplitView } from '@sen/core/views';
import { FactGrid, type GridFact } from '@/blocks/facts';
import { GroupCard, PersonAvatar, PersonRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { Sheet } from '@/blocks/sheet';
import { StatusCard } from '@/blocks/status';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useSplit, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { longDay, momentLabel } from '@/lib/dates';
import { Loaded, useGo, useScreenSearch } from '../kit';
import { BillHeader, ItemRows, NameSheet, PayActions, Roster, StandInQr, type PartItem } from './parts';

/**
 * One shared bill (screens.md `split`), as the payer and as one who owes. Everyone ticks what they
 * had; it locks when everyone is done and every item is claimed (D71). Each change happens at once.
 */
export default function Split() {
  const { id } = useScreenSearch();
  const q = useSplit(id ?? '');
  const [shareOpen, setShareOpen] = useState(false);
  // the QR and the link live in a sheet, for the payer while the shares still move
  const canShare = q.data?.paidBy === 'me' && q.data.state !== 'final';
  return (
    <Screen
      bar={
        <AppBar
          title="Shared bill"
          action={
            canShare ? (
              <Button variant="ghost" size="icon" aria-label="Share" onClick={() => setShareOpen(true)}>
                <ShareIcon />
              </Button>
            ) : undefined
          }
        />
      }
    >
      {id ? (
        <Loaded q={q} what="this split">
          {(v) => (v ? <SplitBody v={v} shareOpen={shareOpen} setShareOpen={setShareOpen} /> : <Gone />)}
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
      icon={SplitIcon}
      title="Not here any more"
      line="This split isn't here any more."
      action={{ label: 'See shared bills', onSelect: () => go('shared') }}
    />
  );
}

function SplitBody({
  v,
  shareOpen,
  setShareOpen,
}: {
  v: SplitView;
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
}) {
  const write = useWrite();
  const me = v.people.find((p) => p.isMe)!;
  const final = v.state === 'final';
  const payerMe = v.paidBy === 'me';
  // after the lock only the payer changes a tick (D71)
  const frozen = final && !payerMe;
  const [someoneElse, setSomeoneElse] = useState<{ id: string; description: string } | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const items: PartItem[] = v.items.map((i) => ({
    id: i.id,
    description: i.description,
    price: i.price,
    takers: i.takers.map((t) => t.name),
    mine: i.mine,
    myPart: i.myPart,
  }));

  const tick = (itemId: string, on: boolean) =>
    void write({ type: 'split.tick', splitId: v.id, itemId, memberId: me.id, on }, { quiet: true });
  const done = (isDone: boolean) => void write({ type: 'split.done', splitId: v.id, memberId: me.id, done: isDone });

  const copyLink = async () => {
    // the real link arrives with B18; this one opens the demo friend's page
    const link = `${location.origin}/s/split-public?id=demo`;
    try {
      await navigator.clipboard.writeText(link);
      toastDone('Link copied');
    } catch {
      toastDone("Couldn't copy here");
    }
  };

  const assignTo = () => {
    const to = name.trim();
    if (!to) return setNameError("Type your friend's name.");
    void write({ type: 'split.assign', splitId: v.id, itemId: someoneElse!.id, to });
    setSomeoneElse(null);
    setName('');
  };

  const others = v.people.filter((p) => !p.isMe);
  // what friends still owe the payer: the payer may write it off, and it becomes their spending (§7)
  const owed = others.filter((p) => !p.paid).reduce((a, p) => a + p.share, 0);
  const waitingLine = [
    v.waitingOn.length ? `Waiting for ${v.waitingOn.join(', ')}` : null,
    v.unclaimed ? `${v.unclaimed} ${v.unclaimed === 1 ? 'item' : 'items'} nobody has ticked` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const facts: GridFact[] = [
    { label: final ? 'Your share' : 'Your share so far', value: <Money sen={v.myShare} /> },
    { label: final ? 'Your spending' : 'Your spending so far', value: <Money sen={v.mySpending} /> },
    ...(v.writtenOff > 0 ? [{ label: 'Written off', value: <Money sen={v.writtenOff} /> }] : []),
  ];

  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <BillHeader
        merchant={v.merchant}
        total={v.total}
        payer={v.payer}
        line={`Paid by ${v.payer} · ${momentLabel(new Date(v.at))}`}
      />
      <div className="px-4">
        {final ? (
          <StatusCard
            icon={LockIcon}
            state="Final"
            status="done"
            title="Everyone is done and every item is claimed."
            waiting={
              frozen ? `To change a tick, ask ${v.payer}.` : 'The shares are locked. Only you can change a tick.'
            }
          />
        ) : (
          <StatusCard
            icon={HourglassIcon}
            state="Still changing"
            status="waiting"
            title="Shares move until everyone is done and every item is claimed."
            waiting={waitingLine || undefined}
          />
        )}
      </div>

      <Roster
        label={final ? 'Shares' : "Who's done"}
        people={v.people.map((p) => ({ name: p.name, done: p.done, share: p.share }))}
      />

      <GroupCard
        label="Items"
        footer={
          items.length ? undefined : 'There are no items: this bill is shared evenly between the people who joined.'
        }
      >
        {items.length ? (
          <ItemRows
            items={items}
            locked={frozen}
            onTick={tick}
            extra={(item) =>
              payerMe && !final && !item.takers.length ? (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void write({ type: 'split.assign', splitId: v.id, itemId: item.id, to: 'everyone' })}
                  >
                    Everyone
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setNameError(undefined);
                      setSomeoneElse({ id: item.id, description: item.description });
                    }}
                  >
                    Someone else…
                  </Button>
                </div>
              ) : null
            }
          />
        ) : null}
      </GroupCard>

      {final && payerMe ? (
        <GroupCard label="Who has paid you back">
          {others.map((p) => {
            const matched = !!p.paidHow?.startsWith('matched');
            return (
              <Item key={p.id} asChild size="sm" className="min-h-14 flex-nowrap rounded-none active:bg-accent">
                <label>
                  <Checkbox
                    checked={p.paid}
                    disabled={matched}
                    onCheckedChange={(on) =>
                      void write(
                        { type: 'split.paid', splitId: v.id, memberId: p.id, paid: on === true },
                        { quiet: true },
                      )
                    }
                  />
                  <PersonAvatar name={p.name} />
                  <ItemContent className="min-w-0 gap-0">
                    <ItemTitle className="text-base font-normal">{p.name}</ItemTitle>
                    <ItemDescription className="text-sm">{p.paidHow ?? 'Not paid yet'}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Money sen={p.share} />
                  </ItemActions>
                </label>
              </Item>
            );
          })}
        </GroupCard>
      ) : null}
      {final && payerMe && owed > 0 ? (
        <div className="flex flex-col gap-1 px-5">
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => void write({ type: 'split.write-off', splitId: v.id })}
          >
            Write off
          </Button>
          <p className="text-sm text-muted-foreground">
            Stop waiting for <Money sen={owed} />. It counts as your spending.
          </p>
        </div>
      ) : null}

      {final && v.owe ? (
        <div className="flex flex-col gap-4 px-4">
          <StatusCard
            icon={v.owe.paid ? CheckCircle2Icon : WalletIcon}
            state={v.owe.paid ? 'Paid' : 'You owe'}
            status={v.owe.paid ? 'done' : 'waiting'}
            title={
              <>
                <Money sen={v.owe.sen} whole /> to {v.owe.to}
              </>
            }
          >
            {v.owe.paid ? null : (
              <>
                <p className="text-sm text-muted-foreground">
                  Sen sees your payment if you send it from an app it reads. Paid another way? Say so here.
                </p>
                <Button variant="secondary" onClick={() => void write({ type: 'split.paid-them', splitId: v.id })}>
                  I've paid
                </Button>
              </>
            )}
          </StatusCard>
          {v.payerQr && !v.owe.paid ? (
            <StandInQr seed={`${v.id}-pay`} title={`${v.owe.to}'s DuitNow QR`} caption={`${v.owe.to}'s DuitNow QR`} />
          ) : null}
          {v.payerQr && !v.owe.paid ? <PayActions sen={v.owe.sen} who={v.owe.to} /> : null}
        </div>
      ) : null}

      {final && !payerMe ? (
        <GroupCard label={`${v.payer}'s tick list`}>
          {v.people.map((p) => (
            <PersonRow
              key={p.id}
              name={p.name}
              detail={p.name === v.payer ? 'Paid the bill' : p.paid ? (p.paidHow ?? 'Paid') : 'Not paid yet'}
              sen={p.share}
            />
          ))}
        </GroupCard>
      ) : null}

      <FactGrid facts={facts} />

      {!final ? (
        <div className="flex flex-col gap-3 px-4">
          {v.meDone ? (
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2Icon className="size-5 text-icon" aria-hidden="true" />
                You're done ✓
              </p>
              <Button variant="ghost" size="sm" onClick={() => done(false)}>
                Still ticking
              </Button>
            </div>
          ) : (
            <Button onClick={() => done(true)}>I've ticked everything I had</Button>
          )}
          {v.lockWithout ? (
            <Button variant="secondary" size="sm" onClick={() => void write({ type: 'split.lock', splitId: v.id })}>
              Lock without waiting for {v.lockWithout}
            </Button>
          ) : null}
        </div>
      ) : null}

      <p className="px-5 text-sm text-muted-foreground">{linkLine(v)}</p>

      <Sheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Share this bill"
        description="Friends scan the code or open the link and tick what they had."
      >
        <div className="flex flex-col items-center gap-3 pb-4">
          <StandInQr seed={v.id} title="QR code for the table" caption="Scan to tick what you had" />
          <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
            Share the link
          </Button>
        </div>
      </Sheet>

      <NameSheet
        open={someoneElse !== null}
        onOpenChange={(open) => {
          if (!open) setSomeoneElse(null);
        }}
        title="Who had this?"
        description={`${someoneElse?.description ?? 'This item'} is theirs. They count as done.`}
        label="Friend's name"
        action="Add"
        value={name}
        onChange={(t) => {
          setName(t);
          setNameError(undefined);
        }}
        error={nameError}
        onSubmit={assignTo}
      />
    </div>
  );
}

function linkLine(v: SplitView): string {
  if (v.link === 'closed') return 'The link is closed.';
  if (v.link === 'closing' && v.closesOn)
    return `The link closes on ${longDay(v.closesOn)}, a day after the last payment was ticked.`;
  return v.state === 'final'
    ? 'The link stays open until the last payment is ticked, then closes a day later.'
    : 'The link is open. It closes a day after the last payment is ticked.';
}
