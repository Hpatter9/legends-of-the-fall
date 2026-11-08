// The Mythics are earned secrets, never random recruits. Keep these rules free of
// battle and meta imports so every selection path can share them safely.
export const MYTHIC_KINDS: readonly string[] = ['vael', 'astrax', 'ilyra', 'orrun', 'nyxara'];
export const isMythic = (kind: string): boolean => MYTHIC_KINDS.includes(kind);
export const MYTHIC_LIMIT_WORDS = 'Only one Mythic may fight in a squad. Remove your current Mythic first.';
export const mythicFits = (kinds: readonly string[], kind: string): boolean => !isMythic(kind) || !kinds.some(isMythic);
export const validMythicSquad = (kinds: readonly string[]): boolean => kinds.filter(isMythic).length <= 1;
/** Keep the first Mythic; bench later ones when reading a malformed or old party. */
export function oneMythic<T>(items: readonly T[], kind: (item: T) => string): T[] {
  let seen = false;
  return items.filter(item => {
    if (!isMythic(kind(item))) return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}
