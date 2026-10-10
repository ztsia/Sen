import { useRef, useState } from 'react';
import { CameraIcon, ImageIcon } from 'lucide-react';
import { toastDone } from '@/blocks/toast';
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
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setBusy(true);
    try {
      // Several photos: each is read; the first opens now, the rest wait in Review.
      const ids: string[] = [];
      for (const f of list) ids.push(await startDraft(f, forTxnId ?? null));
      go('crop', { id: ids[0] }, { replace: true });
    } catch (e) {
      toastDone(e instanceof Error ? e.message : "That didn't open. Try again.");
      setBusy(false);
    }
  };

  return (
    <Screen bar={<AppBar title="Scan a receipt" />}>
      <div className="flex flex-col gap-4 px-4 pt-4">
        <p className="text-muted-foreground">
          {forTxnId
            ? 'Take a photo of the receipt for this payment.'
            : 'Take a photo of the receipt, flat and in the light.'}{' '}
          In Sen&rsquo;s Android app, the scanner finds the edges by itself.
        </p>
        <Button size="lg" className="h-16 text-lg" disabled={busy} onClick={() => camera.current?.click()}>
          <CameraIcon aria-hidden="true" />
          Take a photo
        </Button>
        <Button size="lg" variant="secondary" disabled={busy} onClick={() => gallery.current?.click()}>
          <ImageIcon aria-hidden="true" />
          From gallery
        </Button>
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
