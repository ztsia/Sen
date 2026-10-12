import { describe, expect, it } from 'vitest';
import { readableName } from './names';

describe('readableName', () => {
  it('shows a name sent in capitals in title case', () => {
    expect(readableName('SATE KAJANG HJ SAMURI')).toBe('Sate Kajang Hj Samuri');
    expect(readableName('GRABFOOD')).toBe('Grabfood');
    expect(readableName('LIM K H')).toBe('Lim K H');
    expect(readableName('ROTI BAKAR 88')).toBe('Roti Bakar 88');
    expect(readableName("MCDONALD'S")).toBe("Mcdonald's");
  });
  it('keeps short single words, mixed case and names without letters as they came', () => {
    expect(readableName('ZUS')).toBe('ZUS');
    expect(readableName('TNG')).toBe('TNG');
    expect(readableName("Nando's")).toBe("Nando's");
    expect(readableName('ZUS Coffee')).toBe('ZUS Coffee');
    expect(readableName('7-11')).toBe('7-11');
  });
});
