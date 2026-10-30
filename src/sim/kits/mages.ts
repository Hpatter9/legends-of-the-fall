// The casters' reworked moves (RPG-SPELLS batch 6, docs/notes/rpg-spells-design.md section 4.4, docs/notes/spells-b6.md), built on the
// movement toolkit (`toolkit/`): the Fire Wizard's Wall of Fire, the Lightning Mage's blink before Storm Surge and her Call Lightning cloud,
// the Warlock's Eldritch Blast that shoves and his Circle of Death, the Great Sage's Font of Magic and the Illusionist's Transposition. No
// randomness: every choice is a fixed order.

import type { At } from '../board';
import { addUnit, atkOf, hurt, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, foesOf, net } from '../abilities';
import { poolOf } from '../heroKits';
import { UNITS } from '../units';
import { blinkTo, canSwap, laneLine, raiseAura, raiseWall, safeTile, shove, swapPlaces } from '../toolkit';
import { charge, overload } from './casters';
import { alliesOf, freeNear, ms, stun, toughest } from './common';
import { kx } from './effects';

const on = (t: number | undefined, b: Battle) => t !== undefined && t > b.t;

/** The Fire Wizard's Wall of Fire: 4 tiles across the lane the most foes are walking, for 6s, cast with a foe within 7 and two or more foes within
 *  2 tiles of the line. */
export const FIRE_WALL = { LEN: 4, MS: 6000, REACH: 7, NEAR: 2, FOES: 2 } as const;
/** Where the Wall of Fire would go, or undefined when it is not worth laying: the lane line (`laneLine`) is worth it when two or more foes
 *  are within 2 tiles of it (the crowd that will walk through it), with a foe within 7 of the Wizard. */
export function fireLane(b: Battle, me: Unit): At[] | undefined {
  const foes = foesOf(b, me);
  if (!foes.some((f) => apart(me, f) <= FIRE_WALL.REACH)) return undefined;
  const line = laneLine(b, me, FIRE_WALL.LEN);
  if (!line || foes.filter((f) => line.some((t) => apart(f, t) <= FIRE_WALL.NEAR)).length < FIRE_WALL.FOES) return undefined;
  return line;
}
/** Fire Wizard, Wall of Fire: a wall of fire across the lane the most foes are walking (`laneLine`), on its tiles with foes in them too; a foe
 *  in it or crossing it burns. It burns as hard as the skill's strength when it was laid. */
export function wallOfFire(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const line = fireLane(b, me);
  if (!line) return false;
  return raiseWall(b, me, line, 'fire', ms(me, FIRE_WALL.MS), out, { pow: castPower(), onFighters: true }).length > 0;
}

/** Lightning Mage, Storm Surge: with a foe beside her she first blinks to the safest tile within 3; then every Charged foe discharges
 *  (Overload). Only when some foe within 8 is Charged. */
export function stormSurge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => on(f.kx?.charged, b) && apart(me, f) <= 8)) return false;
  if (foesOf(b, me).some((f) => apart(me, f) === 1)) {
    const to = safeTile(b, me, 3);
    if (to) blinkTo(b, me, to, out);
  }
  return overload(b, me, out);
}

/** The Lightning Mage's Call Lightning: a storm cloud over her for 6s; each second a bolt strikes the toughest foe within 6. */
export const CALL = { MS: 6000, EVERY: 1000, REACH: 6, MULT: 1.4, STUN: 800 } as const;
/** Lightning Mage, Call Lightning: the cloud gathers (an aura the page draws; it does nothing itself) and the first bolt falls at once;
 *  `kitTick` calls the rest (`stormBolt`). The bolts strike as hard as the ultimate's strength when it was called. */
export function callLightning(b: Battle, me: Unit, out: BattleEvent[], msLong: number): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= CALL.REACH)) return false;
  kx(me).storm = { until: b.t + msLong, next: b.t, pow: castPower() };
  raiseAura(b, me, { what: 'storm cloud', reach: CALL.REACH, ms: msLong, every: CALL.EVERY }, out);
  stormBolt(b, me, out);
  return true;
}
/** One bolt from the Lightning Mage's cloud: the toughest foe within 6 is struck, stunned 0.8s and Charged. */
export function stormBolt(b: Battle, me: Unit, out: BattleEvent[]): void {
  const s = me.kx?.storm;
  if (!s) return;
  s.next = b.t + CALL.EVERY;
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= CALL.REACH)
    .sort(toughest)[0];
  if (!f) return;
  out.push({ kind: 'arc', from: me.id, to: f.id });
  hurt(b, me, f, net(atkOf(me) * CALL.MULT * s.pow, f), true, false, out, 'skill');
  if (!f.alive) return;
  stun(b, f, ms(me, CALL.STUN));
  charge(b, me, f, out);
}

/** Warlock, Eldritch Blast's force: each foe the hex struck (its `arc` events from him, from `first` on in `out`) is shoved a tile back. */
export function blastShoves(b: Battle, me: Unit, out: BattleEvent[], first: number): void {
  const hit = out.slice(first).flatMap((e) => (e.kind === 'arc' && e.from === me.id ? [e.to] : []));
  for (const id of hit) {
    const f = b.units.find((x) => x.id === id);
    if (f && f.alive) shove(b, me, f, 1, out);
  }
}

/** The Warlock's Circle of Death: a ring round him for 6s; a foe within 2 takes 0.3 of his attack a second (the design's 0.4 made the level-100
 *  party clear the Mythic Golem Forge at the first try), and he drinks a third of it. */
export const CIRCLE = { MS: 6000, REACH: 2, DMG: 0.3, DRINK: 1 / 3 } as const;
/** Raise the Circle of Death's ring (as hard as the ultimate's strength when it was cast). */
export function circleOfDeath(b: Battle, me: Unit, out: BattleEvent[], msLong: number): void {
  raiseAura(b, me, { what: 'circle of death', reach: CIRCLE.REACH, ms: msLong, every: 1000, foe: { dmg: CIRCLE.DMG * castPower(), drink: CIRCLE.DRINK } }, out);
}

/** The Great Sage's Font of Magic: a font on his tile for 8s; friends within 3 of it gain 4 mana or 2 stamina a second. */
export const FONT = { MS: 8000, REACH: 3, MANA: 4, STAMINA: 2 } as const;
/** Great Sage, Font of Magic: raised when friends with a pool are within 3 and some of them run low (as Font of Wisdom asked). The flow is
 *  as strong as the skill's strength when it rose. */
export function fontOfMagic(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = alliesOf(b, me).filter((a) => a !== me && apart(a, me) <= FONT.REACH && poolOf(a));
  if (!near.length || near.filter((a) => a.charge < 34).length < Math.min(2, near.length) || !foesOf(b, me).length) return false;
  const k = castPower();
  raiseAura(b, me, { what: 'font of magic', at: { u: me.u, v: me.v }, reach: FONT.REACH, ms: ms(me, FONT.MS), every: 1000, ally: { mana: FONT.MANA * k, stamina: FONT.STAMINA * k } }, out);
  return true;
}

/** Illusionist, Transposition: the friend in most trouble within 5 (beside a foe, under 60%) and she change places; a decoy springs up
 *  beside the friend, and the foes that were striking the friend now face her for 3s (she slips a quarter of blows). */
export const SWAP_REACH = 5;
export const inTrouble = (b: Battle, me: Unit, a: Unit): boolean =>
  a !== me && a.owner === undefined && !UNITS[a.def].summon && apart(a, me) <= SWAP_REACH && a.hp < a.maxHp * 0.6 && foesOf(b, me).some((f) => apart(f, a) === 1);
export function transposition(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const ally = alliesOf(b, me)
    .filter((a) => inTrouble(b, me, a) && canSwap(b, me, a))
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (!ally) return false;
  const strikers = foesOf(b, me).filter((f) => apart(f, ally) === 1);
  if (!swapPlaces(b, me, ally, out)) return false;
  for (const f of strikers) f.taunt = { to: me.id, until: b.t + ms(me, 3000) };
  const spot = freeNear(b, ally, 1)[0];
  if (spot) {
    const d = addUnit(b, 'decoy', spot.u, spot.v);
    d.owner = me.id;
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * 0.45 * castPower()));
    d.busyUntil = b.t + 1500;
    d.expires = b.t + ms(me, 5000);
    for (const f of foesOf(b, me)) if (!strikers.includes(f) && apart(f, spot) <= 2) f.taunt = { to: d.id, until: b.t + ms(me, 3000) };
  }
  return true;
}
