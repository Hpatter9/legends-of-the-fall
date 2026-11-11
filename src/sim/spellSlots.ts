// SPELL-SLOTS (the owner: "For spells, there should be one unlocked to start then the other slots unlock slowly till you get your 4
// slots"; docs/notes/spell-slots.md). A save carries as many of the king's spells into a fight as it has spell slots open: one from the
// start, and the others one at a time as the army stars are won (`totalStars`, the stars that open the armies, the modes and the rune
// bench's Auto: `featureUnlocks.ts`). The loadout keeps its shape (three school slots and the open slot, `schools.ts`); the slots open
// are how many of those four may be filled at once.
//
// A save from before the slots keeps what it had: the slots it had filled when it was first read stay open (`Loadout.slots`, set by
// `readLoadout`), so nobody loses a spell. Each slot's opening is told once (`Meta.slotsTold`). Pure rules: no Pixi, no DOM.

import { totalStars } from './armies';
import { spellsOpen } from './castle';
import type { Meta } from './meta';
import { castList, fillSlots, LOADOUT_SLOTS } from './schools';
import { SPELLS, type SpellId } from './spells';

/** The army stars each slot opens at, the first slot first. One at the start; the second as the first army falls (it gives three stars at
 *  best, two at least on most clears); the third with the Chapel and the Spells tab (`SPELLS_NEED`); the fourth at twenty. */
export const SLOT_STARS: readonly number[] = [0, 3, 10, 20];

/** How many slots these stars open (1 to 4). */
export const slotsAtStars = (stars: number): number => Math.max(1, SLOT_STARS.filter((need) => stars >= need).length);

/** How many spell slots a save has open: what its stars open, or what it held from before the slots, whichever is more. */
export const spellSlots = (m: Pick<Meta, 'spellbook' | 'armies'>): number => Math.min(LOADOUT_SLOTS, Math.max(slotsAtStars(totalStars(m as Meta)), m.spellbook?.slots ?? 1));

/** The stars the slot at this place (0 to 3) opens at. */
export const slotNeed = (index: number): number => SLOT_STARS[Math.max(0, Math.min(LOADOUT_SLOTS - 1, index))];

/** A shut slot's words: "Opens at 10 ★ (you have 6)". */
export const slotLockLine = (m: Meta, index: number): string => `Opens at ${slotNeed(index)} ★ (you have ${totalStars(m)})`;

/** How many open slots stand empty (the Spells tab wears its mark while one does, and the spellbook can be opened). */
export const slotsEmpty = (m: Meta): number => Math.max(0, spellSlots(m) - castList(m.spellbook).length);

/** Whether the Spells tab should wear its mark: the spellbook is open, a slot stands empty, and a spell known could fill it. */
export const slotWaiting = (m: Meta, school: string | undefined): boolean => {
  if (!spellsOpen(m) || slotsEmpty(m) === 0) return false;
  const l = { ...m.spellbook, equipped: [...m.spellbook.equipped] };
  return fillSlots(l, school, spellSlots(m)).length > 0;
};

const NTH = ['first', 'second', 'third', 'fourth'];

/**
 * The slots opened since the save was last told, told once: each one's line, for the unlock notice and the run recap's news. While the
 * spellbook is shut (the Chapel not yet standing) the player cannot fill a slot, so a new slot takes the next spell the save would carry
 * by default (`fillSlots`: Heal, then the ruler's school in its order) and the line names it; once the spellbook is open the slot is left
 * empty for the player to fill, and the Spells tab wears its mark (`slotWaiting`). Changes `m` and returns the lines (none: nothing new).
 */
export function tellSlots(m: Meta, school: string | undefined): string[] {
  const open = spellSlots(m);
  const told = Math.max(1, m.slotsTold ?? 1);
  if (open <= told) return [];
  const lines: string[] = [];
  for (let n = told + 1; n <= open; n++) {
    const got: SpellId[] = spellsOpen(m) ? [] : fillSlots(m.spellbook, school, n);
    const name = `${NTH[n - 1][0].toUpperCase()}${NTH[n - 1].slice(1)}`;
    lines.push(got.length ? `${name} spell slot unlocked · ${got.map((id) => SPELLS[id].name).join(', ')} joins your spells` : spellsOpen(m) ? `${name} spell slot unlocked · fill it in the spellbook` : `${name} spell slot unlocked`);
  }
  m.slotsTold = open;
  return lines;
}
