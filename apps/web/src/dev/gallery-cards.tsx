import { useState } from 'react';
import {
  BellRingIcon,
  CoffeeIcon,
  InboxIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  PaletteIcon,
  ReceiptTextIcon,
  SparklesIcon,
  SplitIcon,
  SunIcon,
  TagsIcon,
} from 'lucide-react';
import { ChoiceCards, Segmented } from '@/blocks/choice';
import { ActionBar, FactGrid, HeaderCard, StatTiles } from '@/blocks/facts';
import { GroupCard, NavRow, PersonRow, SwitchRow } from '@/blocks/group';
import { Money } from '@/blocks/money';
import { EmptyState } from '@/blocks/states';
import { StepPager, Steps } from '@/blocks/steps';
import { IconTile } from '@/blocks/tile';
import { toastDone, toastUndo } from '@/blocks/toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const say = (what: string) => () => toastDone(what);

/** D130's blocks, in the gallery: the detail parts, then grouped rows, choices and steps. */
export function DetailGallery() {
  return (
    <div className="flex flex-col gap-4">
      <HeaderCard
        mark={<IconTile size="lg" icon={CoffeeIcon} tone="hue2" />}
        title="Kopi Kawan"
        figure={<Money sen={1290} />}
        copy={1290}
        meta="Thu, 8 Oct, 08:12 · Ryt Bank"
        source="From Ryt Bank's notification"
      />
      <ActionBar
        actions={[
          { icon: ReceiptTextIcon, label: 'Receipt', onSelect: say('Opens the receipt') },
          { icon: SplitIcon, label: 'Split', onSelect: say('Opens the split') },
          { icon: SparklesIcon, label: 'Ask Sen', onSelect: say("Opens Sen's sheet") },
        ]}
        more={[
          { label: 'Mark as…', onSelect: say('Opens Mark as') },
          {
            label: 'Delete',
            destructive: true,
            onSelect: () => toastUndo('Deleted Kopi Kawan, RM12.90', () => undefined),
          },
        ]}
      />
      <FactGrid
        facts={[
          { label: 'Category', value: 'Drinks & desserts', onSelect: say('Opens the categories') },
          { label: 'Your share', value: <Money sen={645} /> },
          { label: 'Note', value: 'Add a note', muted: true, wide: true, onSelect: say('Opens the note') },
        ]}
      />
      <StatTiles
        stats={[
          { label: 'In', value: <Money sen={420000} kind="in" /> },
          { label: 'Spent', value: <Money sen={291550} /> },
          { label: 'Left', value: <Money sen={128450} />, emphasis: true },
        ]}
      />
    </div>
  );
}

export function CardsGallery() {
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('system');
  const [pay, setPay] = useState<'last' | 'day' | 'none'>('last');
  const [on, setOn] = useState(true);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 px-4">
        {(['neutral', 'accent', 'warn', 'hue1', 'hue2', 'hue3'] as const).map((t) => (
          <IconTile key={t} icon={TagsIcon} tone={t} />
        ))}
        <IconTile icon={TagsIcon} tone="accent" size="lg" />
      </div>
      <GroupCard label="Setup" footer="A row says its state, so you needn't open it.">
        <NavRow icon={PaletteIcon} tone="accent" title="Appearance" value="Minted" onOpen={say('Opens Appearance')} />
        <NavRow icon={BellRingIcon} title="Capture" value="4 apps · listening" onOpen={say('Opens Capture')} />
        <NavRow
          icon={MailIcon}
          title="Receipts by email"
          description="Forward receipts to your own address"
          trailing={<Badge variant="warning">Not confirmed</Badge>}
          onOpen={say('Opens email')}
        />
        <SwitchRow
          icon={InboxIcon}
          title="Show me splits"
          description="Ask before splitting"
          checked={on}
          onCheckedChange={setOn}
        />
        <NavRow title="Version" value="0.4.0 (b04)" />
      </GroupCard>
      <GroupCard label="People">
        <PersonRow name="Mei Ling" detail="3 items" state={{ label: 'Done', tone: 'accent' }} sen={2450} />
        <PersonRow
          name="Ali"
          detail="Hasn't ticked yet"
          state={{ label: 'Waiting' }}
          sen={1180}
          onOpen={say('Opens Ali')}
        />
      </GroupCard>
      <Segmented
        label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'system', label: 'System', icon: MonitorSmartphoneIcon },
          { value: 'light', label: 'Light', icon: SunIcon },
          { value: 'dark', label: 'Dark', icon: MoonIcon },
        ]}
      />
      <ChoiceCards
        label="Payday"
        columns={1}
        value={pay}
        onChange={setPay}
        options={[
          { value: 'last', label: 'Last working day', description: 'Fri, 30 Oct this month' },
          { value: 'day', label: 'A day of the month' },
          { value: 'none', label: 'No payday' },
        ]}
      />
      <Steps
        steps={[
          { title: 'Choose your apps', done: true },
          {
            title: 'Allow notification access',
            detail: 'Android asks once. Sen reads only the apps you chose.',
            action: { label: 'Open settings', onSelect: say('Opens Android settings') },
          },
          { title: 'Keep Sen running', action: { label: 'Allow', onSelect: say('Opens the battery dialog') } },
        ]}
      />
      <StepPager
        label="Insights"
        pages={['On track', 'Budgets', 'Subscriptions', 'Goals', 'Year'].map((name, i) => ({
          name,
          content: (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <p className="text-lg font-semibold">{name}</p>
                <Progress value={30 + i * 15} tone={i === 1 ? 'warning' : 'accent'} aria-label={`${name}, made up`} />
                <p className="text-sm text-muted-foreground">One card at a time, swiped or chosen above.</p>
              </CardContent>
            </Card>
          ),
        }))}
      />
      <EmptyState
        icon={ReceiptTextIcon}
        title="No receipts yet"
        line="Scan one, or forward it to your address."
        action={{ label: 'Scan a receipt', onSelect: say('Opens Scan') }}
      />
    </div>
  );
}
