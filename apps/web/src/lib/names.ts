/**
 * A payee as people read it (patterns.md §2, Sizes, D129): a name the bank sent in capitals is shown
 * in title case, *SATE KAJANG HJ SAMURI* as *Sate Kajang Hj Samuri*. A short single word (*ZUS*,
 * *TNG*) stays as it came, since it's likelier an acronym, and a name with any lower case is left
 * alone. Display only: the stored text is what the bank sent.
 */
export function readableName(name: string): string {
  if (/\p{Ll}/u.test(name) || !/\p{Lu}/u.test(name)) return name;
  const words = name.trim().split(/\s+/);
  if (words.length === 1 && name.trim().length <= 4) return name;
  return name.replace(/\p{L}[\p{L}']*/gu, (w) => w[0] + w.slice(1).toLowerCase());
}
