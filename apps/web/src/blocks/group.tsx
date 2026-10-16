import { useId, type ComponentType, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Money, type MoneyKind } from './money';
import { IconTile, type TileTone } from './tile';

// Grouped rows (patterns.md §7, D130): rows sit in a rounded card with a small label above it, never in
// full-bleed hairline lists. A destination leads with an icon tile and says its state.

/** The small label above a group or a control: secondary text, muted (D129). */
export function GroupLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-end justify-between gap-3 px-1">
      {children ? <h2 className="text-sm font-medium text-muted-foreground">{children}</h2> : <span />}
      {action}
    </div>
  );
}

/** A card of rows, with a small label above it. Rows inside are divided; the card is the edge. */
export function GroupCard({
  label,
  action,
  footer,
  className,
  children,
}: {
  label?: string;
  /** A small action beside the label, such as *See all*. */
  action?: ReactNode;
  /** One muted line under the card, for what the group means. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('flex flex-col gap-2 px-4', className)} aria-label={label}>
      {label || action ? <GroupLabel action={action}>{label}</GroupLabel> : null}
      <Card className="gap-0 divide-y divide-border overflow-hidden py-0">{children}</Card>
      {footer ? <p className="px-1 text-sm text-muted-foreground">{footer}</p> : null}
    </section>
  );
}

/** The handlers of lib/long-press.ts's useLongPress, for a row with a hidden long-press (B02's version row). */
type PressHandlers = Partial<
  Pick<
    HTMLAttributes<HTMLButtonElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel' | 'onClick'
  >
>;

/**
 * A destination or an action: its tile, its title, a line under it if needed, and its state on the
 * right (*4 apps · running*, *Minted*), then a chevron when it opens a screen. Without `onOpen` or
 * `press` it's information, and has no tile.
 */
export function NavRow({
  icon,
  tone,
  title,
  description,
  value,
  trailing,
  destructive,
  onOpen,
  press,
}: {
  icon?: ComponentType<{ className?: string }>;
  tone?: TileTone;
  title: ReactNode;
  description?: ReactNode;
  /** The row's state, short, muted. */
  value?: ReactNode;
  /** Something richer than a value on the right: a badge, a thumbnail, a small button. */
  trailing?: ReactNode;
  destructive?: boolean;
  onOpen?: () => void;
  press?: PressHandlers;
}) {
  const inner = (
    <>
      {icon ? <IconTile icon={icon} tone={tone ?? (destructive ? 'warn' : 'neutral')} /> : null}
      {/* at least 6rem of words before the value: at large text (Android's font size) that's wider than
          the row has, so the value wraps under the title instead of drawn over it (lived-in, 200%) */}
      <ItemContent className="min-w-0 basis-24 gap-0.5">
        <ItemTitle className={cn('text-base font-normal', destructive && 'text-destructive')}>{title}</ItemTitle>
        {description ? <ItemDescription className="text-sm">{description}</ItemDescription> : null}
      </ItemContent>
      {value || trailing || onOpen ? (
        <ItemActions className="ml-auto max-w-[48%] shrink-0 gap-2 text-right text-sm text-muted-foreground">
          {/* a value wraps between words rather than cutting off, so an amount is never hidden (QA B04 redesign run 3, 5) */}
          {value ? <span className="min-w-0 text-pretty">{value}</span> : null}
          {trailing}
          {onOpen ? <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" /> : null}
        </ItemActions>
      ) : null}
    </>
  );
  const cls = 'min-h-14 w-full flex-wrap gap-3 rounded-none py-2.5 text-left text-base';
  if (!onOpen && !press)
    return (
      <Item size="sm" className={cls}>
        {inner}
      </Item>
    );
  return (
    <Item asChild size="sm" className={cn(cls, 'active:bg-accent')}>
      <button type="button" onClick={onOpen} {...press}>
        {inner}
      </button>
    </Item>
  );
}

/** A setting that's on or off. The label stretches over the row, so a tap anywhere flips it (patterns.md §8). */
export function SwitchRow({
  icon,
  tone,
  media,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  name,
}: {
  icon?: ComponentType<{ className?: string }>;
  tone?: TileTone;
  /** What the switch turns on, when the row's title says something else (a rule's *A hawker*). */
  name?: string;
  /** A leading mark of its own, such as an app's icon (B02's picker). */
  media?: ReactNode;
  title: string;
  /** A line under the label; on a disabled switch, why it can't be turned on. */
  description?: string;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const about = description ? `${id}-about` : undefined;
  return (
    <Item
      size="sm"
      className={cn(
        'relative min-h-14 flex-nowrap gap-3 rounded-none py-0 pr-2 text-base',
        disabled ? 'opacity-70' : 'active:bg-accent',
      )}
    >
      {media ? (
        <span
          className="size-8 shrink-0 overflow-hidden rounded-[calc(var(--radius-card,16px)*0.6)]"
          aria-hidden="true"
        >
          {media}
        </span>
      ) : icon ? (
        <IconTile icon={icon} tone={tone} />
      ) : null}
      <ItemContent className="min-w-0 gap-0.5 py-2.5">
        <label htmlFor={id} className="wrap-anywhere after:absolute after:inset-0">
          {title}
        </label>
        {description ? (
          <ItemDescription id={about} className="text-sm">
            {description}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className="relative">
        <Switch
          id={id}
          aria-label={name}
          checked={checked}
          disabled={disabled}
          aria-describedby={about}
          onCheckedChange={onCheckedChange}
        />
      </ItemActions>
    </Item>
  );
}

// the initials are text, so they take the text colour; the hue tints only the disc (axe's contrast)
const AVATAR_TONE = ['bg-chart-1/16 text-foreground', 'bg-chart-2/16 text-foreground', 'bg-chart-3/20 text-foreground'];
/** Up to two initials: *Mei Ling* → *ML*. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';
/** A person's tint, stable for their name. */
const toneOf = (name: string) => AVATAR_TONE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 3]!;

/** A person's initials in a disc, tinted by their name. */
export function PersonAvatar({ name, size = 'lg' }: { name: string; size?: 'default' | 'lg' | 'xl' }) {
  return (
    <Avatar size={size} aria-hidden="true">
      <AvatarFallback className={toneOf(name)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export type PersonState = { label: string; tone?: 'muted' | 'accent' | 'warning' | 'outline' };

/** A person in a split or among the members: their avatar, name, a state badge, and an amount. */
export function PersonRow({
  name,
  detail,
  state,
  sen,
  kind = 'out',
  trailing,
  onOpen,
}: {
  name: string;
  detail?: ReactNode;
  state?: PersonState;
  sen?: number;
  kind?: MoneyKind;
  trailing?: ReactNode;
  onOpen?: () => void;
}) {
  const inner = (
    <>
      <PersonAvatar name={name} />
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="flex w-full min-w-0 items-center gap-2 text-base font-normal">
          <span className="truncate">{name}</span>
          {state ? <Badge variant={state.tone ?? 'muted'}>{state.label}</Badge> : null}
        </ItemTitle>
        {detail ? <ItemDescription className="text-sm">{detail}</ItemDescription> : null}
      </ItemContent>
      {sen !== undefined || trailing || onOpen ? (
        <ItemActions className="shrink-0 gap-2 text-right">
          {sen !== undefined ? <Money sen={sen} kind={kind} /> : null}
          {trailing}
          {onOpen ? <ChevronRightIcon className="size-5 shrink-0 text-icon" aria-hidden="true" /> : null}
        </ItemActions>
      ) : null}
    </>
  );
  const cls = 'min-h-14 w-full flex-wrap gap-3 rounded-none py-2.5 text-left text-base';
  if (!onOpen)
    return (
      <Item size="sm" className={cls}>
        {inner}
      </Item>
    );
  return (
    <Item asChild size="sm" className={cn(cls, 'active:bg-accent')}>
      <button type="button" onClick={onOpen}>
        {inner}
      </button>
    </Item>
  );
}
