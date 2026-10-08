import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLook } from '@/theme/look';

/**
 * Markup a look drew (an SVG string, or a canvas it fills itself), placed as is. The strings come from
 * the look modules in this repo, never from data, so setting them as HTML is safe. A look with live
 * drawing starts it here and stops it when the markup goes.
 */
export function LookMarkup({ html, className, as: Tag = 'span' }: { html: string; className?: string; as?: 'span' | 'div' }) {
  const ref = useRef<HTMLElement>(null);
  const look = useLook();
  useEffect(() => {
    const el = ref.current;
    if (!el || !look?.mount) return;
    return look.mount(el);
  }, [html, look]);
  return <Tag ref={ref as never} className={cn(className)} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}
