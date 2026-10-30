// How a new hero arrives (RECAP-REVEAL, the owner's ask: "When a hero is obtained through a task, they shouldn't act like they came
// from the summoner"). A hero summoned (a stone or a pull) is called up in the summoning chamber (`summonTarot.ts`); one of the ten
// earned by a milestone (`contentHeroes.ts`) walks in to the keep's overlook instead, with the deed that earned it named
// (`earnedArrival.ts`). Pure rules: no Pixi, no DOM.

import { contentOf } from './contentHeroes';

export type Arrival = 'summoned' | 'earned';

/** Which arrival a hero's first reveal plays. `pulled`: it has just come out of a pull (the summoner called it, whoever it is). */
export const arrivalOf = (kind: string, pulled = false): Arrival => (!pulled && contentOf(kind) ? 'earned' : 'summoned');

/** The deed an earned hero's arrival names: "Earned: clear the Undead Legion on Hard". None for a hero that is not earned. */
export function deedLine(kind: string): string | null {
  const c = contentOf(kind);
  return c ? `Earned: ${c.line}` : null;
}
