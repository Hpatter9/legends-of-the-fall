// The look an awakened hero wears (rank 5 and 6). Since AWAKEN-002 there is no recolour and no pack colour variant: an
// awakened hero keeps its own colours and its top form's sheet, and its class's aura (`auraStyles.ts`) is what marks it.
// Pure: no Pixi, no DOM.

import { formOf, UNITS } from '../sim/units';
import { MAX_RANK } from '../sim/meta';

/** The awakened step a full rank stands for (0 below rank 5). */
export const stepOfRank = (rank: number): number => Math.max(0, Math.min(2, rank - MAX_RANK));

/** The sheet a hero is drawn from at a rank and grade: its form at that grade (awakening changes no sheet). */
export function lookSheet(kind: string, _rank: number, grade: number): string {
  return formOf(UNITS[kind], grade);
}
