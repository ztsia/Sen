import { describe, expect, it } from 'vitest';
import { eventId, txnId } from './ids';

// The same vectors are in the shell's IdsTest.kt: the phone and the server must derive the same ids.
const A = '00000000-0000-4000-8000-00000000000a';

describe('derived ids', () => {
  it('an event’s id is of its person and dedupe key', () => {
    expect(eventId(A, 'a'.repeat(64))).toBe('3cdaca7c-ddc1-583c-884e-4fd234d7d9e6');
    expect(eventId(A, '0123456789abcdef'.repeat(4))).toBe('38794c1a-8e54-570c-a02c-53e5613452d3');
  });
  it('another person’s is another id', () => {
    expect(eventId('00000000-0000-4000-8000-00000000000b', 'a'.repeat(64))).not.toBe(eventId(A, 'a'.repeat(64)));
  });
  it('a transaction’s is of its event’s id and its index', () => {
    const e = eventId(A, 'a'.repeat(64));
    expect(txnId(e, 0)).toBe('3aadfde9-d6c7-53fb-86d3-08ffb252fe32');
    expect(txnId(e, 1)).toBe('5b69ef63-d6d3-5bcb-bfd7-3974eea526e5');
  });
});
