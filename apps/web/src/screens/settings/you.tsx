import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsRow } from '@/blocks/rows';
import { ListSkeleton } from '@/blocks/states';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useMe, useSettings, useWrite } from '@/data/hooks';
import { Loaded, Section } from '../kit';

type PaydayKind = 'last-working' | 'day' | 'none';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

/**
 * Settings → You (screens.md; D14, D17, D47, D79): your names as banks print them (capture only), the
 * expected payday, and your DuitNow QR. Each change acts at once, with Undo (patterns.md §7).
 */
export default function You() {
  const s = useSettings();
  const me = useMe();
  return (
    <Screen bar={<AppBar title="You" />}>
      <Loaded q={s} what="your details" skeleton={<ListSkeleton rows={3} />}>
        {(v) => (
          <Loaded q={me} what="your details" skeleton={<ListSkeleton rows={3} />}>
            {(m) => <Body names={v.you.bankNames} payday={v.you.payday} qr={v.you.qr} capture={m.capture} />}
          </Loaded>
        )}
      </Loaded>
    </Screen>
  );
}

function Body({
  names,
  payday,
  qr,
  capture,
}: {
  names: string[];
  payday: { kind: 'last-working' } | { kind: 'day'; day: number } | { kind: 'none' };
  qr: boolean;
  capture: boolean;
}) {
  const write = useWrite();
  const [text, setText] = useState(names.join('\n'));
  const [kind, setKind] = useState<PaydayKind>(payday.kind);
  const [day, setDay] = useState(payday.kind === 'day' ? String(payday.day) : '');
  const [dayError, setDayError] = useState<string | undefined>();

  const saveNames = () => {
    if (
      text
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean)
        .join('\n') === names.join('\n')
    )
      return;
    void write({ type: 'setting.set', key: 'you.bankNames', value: text });
  };
  const choose = (next: PaydayKind) => {
    if (!next) return;
    setKind(next);
    setDayError(undefined);
    if (next !== 'day') void write({ type: 'setting.set', key: 'you.payday', value: { kind: next } });
  };
  const saveDay = () => {
    // The day as the list's own text ("1" to "31"), so no number is parsed from typed text.
    const n = DAYS.indexOf(day.replace(/^0(?=\d)/, '')) + 1;
    if (!n) {
      setDayError('Type a day from 1 to 31.');
      return;
    }
    setDayError(undefined);
    if (payday.kind === 'day' && payday.day === n) return;
    void write({ type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: n } });
  };

  return (
    <div className="flex flex-col pb-6">
      {capture ? (
        <Section title="Names">
          <div className="flex flex-col gap-3 px-4 pt-1">
            <Field>
              <FieldLabel htmlFor="bank-names">Your names as banks print them</FieldLabel>
              <Textarea
                id="bank-names"
                enterKeyHint="done"
                autoComplete="off"
                spellCheck={false}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={saveNames}
              />
              <FieldDescription>One to a line. Sen matches a notification’s name against these.</FieldDescription>
            </Field>
          </div>
        </Section>
      ) : null}
      <Section title="Payday">
        <div className="flex flex-col gap-3 px-4 pt-1">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            aria-label="Expected payday"
            className="w-full"
            value={kind}
            onValueChange={(v) => choose(v as PaydayKind)}
          >
            <ToggleGroupItem value="last-working" className="min-h-12 flex-1">
              Last working day
            </ToggleGroupItem>
            <ToggleGroupItem value="day" className="min-h-12 flex-1">
              A day
            </ToggleGroupItem>
            <ToggleGroupItem value="none" className="min-h-12 flex-1">
              Not set
            </ToggleGroupItem>
          </ToggleGroup>
          {kind === 'day' ? (
            <Field data-invalid={dayError ? true : undefined}>
              <FieldLabel htmlFor="payday-day">Day of the month</FieldLabel>
              <Input
                id="payday-day"
                className="num h-12 max-w-32 text-lg"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                placeholder="25"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                onBlur={saveDay}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveDay();
                }}
              />
              <FieldError>{dayError}</FieldError>
            </Field>
          ) : null}
          <FieldDescription>
            Sen counts each cycle from it. {capture ? '' : 'Without capture, a payday is optional.'}
          </FieldDescription>
        </div>
      </Section>
      <Section title="Sharing">
        <SettingsRow
          label="DuitNow QR"
          description="Friends who owe you a split see it once you’ve paid."
          checked={qr}
          onCheckedChange={(on) => void write({ type: 'setting.set', key: 'you.qr', value: on })}
        />
      </Section>
    </div>
  );
}
