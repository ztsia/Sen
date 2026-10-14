import { useRef, useState } from 'react';
import { dismissToast, toastDone } from '@/blocks/toast';
import { startDraft } from '@/data/hooks';
import { useGo } from '@/screens/kit';

/**
 * The camera and the gallery as file pickers, so a tap on Scan opens the camera straight away (D69) and
 * the long-press sheet's rows open theirs. In a browser the camera comes through the file picker and
 * the photo goes on to `crop`; in Sen's Android app ML Kit's scanner takes this place, finding the edges
 * itself (B15). `open` must run inside the tap's own handler, or the browser refuses to open a picker.
 */
export function useReceiptPicker({
  forTxnId = null,
  replace = false,
}: { forTxnId?: string | null; replace?: boolean } = {}) {
  const go = useGo();
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
      for (const f of list) ids.push(await startDraft(f, forTxnId));
      // a refusal from the last pick (*Already added*) doesn't follow onto crop (QA B04 run 2, 22)
      dismissToast();
      go('crop', { id: ids[0] }, { replace });
    } catch (e) {
      toastDone(e instanceof Error ? e.message : "That didn't open. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const input = (which: 'camera' | 'gallery') => (
    <input
      ref={which === 'camera' ? camera : gallery}
      type="file"
      accept="image/*,application/pdf"
      capture={which === 'camera' ? 'environment' : undefined}
      multiple={which === 'gallery'}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      data-testid={`scan-${which}`}
      onChange={(e) => {
        void picked(e.target.files);
        e.target.value = '';
      }}
    />
  );

  return {
    busy,
    openCamera: () => camera.current?.click(),
    openGallery: () => gallery.current?.click(),
    /** The two hidden pickers: render them once, outside anything that closes. */
    inputs: (
      <>
        {input('camera')}
        {input('gallery')}
      </>
    ),
  };
}
