// FX-PLACE (docs/notes/fx-place.md): where an effect that covers ground is drawn, as tiles, from the battle event the sim sent. Each rule is
// the sim's own reach for that event, so the tinted tiles cover exactly the fighters the sim strikes, heals or shields there: a 3x3 for a
// volley or a meteor (wider by its `r`), the aimed column for the Lance, the aimed row for the Sunbeam, the wall's own row for the king's walls,
// a diamond (Manhattan reach, as the grid counts it) for an aura and the Mythics' bursts. `fx.ts` lays its marks on these tiles, and
// `test/fx-place.test.ts` holds each rule to the sim.
//
// Pure: no Pixi, no DOM.

import { tileAt, type At, type Board } from '../sim/board';
import type { SpellId } from '../sim/spells';
import { SPELLS } from '../sim/spells';

/** Every tile within `r` of (u, v) on the board: a square (`'square'`, the grid's 3x3 counting) or a diamond (`'diamond'`, Manhattan reach). */
export function tilesWithin(board: Board, u: number, v: number, r: number, shape: 'square' | 'diamond'): At[] {
  const out: At[] = [];
  for (let dv = -r; dv <= r; dv++)
    for (let du = -r; du <= r; du++) {
      if (shape === 'diamond' && Math.abs(du) + Math.abs(dv) > r) continue;
      if (tileAt(board, u + du, v + dv)) out.push({ u: u + du, v: v + dv });
    }
  return out;
}

/** The Mythics' great moves that send an `area` event on their caster's tile as their look (`mythicCombat.ts`, `burst`): the sim strikes every foe
 *  within `reach` (Manhattan) of the caster, or shields every friend within it (`help`). Their `area` is drawn as that diamond, in the help's
 *  colours for a ward, and not as a meteor's 3x3 (FX-PLACE). The keys are the skills' own (`keyOf`). */
export const AREA_REACH: Readonly<Record<string, { reach: number; help?: true; burns?: number }>> = {
  // (Vael: a cleave round her, a smash, and her wards on her friends within 4)
  'Eclipse Cleave': { reach: 2 },
  'Solar Aegis': { reach: 4, help: true },
  Crownfall: { reach: 4 },
  'Kneel Before Night': { reach: 4, help: true },
  // (Astrax: a breath on its target's cluster; the hunger and the lance strike one foe, so only its tile is marked; Heavenfall's three
  // constellations burn a 3x3 each for six seconds, `burns`, though the sim sends no `zone` for them)
  Starbreath: { reach: 2 },
  'Star Hunger': { reach: 0 },
  'Comet Lance': { reach: 0 },
  Heavenfall: { reach: 0, burns: 6000 },
  // (Ilyra: the halo strikes within 4; Death Denied holds the whole squad, so only her tile)
  'Broken Halo': { reach: 4 },
  'Death Denied': { reach: 0, help: true },
  // (Orrun: the quake within 3, the sanctuary's shields within 3, the heartwood's within 4, the World Tree's roots within 5)
  Rootquake: { reach: 3 },
  'Living Sanctuary': { reach: 3, help: true },
  Heartwood: { reach: 4, help: true },
  'The World Stands': { reach: 5 },
  // (Nyxara: the rewind restores her friends wherever they stand)
  'Rewrite Fate': { reach: 0, help: true },
};

/** The tiles an `area` event's mark covers: the sim's 3x3 (`landArea`: Chebyshev 1 + `r`) round its tile, or, for a move in `AREA_REACH`, its
 *  diamond. `skill` is the key of the skill cast that tick (or last). */
export function areaTiles(board: Board, e: { u: number; v: number; r?: number }, skill?: string): { tiles: At[]; help: boolean; burns?: number } {
  const m = skill ? AREA_REACH[skill] : undefined;
  if (m) return { tiles: tilesWithin(board, e.u, e.v, m.reach, 'diamond'), help: !!m.help, ...(m.burns ? { burns: m.burns } : {}) };
  return { tiles: tilesWithin(board, e.u, e.v, 1 + (e.r ?? 0), 'square'), help: false };
}

/** The skill an `area` event belongs to (FX-PLACE): the one its caster cast this tick, else Vael's ward when the area is on her own tile with no cast
 *  (her totality's ward rides on a blow, `mythicBlow`), else the one it cast last. */
export function areaSkill(tickCast: string | undefined, lastCast: string | undefined, by: { def: string; u: number; v: number } | undefined, e: At): string | undefined {
  if (tickCast) return tickCast;
  if (by?.def === 'vael' && by.u === e.u && by.v === e.v) return 'Solar Aegis';
  return lastCast;
}

/** The tiles a king's spell touches, aimed at (u, v), at rank `rank` (`rankOf`; 3 is the top): none for a spell that goes everywhere; the
 *  aimed column for the Lance; the aimed row for the Sunbeam (and a row either side at the top rank); the wall's row for the walls (one tile
 *  either side, two at the top rank, `rowTiles`); else the 3x3 (`inArea`). As `castSpell` reads them. */
export function spellTiles(board: Board, id: SpellId, u: number, v: number, rank = 1): At[] {
  const top = rank >= 3;
  if (SPELLS[id]?.target === 'all') return [];
  if (id === 'lance') {
    const out: At[] = [];
    for (let r = 0; r < board.d; r++) if (tileAt(board, u, r)) out.push({ u, v: r });
    return out;
  }
  if (id === 'sunbeam') {
    const out: At[] = [];
    for (let r = v - (top ? 1 : 0); r <= v + (top ? 1 : 0); r++) for (let c = 0; c < board.w; c++) if (tileAt(board, c, r)) out.push({ u: c, v: r });
    return out;
  }
  if (id === 'firewall' || id === 'icewall' || id === 'bonewall') {
    const out: At[] = [];
    const half = top ? 2 : 1;
    for (let du = -half; du <= half; du++) if (tileAt(board, u + du, v)) out.push({ u: u + du, v });
    return out;
  }
  return tilesWithin(board, u, v, 1, 'square');
}

/** The tiles an aura holds: a diamond of its reach (Manhattan, `toolkit/auras.ts`) round its tile. */
export const auraTiles = (board: Board, c: At, reach: number): At[] => tilesWithin(board, c.u, c.v, reach, 'diamond');
