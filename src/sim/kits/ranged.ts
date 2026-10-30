// The ranged heroes' and the summoners' reworked moves (RPG-SPELLS batch 5, docs/notes/rpg-spells-design.md sections 4.3 and 4.7,
// docs/notes/spells-b5.md), built on the movement toolkit (`toolkit/`): the Archer's leap back, the Gunslinger's roll, the Rifle Bot's jets,
// the Siege Bot's and Dread Pirate's blasts that throw their foes, the Beastmaster's leaping wolves and the Reaper's pulling sweep. No
// randomness: every choice is a fixed order.

import { tileAt, type At } from '../board';
import { tileOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, foesOf } from '../abilities';
import { canLand, displace, leapTo, moveMany, safeTile } from '../toolkit';

const besideFoe = (b: Battle, me: Unit, n: number) => foesOf(b, me).some((f) => apart(me, f) <= n);

/** The best tile within `n` to fall back to: free, farthest from the foes (the three nearest), higher ground first among equals... as the
 *  toolkit's `safeTile`, but higher ground counts first (a shooter wants the heights). Undefined when no tile is better than where it stands. */
export function highGround(b: Battle, me: Unit, n: number): At | undefined {
  const foes = foesOf(b, me);
  if (!foes.length) return undefined;
  const away = (at: At) => foes.map((f) => apart(at, f)).sort((x, y) => x - y).slice(0, 3).reduce((s, d) => s + d, 0);
  const h0 = tileOf(b, me).h;
  let best: { at: At; h: number; away: number; i: number } | undefined;
  for (let v = me.v - n; v <= me.v + n; v++)
    for (let u = me.u - n; u <= me.u + n; u++) {
      const at = { u, v };
      const d = apart(me, at);
      if (d === 0 || d > n || !canLand(b, me, at)) continue;
      const c = { at, h: tileAt(b.board, u, v)!.h, away: away(at), i: v * b.board.w + u };
      if (!best || c.h > best.h || (c.h === best.h && (c.away > best.away || (c.away === best.away && c.i < best.i)))) best = c;
    }
  if (!best || (best.h <= h0 && best.away <= away(me))) return undefined;
  return best.at;
}

/** Archer, Aimed Shot's leap: with a foe beside her, she first leaps up to 2 tiles back, to higher ground if she can. */
export function leapBack(b: Battle, me: Unit, out: BattleEvent[]): void {
  if (!besideFoe(b, me, 1)) return;
  const to = highGround(b, me, 2) ?? safeTile(b, me, 2);
  if (to) leapTo(b, me, to, out);
}

/** Gunslinger, Fan the Hammer's roll: with a foe within 2, she first rolls up to 2 tiles away from it (a dash along the ground). */
export function rollAway(b: Battle, me: Unit, out: BattleEvent[]): void {
  if (!besideFoe(b, me, 2)) return;
  const to = safeTile(b, me, 2);
  if (!to) return;
  const from = { u: me.u, v: me.v };
  me.step = { u: from.u, v: from.v, h: tileOf(b, me).h, at: b.t, ms: 180 };
  me.u = to.u;
  me.v = to.v;
  out.push({ kind: 'dash', by: me.id, from, to: { ...to } });
}

/** Rifle Bot, Overclock's jets: it first jets (up to 3 tiles, an arc) to the highest free tile in reach, or clear of a foe beside it. */
export function jets(b: Battle, me: Unit, out: BattleEvent[]): void {
  const to = highGround(b, me, 3) ?? (besideFoe(b, me, 1) ? safeTile(b, me, 3) : undefined);
  if (to) leapTo(b, me, to, out);
}

/** What a shell or keg throws when it lands (`Pending.throws`): the foe on the blast's heart is launched `heart` tiles, the others in its 3x3
 *  are moved `ring` tiles outward (`ringHow`: shoved along the ground, or launched). */
export interface Throws {
  heart: number;
  ring: number;
  ringHow: 'shove' | 'launch';
}

/** A blast at (u, v) throws its foes, as `Throws` says (from the blast's heart outward; the heart's foe in the way it faces from the thrower). */
export function blastThrows(b: Battle, by: Unit, at: At, t: Throws, out: BattleEvent[]): void {
  const inBlast = foesOf(b, by).filter((f) => f.alive && Math.abs(f.u - at.u) <= 1 && Math.abs(f.v - at.v) <= 1);
  const heart = inBlast.find((f) => f.u === at.u && f.v === at.v);
  if (t.ring) moveMany(b, by, inBlast.filter((f) => f !== heart), t.ring, t.ringHow, out, at);
  if (heart && heart.alive && t.heart) displace(b, by, heart, wayTo(by, heart), t.heart, 'launch', out);
}

/** The Siege Bot's Bombard: its shell launches the foe at its heart 2 tiles and shoves the rest of the 3x3 a tile out. */
export const BOMBARD_THROWS: Throws = { heart: 2, ring: 1, ringHow: 'shove' };
/** The Siege Bot's Orbital Strike: the first shell launches every foe in the 3x3 2 tiles outward. */
export const ORBITAL_THROWS: Throws = { heart: 2, ring: 2, ringHow: 'launch' };
/** The Dread Pirate's Powder Keg: the blast launches its 3x3 a tile outward, and 2 at its heart. */
export const KEG_THROWS: Throws = { heart: 2, ring: 1, ringHow: 'launch' };
/** The Fire Wizard's Meteor Swarm (RPG-SPELLS batch 6): each meteor launches the foe at its heart a tile. */
export const SWARM_THROWS: Throws = { heart: 1, ring: 0, ringHow: 'launch' };

/** The Beastmaster's Pack Tactics: a wolf leaps (up to 4 tiles, an arc) to its tile beside the marked foe; farther than that it blinks, as
 *  before. True when it moved. */
export function wolfLeap(b: Battle, w: Unit, to: At, out: BattleEvent[]): boolean {
  return apart(w, to) <= 4 && leapTo(b, w, to, out);
}

/** The Reaper's Harvest of Souls: the scythe's sweep drags every foe within `reach` a tile towards him first. */
export function reaperDrag(b: Battle, me: Unit, reach: number, out: BattleEvent[]): void {
  moveMany(b, me, foesOf(b, me).filter((f) => apart(me, f) <= reach && apart(me, f) > 1), 1, 'drag', out);
}
