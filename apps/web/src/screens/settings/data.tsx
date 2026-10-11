import { DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/blocks/rows';
import { ListSkeleton } from '@/blocks/states';
import { toastDone } from '@/blocks/toast';
import { useSettings } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { momentLabel } from '@/lib/dates';
import { Loaded, Section } from '../kit';

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
          <div className="flex flex-col pb-6">
            <Section title="Export">
              <div className="flex flex-col gap-3 px-4 pt-1">
                <p className="text-sm text-muted-foreground">
                  Every payment, receipt and setting, as files you can keep.
                </p>
                <Button
                  variant="secondary"
                  className="min-h-12 self-start"
                  onClick={() => toastDone('Export isn’t ready yet. Nothing was exported.')}
                >
                  <DownloadIcon aria-hidden="true" />
                  Export everything
                </Button>
              </div>
            </Section>
            {v.admin ? (
              <Section title="Backups">
                <SettingsRow
                  label="Last backup"
                  value={v.data.lastBackup ? momentLabel(new Date(v.data.lastBackup)) : 'None yet'}
                />
              </Section>
            ) : null}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
