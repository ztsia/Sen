import { SettingsRow } from '@/blocks/rows';
import { ListSkeleton } from '@/blocks/states';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useMe, useSettings } from '@/data/hooks';
import { DEV_TOOLS } from '@/lib/env';
import { LOOK_NAMES } from '@/looks/ids';
import { useTheme } from '@/theme/store';
import { inShell } from '@/shell/bridge';
import { Loaded, Section, useGo } from '../kit';

/**
 * Settings (screens.md): each section shows only to the people who can use it (D52). Capture shows in
 * the shell, or in previews, where the browser stands in for it; Members is the admin's alone.
 */
export default function Settings() {
  const s = useSettings();
  const me = useMe();
  return (
    <Screen bar={<AppBar title="Settings" />}>
      <Loaded q={s} what="your settings" skeleton={<ListSkeleton rows={6} />}>
        {(v) => (
          <Loaded q={me} what="your settings" skeleton={<ListSkeleton rows={6} />}>
            {(m) => <Body admin={v.admin} email={v.email} me={m} />}
          </Loaded>
        )}
      </Loaded>
    </Screen>
  );
}

function Body({
  admin,
  email,
  me,
}: {
  admin: boolean;
  email: string;
  me: { capture: boolean; claims: boolean; agent: boolean };
}) {
  const go = useGo();
  const look = useTheme((t) => t.look);
  const captureHere = me.capture && (inShell() || DEV_TOOLS);
  return (
    <div className="flex flex-col pb-6">
      <Section title="Appearance">
        <SettingsRow label="Appearance" value={LOOK_NAMES[look]} onOpen={() => go('settings/appearance')} />
      </Section>
      <Section title="Setup">
        {captureHere ? <SettingsRow label="Capture" onOpen={() => go('settings/capture')} /> : null}
        <SettingsRow label="You" onOpen={() => go('settings/you')} />
        <SettingsRow label="Categories and rules" onOpen={() => go('settings/categories')} />
        <SettingsRow label="Receipts by email" onOpen={() => go('settings/email')} />
      </Section>
      {me.claims || me.agent || admin ? (
        <Section title="Features">
          {me.claims ? <SettingsRow label="Claims" onOpen={() => go('settings/claims')} /> : null}
          {me.agent ? <SettingsRow label="Sen" onOpen={() => go('settings/sen')} /> : null}
          {admin ? <SettingsRow label="Members" onOpen={() => go('settings/members')} /> : null}
        </Section>
      ) : null}
      <Section title="Data and account">
        <SettingsRow label="Data" onOpen={() => go('settings/data')} />
        <SettingsRow label="Account" value={email} onOpen={() => go('settings/account')} />
      </Section>
    </div>
  );
}
