import { useEffect, useState } from 'react';
import { CopyIcon, ExternalLinkIcon, FileTextIcon, ImageIcon, SendIcon, ShareIcon } from 'lucide-react';
import type { ClaimView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { useClaim, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, Section, useGo, useScreenSearch } from '../kit';
import { claimDue, claimState } from './claim-status';

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
      <Loaded q={q} what="this claim">
        {(v) => (v ? <Body v={v} /> : <Gone />)}
      </Loaded>
    </Screen>
  );
}

function Gone() {
  const go = useGo();
  return (
    <EmptyState
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

  return (
    <div className="flex flex-col gap-1 pb-4">
      <div className="px-4 pt-2">
        <StatusCard
          icon={s.icon}
          state={s.state}
          status={s.tone}
          title={
            <span className="flex items-baseline justify-between gap-3">
              <span>
                {c.scheme} · {c.period}
              </span>
              <Money sen={c.amount} />
            </span>
          }
          waiting={claimDue(c) || undefined}
        >
          {c.approvedAmount !== null ? (
            <p className="text-sm">
              {c.status === 'paid' ? 'Approved and paid: ' : 'Approved: '}
              <Money sen={c.approvedAmount} kind="in" className="font-semibold" />
              {c.reason ? <span className="block text-muted-foreground">{c.reason}</span> : null}
            </p>
          ) : null}
        </StatusCard>
      </div>

      {v.missing.length ? (
        <Section title="Still missing">
          <ItemGroup>
            {v.missing.map((m) => (
              <Item key={m.what} size="sm" className="rounded-none text-base">
                <ItemContent>
                  <ItemTitle className="text-base">{m.what}</ItemTitle>
                  <ItemDescription>{m.how}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </Section>
      ) : null}

      <Section title="Copy into ESS">
        <ItemGroup>
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
        </ItemGroup>
      </Section>

      <Section title="Files to attach">
        {v.files.length ? (
          <ItemGroup>
            {v.files.map((f) => (
              <Item key={f.id} size="sm" className="min-h-14 flex-wrap rounded-none">
                <ItemMedia variant="icon" className="size-10 rounded-full border-0 bg-muted text-icon">
                  {f.kind === 'pdf' ? <FileTextIcon className="size-5" /> : <ImageIcon className="size-5" />}
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="text-base font-normal wrap-anywhere">{f.name}</ItemTitle>
                </ItemContent>
                <ItemFooter className="justify-start pl-13">
                  {/* stand-ins: opening and sharing a stored file arrive with claims (B25) */}
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Open ${f.name}`}
                    onClick={() => toastDone(`Opens ${f.name} on your phone`)}
                  >
                    <ExternalLinkIcon /> Open
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Share ${f.name}`}
                    onClick={() => toastDone(`Shares ${f.name} to ESS or any app`)}
                  >
                    <ShareIcon /> Share
                  </Button>
                </ItemFooter>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="px-4 text-muted-foreground">No files yet.</p>
        )}
      </Section>

      {open ? (
        <div className="flex flex-col gap-2 px-4 pt-6">
          {v.ess ? (
            <>
              <Button
                size="lg"
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
              {v.missing.length ? (
                <p className="text-sm text-muted-foreground">Add what's missing first, then Sen can send it.</p>
              ) : null}
            </>
          ) : null}
          <Button
            size="lg"
            variant={v.ess ? 'outline' : 'default'}
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
