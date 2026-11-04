// The soft snap for aiming the king's spells (KING-SPELLS batch 1, `docs/notes/king-spells-b1.md`). A thumb on an isometric grid of moving
// fighters lands a tile or so off, so when the player taps or drops a spell on a tile, the 3x3 slides by at most one tile to where it catches
// the most: foes for a harm spell, the hurt for a heal, heroes for a buff, a fallen hero for Resurrect, the fullest column for Light Lance. It
// moves only when the slid spot catches strictly more than the tile itself; between equals it keeps the nearest, then the board's order.
// Blink and the wolves land exactly where they are put. The page calls `snapSpell` for the preview and again for the cast, so what the player
// sees is what is cast; the cast still goes through `castSpell` on the snapped tile (and so into the fight's log), so a replay is the same.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { tileAt } from './board';
import { defOf, type Battle, type Unit } from './battle';
import { fallenIn, SPELLS, type SpellId } from './spells';

/** The spells whose 3x3 is on foes. */
const HARM: ReadonlySet<SpellId> = new Set(['meteor', 'smite', 'chain', 'poison', 'frost', 'hex', 'deepfreeze', 'starfall']);
/** The spells that land exactly where they are put. */
const EXACT: ReadonlySet<SpellId> = new Set(['blink', 'wolves']);

const at3 = (x: { u: number; v: number }, u: number, v: number) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1;

/** What a spell centred on (u, v) would catch, as a score (0 for nothing). */
export function aimScore(b: Battle, id: SpellId, u: number, v: number): number {
  const alive = (side: Unit['side']) => b.units.filter((x) => x.alive && x.side === side && !x.under);
  if (id === 'lance') return alive('foe').filter((x) => x.u === u).length;
  if (HARM.has(id)) return alive('foe').filter((x) => at3(x, u, v)).length;
  if (id === 'resurrect') return fallenIn(b, u, v) ? 1 : 0;
  const heroes = alive('hero').filter((x) => at3(x, u, v) && !defOf(x).summon);
  // (a heal is worth what it gives back: the health missing, in shares of each hero; a buff or a shield counts the heroes)
  if (id === 'heal' || id === 'renewal') return heroes.reduce((n, x) => n + (1 - x.hp / x.maxHp), 0);
  return heroes.length;
}

/** The tile a spell put on (u, v) is cast on: that tile, or a neighbour that catches strictly more. */
export function snapSpell(b: Battle, id: SpellId, u: number, v: number): [number, number] {
  if (SPELLS[id].target === 'all' || EXACT.has(id) || !tileAt(b.board, u, v)) return [u, v];
  let top: [number, number] = [u, v];
  let best = aimScore(b, id, u, v);
  let far = 0;
  for (let dv = -1; dv <= 1; dv++)
    for (let du = -1; du <= 1; du++) {
      // (Light Lance's line is a column: only sideways steps change what it hits)
      if ((du === 0 && dv === 0) || (id === 'lance' && dv !== 0) || !tileAt(b.board, u + du, v + dv)) continue;
      const s = aimScore(b, id, u + du, v + dv);
      // (among equals a straight step beats a diagonal one)
      const d = Math.abs(du) + Math.abs(dv);
      if (s > best + 1e-9 || (s > aimScore(b, id, u, v) + 1e-9 && Math.abs(s - best) <= 1e-9 && d < far)) {
        best = s;
        far = d;
        top = [u + du, v + dv];
      }
    }
  return top;
}
