import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2Icon, HourglassIcon, LockIcon } from 'lucide-react';
import type { PublicSplitView } from '@sen/core/views';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePublicSplit, usePublicWrite } from '@/data/public';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded, Section, useScreenSearch } from '../kit';
import { BillHeader, Facts, ItemRows, PayActions, Roster, StandInQr, type PartItem } from './parts';

/**
 * `split-public` (screens.md): a friend's browser, no login (D47, D64, D71). It reads only its own
 * little interface (data/public.ts), never the person's data, and shares only plain-prop pieces with
 * `split`.
 */
export default function SplitPublic() {
  const { id } = useScreenSearch();
  const token = id ?? '';
  const q = usePublicSplit(token);
  return (
    // the wordmark, not a back button: a friend opens this from a link, with nothing behind it
    <Screen bar={<AppBar title="Split link" home />}>
      <Loaded q={q} what="this split">
        {(v) => (v.state === 'closed' ? <Closed /> : <Body token={token} v={v} />)}
      </Loaded>
    </Screen>
  );
}

function Closed() {
  return <EmptyState line="This split is closed" />;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : "That didn't save. Try again.");

function Body({ token, v }: { token: string; v: PublicSplitView }) {
  const write = usePublicWrite(token);
  const final = v.state === 'final';
  const named = v.you !== null;
  const run = (p: Promise<void>) => p.catch((e: unknown) => toastDone(messageOf(e)));

  const items: PartItem[] = v.items.map((i) => ({
    id: i.id,
    description: i.description,
    price: i.price,
    takers: i.takers.map((t) => (t === v.you ? 'You' : t)),
    mine: i.mine,
    myPart: i.myPart,
  }));
  const waiting = v.people.filter((p) => !p.done).map((p) => (p.name === v.you ? 'You' : p.name));
  const unclaimed = v.items.filter((i) => !i.takers.length).length;
  const waitingLine = [
    waiting.length ? `Waiting for ${waiting.join(', ')}` : null,
    unclaimed ? `${unclaimed} ${unclaimed === 1 ? 'item' : 'items'} nobody has ticked` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-4 px-4">
        <BillHeader
          merchant={v.merchant}
          total={v.total}
          line={`Paid by ${v.payer} · ${v.at ? momentLabel(new Date(v.at)) : ''}`}
        />
        {named ? (
          <p className="text-muted-foreground">Hi {v.you}. Sen remembers this browser.</p>
        ) : (
          <NameBox onSubmit={(name) => write.setName(name)} />
        )}
        {final ? (
          <StatusCard
            icon={LockIcon}
            state="Final"
            status="done"
            title="Everyone is done and every item is claimed."
            waiting={`To change a tick, ask ${v.payer}.`}
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

      <Section title={final ? 'Everyone' : "Who's done"}>
        <Roster people={v.people.map((p) => ({ name: p.name === v.you ? 'You' : p.name, done: p.done }))} />
      </Section>

      <Section title="Items">
        <ItemRows
          items={items}
          // a name first, and after the lock only the payer changes a tick
          locked={final || !named}
          onTick={(itemId, on) => void run(write.tick(itemId, on))}
        />
        {!named ? (
          <p className="px-4 pt-3 text-sm text-muted-foreground">Type your name to tick what you had.</p>
        ) : null}
      </Section>

      {named ? (
        <Section title="You">
          <Facts rows={[{ label: final ? 'Your share' : 'Your share so far', value: <Money sen={v.yourShare} /> }]} />
        </Section>
      ) : null}

      {named && !final ? (
        <div className="px-4">
          {v.youDone ? (
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2Icon className="size-5 text-icon" aria-hidden="true" />
                You're done ✓
              </p>
              <Button variant="ghost" onClick={() => void run(write.done(false))}>
                Still ticking
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => void run(write.done(true))}>
              I've ticked everything I had
            </Button>
          )}
        </div>
      ) : null}

      {v.pay ? (
        <section aria-label="Pay" className="flex flex-col items-center gap-3 px-4 pt-2">
          <p className="text-2xl font-semibold">
            Pay <Money sen={v.pay.sen} whole className="text-2xl font-semibold" />
          </p>
          {v.pay.qr ? (
            <StandInQr seed={`${token}-pay`} title={`${v.payer}'s DuitNow QR`} caption={`${v.payer}'s DuitNow QR`} />
          ) : (
            <p className="text-muted-foreground">Ask {v.payer} how to pay.</p>
          )}
          {v.pay.qr ? <PayActions browser sen={v.pay.sen} who={v.payer} /> : null}
        </section>
      ) : null}
    </div>
  );
}

/** The first time: a name box, and nothing else to learn (D64). */
function NameBox({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const id = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Type your first name.');
    setBusy(true);
    onSubmit(name).then(
      () => setBusy(false),
      (err: unknown) => {
        setBusy(false);
        setError(messageOf(err));
      },
    );
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>What's your name?</FieldLabel>
        <Input
          id={id}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          autoComplete="given-name"
          enterKeyHint="done"
          maxLength={40}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-msg`}
        />
        <div id={`${id}-msg`} aria-live="polite">
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>Sen remembers this browser, so next time you won't be asked.</FieldDescription>
          )}
        </div>
      </Field>
      <Button type="submit" disabled={busy}>
        Continue
      </Button>
    </form>
  );
}
