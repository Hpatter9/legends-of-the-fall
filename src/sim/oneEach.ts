// One of each hero on the field (ONE-OF-EACH, `docs/notes/one-of-each.md`). The owner's rule: "we should only allow one unit of a hero
// on the battlefield at a time". The battle refuses a second hero of a kind (`placeBlock`'s 'twin', `twinOf` in `battle.ts`), the squad
// does too (`canJoin` in `run.ts`), and the greedy player picks one of each (`pickSquad`). Copies still come from hires, offers and
// rewards, and wait on the bench to be merged (MERGE-TWO). This file holds the swap: a bench copy put where its twin stands takes its
// place, and the twin goes back to the bench. Pure rules: no Pixi, no DOM, no randomness.

import { place, twinOf, unplace, type Battle, type Boost, type Unit } from './battle';
import { heroOf, type Run } from './run';

/** The hero of the run's kind `kind` on the field in battle `b` other than hero `id` (the twin a new copy would meet), if any. */
export const fieldTwin = (b: Battle, run: Run, id: number): Unit | undefined => {
  const h = heroOf(run, id);
  return h ? twinOf(b, h.kind, id) : undefined;
};

/** Whether bench hero `id` may swap with its twin on the field: a deploy, the hero owned and not on the field, and a twin of its kind standing. */
export function canSwapTwin(b: Battle, run: Run, id: number): boolean {
  if (b.phase !== 'deploy' || run.over) return false;
  const h = heroOf(run, id);
  if (!h || b.units.some((u) => u.side === 'hero' && u.tag === id)) return false;
  const twin = twinOf(b, h.kind, id);
  return !!twin && twin.tag !== undefined && !!heroOf(run, twin.tag);
}

/** Swap bench hero `id` in for its twin on the field: it stands on the twin's tile and takes the twin's place in the squad, and the twin goes
 *  back to the bench. Returns the roster id of the hero sent back, or null (and nothing changes) when `canSwapTwin` says no. */
export function swapTwin(b: Battle, run: Run, id: number, boost?: Boost): number | null {
  if (!canSwapTwin(b, run, id)) return null;
  const h = heroOf(run, id)!;
  const twin = twinOf(b, h.kind, id)!;
  const out = twin.tag!;
  const [u, v] = [twin.u, twin.v];
  unplace(b, twin.def, out);
  if (!place(b, h.kind, u, v, id, boost)) {
    // (cannot happen: the tile was the twin's; put it back as it was to be safe)
    place(b, twin.def, u, v, out, boost);
    return null;
  }
  const at = run.squad.indexOf(out);
  run.squad = run.squad.filter((x) => x !== id);
  if (at >= 0) run.squad[at] = id;
  else run.squad.push(id);
  return out;
}
