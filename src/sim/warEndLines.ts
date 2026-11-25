// The words for a War that ended at the Last Hold (the Assault's phase 5, `docs/notes/assault-5.md`). The Assault was withdrawn before
// release (RELEASE-TRIM, `docs/notes/release-trim.md`), so nothing ends the War now; a save that ended it keeps its end, and the Council's
// card still tells it in these words. Pure data: no Pixi, no DOM.

import { armyById } from './armies';
import type { WarEnd } from './nemesis';

/** Each army's hold, by name (the Assault's blueprints' names). */
export const HOLD_NAMES: Readonly<Record<string, string>> = {
  orcs: 'Bloodtusk Hold',
  undead: 'Barrow Necropolis',
  beasts: 'Howling Den',
  wildwood: 'Elder Root',
  labyrinth: 'Heart of the Maze',
  ogres: 'Bonefire Crag',
  infernal: 'Brimstone Gate',
  yokai: 'Moonlit Shrine',
  golems: 'Iron Foundry',
};

/** An army's hold by name (one with no hold of its own is named by its army). */
export const holdName = (army: string): string => HOLD_NAMES[army] ?? `the ${armyById(army)?.name ?? army}'s hold`;

/** The War's end in a line, for the Council's card. */
export function endLine(end: WarEnd): string {
  const others = end.slain.filter((n) => n !== end.chief.name).length;
  return `The War ended at ${holdName(end.army)}, the Last Hold, in ${end.tries} assault${end.tries === 1 ? '' : 's'}: ${end.chief.name} fell on its throne${others ? ` with ${others} of the Council` : ''}`;
}
