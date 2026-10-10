// Ids for the made-up scenario: the same name always gives the same UUID, so a screenshot, a link and
// a test can name a row. Rows made while the app runs use crypto.randomUUID(), as the phone will (§15).

function hash32(s: string, seed: number): number {
  let h = seed ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

const HEX = '0123456789abcdef';
const hex8 = (n: number) => n.toString(16).padStart(8, '0');

/** A version-4-shaped UUID from a name. */
export function uid(name: string): string {
  const h = [1, 2, 3, 4].map((seed) => hex8(hash32(name, seed * 0x9e3779b1))).join('');
  const variant = ((HEX.indexOf(h[16]!) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** A seeded random number in [0, 1): the scenario's history is the same on every load. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
