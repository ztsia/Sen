import { useState, type ReactNode } from 'react';
import {
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  CircleCheckIcon,
  HandCoinsIcon,
  LightbulbIcon,
  PiggyBankIcon,
  Undo2Icon,
  WalletIcon,
} from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { PaydayStep, PaydayView } from '@sen/core/views';
import { GroupCard, GroupLabel, NavRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { IconTile } from '@/blocks/tile';
import { toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBalanceCheck, usePayday, useWrite } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { Loaded, useGo } from '../kit';
import { BalanceForm } from './balance-form';

const TITLES: Record<PaydayStep, string> = {
  claims: 'Your claims',
  balance: 'Check your balances',
  'look-back': 'Last cycle',
  plan: "This cycle's plan",
};

/**
 * Payday (screens.md, spec §9.7, D60, D104): a full-screen task, one step per screen, up to four: the
 * claims (already answered by the payslip, with Undo, or asked), the balance check, last cycle's
 * look-back and this cycle's plan. Each step has Skip, and a skipped step waits in Review. The steps a
 * person can't use aren't there (D52).
 */
export default function Payday() {
  const q = usePayday();
  return (
    <Screen bar={<AppBar title="Payday" />}>
      <Loaded q={q} what="your payday">
        {(v) => (v ? <Steps v={v} /> : <Nothing />)}
      </Loaded>
    </Screen>
  );
}

function Nothing() {
  const go = useGo();
  return (
    <EmptyState
      icon={CircleCheckIcon}
      title="Nothing to go through"
      line="There's no payday to go through right now."
      action={{ label: 'Back to Home', onSelect: () => go('home') }}
    />
  );
}

function Steps({ v }: { v: PaydayView }) {
  const go = useGo();
  const write = useWrite();
  const [i, setI] = useState(0);
  const step = v.steps[i];
  const last = i >= v.steps.length - 1;

  /** Past the last step the payday is done: with the plan, Home counts its moves; without, the card goes. */
  const finish = async (usePlan: boolean) => {
    await write({ type: 'payday.plan', use: usePlan });
    go('home', {}, { replace: true });
  };
  const next = () => {
    if (last) void finish(false);
    else setI(i + 1);
  };
  const skip = async () => {
    if (!step) return;
    await write({ type: 'payday.skip', step });
    next();
  };

  if (!step) {
    // a person with nothing to go through (no claims, no capture, no Sen): the card just clears
    return (
      <EmptyState
        icon={CircleCheckIcon}
        title="Salary landed"
        line="Your salary landed. There's nothing to go through this payday."
        action={{ label: 'Done', onSelect: () => void finish(false) }}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-1">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Step {i + 1} of {v.steps.length}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void skip()}>
          Skip
        </Button>
      </header>
      <div className="flex gap-1.5 px-4 pt-2" aria-hidden="true">
        {v.steps.map((s, n) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${n <= i ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
      <div className="px-4 pt-3">
        <h2 className="text-2xl font-semibold text-pretty">{TITLES[step]}</h2>
        <p className="text-sm text-muted-foreground">
          Your salary of <Money sen={v.salary} className="font-normal text-foreground" whole /> landed.
        </p>
      </div>
      <div className="flex flex-1 flex-col pt-4">
        {step === 'claims' && v.claims ? <ClaimsStep c={v.claims} onNext={next} /> : null}
        {step === 'balance' ? <BalanceStep onSaved={next} /> : null}
        {step === 'look-back' && v.lookBack ? <LookBack l={v.lookBack} onNext={next} /> : null}
        {step === 'plan' && v.plan ? <Plan p={v.plan} onUse={() => void finish(true)} /> : null}
      </div>
    </div>
  );
}

/** The footer every step ends in: its one next action, in thumb reach. */
function Foot({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-4">
      {children}
    </div>
  );
}

function ClaimsStep({ c, onNext }: { c: NonNullable<PaydayView['claims']>; onNext: () => void }) {
  const write = useWrite();
  const [answer, setAnswer] = useState<'yes' | 'no'>('yes');
  const total = c.claims.reduce((s, x) => s + x.sen, 0);
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4">
        {c.answered ? (
          <>
            <StatusCard
              icon={CircleCheckIcon}
              state="Done"
              status="done"
              title={
                c.claims.length ? (
                  <>
                    Your payslip matched, so Sen split <Money sen={total} whole /> of claims from your salary.
                  </>
                ) : (
                  'No claims were in this salary.'
                )
              }
              waiting="The payslip arrived by itself, a few minutes after the salary."
            />
            {c.claims.length ? (
              <GroupCard className="-mx-4">
                {c.claims.map((x) => (
                  <NavRow key={x.label} icon={HandCoinsIcon} title={x.label} value={formatSen(x.sen)} />
                ))}
              </GroupCard>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => void write({ type: 'payday.claims', answer: 'undo' })}
            >
              <Undo2Icon aria-hidden="true" />
              Undo
            </Button>
          </>
        ) : (
          <Field>
            <FieldLabel id="claims-q">Did this salary include your claims?</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={2}
              aria-labelledby="claims-q"
              value={answer}
              onValueChange={(x) => {
                if (x === 'yes' || x === 'no') setAnswer(x);
              }}
            >
              <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
              <ToggleGroupItem value="no">No</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-sm text-muted-foreground">
              Yes splits them out of your salary, so they aren't counted as income.
            </p>
          </Field>
        )}
      </div>
      <Foot>
        <Button
          onClick={() => {
            if (c.answered) onNext();
            else void write({ type: 'payday.claims', answer }).then((r) => r && onNext());
          }}
        >
          Next
        </Button>
      </Foot>
    </>
  );
}

function BalanceStep({ onSaved }: { onSaved: () => void }) {
  const q = useBalanceCheck();
  return (
    <Loaded q={q} what="your balances">
      {(v) => <BalanceForm v={v} onSaved={onSaved} />}
    </Loaded>
  );
}

function LookBack({ l, onNext }: { l: NonNullable<PaydayView['lookBack']>; onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-5">
          <GroupCard label="Sen's three reasons it went the way it did">
            {l.reasons.map((r) => (
              <NavRow key={r.label} icon={ChartNoAxesColumnIcon} title={r.label} value={formatSen(r.sen)} />
            ))}
          </GroupCard>
          <section className="flex flex-col gap-2 px-4" aria-label="One thing to try this cycle">
            <GroupLabel>One thing to try this cycle</GroupLabel>
            <Card className="gap-3 px-4 py-4">
              <p className="flex items-start gap-3 text-base">
                <IconTile icon={LightbulbIcon} tone="accent" />
                <span className="min-w-0 flex-1 pt-1">{l.experiment}</span>
              </p>
              {/* a stand-in: the experiment is counted by code once Sen is built (§12.1, B30) */}
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => toastDone('Sen will count it this cycle and tell you where you are')}
              >
                Track it
              </Button>
            </Card>
          </section>
        </div>
      </div>
      <Foot>
        <Button onClick={onNext}>Next</Button>
      </Foot>
    </>
  );
}

const PLAN_TITLE = { due: 'Due this cycle', aside: 'Set aside', spend: 'Left to spend' } as const;
const PLAN_ICON = { due: CalendarClockIcon, aside: PiggyBankIcon, spend: WalletIcon } as const;

function Plan({ p, onUse }: { p: NonNullable<PaydayView['plan']>; onUse: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-5">
        {(['due', 'aside', 'spend'] as const).map((kind) => {
          const lines = p.lines.filter((l) => l.kind === kind);
          if (!lines.length) return null;
          return (
            <GroupCard key={kind} label={PLAN_TITLE[kind]}>
              {lines.map((l) => (
                <NavRow key={l.label} icon={PLAN_ICON[kind]} title={l.label} value={formatSen(l.sen)} />
              ))}
            </GroupCard>
          );
        })}
        <p className="px-4 pt-4 text-sm text-muted-foreground">
          Each move ticks off on Home as its notification arrives.
        </p>
      </div>
      <Foot>
        <Button onClick={onUse}>Use this plan</Button>
      </Foot>
    </>
  );
}
