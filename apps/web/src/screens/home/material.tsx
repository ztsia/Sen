import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLook } from '@/theme/look';
import { useMode } from '@/theme/store';

/**
 * Home's own material (B03, ported from each look's design page): the look's `decorate` behind the
 * column, and its `paydayFx` once when payday's card shows. The column isolates its own stacking
 * context, so what a look draws sits behind Home's content and never past its edges.
 *
 * `patina` is the share of the cycle's money spent (0 to 1): Copper's coins wear it, Sen's included,
 * so it is set on the column and on the page, where Sen's button can see it.
 */
export function HomeMaterial({ payday, patina, children }: { payday: boolean; patina?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const look = useLook();
  const mode = useMode();
  const played = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || patina === undefined) return;
    const share = Math.max(0, Math.min(1, patina));
    const hosts = [el, document.documentElement];
    hosts.forEach((h) => {
      h.dataset.patina = String(share);
      h.dataset.over = share >= 1 ? '1' : '0';
    });
    return () => hosts.forEach((h) => (delete h.dataset.patina, delete h.dataset.over));
  }, [patina]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !look?.decorate) return;
    return look.decorate(el, mode);
  }, [look, mode, payday]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !look || !payday || played.current === look.id) return;
    played.current = look.id;
    look.paydayFx?.(el);
  }, [look, payday]);

  return (
    <div
      ref={ref}
      className="home-material relative isolate min-h-full overflow-clip"
      data-payday={payday ? '' : undefined}
    >
      {children}
    </div>
  );
}
