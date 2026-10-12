import { CheckIcon, ExternalLinkIcon, FileTextIcon, ImageIcon, SparklesIcon } from 'lucide-react';
import type { SenMessage, SenPart, SenRun } from '@sen/core/views';
import { ReviewRow } from '@/blocks/rows';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWrite } from '@/data/hooks';
import { useUi } from '@/frame/ui-store';
import { useGo } from '../kit';
import { momentLabel, shortDay } from '@/lib/dates';
import { openInBrowser } from '@/lib/open-in-browser';
import { cn } from '@/lib/utils';

// What Sen's conversation is made of (spec §12.2–§12.5, screens.md `sen`): a text with its marked
// figures, a file you sent, and the cards for a proposal, a research draft, an ask_user and a button
// to a screen. Each card is a part of one message; a screen id and a record id are all `open` carries,
// never an amount (§12.3).

/** One run of Sen's text. A figure code couldn't trace says so in words, not only in style (D108, D109). */
function Run({ run }: { run: SenRun }) {
  if (!run.mark) return <>{run.text}</>;
  const label = run.mark === 'unchecked' ? 'not checked' : 'from your file';
  return (
    <>
      <span className="underline decoration-dotted underline-offset-4">{run.text}</span>{' '}
      <Badge variant="outline" className="align-middle">
        {label}
      </Badge>
    </>
  );
}

export function Text({ runs }: { runs: SenRun[] }) {
  return (
    <p className="text-base text-pretty wrap-anywhere select-text">
      {runs.map((r, i) => (
        <Run key={i} run={r} />
      ))}
    </p>
  );
}

export function FileChip({ name, kind }: { name: string; kind: 'pdf' | 'image' }) {
  const Icon = kind === 'pdf' ? FileTextIcon : ImageIcon;
  return (
    <p className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-sm">
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 wrap-anywhere">
        <span className="sr-only">{kind === 'pdf' ? 'PDF: ' : 'Image: '}</span>
        {name}
      </span>
    </p>
  );
}

/** `propose` (§12.3): Apply or Dismiss, which also clears it from Review. */
function Proposal({ part }: { part: Extract<SenPart, { type: 'proposal' }> }) {
  const write = useWrite();
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <SparklesIcon className="size-4" aria-hidden="true" />
        Sen suggests
      </p>
      <p className="text-base font-semibold text-pretty wrap-anywhere">{part.title}</p>
      <p className="text-sm text-muted-foreground">{part.why}</p>
      {part.status === 'open' ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void write({ type: 'proposal.answer', id: part.id, answer: 'apply' })}>
            Apply
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void write({ type: 'proposal.answer', id: part.id, answer: 'dismiss' })}
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium">
          {part.status === 'applied' ? <CheckIcon className="size-4" aria-hidden="true" /> : null}
          {part.status === 'applied' ? 'Applied' : 'Dismissed'}
        </p>
      )}
    </div>
  );
}

const checkedOn = (day: string) => `checked ${shortDay(day)} ${day.slice(0, 4)}`;

/**
 * `research`: the findings exactly as found, each with its numbered marker, then the sources below with
 * the date each was checked (§12.2 rule 6). A draft until you confirm it; Sen's own comment is a
 * separate message.
 */
function Research({ part, messageId }: { part: Extract<SenPart, { type: 'research' }>; messageId: string }) {
  const write = useWrite();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={part.confirmed ? 'default' : 'outline'}>
          {part.confirmed ? 'Confirmed' : 'Draft, not confirmed'}
        </Badge>
        <span className="text-xs text-muted-foreground">Research</span>
      </div>
      <p className="text-base font-semibold text-pretty wrap-anywhere">{part.question}</p>
      <ul className="flex flex-col gap-2">
        {part.findings.map((f, i) => (
          <li key={i} className="text-base text-pretty wrap-anywhere select-text">
            {f.text}{' '}
            <span className="num text-sm text-muted-foreground">
              <span className="sr-only">Source </span>[{f.source}]
            </span>
          </li>
        ))}
      </ul>
      <ol className="flex flex-col gap-1 border-t border-border pt-2" aria-label="Sources">
        {part.sources.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-2 text-left active:bg-accent"
              onClick={() => openInBrowser(s.url)}
              aria-label={`Source ${s.n}: ${s.title}, ${s.site}, ${checkedOn(s.checkedOn)}. Opens in your browser`}
            >
              <span className="num w-6 shrink-0 text-sm text-muted-foreground">[{s.n}]</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium wrap-anywhere">{s.title}</span>
                <span className="text-sm text-muted-foreground">
                  {s.site} · {checkedOn(s.checkedOn)}
                </span>
              </span>
              <ExternalLinkIcon className="size-4 shrink-0 text-icon" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {part.confirmed ? null : (
        <Button variant="secondary" size="sm" onClick={() => void write({ type: 'research.confirm', messageId })}>
          Confirm these figures
        </Button>
      )}
    </div>
  );
}

/**
 * `ask_user` (§12.3): buttons styled as a Review row, the recommended one first and marked. The tradeoffs
 * are said in words under the question. A row shows three answers at most, so a fourth option is for the
 * server to keep out of the draft (§12.3 allows 2–4; the skeleton's asks have three).
 */
/** A KL day, `2026-10-04`: what the gap's button carries as its record id (flows.md). */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The gap's ask (`ask:gap`): *Yes, I did* opens `manual` on the day the ask is about. */
function Ask({ part, message }: { part: Extract<SenPart, { type: 'ask' }>; message: SenMessage }) {
  const write = useWrite();
  const go = useGo();
  const setSenOpen = useUi((s) => s.setSenOpen);
  const gapDay = message.parts.find(
    (p): p is Extract<SenPart, { type: 'open' }> => p.type === 'open' && p.screen === 'manual' && DAY.test(p.id ?? ''),
  )?.id;
  if (part.answer)
    return (
      <p className="rounded-xl border border-border bg-card p-3 text-sm text-card-foreground">
        {part.question} <span className="font-medium">You chose: {part.answer}</span>
      </p>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      <ReviewRow
        question={part.question}
        knows={part.options.map((o) => (
          <span key={o.label} className="block">
            <span className="font-medium text-foreground">{o.label}.</span> {o.tradeoff}
          </span>
        ))}
        answers={part.options.map((o) => ({
          label: o.label,
          suggested: o.recommended,
          onSelect: async () => {
            const r = await write({ type: 'sen.answer', askId: part.id, answer: o.label }, { quiet: true });
            if (r && part.id === 'ask:gap' && gapDay && o.recommended) {
              setSenOpen(false);
              go('manual', { day: gapDay }, { replace: true });
            }
            return r ? { said: r.said, undo: r.undo } : null;
          },
        }))}
      />
    </div>
  );
}

/** `open_screen`: a button, never with an amount filled in. */
function Open({
  part,
  onOpen,
}: {
  part: Extract<SenPart, { type: 'open' }>;
  onOpen: (screen: string, id: string | null) => void;
}) {
  const go = useGo();
  const setSenOpen = useUi((s) => s.setSenOpen);
  // `manual` carries a day, not a record: it opens on that day
  const dayOnly = part.screen === 'manual' && DAY.test(part.id ?? '');
  return (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      onClick={() => {
        if (!dayOnly) return onOpen(part.screen, part.id);
        setSenOpen(false);
        go('manual', { day: part.id! }, { replace: true });
      }}
    >
      {part.label}
    </Button>
  );
}

export function Part({
  part,
  message,
  onOpen,
}: {
  part: SenPart;
  message: SenMessage;
  onOpen: (screen: string, id: string | null) => void;
}) {
  switch (part.type) {
    case 'text':
      return <Text runs={part.runs} />;
    case 'file':
      return <FileChip name={part.name} kind={part.kind} />;
    case 'proposal':
      return <Proposal part={part} />;
    case 'research':
      return <Research part={part} messageId={message.id} />;
    case 'ask':
      return <Ask part={part} message={message} />;
    case 'open':
      return <Open part={part} onOpen={onOpen} />;
  }
}

/** One message: yours on the right, Sen's on the left, with a check-in marked as one (§12.4). */
export function Message({
  message,
  onOpen,
}: {
  message: SenMessage;
  onOpen: (screen: string, id: string | null) => void;
}) {
  const mine = message.role === 'you';
  // a card sits on its own; text sits in a bubble
  const bubble = message.parts.filter((p) => p.type === 'text' || p.type === 'file');
  const cards = message.parts.filter((p) => p.type !== 'text' && p.type !== 'file');
  return (
    <li
      className={cn('flex flex-col gap-1.5', mine ? 'items-end' : 'items-start')}
      aria-label={mine ? 'You' : 'Sen'}
      aria-busy={message.streaming || undefined}
    >
      {message.checkin ? <p className="text-xs font-medium text-muted-foreground">Evening note</p> : null}
      {bubble.length ? (
        <div
          className={cn(
            'flex max-w-[88%] flex-col gap-2 rounded-2xl px-3.5 py-2.5',
            mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
          )}
        >
          {bubble.map((p, i) => (
            <Part key={i} part={p} message={message} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
      {cards.map((p, i) => (
        <div key={i} className="flex w-full max-w-[96%] flex-col">
          <Part part={p} message={message} onOpen={onOpen} />
        </div>
      ))}
      <p className="px-1 text-xs text-muted-foreground">
        {message.streaming ? 'Sen is answering…' : momentLabel(new Date(message.at))}
      </p>
    </li>
  );
}
