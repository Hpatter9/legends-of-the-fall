// DUCHESS-TAPS (docs/notes/release-fixes-2.md): a tap on Duchess counts on the game's own meta, the one its achievements and her
// cosmetics read and the one it saves. Before, each of the four places she can be tapped (the page's edge in a fight, the camp, the
// courtyard, the tavern) read the save from storage, added one and wrote it back behind the game's meta, so the game never saw the
// count until the next start, and its next save (a fight's end, a build finishing) wrote its old count back over the taps.
// Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';

/** One tap on Duchess: counted on `m` (the caller saves it). Returns the count now. */
export function countDuchessTap(m: Meta): number {
  m.duchessTaps = Math.max(0, (m.duchessTaps ?? 0) | 0) + 1;
  return m.duchessTaps;
}

/** Duchess's haystack treat (the camp's and the courtyard's): today's already found, by the game's meta. */
export const treatFoundToday = (m: Meta, today: number): boolean => m.duchessTreat === today;
