// Dates and month boundaries are always in Kuala Lumpur (CLAUDE.md, conventions).
export const KL = 'Asia/Kuala_Lumpur';

const dayFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, hour: '2-digit', minute: '2-digit', hour12: false });

/** `Thu, 8 Oct` for a day header. */
export const dayLabel = (d: Date) => dayFmt.format(d);
/** `21:02`. */
export const timeLabel = (d: Date) => timeFmt.format(d);

/** `Updated just now`, `Updated 2 min ago`, `Updated 3 h ago`: how stale a screen is while live updates are down. */
export function updatedAgo(then: Date, now: Date = new Date()): string {
  const min = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (min < 1) return 'Updated just now';
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Updated ${h} h ago`;
  return `Updated ${dayLabel(then)}`;
}
