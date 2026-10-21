import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { BusIcon, CheckIcon, CoffeeIcon, ShoppingBagIcon, UtensilsIcon, type LucideIcon } from 'lucide-react';
import type { LookId } from '@sen/looks';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import { HeaderCard } from '@/blocks/facts';
import { GroupCard, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { ListRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { toastUndo } from '@/blocks/toast';
import { AppBar } from '@/frame/app-bar';
import { useTheme, useReducedMotion } from '@/theme/store';

// B05 · Feel's motion demo (/dev/gallery/motion): the owner tries each variant on the phone and picks
// one of each before the motion system is built. Self-contained: nothing here is the app's motion yet.
// Made-up payments only (D11). Never in production.

type ScreenMotion = 'push' | 'fade-through' | 'fade';
type Speed = 150 | 200 | 250;
type Press = 'scale' | 'tint' | 'ripple';
type PerLook = 'one' | 'tuned';

// "Tuned per look": each look scales the shared duration and picks its own easing, in its character.
// Only for trying the idea; the recommendation is one motion for all six.
const TUNING: Record<LookId, { x: number; ease: string; note: string }> = {
  minted: { x: 1, ease: 'cubic-bezier(0.2, 0, 0, 1)', note: 'standard' },
  copper: { x: 1.2, ease: 'cubic-bezier(0.3, 0, 0.1, 1)', note: 'slower, soft' },
  firefly: { x: 1.15, ease: 'cubic-bezier(0.4, 0, 0.2, 1)', note: 'gentle in and out' },
  instrument: { x: 0.85, ease: 'cubic-bezier(0.05, 0.7, 0.1, 1)', note: 'quick, precise' },
  line: { x: 1, ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)', note: 'even' },
  mercury: { x: 1.1, ease: 'cubic-bezier(0.34, 1.3, 0.64, 1)', note: 'fluid, a slight overshoot' },
};
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

interface Pay {
  id: string;
  icon: LucideIcon;
  title: string;
  secondary: string;
  sen: number;
}
const PAYMENTS: Pay[] = [
  { id: 'p1', icon: UtensilsIcon, title: 'Nasi Kandar Pelita', secondary: 'Meals · Touch ’n Go', sen: 1890 },
  { id: 'p2', icon: CoffeeIcon, title: 'ZUS Coffee', secondary: 'Drinks & desserts · Ryt Bank', sen: 1290 },
  { id: 'p3', icon: BusIcon, title: 'Grab', secondary: 'Transport · Grab', sen: 2350 },
  { id: 'p4', icon: ShoppingBagIcon, title: 'Uniqlo', secondary: 'Shopping · Public Bank', sen: 15990 },
];
const QUESTIONS = [
  { id: 'q1', q: 'RM42.00 at Jaya Grocer', k: 'Groceries, like last time?' },
  { id: 'q2', q: 'RM8.50 at Family Mart', k: 'Meals or Groceries?' },
  { id: 'q3', q: 'RM120.00 to Ahmad', k: 'A transfer to a friend' },
  { id: 'q4', q: 'RM15.90 at Watsons', k: 'Health or Shopping?' },
];

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/** Runs a DOM change inside a view transition tagged with `kind`, or straight away where there's none. */
function transition(kind: string, change: () => void, reduced: boolean) {
  const doc = document as DocWithVT;
  if (reduced || !doc.startViewTransition) {
    change();
    return;
  }
  const html = document.documentElement;
  html.dataset.demoVt = kind;
  const t = doc.startViewTransition(() => flushSync(change));
  void t.finished.finally(() => {
    if (html.dataset.demoVt === kind) delete html.dataset.demoVt;
  });
}

function css(motion: ScreenMotion, ms: number, ease: string) {
  const d = `${ms}ms`;
  const screen = {
    push: {
      fwdOld: 'demo-out-left',
      fwdNew: 'demo-in-right',
      backOld: 'demo-out-right',
      backNew: 'demo-in-left',
    },
    'fade-through': {
      fwdOld: 'demo-fade-out',
      fwdNew: 'demo-through-in',
      backOld: 'demo-fade-out',
      backNew: 'demo-through-in',
    },
    fade: { fwdOld: 'demo-fade-out', fwdNew: 'demo-fade-in', backOld: 'demo-fade-out', backNew: 'demo-fade-in' },
  }[motion];
  return `
.demo-stage { view-transition-name: demo-stage; }
html[data-demo-vt] [data-demo-shared] [data-sen], html[data-demo-vt] [data-demo-figure] [data-sen] { view-transition-name: demo-amount; }
html[data-demo-vt=clear] [data-demo-row] { view-transition-name: var(--demo-n); view-transition-class: demo-row; }
::view-transition-group(root) { animation: none; }
::view-transition-old(root), ::view-transition-new(root) { animation: none; }
::view-transition-group(*) { animation-duration: ${d}; animation-timing-function: ${ease}; }
html[data-demo-vt=forward]::view-transition-old(demo-stage) { animation: ${d} ${ease} both ${screen.fwdOld}; }
html[data-demo-vt=forward]::view-transition-new(demo-stage) { animation: ${d} ${ease} both ${screen.fwdNew}; }
html[data-demo-vt=back]::view-transition-old(demo-stage) { animation: ${d} ${ease} both ${screen.backOld}; }
html[data-demo-vt=back]::view-transition-new(demo-stage) { animation: ${d} ${ease} both ${screen.backNew}; }
html[data-demo-vt=back]::view-transition-old(demo-stage) { z-index: 1; }
html[data-demo-vt=tab]::view-transition-old(demo-stage) { animation: ${d} ${ease} both demo-fade-out; }
html[data-demo-vt=tab]::view-transition-new(demo-stage) { animation: ${d} ${ease} both demo-fade-in; }
::view-transition-old(*.demo-row):only-child { animation: ${d} ${ease} both demo-row-out; }
::view-transition-new(*.demo-row):only-child { animation: ${d} ${ease} both demo-row-in; }
@keyframes demo-in-right { from { transform: translateX(100%); } }
@keyframes demo-out-left { to { transform: translateX(-25%); opacity: 0.6; } }
@keyframes demo-in-left { from { transform: translateX(-25%); opacity: 0.6; } }
@keyframes demo-out-right { to { transform: translateX(100%); } }
@keyframes demo-fade-out { to { opacity: 0; } }
@keyframes demo-fade-in { from { opacity: 0; } }
@keyframes demo-through-in { 0%, 35% { opacity: 0; transform: scale(0.94); } }
@keyframes demo-row-out { to { opacity: 0; transform: translateX(-30%); } }
@keyframes demo-row-in { from { opacity: 0; transform: translateY(-8px); } }

/* press feedback: the page's own active tints are cancelled, so only the chosen one shows */
.demo-press :is([data-slot=button], [data-slot=item], [data-slot=toggle-group-item]) {
  transition: transform 150ms ${EASE}, background-color 150ms ${EASE};
}
.demo-press :is([data-slot=button], [data-slot=item]):active { background-color: revert-layer; }
.demo-press[data-press=scale] [data-pressed] { transform: scale(0.96); transition-duration: 50ms; }
.demo-press[data-press=scale] [data-slot=item][data-pressed] { transform: scale(0.985); }
.demo-press[data-press=tint] [data-pressed] { position: relative; }
.demo-press[data-press=tint] [data-pressed]::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: currentColor; opacity: 0.12;
}
.demo-press[data-press=ripple] :is([data-slot=button], [data-slot=item], [data-slot=toggle-group-item]) { position: relative; overflow: hidden; }
.demo-ripple {
  position: absolute; border-radius: 9999px; pointer-events: none; background: currentColor;
  opacity: 0.16; transform: scale(0); animation: demo-ripple 350ms ${EASE} forwards;
}
.demo-ripple[data-up] { opacity: 0; transition: opacity 250ms linear; }
@keyframes demo-ripple { to { transform: scale(1); } }
`;
}

const PRESSABLE = '[data-slot=button], [data-slot=item], [data-slot=toggle-group-item]';

/** Marks the pressed control at once, on pointerdown, so feedback lands in the first frame. */
function usePress(press: Press) {
  return (e: ReactPointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>(PRESSABLE);
    if (!el) return;
    el.dataset.pressed = '';
    let ripple: HTMLSpanElement | null = null;
    if (press === 'ripple') {
      const r = el.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      ripple = document.createElement('span');
      ripple.className = 'demo-ripple';
      Object.assign(ripple.style, {
        width: `${size}px`,
        height: `${size}px`,
        left: `${e.clientX - r.left - size / 2}px`,
        top: `${e.clientY - r.top - size / 2}px`,
      });
      el.appendChild(ripple);
    }
    const up = () => {
      delete el.dataset.pressed;
      if (ripple) {
        const rp = ripple;
        rp.dataset.up = '';
        window.setTimeout(() => rp.remove(), 300);
      }
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
}

function Pick<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(value)}
        onValueChange={(v) => {
          const hit = options.find(([o]) => String(o) === v);
          if (hit) onChange(hit[0]);
        }}
        className="w-full"
      >
        {options.map(([o, name]) => (
          <ToggleGroupItem key={String(o)} value={String(o)} className="min-h-12 flex-1">
            {name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export default function MotionDemo() {
  const lookId = useTheme((s) => s.look);
  const reduced = useReducedMotion();
  const [motion, setMotion] = useState<ScreenMotion>('push');
  const [speed, setSpeed] = useState<Speed>(200);
  const [press, setPress] = useState<Press>('scale');
  const [perLook, setPerLook] = useState<PerLook>('one');
  const tune = perLook === 'tuned' ? TUNING[lookId] : { x: 1, ease: EASE, note: '' };
  const ms = Math.round(speed * tune.x);

  // The detail is one history step, so Back and the back gesture pop it like a real screen.
  const { v } = useSearch({ from: '/dev/gallery/motion' });
  const navigate = useNavigate();
  const [shown, setShown] = useState<string | undefined>(v);
  const [selected, setSelected] = useState<string>('p1');
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (v === shown) return;
    transition(v ? 'forward' : 'back', () => setShown(v), reduced);
  }, [v, shown, reduced]);

  const [tab, setTab] = useState<'payments' | 'review'>('payments');
  const [rows, setRows] = useState(QUESTIONS);
  const [sheet, setSheet] = useState(false);
  const pay = PAYMENTS.find((p) => p.id === shown);
  const onPointerDown = usePress(press);

  // cleared rows come back after a while, so the demo never runs dry
  useEffect(() => {
    if (rows.length > 1) return;
    const t = window.setTimeout(() => transition('clear', () => setRows(QUESTIONS), reduced), 1200);
    return () => window.clearTimeout(t);
  }, [rows, reduced]);

  const picks = `${{ push: 'Push', 'fade-through': 'Fade-through', fade: 'Fade' }[motion]} · ${speed} ms · ${
    { scale: 'Scale', tint: 'Tint', ripple: 'Ripple' }[press]
  } · ${perLook === 'one' ? 'One motion' : 'Tuned per look'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <style>{css(motion, ms, tune.ease)}</style>
      <AppBar title="Motion" />
      <div className="scroll-area min-h-0 flex-1 pb-8">
        <div className="flex flex-col gap-4">
          <p className="px-5 text-sm text-pretty text-muted-foreground">
            Try each choice on the phone below, then tell Sen your picks. The look, light or dark and reduced motion are
            in the dev panel.
          </p>

          <Card className="mx-4 gap-0 divide-y divide-border py-0">
            <Pick
              label="Screen change"
              value={motion}
              onChange={setMotion}
              options={[
                ['push', 'Push'],
                ['fade-through', 'Fade-through'],
                ['fade', 'Fade'],
              ]}
            />
            <Pick
              label="Speed"
              value={speed}
              onChange={setSpeed}
              options={[
                [150, '150 ms'],
                [200, '200 ms'],
                [250, '250 ms'],
              ]}
            />
            <Pick
              label="Press feedback"
              value={press}
              onChange={setPress}
              options={[
                ['scale', 'Scale'],
                ['tint', 'Tint'],
                ['ripple', 'Ripple'],
              ]}
            />
            <Pick
              label="Across the six looks"
              value={perLook}
              onChange={setPerLook}
              options={[
                ['one', 'One motion'],
                ['tuned', 'Tuned per look'],
              ]}
            />
            <p className="px-4 py-3 text-sm text-pretty" aria-live="polite">
              Your picks: <span className="font-medium">{picks}</span>
              {perLook === 'tuned' ? (
                <span className="text-muted-foreground">
                  {' '}
                  ({lookId}: {ms} ms, {tune.note})
                </span>
              ) : null}
              {reduced ? (
                <span className="text-muted-foreground"> · reduced motion is on, so nothing moves</span>
              ) : null}
            </p>
          </Card>

          <div className="demo-press flex flex-col gap-4" data-press={press} onPointerDown={onPointerDown}>
            {/* the stage: a small Sen, full width, so a push slides in from the screen's edge */}
            <div className="demo-stage flex min-h-[29rem] flex-col gap-3 border-y border-border bg-background py-3">
              {shown && pay ? (
                <>
                  <AppBar title="Payment" onBack={() => window.history.back()} />
                  <HeaderCard
                    title={pay.title}
                    figure={
                      <span data-demo-figure="" className="inline-block">
                        <Money sen={pay.sen} kind="out" />
                      </span>
                    }
                    meta={pay.secondary}
                    source="From a made-up notification"
                  />
                  <GroupCard>
                    <NavRow title="Category" value={pay.secondary.split(' · ')[0]} onOpen={() => setSheet(true)} />
                    <NavRow title="Note" value="None" onOpen={() => setSheet(true)} />
                  </GroupCard>
                </>
              ) : (
                <>
                  <div className="px-4">
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={tab}
                      onValueChange={(t) => {
                        if (t === 'payments' || t === 'review') transition('tab', () => setTab(t), reduced);
                      }}
                      className="w-full"
                    >
                      <ToggleGroupItem value="payments" className="min-h-12 flex-1">
                        Payments (push)
                      </ToggleGroupItem>
                      <ToggleGroupItem value="review" className="min-h-12 flex-1">
                        Review (clear)
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {tab === 'payments' ? (
                    <GroupCard label="Today" footer="Tap a payment: its amount stays in place as the detail opens.">
                      {PAYMENTS.map((p) => (
                        <div key={p.id} data-demo-shared={p.id === selected ? '' : undefined}>
                          <ListRow
                            icon={p.icon}
                            title={p.title}
                            secondary={p.secondary}
                            sen={p.sen}
                            onOpen={() => {
                              flushSync(() => setSelected(p.id));
                              void navigate({ to: '/dev/gallery/motion', search: { v: p.id } });
                            }}
                          />
                        </div>
                      ))}
                    </GroupCard>
                  ) : (
                    <div className="flex flex-col gap-3 px-4">
                      {rows.map((r) => (
                        <div key={r.id} data-demo-row="" style={{ ['--demo-n' as string]: `demo-${r.id}` }}>
                          <Card className="gap-2 p-3">
                            <div>
                              <p className="font-semibold">{r.q}</p>
                              <p className="text-sm text-muted-foreground">{r.k}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="chip"
                                onClick={() => {
                                  transition('clear', () => setRows((rs) => rs.filter((x) => x.id !== r.id)), reduced);
                                  toastUndo('Confirmed', () =>
                                    transition(
                                      'clear',
                                      () =>
                                        setRows((rs) =>
                                          rs.some((x) => x.id === r.id)
                                            ? rs
                                            : QUESTIONS.filter((q) => q.id === r.id || rs.some((x) => x.id === q.id)),
                                        ),
                                      reduced,
                                    ),
                                  );
                                }}
                              >
                                <CheckIcon />
                                Confirm
                              </Button>
                              <Button variant="ghost" size="chip" onClick={() => setSheet(true)}>
                                Other…
                              </Button>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <GroupCard label="Press anything" footer="Buttons, chips and rows all answer the same way.">
              <div className="flex flex-wrap gap-2 p-4">
                <Button>Confirm</Button>
                <Button variant="outline">Edit</Button>
                <Button variant="outline" size="chip">
                  Meals
                </Button>
                <Button variant="outline" size="chip">
                  Groceries
                </Button>
              </div>
              <NavRow title="Open a sheet" onOpen={() => setSheet(true)} />
            </GroupCard>
          </div>
        </div>
      </div>
      <Sheet open={sheet} onOpenChange={setSheet} title="A sheet">
        <p className="pb-4 text-sm text-muted-foreground">Sheets rise and fall the same way in every choice.</p>
        <Button className="w-full" onClick={() => setSheet(false)}>
          Done
        </Button>
      </Sheet>
    </div>
  );
}
