import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/theme/store';

// Steps (patterns.md §7, D130): a how-to as numbered steps instead of paragraphs, and a pager that
// shows one card at a time under named steps.

export interface Step {
  title: string;
  detail?: ReactNode;
  done?: boolean;
  /** The step's own button, `sm`. Hidden once it's done. */
  action?: { label: string; onSelect: () => void };
}

/** Numbered steps in a card; each shows ✓ when done, and the first not done is the one to do. */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card className={cn('mx-4 gap-0 divide-y divide-border py-0', className)}>
      <ol className="contents">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 px-4 py-3" aria-current={i === next ? 'step' : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                s.done
                  ? 'bg-primary text-primary-foreground'
                  : i === next
                    ? 'ring-2 ring-primary text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {s.done ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={cn('text-base', s.done && 'text-muted-foreground')}>
                {s.title}
                {s.done ? <span className="sr-only">, done</span> : null}
              </p>
              {s.detail && !s.done ? <div className="text-sm text-muted-foreground">{s.detail}</div> : null}
              {s.action && !s.done ? (
                <Button
                  size="sm"
                  variant={i === next ? 'default' : 'secondary'}
                  className="mt-1 self-start"
                  onClick={s.action.onSelect}
                >
                  {s.action.label}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * One card at a time, swiped sideways or chosen by its name on top, with *2 of 5*. No peek of the
 * next card: each page is the full width and snaps.
 */
export function StepPager({
  label,
  pages,
  initial = 0,
}: {
  /** What the pages are, for screen readers: *Insights*. */
  label: string;
  pages: { name: string; content: ReactNode }[];
  initial?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const names = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(initial);
  // with reduced motion the pages jump to their place (patterns.md §8; QA B04 redesign run 2, 12)
  const behavior: ScrollBehavior = useReducedMotion() ? 'auto' : 'smooth';

  useEffect(() => {
    const el = track.current;
    if (el && initial) el.scrollLeft = initial * el.clientWidth;
  }, [initial]);
  // the chosen name stays in view as the pages move
  useEffect(() => {
    names.current?.children[at]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior });
  }, [at, behavior]);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior });
    setAt(i);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pr-4">
        <div
          ref={names}
          role="tablist"
          aria-label={label}
          className="[scrollbar-width:none] flex min-w-0 flex-1 gap-1 overflow-x-auto px-4"
        >
          {pages.map((p, i) => (
            <Button
              key={p.name}
              role="tab"
              aria-selected={i === at}
              aria-controls={`pager-${i}`}
              size="chip"
              variant={i === at ? 'default' : 'ghost'}
              className={cn(i !== at && 'text-muted-foreground')}
              onClick={() => go(i)}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
          {at + 1} of {pages.length}
        </span>
      </div>
      <div
        ref={track}
        // a scrolling region is focusable, so a keyboard can reach and scroll it (axe)
        tabIndex={0}
        aria-label={`${label}: ${pages[at]?.name ?? ''}`}
        className="[scrollbar-width:none] flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
          if (i !== at) setAt(i);
        }}
      >
        {pages.map((p, i) => (
          <div
            key={p.name}
            id={`pager-${i}`}
            role="tabpanel"
            aria-label={p.name}
            aria-hidden={i !== at}
            inert={i !== at}
            className="w-full shrink-0 snap-start snap-always px-4"
          >
            {p.content}
          </div>
        ))}
      </div>
    </div>
  );
}
