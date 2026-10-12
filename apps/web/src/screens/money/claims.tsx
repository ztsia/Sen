import { ChevronRightIcon, DownloadIcon, HandCoinsIcon, SendIcon } from 'lucide-react';
import type { ClaimRow, ClaimsView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { ListRow } from '@/blocks/rows';
import { EmptyState } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { useClaims, useMe, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, Section, useGo } from '../kit';
import { claimDue, claimState } from './claim-status';
import { essHere, EssStandIn } from './ess';

/**
 * Claims (screens.md, spec §13): this period's claim per scheme with its amount, status, deadline and
 * evidence, *Download claim pack* (one PDF to print, D97), and in the shell *Send to ESS* from the claim
 * (D96). Earlier periods follow, as plain rows.
 */
export default function Claims() {
  const q = useClaims();
  return (
    <Screen bar={<AppBar title="Claims" />}>
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
        line={
          // a link to Claims can reach someone whose claims are off (D52): no scheme to add (QA B04 run 2, 22)
          me.data && !me.data.claims
            ? 'Claims are off for you. Whoever invited you to Sen can switch them on.'
            : "Each scheme's claim drafts itself on the 1st. Add a scheme in Settings → Claims."
        }
      />
    );
  const now = v.claims.filter((c) => c.period === v.period);
  const earlier = v.claims.filter((c) => c.period !== v.period);
  const toSubmit = now.filter((c) => c.status === 'to_submit');
  const ready = toSubmit.filter((c) => !c.missing.length);
  return (
    <div className="flex flex-col pb-4">
      <Section title={v.period}>
        <ul className="flex flex-col gap-3 px-4">
          {now.map((c) => (
            <li key={c.id}>
              <ClaimCard c={c} onOpen={() => go('claim', { id: c.id })} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 px-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            // a stand-in: the printable PDF is built with claims (B25, D97)
            onClick={() => toastDone('The claim pack PDF arrives with claims. Nothing to print yet.')}
          >
            <DownloadIcon /> Download claim pack
          </Button>
          {v.ess && essHere() && toSubmit.length ? (
            <>
              <Button
                size="lg"
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
              <EssStandIn />
              {toSubmit.length > ready.length ? (
                <p className="text-sm text-muted-foreground">
                  A claim with evidence missing waits until you've added it.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </Section>
      {earlier.length ? (
        <Section title="Earlier">
          <ul className="flex flex-col">
            {earlier.map((c) => (
              <li key={c.id}>
                <ListRow
                  icon={HandCoinsIcon}
                  title={`${c.scheme} · ${c.period}`}
                  secondary={claimState(c).state}
                  sen={c.status === 'approved' || c.status === 'paid' ? (c.approvedAmount ?? c.amount) : c.amount}
                  kind={c.status === 'approved' || c.status === 'paid' ? 'in' : 'out'}
                  onOpen={() => go('claim', { id: c.id })}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function ClaimCard({ c, onOpen }: { c: ClaimRow; onOpen: () => void }) {
  const s = claimState(c);
  return (
    <button type="button" className="w-full text-left active:opacity-80" onClick={onOpen}>
      <StatusCard
        icon={s.icon}
        state={s.state}
        status={s.tone}
        title={
          <span className="flex items-baseline justify-between gap-3">
            <span>{c.scheme}</span>
            <Money sen={c.amount} />
          </span>
        }
        waiting={
          <>
            {claimDue(c)}
            {claimDue(c) ? ' · ' : ''}
            {c.evidence} {c.evidence === 1 ? 'file' : 'files'} · capped at{' '}
            <Money sen={c.cap} className="font-normal" whole />
          </>
        }
      >
        {c.missing.length ? <p className="text-sm">{c.missing.join('. ')}</p> : null}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          Open the claim <ChevronRightIcon className="size-4" aria-hidden="true" />
        </span>
      </StatusCard>
    </button>
  );
}
