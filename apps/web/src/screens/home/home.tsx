import { useState } from 'react';
import { CalendarCheckIcon, ChevronRightIcon, CloudOffIcon, PartyPopperIcon, TriangleAlertIcon } from 'lucide-react';
import { formatSen } from '@sen/core/money';
import type { HomeView } from '@sen/core/views';
import { MiniPace } from '@/blocks/charts';
import { HeroFigure } from '@/blocks/hero';
import { Money } from '@/blocks/money';
import { HealthBar, StatusCard } from '@/blocks/status';
import { Avatar } from '@/components/look/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useHome } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useUi } from '@/frame/ui-store';
import { momentLabel, shortDay } from '@/lib/dates';
import { Loaded, useGo } from '../kit';
import { CycleSheet } from './cycle-sheet';
import { HomeMaterial } from './material';

/**
 * Home (screens.md, D59, D68): what's left until payday, and am I on track? At most four figures
 * (§9.2): the large figure, pace, and the quiet row's balance and gap; Review's count is the tab's badge.
 */
export default function Home() {
  const q = useHome();
  return (
    <Screen bar={<AppBar title="Home" home />} senRoom>
      <h2 className="sr-only">Home</h2>
      <Loaded q={q} what="Home" skeleton={<HomeSkeleton />}>
        {(h) => <HomeBody h={h} />}
      </Loaded>
    </Screen>
  );
}

const FIGURE_LABEL: Record<HomeView['figure']['kind'], string> = {
  left: 'Left until payday',
  'since-start': 'Spent since you started',
  month: 'Spent this month',
};

function HomeBody({ h }: { h: HomeView }) {
  const go = useGo();
  const setSenOpen = useUi((s) => s.setSenOpen);
  const [cycleOpen, setCycleOpen] = useState(false);
  const f = h.figure;
  const month = h.cycle.basis === 'month';
  const label = f.over ? 'Over by' : FIGURE_LABEL[f.kind];
  const sub = `${f.daysToGo} ${f.daysToGo === 1 ? 'day' : 'days'} to go${month ? ' this month' : ''}`;
  const unit = month ? 'month' : 'cycle';

  return (
    <HomeMaterial payday={h.payday?.stage === 'card'}>
      <div className="flex flex-col gap-4 px-4 pt-1">
        {h.health.map((w) => (
          <HealthBar
            key={w.key}
            icon={TriangleAlertIcon}
            title={w.title}
            detail={w.detail}
            fix={w.fix}
            onFix={() => go('settings/capture')}
          />
        ))}

        {h.payday?.stage === 'card' ? (
          <Card className="gap-3">
            <CardContent className="flex flex-col gap-3">
              <p className="inline-flex items-center gap-2 font-semibold">
                <PartyPopperIcon className="size-5 text-icon" aria-hidden="true" />
                Payday
              </p>
              <p>Your salary landed. Take two minutes to start {h.cycle.label} well.</p>
              <Button size="lg" onClick={() => go('payday')}>
                Start
              </Button>
            </CardContent>
          </Card>
        ) : h.payday?.stage === 'progress' ? (
          <button type="button" className="text-left" onClick={() => go('payday')}>
            <StatusCard
              icon={CalendarCheckIcon}
              state={`${h.payday.done} of ${h.payday.of} moves done`}
              status="waiting"
              title={`${h.cycle.label}'s payday plan`}
              waiting="Each move ticks itself when its notification lands."
            />
          </button>
        ) : null}

        <button
          type="button"
          className="home-hero -mx-1 rounded-xl px-1 text-left active:bg-accent"
          aria-label={`${label}, ${formatSen(Math.abs(f.sen))}, ${sub}. How it's worked out`}
          onClick={() => setCycleOpen(true)}
          data-testid="hero"
        >
          <HeroFigure
            label={label}
            sen={Math.abs(f.sen)}
            sub={sub}
            day={f.day}
            days={f.days}
            state={{ over: f.over, spent: f.spent, income: f.income, spentByDay: f.spentByDay }}
          />
        </button>

        <Item asChild size="sm" variant="outline" className="w-full flex-nowrap text-left active:bg-accent">
          <button type="button" onClick={() => go('payments', { cycle: h.cycle.id })} data-testid="pace">
            <ItemContent className="min-w-0 gap-0.5">
              <p className="text-base">
                Spent <Money sen={h.pace.spent} /> this {unit}
              </p>
              <ItemDescription className="text-sm">
                {h.pace.delta === null
                  ? `Your first ${unit}: nothing to compare with yet`
                  : h.pace.delta === 0
                    ? `The same as last ${unit} by this day`
                    : `${formatSen(Math.abs(h.pace.delta))} ${h.pace.delta > 0 ? 'more' : 'less'} than last ${unit} by this day`}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <MiniPace thisCycle={h.pace.thisCycle} lastCycle={h.pace.lastCycle} days={f.days} />
              <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
            </ItemActions>
          </button>
        </Item>

        {h.unsynced ? (
          <Badge variant="outline" className="self-start gap-1.5 text-sm text-money-pending">
            <CloudOffIcon aria-hidden="true" />
            {h.unsynced} not synced yet
          </Badge>
        ) : null}

        {h.note ? (
          <Item asChild size="sm" variant="muted" className="w-full flex-nowrap items-start text-left active:bg-accent">
            <button type="button" onClick={() => setSenOpen(true)} data-testid="sen-note">
              <ItemMedia className="shrink-0">
                <Avatar state="note" size={36} />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-1">
                <ItemDescription className="text-xs">Sen · {momentLabel(new Date(h.note.at))}</ItemDescription>
                <p className="selectable text-base text-pretty">{h.note.text}</p>
              </ItemContent>
            </button>
          </Item>
        ) : null}

        {h.quiet ? (
          <Item
            asChild
            size="sm"
            className="w-full flex-nowrap rounded-none border-t border-border px-0 text-left active:bg-accent"
          >
            <button type="button" onClick={() => go('accounts')} data-testid="quiet">
              <ItemContent className="min-w-0 gap-0.5">
                <ItemDescription className="text-sm">Total balance</ItemDescription>
                <ItemTitle className="text-base font-normal">
                  <Money sen={h.quiet.balance} />
                </ItemTitle>
              </ItemContent>
              {h.quiet.gap ? (
                <ItemContent className="min-w-0 items-end gap-0.5 text-right">
                  <ItemDescription className="text-sm">Gap at {shortDay(h.quiet.gap.on)}'s check</ItemDescription>
                  <ItemTitle className="text-base font-normal">
                    <Money sen={Math.abs(h.quiet.gap.sen)} />
                  </ItemTitle>
                </ItemContent>
              ) : null}
              <ItemActions>
                <ChevronRightIcon className="size-5 text-icon" aria-hidden="true" />
              </ItemActions>
            </button>
          </Item>
        ) : null}
      </div>
      <CycleSheet open={cycleOpen} onOpenChange={setCycleOpen} />
    </HomeMaterial>
  );
}

function HomeSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4 px-4 pt-2" aria-label="Loading">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-56" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
