// The king's spells' ranks and the school marks that buy them (KING-SPELLS batch 3, docs/notes/king-spells-b3.md; the director passed on the
// owner's yes to the plan). A save earns one mark for each level of the Mage Tower and one for each army cleared (its Normal tier, the first a
// save can clear). A mark raises one spell a rank, to rank 3 at most: rank 2 strikes, heals and shields 20% harder and cools 15% sooner, rank 3
// 40% and 30%, and adds the spell's rider (`RIDERS` in `spells.ts`). A rank belongs to the spell, so it carries over when the ruler changes;
// marks are never lost and never come back once spent. The page copies the ranks onto every fight (`b.spells.ranks`).
//
// Pure rules: no Pixi, no DOM, no randomness.

import { ARMIES, armyCleared } from './armies';
import type { Meta } from './meta';
import { RANK_MAX, SPELLS, type Loadout, type SpellId } from './spells';

/** The marks a save has earned: its Mage Tower's levels and its armies cleared. */
export const marksEarned = (m: Meta): number => m.castle.mageTower + ARMIES.filter((a) => armyCleared(m, a.id)).length;
/** A spell's rank in the loadout (1 when unset). */
export const rankIn = (l: Loadout, id: SpellId): number => Math.max(1, Math.min(RANK_MAX, Math.floor(l.ranks?.[id] ?? 1)));
/** The marks spent: one a rank above the first, on every spell. */
export const marksSpent = (l: Loadout): number => Object.keys(l.ranks ?? {}).reduce((n, id) => n + rankIn(l, id as SpellId) - 1, 0);
export const marksFree = (m: Meta): number => Math.max(0, marksEarned(m) - marksSpent(m.spellbook));

/** Why a spell can't be ranked up now, or null when it can. */
export function rankBlock(m: Meta, id: SpellId): string | null {
  const l = m.spellbook;
  if (!SPELLS[id]) return 'No such spell';
  if (!l.owned.includes(id)) return 'Not learnt yet';
  if (rankIn(l, id) >= RANK_MAX) return 'Already at its top rank';
  if (marksFree(m) < 1) return 'No school mark free: raise the Mage Tower or clear an army';
  return null;
}

/** Raise a spell one rank with a mark. False (and nothing changed) when `rankBlock` says no. */
export function rankUp(m: Meta, id: SpellId): boolean {
  if (rankBlock(m, id)) return false;
  (m.spellbook.ranks ??= {})[id] = rankIn(m.spellbook, id) + 1;
  return true;
}

/** What a fight takes from the save: the ranks above the first (unset when none, so a fight with no ranks plays as before). */
export const fightRanks = (l: Loadout): Partial<Record<SpellId, number>> | undefined => {
  const out: Partial<Record<SpellId, number>> = {};
  for (const id of Object.keys(l.ranks ?? {}) as SpellId[]) if (rankIn(l, id) > 1) out[id] = rankIn(l, id);
  return Object.keys(out).length ? out : undefined;
};
