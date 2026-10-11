import { CircleCheckIcon, CircleDashedIcon, SendIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import type { ClaimRow } from '@sen/core/views';
import type { StatusTone } from '@/blocks/status';
import { shortDay } from '@/lib/dates';

/** A claim's state in words first, with its icon and tone (patterns.md §7, status cards). */
export function claimState(c: ClaimRow): { state: string; icon: LucideIcon; tone: StatusTone } {
  switch (c.status) {
    case 'to_submit':
      return c.missing.length
        ? { state: 'To submit · evidence missing', icon: TriangleAlertIcon, tone: 'warning' }
        : { state: 'To submit · evidence complete', icon: CircleDashedIcon, tone: 'neutral' };
    case 'submitted':
      return { state: 'Submitted · waiting for ESS', icon: SendIcon, tone: 'waiting' };
    case 'approved':
      return { state: 'Approved', icon: CircleCheckIcon, tone: 'done' };
    case 'paid':
      return { state: 'Paid in your salary', icon: CircleCheckIcon, tone: 'done' };
    case 'rejected':
      return { state: 'Rejected', icon: TriangleAlertIcon, tone: 'warning' };
  }
}

/** The deadline line: `Submit by 25 Oct`, or the ESS reference once it's in. */
export const claimDue = (c: ClaimRow) =>
  c.status === 'to_submit' ? `Submit by ${shortDay(c.deadline)}` : c.essRef ? `ESS reference ${c.essRef}` : '';
