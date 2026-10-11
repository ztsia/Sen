import { z } from 'zod';
import { Amount, Id, Instant, Sen } from './schema';

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
   * A checked receipt (§6.4): *Done*, *Share a link* (Done, and an open split to tick, D92), *Just my
   * part* (the items ticked are yours, D92), or kept as evidence only. The backend matches it to its payment, or it waits for one.
   */
  z.object({
    type: z.literal('receipt.commit'),
    id: Id,
    action: z.enum(['done', 'share', 'mine', 'evidence']),
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
    /** The file's hash: the same file twice is *Already added* (§6.5). */
    contentHash: z.string().nullable(),
  }),
  /** A waiting receipt attached to a payment by hand, or filed as evidence (§6.4). */
  z.object({ type: z.literal('receipt.attach'), receiptId: Id, txnId: Id }),
  z.object({ type: z.literal('receipt.evidence'), receiptId: Id }),
  /** A receipt's note (D90). */
  z.object({ type: z.literal('receipt.note'), receiptId: Id, note: z.string().nullable() }),
  /** A Review item answered in a way no other command covers: a proposal applied or dismissed. */
  z.object({ type: z.literal('review.answer'), itemId: z.string(), answer: z.string() }),
  /** A budget for a category, per cycle (D29); amount 0 removes it. */
  z.object({ type: z.literal('budget.set'), categoryId: Id, amount: Amount }),
  // --- B04 ---
  /** *Split* on a payment with none (§7): an open split, with only you in it so far, shared evenly. */
  z.object({ type: z.literal('split.start'), splitId: Id, txnId: Id }),
  /** Tick or untick an item as yours, or, as the payer, for someone (D71). */
  z.object({ type: z.literal('split.tick'), splitId: Id, itemId: Id, memberId: Id, on: z.boolean() }),
  /** An item nobody ticked: *Everyone*, or *Someone else…* by name (the payer only). */
  z.object({
    type: z.literal('split.assign'),
    splitId: Id,
    itemId: Id,
    to: z.union([z.literal('everyone'), z.string().min(1)]),
  }),
  /** *I've ticked everything I had*, or *Still ticking* to undo it, until the lock. */
  z.object({ type: z.literal('split.done'), splitId: Id, memberId: Id, done: z.boolean() }),
  /** *Lock without waiting for…* (the payer, once every item is claimed). */
  z.object({ type: z.literal('split.lock'), splitId: Id }),
  /** The payer's tick list: a friend's share paid, by cash or a payment Sen didn't match (D65). */
  z.object({ type: z.literal('split.paid'), splitId: Id, memberId: Id, paid: z.boolean() }),
  /** *I've paid*, for a payment Sen can't see (D65). */
  z.object({ type: z.literal('split.paid-them'), splitId: Id }),
  /** The bank's figures (D18): each difference is booked as *Unaccounted*. */
  z.object({ type: z.literal('balance.check'), checks: z.array(z.object({ accountId: Id, balance: Sen })) }),
  /** *Submitted* in ESS by hand, or *Send to ESS* in the shell (§13). */
  z.object({ type: z.literal('claim.submitted'), id: Id, essRef: z.string().nullable() }),
  /** A message to Sen, with its id made on the phone, so a retried send is a no-op (§12.5). */
  z.object({
    type: z.literal('sen.send'),
    id: z.string(),
    text: z.string(),
    file: z.object({ name: z.string(), kind: z.enum(['pdf', 'image']) }).nullable(),
    from: z.string(),
  }),
  /** An `ask_user` button. */
  z.object({ type: z.literal('sen.answer'), askId: z.string(), answer: z.string() }),
  /** A proposal card, in the chat or in Review (`/proposals/:id`). */
  z.object({ type: z.literal('proposal.answer'), id: z.string(), answer: z.enum(['apply', 'dismiss']) }),
  /** A research draft's figures confirmed into `products` (§12.2 rule 6). */
  z.object({ type: z.literal('research.confirm'), messageId: z.string() }),
  z.object({ type: z.literal('memory.forget'), id: z.string() }),
  /** One Settings value, by its path: `you.payday`, `sen.calendar`, `claims.essSender`. */
  z.object({
    type: z.literal('setting.set'),
    key: z.string(),
    value: z.union([z.boolean(), z.string(), z.int(), z.null(), z.record(z.string(), z.unknown())]),
  }),
  /** Settings → Members (D52, D98): invite, a switch, credit, suspend, remove. */
  z.object({
    type: z.literal('member.invite'),
    email: z.string(),
    shell: z.boolean(),
    switches: z.object({
      capture: z.boolean(),
      agent: z.boolean(),
      splits: z.boolean(),
      email: z.boolean(),
      calendar: z.boolean(),
      claims: z.boolean(),
    }),
    welcome: Amount,
    allowance: Amount,
  }),
  z.object({
    type: z.literal('member.set'),
    id: Id,
    key: z.string(),
    value: z.union([z.boolean(), z.int(), z.string()]),
  }),
  z.object({ type: z.literal('member.remove'), id: Id }),
  /** Payday (§9.7): the claims question, a step skipped (it waits in Review), the plan used. */
  z.object({ type: z.literal('payday.claims'), answer: z.enum(['yes', 'no', 'undo']) }),
  z.object({ type: z.literal('payday.skip'), step: z.enum(['claims', 'balance', 'look-back', 'plan']) }),
  z.object({ type: z.literal('payday.plan'), use: z.boolean() }),
  /** Undo: the backend's own token for putting things back as they were. */
  z.object({ type: z.literal('undo'), token: z.string() }),
]);
export type Command = z.infer<typeof Command>;

/** What a backend answers: what happened, in words, and the command that undoes it. */
export interface WriteResult {
  said: string;
  undo: Command | null;
}
