// The six looks (patterns.md §1). Each look's drawing is its own module, loaded only when it's shown.
import type { Look, LookId } from './types';

export * from './types';
export { setReducedMotion, TABS, TAB_SK } from './engine';

export const LOOK_IDS: readonly LookId[] = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];

const loaders: Record<LookId, () => Promise<{ DIR: Look }>> = {
  minted: () => import('./minted'),
  instrument: () => import('./instrument'),
  firefly: () => import('./firefly'),
  line: () => import('./line'),
  mercury: () => import('./mercury'),
  copper: () => import('./copper'),
};

const cache = new Map<LookId, Look>();
/** Loads a look's module (and with it, its CSS). */
export async function loadLook(id: LookId): Promise<Look> {
  const hit = cache.get(id);
  if (hit) return hit;
  const { DIR } = await loaders[id]();
  cache.set(id, DIR);
  return DIR;
}
/** A look already loaded, or undefined. */
export const loadedLook = (id: LookId) => cache.get(id);
