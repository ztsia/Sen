import type { LookId } from '@sen/looks';

export type { LookId };
// The pool of six looks (D77, D78), in the pool's order.
export const LOOK_IDS = [
  'minted',
  'instrument',
  'firefly',
  'line',
  'mercury',
  'copper',
] as const satisfies readonly LookId[];

export const LOOK_NAMES: Record<LookId, string> = {
  minted: 'Minted',
  instrument: 'Instrument',
  firefly: 'Firefly',
  line: 'Line',
  mercury: 'Mercury',
  copper: 'Copper',
};

/** Until the rotation is built (B14), production shows one pinned look: chosen in B04's review, the first in the pool until then. */
export const PRODUCTION_LOOK: LookId = 'minted';

export const isLookId = (v: unknown): v is LookId =>
  typeof v === 'string' && (LOOK_IDS as readonly string[]).includes(v);
