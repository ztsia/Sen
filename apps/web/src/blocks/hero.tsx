import { TriangleAlertIcon } from 'lucide-react';
import { spokenSen } from '@sen/core/money';
import type { FigureState } from '@sen/looks';
import { LookMarkup } from '@/components/look/look-markup';
import { useLook } from '@/theme/look';
import { useMode } from '@/theme/store';
import { cn } from '@/lib/utils';

interface HeroProps {
  label: string;
  sen: number;
  sub: string;
  day: number;
  days: number;
  state?: FigureState;
}

/**
 * The one large figure (patterns.md §3), the only figure a look draws in its own material. Under it is
 * always the same amount as text, so a screen reader reads its label and amount: "Left until payday,
 * RM 1,284.50, 12 days to go". Over budget, it says so in words, with an icon, in the warning colour.
 */
export function HeroFigure({ label, sen, sub, day, days, state = {} }: HeroProps) {
  const look = useLook();
  const mode = useMode();
  return (
    <div className={cn('hero', state.over && 'over')} role="group" aria-label={`${label}, ${spokenSen(sen)}, ${sub}`}>
      <span className="hero-lbl" aria-hidden="true">
        {state.over ? <TriangleAlertIcon className="size-4" /> : null}
        {label}
      </span>
      {look ? (
        <LookMarkup className="hero-fig" html={look.heroFigure(sen, mode, state)} />
      ) : (
        <span className="hero-fig" aria-hidden="true" />
      )}
      <span className="hero-sub" aria-hidden="true">
        {sub}
      </span>
      {look ? <LookMarkup className="strip" html={look.strip(day, days, mode, state)} /> : null}
    </div>
  );
}
