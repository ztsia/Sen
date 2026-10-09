import { useMemo, useState } from 'react';
import { SearchIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SettingsRow } from '@/blocks/rows';
import { EmptyState, ListSkeleton } from '@/blocks/states';
import { StatusCard } from '@/blocks/status';
import { toastDone } from '@/blocks/toast';
import { lightTick } from '@/lib/haptics';
import { SenCapture, type BlockReason, type CaptureApp } from '@/shell/bridge';
import { useBridge } from '@/shell/use-bridge';
import { AppIcon, BridgeError, CaptureScreen, Section } from './common';

/** Why an app can't be chosen, in words (D86). */
export const BLOCKED: Record<BlockReason, string> = {
  self: "Sen itself can't be chosen",
  sms: "Your SMS app can't be chosen: it carries TACs",
  messaging: "A messaging app can't be chosen",
  email: "An email app can't be chosen",
  social: "A social app can't be chosen",
  denylist: "A messaging, email or social app can't be chosen",
  missing: 'Not installed',
};

/**
 * Your apps (D86, spec §6.2): the installed banks and e-wallets from the curated list first, then
 * *More*, every other launchable app, searchable. Each switch saves at once; the shell checks it again
 * and refuses SMS, messaging, email and social apps, whatever the page asks. B08 shows this same
 * screen as first run's second step.
 */
export default function CaptureApps() {
  const { data, error, reload } = useBridge(() => SenCapture.apps({ icons: true }));
  const [apps, setApps] = useState<CaptureApp[]>();
  const [query, setQuery] = useState('');
  const list = apps ?? data?.apps;
  const chosen = useMemo(() => new Set(list?.filter((a) => a.chosen).map((a) => a.package)), [list]);
  const curated = list?.filter((a) => a.curated) ?? [];
  const q = query.trim().toLowerCase();
  const others = (list ?? []).filter(
    (a) => !a.curated && (!q || a.label.toLowerCase().includes(q) || a.package.includes(q)),
  );

  const save = async (next: Set<string>) => {
    const before = list;
    setApps(list?.map((a) => ({ ...a, chosen: next.has(a.package) })));
    lightTick();
    try {
      const r = await SenCapture.setChosen({ packages: [...next] });
      if (r.refused.length) {
        const why = r.refused[0]!;
        toastDone(`${before?.find((a) => a.package === why.package)?.label ?? why.package}: ${BLOCKED[why.reason]}`);
      }
      const ok = new Set(r.chosen);
      setApps((cur) => cur?.map((a) => ({ ...a, chosen: ok.has(a.package) })));
    } catch {
      setApps(before);
      toastDone("Couldn't save your apps. Try again.");
    }
  };
  const toggle = (p: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(p);
    else next.delete(p);
    void save(next);
  };

  const row = (a: CaptureApp) => (
    <SettingsRow
      key={a.package}
      label={a.label}
      media={<AppIcon icon={a.icon} label={a.label} />}
      description={a.blocked ? BLOCKED[a.blocked] : undefined}
      disabled={!!a.blocked}
      checked={chosen.has(a.package)}
      onCheckedChange={(on) => toggle(a.package, on)}
    />
  );

  return (
    <CaptureScreen title="Your apps">
      {error ? <BridgeError onRetry={reload} /> : null}
      <p className="px-4 pt-2 text-base text-pretty">
        Sen reads notifications only from the apps you choose here, and stores what they say. When an app's wording is
        new to Sen, that one notification goes to Google once, with long numbers masked, so Sen can learn to read it.
        Other apps' notifications are ignored and never stored.
      </p>
      {!list && !error ? <ListSkeleton rows={4} /> : null}
      {list ? (
        <>
          {chosen.size === 0 && curated.some((a) => !a.blocked) ? (
            <div className="px-4 pt-4">
              <StatusCard
                icon={SparklesIcon}
                state="Suggested"
                title={`Sen found ${curated.length} ${curated.length === 1 ? 'bank or e-wallet' : 'banks and e-wallets'} on this phone.`}
              >
                <Button
                  className="mt-2 self-start"
                  onClick={() => void save(new Set(curated.filter((a) => !a.blocked).map((a) => a.package)))}
                >
                  Choose {curated.length === 1 ? 'it' : `these ${curated.length}`}
                </Button>
              </StatusCard>
            </div>
          ) : null}
          <Section title="Banks and e-wallets">
            {curated.length ? (
              curated.map(row)
            ) : (
              <EmptyState line="None of the Malaysian banks and e-wallets Sen knows is installed. Find yours under More." />
            )}
          </Section>
          <Section title="More">
            <div className="px-4 pb-2">
              <Field>
                <FieldLabel htmlFor="app-search">Search every app</FieldLabel>
                <div className="relative">
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-icon"
                    aria-hidden="true"
                  />
                  <Input
                    id="app-search"
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    placeholder="A bank, a wallet, a shop"
                    className="pl-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </Field>
            </div>
            {others.length ? (
              others.map(row)
            ) : (
              <EmptyState line={q ? `No app matches “${query.trim()}”.` : 'No other apps.'} />
            )}
          </Section>
        </>
      ) : null}
    </CaptureScreen>
  );
}
