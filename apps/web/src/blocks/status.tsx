import type { ComponentType, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'done' | 'waiting' | 'warning';
// The money colours keep their one meaning (patterns.md §3): done and waiting are said in words, in the
// text colours; only a warning, always with its icon and words, takes money-warning.
const tone: Record<StatusTone, string> = {
  neutral: 'text-icon',
  done: 'text-foreground',
  waiting: 'text-muted-foreground',
  warning: 'text-money-warning',
};

/**
 * A card whose state matters (patterns.md §7): its state in words first, with an icon, then what it's
 * waiting for. Colour only supports the words.
 */
export function StatusCard({
  icon: Icon,
  state,
  status = 'neutral',
  title,
  waiting,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  state: string;
  status?: StatusTone;
  title: ReactNode;
  waiting?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5">
        <p className={cn('inline-flex items-center gap-2 text-sm font-semibold', tone[status])}>
          <Icon className="size-4 shrink-0" />
          {state}
        </p>
        <p className="font-medium text-pretty">{title}</p>
        {waiting ? <p className="text-sm text-muted-foreground">{waiting}</p> : null}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * A health warning (spec §18), at the top of Home until it's fixed: what's wrong, in words, and one
 * button that fixes it.
 */
export function HealthBar({
  icon: Icon,
  title,
  detail,
  fix,
  onFix,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  fix: string;
  onFix: () => void;
}) {
  return (
    <Alert variant="warning" className="flex items-center gap-3 [&>svg]:translate-y-0">
      <Icon className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <AlertTitle className="text-base font-semibold">{title}</AlertTitle>
        <AlertDescription>{detail}</AlertDescription>
      </div>
      <Button size="sm" variant="warning" onClick={onFix}>
        {fix}
      </Button>
    </Alert>
  );
}
