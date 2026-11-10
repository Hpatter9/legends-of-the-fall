// Which modes the army stars open: the castle's buildings, the endless tower and the Calamity. Each opens at a total of army stars (every
// star won over every army and tier), and a save that had already played a mode keeps it (`grandfather`). Pure rules: no Pixi, no DOM.

import { ARMIES, armyCleared, totalStars } from './armies';
import type { Meta } from './meta';

export type ModeKey = 'castle' | 'tower' | 'calamity';

/** The army stars each mode opens at. (FIRST-HOUR 3, the owner's number: the Castle opens at 6, not 10, about the third army.) */
export const MODE_NEED: Readonly<Record<ModeKey, number>> = { castle: 6, tower: 12, calamity: 16 };

/** The army stars the Chapel, and so the spellbook, opens at. The Castle's gate opens earlier now; the spells stay where they were. */
export const SPELLS_NEED = 10;

/** Whether the Chapel can be raised: the stars reach its number, or the save had the castle open from before the stars (its Chapel was
 *  never held back), or the Chapel already stands or is being built. */
export const chapelOpen = (m: Meta): boolean => totalStars(m) >= SPELLS_NEED || !!m.opened?.includes('castle') || m.chapel === true || (m.castle?.chapel ?? 0) > 0 || m.works?.id === 'chapel';

/** The words for a Chapel that cannot be raised yet: "The Chapel can be raised at 10 stars · 7/10 stars". */
export const chapelWaits = (m: Meta): string => `The Chapel can be raised at ${SPELLS_NEED} stars · ${progressLine(m, SPELLS_NEED)}`;

/** Whether a mode is open: the stars reach its number, or the save held it open from before the stars. */
export const modeOpen = (m: Meta, k: ModeKey): boolean => totalStars(m) >= MODE_NEED[k] || !!m.opened?.includes(k);

/** The stars still to win before a mode opens (0 when it is open). */
export const starsToGo = (m: Meta, k: ModeKey): number => (modeOpen(m, k) ? 0 : MODE_NEED[k] - totalStars(m));

/** The plate's words for a shut mode: "Opens at 12 stars". */
export const opensAt = (n: number): string => `Opens at ${n} stars`;

/** The same with the player's progress: "7/12 stars". */
export const progressLine = (m: Meta, need: number): string => `${Math.min(need, totalStars(m))}/${need} stars`;

/**
 * What a save from before the stars has open, written once into `Meta.opened`: each army the old rule had open (the first, and any after a
 * beaten one), the castle if a building or the chapel was begun, the tower if it was climbed, the Calamity if it was tried.
 */
export function grandfather(m: Meta): string[] {
  const out: string[] = [];
  ARMIES.forEach((a, i) => {
    if (i > 0 && armyCleared(m, ARMIES[i - 1].id)) out.push(a.id);
  });
  if (Object.values(m.castle).some((n) => n > 0) || m.chapel || m.works) out.push('castle');
  if (m.tower > 0 || m.bestStage >= TOWER_PLAYED) out.push('tower');
  if (m.calamity) out.push('calamity');
  return out;
}

/** A best stage this high (from before the armies) means the old endless climb was played. */
const TOWER_PLAYED = 10;
