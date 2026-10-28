// Where a boss and its escorts stand in an army's boss arena (FIGHT-FIXES, the owner: "The bosses should stand in the middle of the boss
// arena."). The arena's section board carries its middle (`Board.arenaMid`, set by `planScenario`); the boss starts on the floor tile nearest
// it, and the rest of its band stand round it: fighters on the side the heroes come from and to its flanks, shooters behind and beside it.
// Pure and deterministic: the caller breaks ties with its own stream.

import { standable, tileAt, type At, type Board, type Tile } from './board';

/** How far from the boss (in tiles, either way) its escorts may stand. */
export const ESCORT_REACH = 3;

/** A floor tile a foe may start on: standable, and not ground that acts each second (lava, coals, a shrine) or a powder barrel. */
const startable = (t: Tile | null): t is Tile => standable(t) && !t.barrel && !t.ground;

/** The best tiles for a foe in the arena (all equally good; the caller picks one): the boss's nearest the middle, an escort's round the boss.
 *  `taken` says whether a tile already holds someone. Empty when nothing fits (the caller falls back to the usual rows). */
export function arenaSpots(board: Board, taken: (u: number, v: number) => boolean, mid: At, shot: boolean, boss: At | null): At[] {
  const spots: { u: number; v: number; score: number }[] = [];
  for (let v = 0; v < board.d; v++)
    for (let u = 0; u < board.w; u++) {
      const t = tileAt(board, u, v);
      if (!startable(t) || taken(u, v)) continue;
      if (!boss) {
        // (the boss: as near the middle as the floor allows; a step of height counts for nothing)
        spots.push({ u, v, score: -Math.round(Math.hypot(u - mid.u, v - mid.v) * 10) });
        continue;
      }
      const far = Math.max(Math.abs(u - boss.u), Math.abs(v - boss.v));
      if (far > ESCORT_REACH) continue;
      // (the heroes come from the high rows: a fighter keeps between them and the boss or at its flank, a shooter behind or beside it, on the higher ground)
      const side = shot ? (v < boss.v ? 2 : v === boss.v ? 1 : 0) : v > boss.v ? 2 : v === boss.v ? 1 : 0;
      spots.push({ u, v, score: -far * 10 + side * 3 + (shot ? t.h : 0) });
    }
  if (!spots.length) return [];
  const top = Math.max(...spots.map((x) => x.score));
  return spots.filter((x) => x.score === top).map(({ u, v }) => ({ u, v }));
}
