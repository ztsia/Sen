import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

// The icon tile (patterns.md §7, D130): a lucide icon on a tinted square. It leads everything you go to
// or do; information never gets one.

export type TileTone = 'neutral' | 'accent' | 'warn' | 'hue1' | 'hue2' | 'hue3';
const TONE: Record<TileTone, string> = {
  neutral: 'bg-muted text-icon',
  accent: 'bg-primary/12 text-primary',
  warn: 'bg-warn-bg text-warn-fg',
  hue1: 'bg-chart-1/14 text-chart-1',
  hue2: 'bg-chart-2/14 text-chart-2',
  hue3: 'bg-chart-3/16 text-chart-3',
};

/** 32 px with a 16 px icon in rows; `lg`, 48 with 24, at the top of a detail. Decorative: the row says what it is. */
export function IconTile({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: TileTone;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        size === 'lg'
          ? 'size-12 rounded-[calc(var(--radius-card,16px)*0.85)]'
          : 'size-8 rounded-[calc(var(--radius-card,16px)*0.6)]',
        TONE[tone],
        className,
      )}
    >
      <Icon className={size === 'lg' ? 'size-6' : 'size-4'} />
    </span>
  );
}
