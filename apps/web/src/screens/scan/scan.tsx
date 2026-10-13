import { useRef, useState } from 'react';
import { CameraIcon, ImageIcon, PencilIcon, RectangleVerticalIcon, ScanLineIcon, SunIcon } from 'lucide-react';
import { GroupCard, NavRow } from '@/blocks/group';
import { dismissToast, toastDone } from '@/blocks/toast';
import { Button } from '@/components/ui/button';
import { startDraft } from '@/data/hooks';
import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';
import { useGo, useScreenSearch } from '../kit';

/**
 * Scan (screens.md `scan`, §6.4 path 5): in a browser there is no scanner, so the camera comes through
 * the file picker. In Sen's Android app the scanner finds the edges by itself (B15).
 */
export default function Scan() {
  const go = useGo();
  const { id: forTxnId } = useScreenSearch();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const picked = async (files: FileList | null) => {
    const all = files ? Array.from(files) : [];
    // a photo or a PDF with something in it; anything else isn't a receipt (QA B03 run 2, finding 25)
    const list = all.filter((f) => f.size > 0 && (f.type.startsWith('image/') || f.type === 'application/pdf'));
    if (all.length && !list.length) return toastDone("That isn't a photo or a PDF of a receipt. Try another.");
    if (!list.length) return;
    setBusy(true);
    try {
      // Several photos: each is read; the first opens now, the rest wait in Review.
      const ids: string[] = [];
      for (const f of list) ids.push(await startDraft(f, forTxnId ?? null));
      // a refusal from the last pick (*Already added*) doesn't follow onto crop (QA B04 run 2, 22)
      dismissToast();
      go('crop', { id: ids[0] }, { replace: true });
    } catch (e) {
      toastDone(e instanceof Error ? e.message : "That didn't open. Try again.");
      setBusy(false);
    }
  };

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
          <Button disabled={busy} onClick={() => camera.current?.click()}>
            <CameraIcon aria-hidden="true" />
            Take a photo
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => gallery.current?.click()}>
            <ImageIcon aria-hidden="true" />
            From gallery
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => go('manual', {})}>
            <PencilIcon aria-hidden="true" />
            Add by hand
          </Button>
        </div>
        <input
          ref={camera}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="scan-camera"
          onChange={(e) => {
            void picked(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={gallery}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="scan-gallery"
          onChange={(e) => {
            void picked(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </Screen>
  );
}
