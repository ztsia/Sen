import { useState } from 'react';
import { BellRingIcon, CalendarClockIcon, DownloadIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GroupCard, GroupLabel, NavRow } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { toastDone } from '@/blocks/toast';
import { formatBytes, scheduleTestJob, sendTestPush } from '@/data/checks';
import { useSettings } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * A check the admin runs: a row that acts. While its request is on its way it says what's happening, with
 * a spinner, and takes no second tap (patterns.md, Waiting on the server); then a toast says how it went.
 */
function CheckRow({
  icon,
  title,
  waiting,
  run,
}: {
  icon: typeof BellRingIcon;
  title: string;
  waiting: string;
  run: () => Promise<string>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <NavRow
      icon={icon}
      title={busy ? waiting : title}
      trailing={busy ? <Spinner aria-hidden /> : undefined}
      press={{
        onClick: () => {
          if (busy) return;
          setBusy(true);
          void run()
            .then(toastDone)
            .finally(() => setBusy(false));
        },
      }}
    />
  );
}

const storageWords = ({ used, allowance }: { used: number; allowance: number }) =>
  `${formatBytes(used)} of ${formatBytes(allowance)}`;

/**
 * Settings → Data (screens.md; D49): *Export everything*, which isn't built yet, so it says so; and for
 * the admin alone (backups: admin), the last backup, the storage used and two checks (B06), which are
 * also production's test menu.
 */
export default function Data() {
  const q = useSettings();
  return (
    <Screen bar={<AppBar title="Data" />}>
      <Loaded q={q} what="your data settings" skeleton={<ListSkeleton rows={3} />}>
        {(v) => (
          <div className="flex flex-col gap-6 pt-2 pb-8">
            <section className="flex flex-col gap-2 px-4" aria-label="Export">
              <GroupLabel>Export</GroupLabel>
              <Card className="gap-3 px-4">
                <div className="flex items-start gap-3">
                  <IconTile icon={DownloadIcon} tone="accent" />
                  <p className="min-w-0 flex-1 pt-1 text-base">
                    Every payment, receipt and setting, as files you can keep.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => toastDone('Export isn’t ready yet. Nothing was exported.')}
                >
                  <DownloadIcon aria-hidden="true" />
                  Export everything
                </Button>
              </Card>
            </section>
            {v.admin ? (
              <>
                <GroupCard label="Backups">
                  <NavRow
                    title="Last backup"
                    value={v.data.lastBackup ? momentLabel(new Date(v.data.lastBackup)) : 'None yet'}
                  />
                  {v.data.storage ? (
                    <NavRow
                      title="Storage"
                      value={
                        v.data.storage.used >= v.data.storage.warnAt ? (
                          // a warning always comes with its icon and words (patterns.md §3)
                          <span className="inline-flex items-center gap-1.5 text-money-warning">
                            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
                            {storageWords(v.data.storage)}
                          </span>
                        ) : (
                          storageWords(v.data.storage)
                        )
                      }
                    />
                  ) : null}
                </GroupCard>
                <GroupCard label="Checks">
                  <CheckRow icon={BellRingIcon} title="Send a test push" waiting="Sending…" run={sendTestPush} />
                  <CheckRow
                    icon={CalendarClockIcon}
                    title="Schedule a test job"
                    waiting="Scheduling…"
                    run={scheduleTestJob}
                  />
                </GroupCard>
              </>
            ) : null}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
