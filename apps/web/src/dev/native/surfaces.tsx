import type { ReactNode } from 'react';
import { formatSen } from '@sen/core/money';
import type { Command } from '@sen/core/commands';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/blocks/money';
import { toastDone } from '@/blocks/toast';
import { cn } from '@/lib/utils';
import { startDraft } from '@/data/hooks';
import { uid } from '@/data/fake/ids';
import { catId, rm } from '@/data/fake/scenario';
import type { ScreenSearch } from '@/router';
import type { SurfaceId } from './ids';

// The native surfaces of docs/screens.md, drawn as stand-ins in the look's tokens (D42): Android draws
// the real ones, outside the web app. Each is labelled a stand-in, and tapping it does what the table's
// last column says, with the screens' ids. Made-up names and amounts only.

/** What a tap can do: open a screen, change what the app is showing, or write as a button on the phone would. */
export interface Ctx {
  go: (id: string, search?: ScreenSearch) => void;
  write: (cmd: Command) => void;
  /** Sen's sheet opens over whatever screen is up (D68). */
  openSen: () => void;
  scenario: (id: 'payday' | 'capture-off') => void;
  /** Clears the stand-in off the screen, as swiping a notification away does. */
  dismiss: () => void;
}

interface Act {
  label: string;
  run: (c: Ctx) => void;
}

export type SurfaceGroup = 'Prompts' | 'Pushes' | 'Launcher and sharing' | 'The island';
export const SURFACE_GROUPS: SurfaceGroup[] = ['Prompts', 'Pushes', 'Launcher and sharing', 'The island'];

interface Def {
  id: SurfaceId;
  group: SurfaceGroup;
  kind: 'notification' | 'island' | 'shortcut' | 'share';
  /** The row in the list. */
  name: string;
  /** The line a notification shows beside its app, or an island's chip. */
  title: ReactNode;
  body?: ReactNode;
  buttons?: Act[];
  /** The tap on the body, and what it does in words (screens.md's "Tapping it"). */
  open: Act;
  does: string;
  /** An island's progress, as segments done of total. */
  segments?: [number, number];
}

const ROTI = uid('txn:roti-bakar');
const NASI = uid('txn:nasi-kandar');
const BBQ = uid('split:bbq');
const HAIDILAO = uid('split:haidilao');

const file = (category: string): Act => ({
  label: category,
  run: (c) => {
    c.write({ type: 'txn.category', id: ROTI, categoryId: catId(category), scope: 'rule' });
    c.dismiss();
  },
});
const scanRoti: Act = { label: 'Scan receipt', run: (c) => (c.dismiss(), c.go('scan', { id: ROTI })) };
const toReview = (c: Ctx) => (c.dismiss(), c.go('review'));
const said = (what: string, then?: (c: Ctx) => void): Act['run'] => {
  return (c) => {
    toastDone(`Simulated: ${what}`);
    then?.(c);
  };
};

export const SURFACES: Def[] = [
  {
    id: 'prompt-category',
    group: 'Prompts',
    kind: 'notification',
    name: 'Category prompt',
    title: (
      <>
        <Money sen={rm('9.50')} whole /> · ROTI BAKAR 88
      </>
    ),
    body: 'A new merchant. Pick a category, or scan the receipt.',
    buttons: [file('Meals'), file('Groceries'), scanRoti],
    open: { label: 'Open Review', run: toReview },
    does: 'A button answers it; the body opens Review.',
  },
  {
    id: 'prompt-payback',
    group: 'Prompts',
    kind: 'notification',
    name: 'Paying-back prompt',
    title: (
      <>
        <Money sen={rm('25.00')} whole /> to MEI LING TAN
      </>
    ),
    body: 'Matches a split you owe on. Works offline too.',
    buttons: [
      {
        label: 'Paying back: BBQ PLACE',
        run: (c) => {
          c.write({ type: 'share.paid', memberId: uid('member:hd:me'), byTransactionId: null });
          c.dismiss();
        },
      },
      { label: 'Other…', run: toReview },
    ],
    open: { label: 'Open Review', run: toReview },
    does: 'Ticks your share (D65).',
  },
  {
    id: 'prompt-scan',
    group: 'Prompts',
    kind: 'notification',
    name: 'Quiet scan prompt',
    title: (
      <>
        <Money sen={rm('58.30')} whole /> · NASI KANDAR ABC · Meals
      </>
    ),
    body: 'Clears itself after 10 minutes. Off in Settings → Capture.',
    buttons: [{ label: 'Scan receipt', run: (c) => (c.dismiss(), c.go('scan', { id: NASI })) }],
    open: { label: 'Scan this payment', run: (c) => (c.dismiss(), c.go('scan', { id: NASI })) },
    does: 'Opens scan for that payment.',
  },
  {
    id: 'owe-reminder',
    group: 'Prompts',
    kind: 'notification',
    name: 'Owe reminder',
    title: (
      <>
        You owe Mei <Money sen={rm('24.40')} whole />
      </>
    ),
    body: 'An hour after the split, once, if unpaid.',
    buttons: [
      {
        label: "I've paid",
        run: (c) => {
          c.write({ type: 'share.paid', memberId: uid('member:hd:me'), byTransactionId: null });
          c.dismiss();
        },
      },
      { label: 'Open the split', run: (c) => (c.dismiss(), c.go('split', { id: HAIDILAO })) },
    ],
    open: { label: 'Open the split', run: (c) => (c.dismiss(), c.go('split', { id: HAIDILAO })) },
    does: 'Opens split.',
  },
  {
    id: 'push-health',
    group: 'Pushes',
    kind: 'notification',
    name: 'Health alert: capture',
    title: 'Capture may be off',
    body: 'No notification from your apps since Thursday, 9:12 am.',
    open: { label: 'Open Home', run: (c) => (c.dismiss(), c.scenario('capture-off'), c.go('home')) },
    does: 'Opens home, with the fix.',
  },
  {
    id: 'push-jobs',
    group: 'Pushes',
    kind: 'notification',
    name: 'Health alert: daily jobs',
    title: 'Daily jobs have stopped',
    body: 'Sen has not run its morning job in over 26 hours.',
    open: { label: 'Open Home', run: (c) => (c.dismiss(), c.go('home')) },
    does: 'Opens home, with the fix.',
  },
  {
    id: 'push-sen',
    group: 'Pushes',
    kind: 'notification',
    name: "Sen's 9pm note",
    title: 'Sen',
    body: 'A quiet day: you spent less than a usual Sunday.',
    open: { label: 'Open Sen', run: (c) => (c.dismiss(), c.openSen()) },
    does: 'Opens sen. At most one push a day (§12.4).',
  },
  {
    id: 'push-budget',
    group: 'Pushes',
    kind: 'notification',
    name: "Sen's push: a budget",
    title: 'Sen',
    body: 'Drinks & desserts is at 80% of its budget, with 12 days to go.',
    open: { label: 'Open Home', run: (c) => (c.dismiss(), c.go('home')) },
    does: 'Opens home.',
  },
  {
    id: 'push-payday',
    group: 'Pushes',
    kind: 'notification',
    name: "Sen's push: payday",
    title: 'Payday',
    body: 'Your salary landed. Two minutes to start the cycle well.',
    open: { label: 'Open Home', run: (c) => (c.dismiss(), c.scenario('payday'), c.go('home')) },
    does: 'Opens home, on payday.',
  },
  {
    id: 'push-claim',
    group: 'Pushes',
    kind: 'notification',
    name: 'Claim reminder: 3 days before',
    title: 'Claims are due in 3 days',
    body: 'Your October medical claim is drafted and waiting.',
    open: { label: 'Open the claim', run: (c) => (c.dismiss(), c.go('claim')) },
    does: 'Opens claim.',
  },
  {
    id: 'push-claim-day',
    group: 'Pushes',
    kind: 'notification',
    name: 'Claim reminder: on the day',
    title: 'Claims are due today',
    body: 'Your October medical claim is not sent yet.',
    open: { label: 'Open the claim', run: (c) => (c.dismiss(), c.go('claim')) },
    does: 'Opens claim.',
  },
  {
    id: 'push-export',
    group: 'Pushes',
    kind: 'notification',
    name: 'Export ready',
    title: 'Your export is ready',
    body: 'The link works for 24 hours.',
    open: { label: 'Download', run: said('the download opens', (c) => c.dismiss()) },
    does: 'Opens the download.',
  },
  {
    id: 'shortcut-scan',
    group: 'Launcher and sharing',
    kind: 'shortcut',
    name: 'Launcher shortcut: Scan receipt',
    title: 'Scan receipt',
    open: { label: 'Scan receipt', run: (c) => (c.dismiss(), c.go('scan')) },
    does: 'Opens scan.',
  },
  {
    id: 'shortcut-manual',
    group: 'Launcher and sharing',
    kind: 'shortcut',
    name: 'Launcher shortcut: Add expense',
    title: 'Add expense',
    open: { label: 'Add expense', run: (c) => (c.dismiss(), c.go('manual')) },
    does: 'Opens manual.',
  },
  {
    id: 'share-receipt',
    group: 'Launcher and sharing',
    kind: 'share',
    name: 'Share target: Sen · Receipt',
    title: 'Sen · Receipt',
    body: 'A PDF or an image shared from another app.',
    open: {
      label: 'Share as a receipt',
      run: (c) => {
        c.dismiss();
        // uploads it as a receipt, then `reading` (screens.md); the fake reads a made-up one
        void startDraft(null, null)
          .then((id) => c.go('reading', { id }))
          .catch(() => c.go('reading'));
      },
    },
    does: 'Uploads it as a receipt, then opens reading (D123).',
  },
  {
    id: 'share-ask',
    group: 'Launcher and sharing',
    kind: 'share',
    name: 'Share target: Ask Sen',
    title: 'Ask Sen',
    body: 'A file or screenshot to ask Sen about, not to keep as a receipt.',
    open: { label: 'Ask Sen', run: (c) => (c.dismiss(), c.openSen()) },
    does: 'Opens sen with the file attached.',
  },
  {
    id: 'island-paid',
    group: 'The island',
    kind: 'island',
    name: 'Just paid',
    title: <>−{formatSen(rm('9.50'))}</>,
    body: 'ROTI BAKAR 88 · for 10 minutes',
    buttons: [file('Meals'), file('Groceries'), scanRoti],
    open: { label: 'Open Review', run: toReview },
    does: 'The category prompt, in the island, for 10 minutes.',
  },
  {
    id: 'island-reading',
    group: 'The island',
    kind: 'island',
    name: 'Reading a receipt',
    title: '6 items · RM45.60 · Check',
    body: 'Reading…',
    open: { label: 'Open the receipt', run: (c) => (c.dismiss(), c.go('reading')) },
    does: 'Opens reading.',
  },
  {
    id: 'island-split',
    group: 'The island',
    kind: 'island',
    name: 'A split at the table',
    title: '2 of 4 ticked',
    body: 'KEDAI MEE ABC · until it locks',
    segments: [2, 4],
    open: { label: 'Open the split', run: (c) => (c.dismiss(), c.go('split', { id: BBQ })) },
    does: 'Opens split.',
  },
  {
    id: 'island-paying',
    group: 'The island',
    kind: 'island',
    name: 'Paying a friend',
    title: 'Mei · RM24.40',
    body: 'Until TNG’s notification ticks the share',
    open: { label: 'Open the split', run: (c) => (c.dismiss(), c.go('split', { id: HAIDILAO })) },
    does: 'Opens split.',
  },
  {
    id: 'island-payday',
    group: 'The island',
    kind: 'island',
    name: 'Payday moves',
    title: '3 of 5 moves',
    body: 'Each segment fills as its notification lands',
    segments: [3, 5],
    open: { label: 'Open Payday', run: (c) => (c.dismiss(), c.scenario('payday'), c.go('payday')) },
    does: 'Opens payday.',
  },
  {
    id: 'island-ess',
    group: 'The island',
    kind: 'island',
    name: 'ESS filing',
    title: 'Sending October claims · 2 of 3',
    body: 'Then the reference',
    segments: [2, 3],
    open: { label: 'Open Claims', run: (c) => (c.dismiss(), c.go('claims')) },
    does: 'Opens claims.',
  },
  {
    id: 'island-sen',
    group: 'The island',
    kind: 'island',
    name: 'Sen working',
    title: 'Answer ready',
    body: 'Sen’s state, then the answer',
    open: { label: 'Open Sen', run: (c) => (c.dismiss(), c.openSen()) },
    does: 'Opens sen.',
  },
];

export const surfaceById = new Map(SURFACES.map((d) => [d.id, d]));

const KIND_LABEL: Record<Def['kind'], string> = {
  notification: 'Notification',
  island: 'Island',
  shortcut: 'Launcher shortcut',
  share: 'Android’s share sheet',
};

/** The stand-in label every one carries: Android draws the real thing (D42). */
function StandIn({ kind }: { kind: Def['kind'] }) {
  return (
    <Badge variant="outline" className="shrink-0 bg-background text-foreground">
      Stand-in · {KIND_LABEL[kind]}
    </Badge>
  );
}

/** Android draws a notification, so this only borrows the look's colours and radius. */
export function Surface({ id, ctx }: { id: SurfaceId; ctx: Ctx }) {
  const d = surfaceById.get(id);
  if (!d) return null;
  const island = d.kind === 'island';
  return (
    <article
      aria-label={`${d.name}, a stand-in`}
      data-testid={`surface-${id}`}
      className={cn(
        'flex flex-col gap-2 border border-border bg-card p-3 text-card-foreground shadow-sm',
        island ? 'rounded-[2rem] bg-foreground text-background' : 'rounded-xl',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium opacity-80">{island ? 'Sen' : 'Sen · now'}</span>
        <StandIn kind={d.kind} />
      </div>
      <button
        type="button"
        onClick={() => d.open.run(ctx)}
        aria-label={`${d.open.label}. ${d.does}`}
        className="flex min-h-12 flex-col items-start gap-0.5 rounded-md text-left"
      >
        <span className="text-base font-semibold">{d.title}</span>
        {d.body ? (
          <span className={cn('text-sm', island ? 'opacity-80' : 'text-muted-foreground')}>{d.body}</span>
        ) : null}
      </button>
      {d.segments ? (
        <div className="flex gap-1" role="img" aria-label={`${d.segments[0]} of ${d.segments[1]} done`}>
          {Array.from({ length: d.segments[1] }, (_, i) => (
            <span
              key={i}
              className={cn('h-1.5 flex-1 rounded-full', i < d.segments![0] ? 'bg-primary' : 'bg-background/30')}
            />
          ))}
        </div>
      ) : null}
      {d.buttons ? (
        <div className="flex flex-wrap gap-2">
          {d.buttons.map((b) => (
            <Button key={b.label} variant={island ? 'secondary' : 'outline'} size="sm" onClick={() => b.run(ctx)}>
              {b.label}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
