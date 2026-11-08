// The Mage Tower's Spell Lectern (DEPTH-BUILD, docs/notes/depth-design.md section 3): an army run carries one spare spell, chosen on the march
// card, and at the camp after the mid-boss it may be swapped into the loadout for one equipped. The loadout's own rules hold (a school's
// spell in a school slot or the open slot, any other in the open slot: `schools.ts`); the old power budget went with the schools. Once a
// run. Pure rules: no Pixi, no DOM.

import { castList, equipBlock, equipSpell, unequipSpell } from './schools';
import type { Loadout } from './spells';
import type { SpellId } from './spells';

/** The spells a run could carry as its spare: known and not in the loadout. */
export const spareChoices = (l: Loadout): SpellId[] => l.owned.filter((id) => !castList(l).includes(id));

/** Whether the camp after the mid-boss offers the swap now: a spare carried, not yet used, and the wave just won was the mid-boss's. */
export const lecternDue = (spare: SpellId | undefined, used: boolean | undefined, midJustWon: boolean): boolean => !!spare && !used && midJustWon;

/** Swap the spare in for an equipped spell. False (and nothing changed) when it does not fit the loadout's rules. */
export function lecternSwap(l: Loadout, spare: SpellId, out: SpellId, school: string | undefined): boolean {
  if (!castList(l).includes(out) || castList(l).includes(spare)) return false;
  const before = { equipped: [...l.equipped], open: l.open };
  unequipSpell(l, out);
  if (equipBlock(l, spare, school) || !equipSpell(l, spare, school)) {
    l.equipped = before.equipped;
    if (before.open) l.open = before.open;
    else delete l.open;
    return false;
  }
  return true;
}
