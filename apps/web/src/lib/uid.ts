import { useId } from 'react';

/** An id safe inside SVG's url(#…): React's ids carry characters a url() reference can't. */
export const useSvgId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9]/g, '');

/**
 * A version-4 UUID for a row made on the phone (§15). `crypto.randomUUID` exists only in a secure
 * context; a preview opened over plain http on the LAN has `getRandomValues` but not it (QA B03 run 2).
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
