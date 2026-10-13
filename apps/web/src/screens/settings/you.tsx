import { useState } from 'react';
import { QrCodeIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceCards } from '@/blocks/choice';
import { GroupCard, GroupLabel, SwitchRow } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useMe, useSettings, useWrite } from '@/data/hooks';
import { Loaded } from '../kit';

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
    <div className="flex flex-col gap-6 pt-2 pb-8">
      {capture ? (
        <section className="flex flex-col gap-2 px-4" aria-label="Names">
          <GroupLabel>Names</GroupLabel>
          <Card className="px-4">
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
          </Card>
        </section>
      ) : null}
      <section className="flex flex-col gap-2" aria-label="Payday">
        <div className="px-4">
          <GroupLabel>Payday</GroupLabel>
        </div>
        <ChoiceCards<PaydayKind>
          label="Expected payday"
          columns={1}
          value={kind}
          onChange={choose}
          options={[
            { value: 'last-working', label: 'Last working day' },
            { value: 'day', label: 'A day' },
            { value: 'none', label: 'Not set' },
          ]}
        />
        {kind === 'day' ? (
          <div className="px-4">
            <Card className="px-4">
              <Field data-invalid={dayError ? true : undefined}>
                <FieldLabel htmlFor="payday-day">Day of the month</FieldLabel>
                <Input
                  id="payday-day"
                  className="num max-w-32"
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
            </Card>
          </div>
        ) : null}
        <p className="px-5 text-sm text-muted-foreground">
          Sen counts each cycle from it. {capture ? '' : 'Without capture, a payday is optional.'}
        </p>
      </section>
      <GroupCard label="Sharing">
        <SwitchRow
          icon={QrCodeIcon}
          title="DuitNow QR"
          description="Friends who owe you a split see it once you’ve paid."
          checked={qr}
          onCheckedChange={(on) => void write({ type: 'setting.set', key: 'you.qr', value: on })}
        />
      </GroupCard>
    </div>
  );
}
