import { z } from 'zod';
import { Amount, Id, Instant } from './schema';

/**
 * Every write the app makes, as data (B03). The screens send these through one write interface, which
 * has three backends behind the same calls: `fake` in memory now, `api` from B05 and B07 (each command
 * is a route's body, §16), and `outbox` in the shell from B07 (each command a row, synced in order).
 *
 * Ids are made on the phone (§15), so a retried command is an upsert, never a second row. Every
 * change happens at once, with Undo (§6.7): a backend answers each command with what happened, in
 * words, and the command that undoes it, which is sent the same way.
 */

const NewPayment = z.object({
  id: Id,
  occurredAt: Instant,
  amount: Amount,
  categoryId: Id,
  accountId: Id.nullable(),
  merchantRaw: z.string().nullable(),
  note: z.string().nullable(),
});
export type NewPayment = z.infer<typeof NewPayment>;

const DraftItem = z.object({
  id: Id,
  description: z.string(),
  qty: z.int().min(1),
  amount: Amount,
  price: Amount,
  categoryId: Id.nullable(),
});

export const Command = z.discriminatedUnion('type', [
  /** A category for a payment; `rule` is *From now on*, which updates its merchant's rule (D25, D89). */
  z.object({ type: z.literal('txn.category'), id: Id, categoryId: Id, scope: z.enum(['once', 'rule']) }),
  /** Money in as income, a transfer from one of your accounts, or a refund of a purchase (D17, D21). */
  z.object({
    type: z.literal('txn.kind'),
    id: Id,
    kind: z.enum(['income', 'transfer', 'refund', 'spend']),
    linkedTransactionId: Id.nullable(),
    otherAccountId: Id.nullable(),
  }),
  z.object({ type: z.literal('txn.note'), id: Id, note: z.string().nullable() }),
  z.object({ type: z.literal('txn.delete'), id: Id }),
  /** *Enter it by hand* (§6.8), or a payment created by a receipt without capture. */
  z.object({ type: z.literal('txn.create'), txn: NewPayment }),
  /** *No receipt…* (D90). */
  z.object({ type: z.literal('txn.no-receipt'), id: Id }),
  /** *Yes* or *No* on a template's first payment (D87). */
  z.object({ type: z.literal('template.answer'), templateId: Id, answer: z.enum(['yes', 'no']) }),
  /** A split share paid: by money in that matched, or ticked by hand (D65). */
  z.object({ type: z.literal('share.paid'), memberId: Id, byTransactionId: Id.nullable() }),
  /** Money in that's nobody's share: *Not a split* (D64). */
  z.object({ type: z.literal('share.not-a-split'), txnId: Id }),
  /** *This was a payment*, on a skipped notification. */
  z.object({ type: z.literal('event.restore'), eventId: Id }),
  /**
   * A checked receipt (§6.4): *Done*, *Just my part* (the items ticked are yours, D92), or kept as
   * evidence only. The backend matches it to its payment, or it waits for one.
   */
  z.object({
    type: z.literal('receipt.commit'),
    id: Id,
    action: z.enum(['done', 'mine', 'evidence']),
    paidBy: z.enum(['me', 'other']),
    merchant: z.string(),
    occurredAt: Instant,
    items: z.array(DraftItem),
    mine: z.array(Id),
    tax: Amount,
    service: Amount,
    total: Amount,
    pax: z.int().min(1),
    note: z.string().nullable(),
    forTxnId: Id.nullable(),
  }),
  /** A waiting receipt attached to a payment by hand, or filed as evidence (§6.4). */
  z.object({ type: z.literal('receipt.attach'), receiptId: Id, txnId: Id }),
  z.object({ type: z.literal('receipt.evidence'), receiptId: Id }),
  /** A Review item answered in a way no other command covers: a proposal applied or dismissed. */
  z.object({ type: z.literal('review.answer'), itemId: z.string(), answer: z.string() }),
  /** A budget for a category, per cycle (D29); amount 0 removes it. */
  z.object({ type: z.literal('budget.set'), categoryId: Id, amount: Amount }),
  /** Undo: the backend's own token for putting things back as they were. */
  z.object({ type: z.literal('undo'), token: z.string() }),
]);
export type Command = z.infer<typeof Command>;

/** What a backend answers: what happened, in words, and the command that undoes it. */
export interface WriteResult {
  said: string;
  undo: Command | null;
}
