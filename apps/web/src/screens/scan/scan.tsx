import { CameraIcon, ImageIcon, PencilIcon, RectangleVerticalIcon, ScanLineIcon, SunIcon } from 'lucide-react';
import { GroupCard, NavRow } from '@/blocks/group';
import { Button } from '@/components/ui/button';
import { AppBar } from '@/frame/app-bar';
import { useReceiptPicker } from '@/frame/receipt-picker';
import { Screen } from '@/frame/screen';
import { useGo, useScreenSearch } from '../kit';

/**
 * Scan (screens.md `scan`, §6.4 path 5): in a browser there is no scanner, so the camera comes through
 * the file picker. In Sen's Android app the scanner finds the edges by itself (B15). The Scan tab opens
 * the camera itself (D69); this screen is for a receipt to a payment, and the long way round.
 */
export default function Scan() {
  const go = useGo();
  const { id: forTxnId } = useScreenSearch();
  const pick = useReceiptPicker({ forTxnId: forTxnId ?? null, replace: true });
  const busy = pick.busy;

  return (
    <Screen bar={<AppBar title="Scan a receipt" />}>
      <div className="flex flex-col gap-4 pt-2">
        <p className="px-4 text-muted-foreground">
          {forTxnId ? 'Take a photo of the receipt for this payment.' : 'Take a photo of the receipt.'} In Sen&rsquo;s
          Android app, the scanner finds the edges by itself.
        </p>
        <GroupCard label="For a good read">
          <NavRow icon={RectangleVerticalIcon} title="Lay it flat" />
          <NavRow icon={SunIcon} title="Stand in the light" />
          <NavRow icon={ScanLineIcon} title="Get the whole receipt in" />
        </GroupCard>
        <div className="flex flex-col gap-3 px-4">
          <Button disabled={busy} onClick={pick.openCamera}>
            <CameraIcon aria-hidden="true" />
            Take a photo
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={pick.openGallery}>
            <ImageIcon aria-hidden="true" />
            From gallery
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => go('manual', {})}>
            <PencilIcon aria-hidden="true" />
            Add by hand
          </Button>
        </div>
        {pick.inputs}
      </div>
    </Screen>
  );
}
