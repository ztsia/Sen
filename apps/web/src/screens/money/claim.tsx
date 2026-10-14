import { useEffect, useState } from 'react';
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  HandCoinsIcon,
  ImageIcon,
  SendIcon,
  ShareIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { ClaimView } from '@sen/core/views';
import { FactGrid, HeaderCard, type GridFact } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { IconTile } from '@/blocks/tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useClaim, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { shortDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Loaded, useGo, useScreenSearch } from '../kit';
import { claimDue, claimState, claimStep, claimTone } from './claim-status';
import { essHere, EssStandIn } from './ess';

/**
 * One claim, the submission kit (screens.md `claim`, spec §13): each value in ESS's order with *Copy*,
 * each file with *Open* and *Share*, what's missing and how to add it, then *Submitted*; once ESS
 * answers, *Approved* and the approved amount. In the shell, *Send to ESS* does it for you (D96).
 */
export default function Claim() {
  const { id } = useScreenSearch();
  const q = useClaim(id ?? '');
  return (
    <Screen bar={<AppBar title="Claim" />}>
      {/* no id (an old or hand-typed link): gone, not loading forever (QA B04 run 1, finding 10) */}
      {id ? (
        <Loaded q={q} what="this claim">
          {(v) => (v ? <Body v={v} /> : <Gone />)}
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
      icon={HandCoinsIcon}
      title="Not here any more"
      line="This claim isn't here any more."
      action={{ label: 'See all claims', onSelect: () => go('claims') }}
    />
  );
}

async function copy(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toastDone(`${label} copied`);
  } catch {
    toastDone("Couldn't copy here");
  }
}

const STEPS = ['Draft', 'Ready', 'Sent', 'Approved', 'Paid'];

/** Where the claim is on its way: Draft → Ready → Sent → Approved → Paid. A rejected one stops at Sent. */
function Stepper({ at, rejected }: { at: number; rejected: boolean }) {
  return (
    <Card className="mx-4 px-4 py-4">
      <ol className="flex items-start" aria-label="Claim progress">
        {STEPS.map((label, i) => {
          const done = i < at || (i === at && at >= 3);
          const here = i === at;
          return (
            <li
              key={label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              aria-current={here ? 'step' : undefined}
            >
              <div className="flex w-full items-center">
                <span
                  className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : i <= at ? 'bg-primary' : 'bg-muted')}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done
                      ? 'bg-primary text-primary-foreground'
                      : here
                        ? rejected && i === 2
                          ? 'bg-warn-bg text-warn-fg ring-2 ring-warn-fg'
                          : 'text-primary ring-2 ring-primary'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? (
                    <CheckIcon className="size-3.5" />
                  ) : rejected && here ? (
                    <TriangleAlertIcon className="size-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    i === STEPS.length - 1 ? 'bg-transparent' : i < at ? 'bg-primary' : 'bg-muted',
                  )}
                />
              </div>
              <span className={cn('text-xs', here ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Body({ v }: { v: ClaimView }) {
  const write = useWrite();
  const c = v.claim;
  const s = claimState(c);
  const open = c.status === 'to_submit';
  const [sending, setSending] = useState(false);

  // Send to ESS answers a moment later (the fake's stand-in for the adapter): say so when it has
  useEffect(() => {
    if (sending && c.status !== 'to_submit') {
      setSending(false);
      toastDone(`Sent to ESS. Reference ${c.essRef ?? ''}`.trim());
    }
  }, [sending, c.status, c.essRef]);

  const facts: GridFact[] = [
    { label: 'Amount', value: <Money sen={c.amount} /> },
    { label: 'Capped at', value: <Money sen={c.cap} /> },
    { label: c.status === 'to_submit' ? 'Submit by' : 'Deadline', value: shortDay(c.deadline) },
    { label: 'Evidence', value: `${c.evidence} ${c.evidence === 1 ? 'file' : 'files'}` },
  ];
  if (c.approvedAmount !== null)
    facts.push({
      label: c.status === 'paid' ? 'Approved and paid' : 'Approved',
      value: <Money sen={c.approvedAmount} kind="in" />,
    });
  if (c.reason) facts.push({ label: 'Why', value: c.reason, wide: true });

  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <HeaderCard
        mark={<IconTile size="lg" icon={s.icon} tone={claimTone(c)} />}
        title={`${c.scheme} · ${c.period}`}
        badge={
          <Badge variant={s.tone === 'warning' ? 'warning' : s.tone === 'done' ? 'accent' : 'muted'}>{s.state}</Badge>
        }
        meta={claimDue(c) || undefined}
      />
      <Stepper at={claimStep(c)} rejected={c.status === 'rejected'} />
      <FactGrid facts={facts} />

      {v.missing.length ? (
        <GroupCard label="Still missing">
          {v.missing.map((m) => (
            <NavRow key={m.what} icon={TriangleAlertIcon} tone="warn" title={m.what} description={m.how} />
          ))}
        </GroupCard>
      ) : null}

      <GroupCard label="Copy into ESS">
        {v.fields.map((f) => (
          <Item key={f.label} size="sm" className="min-h-14 flex-nowrap rounded-none">
            <ItemContent className="min-w-0 gap-0">
              <ItemDescription>{f.label}</ItemDescription>
              <ItemTitle className="text-base font-normal wrap-anywhere">{f.value}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Copy ${f.label}`}
                onClick={() => void copy(f.label, f.value)}
              >
                <CopyIcon /> Copy
              </Button>
            </ItemActions>
          </Item>
        ))}
      </GroupCard>

      <section className="flex flex-col gap-2 px-4" aria-label="Files to attach">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Files to attach</h2>
        {v.files.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {v.files.map((f) => (
              <li key={f.id}>
                <Card className="relative gap-0 overflow-hidden py-0">
                  {/* stand-ins: opening and sharing a stored file arrive with claims (B25) */}
                  <button
                    type="button"
                    aria-label={`Open ${f.name}`}
                    className="flex flex-col items-center gap-2 px-3 pt-4 pb-3 active:bg-accent"
                    onClick={() => toastDone(`Opens ${f.name} on your phone`)}
                  >
                    <IconTile size="lg" icon={f.kind === 'pdf' ? FileTextIcon : ImageIcon} tone="hue1" />
                    <span className="w-full truncate text-center text-sm">{f.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1"
                    aria-label={`Share ${f.name}`}
                    onClick={() => toastDone(`Shares ${f.name} to ESS or any app`)}
                  >
                    <ShareIcon />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="px-4 py-3 text-muted-foreground">No files yet.</Card>
        )}
      </section>

      {open ? (
        <div className="flex flex-col gap-2 px-4 pt-2">
          {v.ess && essHere() && c.status === 'to_submit' ? (
            <>
              <Button
                disabled={sending || v.missing.length > 0}
                onClick={() => {
                  setSending(true);
                  void write({ type: 'claim.submitted', id: c.id, essRef: 'send' }, { quiet: true }).then((r) => {
                    if (!r) setSending(false);
                  });
                }}
              >
                <SendIcon /> {sending ? 'Sending to ESS…' : 'Send to ESS'}
              </Button>
              <EssStandIn />
              {v.missing.length ? (
                <p className="text-sm text-muted-foreground">Add what's missing first, then Sen can send it.</p>
              ) : null}
            </>
          ) : null}
          <Button
            variant={v.ess ? 'outline' : 'default'}
            size={v.ess ? 'sm' : 'default'}
            disabled={sending}
            onClick={() => void write({ type: 'claim.submitted', id: c.id, essRef: null })}
          >
            Submitted
          </Button>
          <p className="text-sm text-muted-foreground">Tap Submitted once you've sent it in ESS yourself.</p>
        </div>
      ) : null}
    </div>
  );
}
