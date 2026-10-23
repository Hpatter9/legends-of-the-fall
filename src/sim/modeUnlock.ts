// Which modes the army stars open: the castle's buildings, the endless tower and the Calamity. Each opens at a total of army stars (every
// star won over every army and tier), and a save that had already played a mode keeps it (`grandfather`). Pure rules: no Pixi, no DOM.

import { ARMIES, armyCleared, totalStars } from './armies';
import type { Meta } from './meta';

export type ModeKey = 'castle' | 'tower' | 'calamity';

/** The army stars each mode opens at. */
export const MODE_NEED: Readonly<Record<ModeKey, number>> = { castle: 10, tower: 15, calamity: 21 };

/** Whether a mode is open: the stars reach its number, or the save held it open from before the stars. */
export const modeOpen = (m: Meta, k: ModeKey): boolean => totalStars(m) >= MODE_NEED[k] || !!m.opened?.includes(k);

/** The stars still to win before a mode opens (0 when it is open). */
export const starsToGo = (m: Meta, k: ModeKey): number => (modeOpen(m, k) ? 0 : MODE_NEED[k] - totalStars(m));

/** The plate's words for a shut mode: "Opens at 15 stars". */
export const opensAt = (n: number): string => `Opens at ${n} stars`;

/** The same with the player's progress: "7/15 stars". */
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
