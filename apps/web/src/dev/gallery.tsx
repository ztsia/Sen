import { useState, type ReactNode } from 'react';
import {
  BusIcon,
  CameraIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlusIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  UtensilsIcon,
  WalletIcon,
  WifiOffIcon,
} from 'lucide-react';
import { formatSen } from '@sen/core/money';
import { AVATAR_STATES } from '@sen/looks';
import { Avatar } from '@/components/look/avatar';
import { Button } from '@/components/ui/button';
import { ItemGroup, ItemSeparator } from '@/components/ui/item';
import { BudgetMeter, CategoryBars, ChartCard, ChartTable, PaceChart, PartsBar, SpendCalendar } from '@/blocks/charts';
import { DetailPage } from '@/blocks/detail';
import { DestructiveDialog } from '@/blocks/dialog';
import { HeroFigure } from '@/blocks/hero';
import { Money } from '@/blocks/money';
import { checkAmount, MoneyInput } from '@/blocks/money-input';
import { DayHeader, ListRow, ReviewRow, SettingsRow } from '@/blocks/rows';
import { Sheet } from '@/blocks/sheet';
import { EmptyState, ErrorState, ListSkeleton, OfflineBanner, UpdatedAgo } from '@/blocks/states';
import { HealthBar, StatusCard } from '@/blocks/status';
import { toastDone, toastUndo } from '@/blocks/toast';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { AVATAR_NAMES } from './dev-panel';

// The gallery (B01): every building block in patterns.md §7, in every state, in the current look.
// Switch the look, light and dark, reduced motion and text size in the dev panel. All figures are
// made up (the wireframe's data, D11), and the gallery never exists in production.

const D = {
  income: 420000,
  thisCycle: [
    4500, 101000, 108000, 119000, 126200, 141000, 147000, 156000, 169000, 182000, 211000, 219000, 226000, 238000,
    247000, 260000, 268000, 286000, 291550,
  ],
  lastCycle: [
    6000, 98000, 106000, 113000, 121000, 133000, 141000, 150000, 160500, 171000, 180500, 189000, 198000, 211000, 222000,
    236000, 248000, 263000, 277550, 284000, 289000, 293500, 296000, 299000, 301500, 303800, 305600, 307900, 309500,
    311000, 312040,
  ],
  days: [0, 4210, 0, 1250, 2890, 6420, 980, 0, 3150, 1730, 520, 8810, 2240, 0, 1450, 3980, 610, 5230, 1190],
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="flex flex-col gap-3 border-b border-border py-6"
      data-testid={`gallery-${id}`}
    >
      <h2 id={`${id}-h`} className="px-4 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
const Pad = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-3 px-4">{children}</div>;
const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
);

export default function Gallery() {
  const [answered, setAnswered] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitError, setSubmitError] = useState<string>();
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <Screen bar={<AppBar title="Gallery" />}>
      <nav aria-label="Sections" className="flex flex-wrap gap-x-3 gap-y-1 px-4 pt-2 text-sm">
        {['figure', 'sen', 'money', 'rows', 'detail', 'forms', 'overlays', 'status', 'states', 'charts'].map((s) => (
          <a
            key={s}
            href={`#${s}`}
            className="inline-flex min-h-12 items-center text-primary underline underline-offset-4"
          >
            {s}
          </a>
        ))}
      </nav>

      <Section id="figure" title="The large figure">
        <Pad>
          <Label>Normal</Label>
          <HeroFigure
            label="Left until payday"
            sen={128450}
            sub="12 days to go"
            day={19}
            days={31}
            state={{ spent: 291550, income: D.income, spentByDay: D.thisCycle }}
          />
          <Label>Over budget</Label>
          <HeroFigure
            label="Over by"
            sen={21540}
            sub="12 days to go"
            day={19}
            days={31}
            state={{ over: true, spent: 441540, income: D.income }}
          />
          <Label>Payday</Label>
          <HeroFigure
            label="Left until payday"
            sen={420000}
            sub="31 days to go"
            day={1}
            days={31}
            state={{ spent: 0, income: D.income }}
          />
          <Label>A long amount</Label>
          <HeroFigure
            label="Total balance"
            sen={123456789}
            sub="Across six accounts"
            day={19}
            days={31}
            state={{ spent: 291550, income: D.income }}
          />
        </Pad>
      </Section>

      <Section id="sen" title="Sen's avatar">
        <div className="grid grid-cols-2 gap-3 px-4" data-patina="0.69">
          {AVATAR_STATES.map((s) => (
            <div
              key={s}
              className="card flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-card p-3"
              data-testid={`avatar-${s}`}
            >
              <Avatar state={s} size={56} />
              <span className="text-sm font-medium">{AVATAR_NAMES[s]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="money" title="Money">
        <Pad>
          <p className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
            <span>
              In <Money sen={420000} kind="in" />
            </span>
            <span>
              Out <Money sen={1290} />
            </span>
            <span>
              <Money sen={650} kind="pending" /> <span className="text-sm text-money-pending">Not synced yet</span>
            </span>
            <span className="inline-flex items-center gap-1 text-money-warning">
              <TriangleAlertIcon className="size-4" aria-hidden="true" />
              Over by <Money sen={21540} kind="warning" />
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Main action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="ghost" size="icon" aria-label="Add expense">
              <PlusIcon />
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-icon" aria-label="Shared icons">
            {[CameraIcon, ClockIcon, WalletIcon, RefreshCwIcon, PlusIcon].map((I, i) => (
              <I key={i} className="size-6" aria-hidden="true" />
            ))}
            <TriangleAlertIcon className="size-6 text-money-warning" aria-hidden="true" />
          </div>
        </Pad>
      </Section>

      <Section id="rows" title="Rows">
        <div>
          <DayHeader date={new Date('2026-10-08T04:00:00Z')} spentSen={4580} />
          <ItemGroup>
            <ListRow
              icon={UtensilsIcon}
              title="KOPI KAWAN"
              secondary="Drinks & desserts · Ryt"
              sen={1290}
              marks={['receipt']}
            />
            <ItemSeparator />
            <ListRow
              icon={ShoppingBagIcon}
              title="A MERCHANT WITH A VERY LONG REGISTERED NAME SDN BHD"
              secondary="Shopping · Public Bank"
              sen={123456}
              marks={['split', 'review']}
            />
            <ItemSeparator />
            <ListRow
              icon={BusIcon}
              title="TNG TOLL"
              secondary="Transport · TNG"
              sen={650}
              kind="pending"
              marks={['pending']}
            />
            <ItemSeparator />
            <ListRow
              icon={WalletIcon}
              title="Salary"
              secondary="Income · Public Bank"
              sen={420000}
              kind="in"
              marks={['filled']}
            />
          </ItemGroup>
        </div>
        {!answered ? (
          <ReviewRow
            question={
              <>
                <Money sen={950} /> · ROTI BAKAR 88
              </>
            }
            knows="New merchant, paid from TNG at 08:12."
            answers={[
              {
                label: 'Meals',
                suggested: true,
                onSelect: () => {
                  setAnswered(true);
                  toastUndo('ROTI BAKAR 88 is Meals now', () => setAnswered(false));
                },
              },
              { label: 'Drinks & desserts', onSelect: () => setAnswered(true) },
              { label: 'Groceries', onSelect: () => setAnswered(true) },
            ]}
            onOther={() => setSheet(true)}
          />
        ) : (
          <EmptyState line="Nothing to review. New questions appear here." />
        )}
        <ItemGroup>
          <SettingsRow
            label="Appearance"
            value="Changes each quarter"
            onOpen={() => toastDone('Settings arrive in B04')}
          />
          <ItemSeparator />
          <SettingsRow label="Just paid in the island" checked={switchOn} onCheckedChange={setSwitchOn} />
        </ItemGroup>
      </Section>

      <Section id="detail" title="Detail page">
        <DetailPage
          sen={1290}
          source="From Ryt's notification"
          facts={[
            { label: 'Merchant', value: 'KOPI KAWAN' },
            { label: 'Category', value: 'Drinks & desserts' },
            { label: 'Account', value: 'Ryt' },
            { label: 'When', value: 'Thu, 8 Oct, 08:12' },
          ]}
          actions={[
            { label: 'Mark as a transfer', onSelect: () => toastUndo('Marked as a transfer', () => undefined) },
            {
              label: 'Delete',
              destructive: true,
              onSelect: () => toastUndo('Deleted KOPI KAWAN, RM12.90', () => undefined),
            },
          ]}
        />
      </Section>

      <Section id="forms" title="Forms">
        <Pad>
          <MoneyInput
            label="Amount"
            value={amount}
            onChange={(t) => {
              setAmount(t);
              setSubmitError(undefined);
            }}
            error={submitError}
            hint="Two decimals at most, like 12.50."
            onEnter={() => setSubmitError(checkAmount(amount).error)}
          />
          <Button
            className="self-start"
            onClick={() => {
              const r = checkAmount(amount);
              if (r.error) setSubmitError(r.error);
              else toastUndo(`Added RM${amount}`, () => setAmount(''));
            }}
          >
            Add
          </Button>
        </Pad>
      </Section>

      <Section id="overlays" title="Sheets, dialog and toast">
        <Pad>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSheet(true)}>
              Open a sheet
            </Button>
            <Button variant="outline" onClick={() => setDialog(true)}>
              Delete forever
            </Button>
            <Button
              variant="outline"
              onClick={() => toastUndo('Attached to RM58.30 on Ryt', () => toastDone('Undone'))}
            >
              Show a toast
            </Button>
          </div>
        </Pad>
      </Section>

      <Section id="status" title="Status cards and health">
        <Pad>
          <HealthBar
            icon={WifiOffIcon}
            title="Capture is off"
            detail="Payments aren't being recorded."
            fix="Fix"
            onFix={() => toastDone('Capture arrives in B02')}
          />
          <StatusCard
            icon={RefreshCwIcon}
            state="Still changing"
            status="waiting"
            title="Dinner at Kak Long's"
            waiting="Waiting for Mei and the satay nobody has ticked"
          />
          <StatusCard
            icon={CheckCircle2Icon}
            state="Final"
            status="done"
            title="Lunch pool, week 41"
            waiting="Everyone has paid"
          />
          <StatusCard
            icon={ClockIcon}
            state="2 of 3 moves done"
            title="Payday plan"
            waiting="Waiting for the transfer to ASB"
          />
          <StatusCard
            icon={TriangleAlertIcon}
            state="Rejected"
            status="warning"
            title="Claim: September parking"
            waiting="The receipt is missing. Add it and send again."
          />
        </Pad>
      </Section>

      <Section id="states" title="Empty, loading, error, offline">
        <EmptyState
          line="Payments you make appear here."
          action={{ label: 'Add expense', onSelect: () => toastDone('Add expense arrives in B08') }}
        />
        <ListSkeleton rows={3} />
        <Pad>
          <ErrorState
            title="Couldn't load your payments"
            detail="The server didn't answer. What you typed is kept."
            action="Try again"
            onAction={() => toastDone('Trying again')}
          />
        </Pad>
        <OfflineBanner />
        <Pad>
          <UpdatedAgo at={new Date(Date.now() - 2 * 60000)} />
        </Pad>
      </Section>

      <Section id="charts" title="Charts">
        <Pad>
          <ChartCard
            question="Am I on track?"
            takeaway="RM140.00 more than last cycle by this day."
            onAskSen={() => toastDone('Sen arrives in B27')}
            table={
              <ChartTable
                caption="Spent by each day"
                head={['Day', 'This cycle', 'Last cycle']}
                rows={D.thisCycle.map((v, i) => [i + 1, formatSen(v), formatSen(D.lastCycle[i] ?? 0)])}
              />
            }
          >
            <PaceChart thisCycle={D.thisCycle} lastCycle={D.lastCycle} days={31} income={D.income} />
          </ChartCard>
          <ChartCard
            question="Where did it go, and what changed?"
            takeaway="Shopping is RM143.00 above its usual by day 19. The line marks typical."
            table={
              <ChartTable
                caption="Each category this cycle"
                head={['Category', 'This cycle']}
                rows={[['Meals', 'RM842.50']]}
              />
            }
          >
            <CategoryBars
              rows={[
                { label: 'Meals', sen: 84250, typical: 76000 },
                { label: 'Shopping', sen: 52300, typical: 38000 },
                { label: 'Groceries', sen: 41200, typical: 45000 },
                { label: 'Transport', sen: 30600, typical: 31000 },
                { label: 'Drinks & desserts', sen: 12300, typical: 11000 },
              ]}
            />
          </ChartCard>
          <ChartCard
            question="How much is spoken for before I spend?"
            takeaway="RM1,520.00 is fixed each cycle."
            table={
              <ChartTable
                caption="Fixed costs, spent and left"
                head={['Part', 'Amount']}
                rows={[['Fixed costs', 'RM1,520.00']]}
              />
            }
          >
            <PartsBar
              label="This cycle"
              parts={[
                { key: 'fixed', label: 'Fixed costs', sen: 152000 },
                { key: 'spent', label: 'Spent', sen: 139550 },
                { key: 'left', label: 'Left', sen: 128450 },
              ]}
            />
          </ChartCard>
          <ChartCard
            question="Four things, folded"
            takeaway="A fourth part folds into Other, in the grey."
            table={<ChartTable caption="Parts" head={['Part']} rows={[['Other']]} />}
          >
            <PartsBar
              label="Parts"
              parts={[
                { key: 'a', label: 'Eating out', sen: 84250 },
                { key: 'b', label: 'Groceries', sen: 41200 },
                { key: 'c', label: 'Transport', sen: 30600 },
                { key: 'd', label: 'Drinks', sen: 12300 },
              ]}
            />
          </ChartCard>
          <ChartCard
            question="When does the money leak?"
            takeaway="The 12th: RM88.10 on the day."
            table={
              <ChartTable
                caption="Discretionary spending each day"
                head={['Day', 'Spent']}
                rows={D.days.map((v, i) => [i + 1, formatSen(v)])}
              />
            }
          >
            <SpendCalendar spent={D.days} days={31} label="Discretionary spending each day of the cycle" />
          </ChartCard>
          <ChartCard
            question="Which budgets are at risk?"
            takeaway="Drinks & desserts is ahead of the cycle."
            table={
              <ChartTable
                caption="Budgets"
                head={['Budget', 'Spent', 'Cap']}
                rows={[['Drinks & desserts', 'RM123.00', 'RM150.00']]}
              />
            }
          >
            <BudgetMeter label="Drinks & desserts" sen={12300} cap={15000} cycleShare={19 / 31} />
            <BudgetMeter label="Shopping" sen={52300} cap={80000} cycleShare={19 / 31} />
          </ChartCard>
        </Pad>
      </Section>

      <Sheet open={sheet} onOpenChange={setSheet} title="Which category?" description="RM9.50 at ROTI BAKAR 88">
        <ItemGroup>
          {['Meals', 'Drinks & desserts', 'Groceries', 'Shopping', 'Transport'].map((c) => (
            <SettingsRow
              key={c}
              label={c}
              onOpen={() => {
                setSheet(false);
                setAnswered(true);
                toastUndo(`ROTI BAKAR 88 is ${c} now`, () => setAnswered(false));
              }}
            />
          ))}
        </ItemGroup>
      </Sheet>
      <DestructiveDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Delete this payment forever?"
        description="It's gone for good, with its receipt. This can't be undone."
        action="Delete forever"
        onConfirm={() => toastDone('Deleted')}
      />
    </Screen>
  );
}
