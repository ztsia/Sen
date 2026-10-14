import type { LookId } from '@/looks/ids';
import type { Mode } from '@/theme/store';
import { cn } from '@/lib/utils';

// A look shown in its own colours and type, inside whatever look the app is in: the tokens follow
// data-look and data-mode on the element (looks.gen.css), so a preview needs no code of its own look.

/** A small swatch for a row: the look's background with its accent. */
export function LookSwatch({ look, mode }: { look: LookId; mode: Mode }) {
  return (
    <span
      data-look={look}
      data-mode={mode}
      aria-hidden="true"
      className="inline-flex h-7 w-10 items-center justify-center gap-1 rounded-md border border-border bg-background"
    >
      <span className="h-3 w-1.5 rounded-full bg-primary" />
      <span className="h-2 w-1.5 rounded-full bg-chart-context" />
    </span>
  );
}

/**
 * A mini Home in the look: its background, a card with the large figure in the look's number font,
 * a bar in its accent, and a strip of its tab bar.
 */
export function LookPreview({ look, mode }: { look: LookId; mode: Mode }) {
  return (
    <div
      data-look={look}
      data-mode={mode}
      aria-hidden="true"
      className="flex h-32 flex-col gap-2 overflow-hidden rounded-[calc(var(--radius-card,16px)*0.75)] border border-border bg-background p-2 text-foreground"
    >
      <div className="flex flex-1 flex-col justify-center gap-1 rounded-[var(--radius-card,16px)] border border-border bg-card px-2.5">
        <span className="text-[9px] leading-none text-muted-foreground" style={{ fontFamily: 'var(--font-ui)' }}>
          Left until payday
        </span>
        <span
          className="truncate text-2xl leading-none"
          style={{
            fontFamily: 'var(--font-num)',
            fontWeight: 'var(--hero-weight)' as never,
            letterSpacing: 'var(--hero-track)',
          }}
        >
          RM1,284
        </span>
        <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <span className="w-3/5 bg-chart-accent" />
          <span className="flex-1 bg-chart-context" />
        </span>
      </div>
      <div className="flex items-center justify-around px-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('size-1.5 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />
        ))}
      </div>
    </div>
  );
}
