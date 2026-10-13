import { DatabaseBackupIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupCard, GroupLabel, NavRow } from '@/blocks/group';
import { ListSkeleton } from '@/blocks/states';
import { IconTile } from '@/blocks/tile';
import { toastDone } from '@/blocks/toast';
import { useSettings } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded } from '../kit';

/**
 * Settings → Data (screens.md; D49): *Export everything*, which isn't built yet, so it says so, and the
 * last backup, which only the admin sees (backups: admin).
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
              <GroupCard label="Backups">
                <NavRow
                  icon={DatabaseBackupIcon}
                  title="Last backup"
                  value={v.data.lastBackup ? momentLabel(new Date(v.data.lastBackup)) : 'None yet'}
                />
              </GroupCard>
            ) : null}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
