// The deploy bar's helpers that a player earns (the owner: "let's have the auto merge unlock after defeating the second army, and auto
// place unlock after defeating the 4th army"). Until then merging is by hand (drag a hero onto its match, or tap one then the other) and so
// is placing. A save that has already beaten those armies has them at once; each one's unlocking is told once, on the next deploy screen
// (`Meta.featuresTold`). Pure rules: no Pixi, no DOM. The sim's own `autoDeploy` and `autoMerge` are untouched (the bots and balance tools
// still use them, as a player tapping the buttons would).
//
// RUNE-BENCH: the rune bench's Auto (the owner: "I also want the runes auto mode to work similarly to the heroes. it starts locked but
// unlocks after a set number of stars are earned") opens at `AUTO_RUNES_STARS` stars won over all the armies (`totalStars`, the stars that
// open the armies and the modes). `autoRunes` itself is untouched, and the bots and balance tools still call it.

import { ARMIES, armyCleared, totalStars } from './armies';
import type { Meta } from './meta';

export type Feature = 'autoMerge' | 'autoPlace' | 'autoRunes';

/** The stars (over all the armies and tiers) that open the rune bench's Auto. Six: at today's pace of two stars an army (the clear star
 *  and one more, `ARMY_NEED`) it comes as the third army falls, between Auto merge (the second) and Auto place (the fourth). */
export const AUTO_RUNES_STARS = 6;

/** What opens each helper (an army, by its place in `ARMIES`, to beat; or stars to win), and the line that tells it. */
export const FEATURES: Readonly<Record<Feature, { army?: number; stars?: number; line: string }>> = {
  autoMerge: { army: 1, line: 'Auto merge unlocked · merge every pair ready with one tap' },
  autoPlace: { army: 3, line: 'Auto place unlocked · set your heroes out with one tap' },
  autoRunes: { stars: AUTO_RUNES_STARS, line: 'Rune Auto unlocked · socket your runes with one tap' },
};
/** The order they unlock in on a normal pace (and are told in). */
const ORDER: readonly Feature[] = ['autoMerge', 'autoRunes', 'autoPlace'];

/** Whether a helper is open: its army has been beaten, or its stars won (old saves count by their records, as `armyCleared` and
 *  `totalStars` read them). */
export function featureOpen(m: Meta, f: Feature): boolean {
  const need = FEATURES[f];
  if (need.stars !== undefined) return totalStars(m) >= need.stars;
  const a = ARMIES[need.army ?? 0];
  return !!a && armyCleared(m, a.id);
}
export const autoMergeOpen = (m: Meta): boolean => featureOpen(m, 'autoMerge');
export const autoPlaceOpen = (m: Meta): boolean => featureOpen(m, 'autoPlace');
export const autoRunesOpen = (m: Meta): boolean => featureOpen(m, 'autoRunes');
/** The stars still to win before a star-opened helper opens (0 when open, or for one opened by an army). */
export function featureStarsToGo(m: Meta, f: Feature): number {
  const need = FEATURES[f].stars;
  return need === undefined ? 0 : Math.max(0, need - totalStars(m));
}

/** The helpers open but not yet told, in the order they unlock; marking them told is `markTold`. */
export function featuresToTell(m: Meta): Feature[] {
  return ORDER.filter((f) => featureOpen(m, f) && !m.featuresTold?.includes(f));
}

/** Remember that these helpers' unlocking has been told, so the notice shows once a save. */
export function markTold(m: Meta, fs: readonly Feature[]): void {
  if (!fs.length) return;
  m.featuresTold = [...new Set([...(m.featuresTold ?? []), ...fs])];
}
