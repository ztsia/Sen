import { DownloadIcon, HandCoinsIcon, SendIcon } from 'lucide-react';
import type { ClaimRow, ClaimsView } from '@sen/core/views';
import { percent } from '@sen/core/money';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useClaims, useMe, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, useGo } from '../kit';
import { claimDue, claimState, claimTone } from './claim-status';
import { essHere } from './ess';

/**
 * Claims (screens.md, spec §13, D130): this period as one summary card holding its claims with their
 * status, *Send to ESS* as the one main action (D96), *Download claim pack* in the app bar (one PDF to
 * print, D97). Earlier periods follow in a card.
 */
export default function Claims() {
  const q = useClaims();
  return (
    <Screen
      bar={
        <AppBar
          title="Claims"
          action={
            q.data?.claims.length ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Download claim pack"
                // a stand-in: the printable PDF is built with claims (B25, D97)
                onClick={() => toastDone('The claim pack PDF arrives with claims. Nothing to print yet.')}
              >
                <DownloadIcon />
              </Button>
            ) : undefined
          }
        />
      }
    >
      <Loaded q={q} what="your claims">
        {(v) => <Body v={v} />}
      </Loaded>
    </Screen>
  );
}

function Body({ v }: { v: ClaimsView }) {
  const go = useGo();
  const write = useWrite();
  const me = useMe();
  if (!v.claims.length)
    return (
      <EmptyState
        icon={HandCoinsIcon}
        title="No claims yet"
        line={
          // a link to Claims can reach someone whose claims are off (D52): no scheme to add (QA B04 run 2, 22)
          me.data && !me.data.claims
            ? 'Claims are off for you. Whoever invited you to Sen can switch them on.'
            : "Each scheme's claim drafts itself on the 1st."
        }
        action={
          me.data && !me.data.claims ? undefined : { label: 'Add a scheme', onSelect: () => go('settings/claims') }
        }
      />
    );
  const now = v.claims.filter((c) => c.period === v.period);
  const earlier = v.claims.filter((c) => c.period !== v.period);
  const toSubmit = now.filter((c) => c.status === 'to_submit');
  const ready = toSubmit.filter((c) => !c.missing.length);
  const send = v.ess && essHere() && toSubmit.length > 0;
  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <PeriodCard period={v.period} claims={now} onOpen={(c) => go('claim', { id: c.id })} />
      {send ? (
        <div className="flex flex-col gap-2 px-4">
          <Button
            disabled={!ready.length}
            onClick={() => {
              // each claim goes on its own; a claim missing evidence waits (D96)
              void Promise.all(
                ready.map((c) => write({ type: 'claim.submitted', id: c.id, essRef: 'send' }, { quiet: true })),
              ).then(() => toastDone(`Sending ${ready.length} ${ready.length === 1 ? 'claim' : 'claims'} to ESS…`));
            }}
          >
            <SendIcon /> Send to ESS
          </Button>
          {toSubmit.length > ready.length ? (
            <p className="px-1 text-sm text-muted-foreground">
              A claim with evidence missing waits until you've added it.
            </p>
          ) : null}
        </div>
      ) : null}
      {earlier.length ? (
        <GroupCard label="Earlier">
          {earlier.map((c) => {
            const paid = c.status === 'approved' || c.status === 'paid';
            return (
              <NavRow
                key={c.id}
                icon={HandCoinsIcon}
                tone={claimTone(c)}
                title={`${c.scheme} · ${c.period}`}
                description={claimState(c).state}
                trailing={<Money sen={paid ? (c.approvedAmount ?? c.amount) : c.amount} kind={paid ? 'in' : 'out'} />}
                onOpen={() => go('claim', { id: c.id })}
              />
            );
          })}
        </GroupCard>
      ) : null}
    </div>
  );
}

/** The month at a glance: how many wait, what they add up to against the caps, then each claim. */
function PeriodCard({ period, claims, onOpen }: { period: string; claims: ClaimRow[]; onOpen: (c: ClaimRow) => void }) {
  const waiting = claims.filter((c) => c.status === 'to_submit').length;
  const amount = claims.reduce((a, c) => a + c.amount, 0);
  const cap = claims.reduce((a, c) => a + c.cap, 0);
  const missing = claims.some((c) => c.status === 'to_submit' && c.missing.length);
  return (
    <section className="flex flex-col gap-2 px-4" aria-label={period}>
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
          <h2 className="text-lg font-semibold">{period}</h2>
          <p className="text-sm text-muted-foreground">
            {waiting ? `${waiting} to submit` : 'Nothing to submit'} ·{' '}
            <Money sen={amount} whole className="font-normal" /> of <Money sen={cap} whole className="font-normal" />
          </p>
          <Progress
            value={cap > 0 ? Math.min(100, percent(amount / cap)) : 0}
            tone={missing ? 'warning' : 'accent'}
            aria-label={`${period}: claimed against caps`}
          />
        </div>
        <div className="divide-y divide-border border-t border-border">
          {claims.map((c) => {
            const s = claimState(c);
            return (
              <NavRow
                key={c.id}
                icon={s.icon}
                tone={claimTone(c)}
                title={c.scheme}
                description={
                  <>
                    {s.state}
                    {claimDue(c) ? <span className="block">{claimDue(c)}</span> : null}
                    {c.missing.length ? <span className="block text-foreground">{c.missing.join('. ')}</span> : null}
                  </>
                }
                trailing={<Money sen={c.amount} />}
                onOpen={() => onOpen(c)}
              />
            );
          })}
        </div>
      </Card>
    </section>
  );
}
