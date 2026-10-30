// The melee heroes' reworked moves (RPG-SPELLS batch 4, docs/notes/rpg-spells-design.md section 4.2, docs/notes/spells-b4.md), built on the
// movement toolkit (`toolkit/`): the Kunoichi's Smoke Bomb that blinks her clear, the Ninja Monk's leaping Quivering Palm, the Arc Blade's
// Thunderwave shove, and what the ultimates add: the Hundred-Hand Strike's launches, the Berserker Leap, the Cavalry Charge through a line,
// the Lightning Storm's teleport slash, the Metamorphosis's chains, the Dragon Dive's launch and the Inferno Breath's burning line. No
// randomness: every choice is a fixed order.

import { type At } from '../board';
import { atkOf, hurt, tileOf, wayTo, type Battle, type BattleEvent, type Pending, type Unit } from '../battle';
import { apart, foesOf, net } from '../abilities';
import { shockFor, stunFor } from '../ailments';
import { foesNear } from './common';
import { blinkTo, chargePlans, displace, leapTo, moveMany, pull, raiseWall, safeTile, teleportSlash } from '../toolkit';

// ---- the skills ----

/** Kunoichi, Smoke Bomb's blink: after the smoke, she blinks up to 3 tiles to the safest free tile (the toolkit's `safeTile`). */
export const SMOKE_BLINK = 3;
export function smokeBlink(b: Battle, me: Unit, out: BattleEvent[]): void {
  const to = safeTile(b, me, SMOKE_BLINK);
  if (to) blinkTo(b, me, to, out);
}

/** Ninja Monk, Quivering Palm's Step of the Wind: with nobody in reach, he leaps (up to 4 tiles) beside the foe with the fullest skill meter
 *  within 4 (then the weakest, then the lower id); the palm then falls on it. False when there is nobody to leap to. */
export const STEP_OF_WIND = 4;
export function stepOfTheWind(b: Battle, me: Unit, out: BattleEvent[]): Unit | undefined {
  const target = foesNear(b, me, STEP_OF_WIND).sort((x, y) => y.charge - x.charge || x.hp - y.hp || x.id - y.id)[0];
  if (!target) return undefined;
  const plan = chargePlans(b, me, { tiles: STEP_OF_WIND, route: 'leap', mult: 0, only: (f) => f === target })[0];
  if (!plan || !leapTo(b, me, plan.end, out)) return undefined;
  me.facing = wayTo(me, target);
  return target;
}

/** Arc Blade, Thunderwave: it goes off once he has stored this much (a share of his attack; 1.2 as Grounding, before RPG-SPELLS batch 4). */
export const THUNDER_STORE = 0.8;

/** Arc Blade, Thunderwave's shove: after the wave, the foes within 2 are shoved 2 tiles back (the toolkit's shared move rule). */
export function thunderShove(b: Battle, me: Unit, out: BattleEvent[]): void {
  moveMany(b, me, foesNear(b, me, 2), 2, 'shove', out);
}

/** Queen Dragoon, Dragon Dive's landing: the foes in the 3x3 round where she lands are launched a tile outward from its heart (the foe at its
 *  heart is not moved). */
export function diveLaunch(b: Battle, me: Unit, p: Pending, out: BattleEvent[]): void {
  const at = { u: p.u!, v: p.v! };
  const ring = foesOf(b, me).filter((f) => f.alive && Math.abs(f.u - at.u) <= 1 && Math.abs(f.v - at.v) <= 1 && (f.u !== at.u || f.v !== at.v));
  moveMany(b, me, ring, 1, 'launch', out, at);
}

// ---- what the ultimates add ----

/** Ninja Monk, Hundred-Hand Strike: the last blow on each foe launches it 2 tiles. */
export function lastBlowLaunch(b: Battle, me: Unit, f: Unit, out: BattleEvent[]): void {
  if (f.alive) displace(b, me, f, wayTo(me, f), 2, 'launch', out);
}

/** Barbarian, Berserker Leap: he leaps (up to 4 tiles) beside the foe with the most foes round it, then strikes the 3x3 round where he lands
 *  (`mult` of attack), shoves its foes a tile out, drinks a third of what it dealt and runs fast. With nobody to leap to but foes beside him, he
 *  stays and whirls. False when there is nobody within 4. */
export const LEAP = { TILES: 4, DRINK: 0.3, HASTE_MS: 5000 } as const;
export function berserkerLeap(b: Battle, me: Unit, out: BattleEvent[], mult: number, hasteMs: number, mend: (amount: number) => void): boolean {
  const foes = foesNear(b, me, LEAP.TILES);
  if (!foes.length) return false;
  const crowd = (f: Unit) => foes.filter((x) => Math.abs(x.u - f.u) <= 1 && Math.abs(x.v - f.v) <= 1).length;
  const target = [...foes].sort((x, y) => crowd(y) - crowd(x) || apart(me, x) - apart(me, y) || x.id - y.id)[0];
  const besideNow = foes.filter((f) => Math.abs(f.u - me.u) <= 1 && Math.abs(f.v - me.v) <= 1).length;
  if (crowd(target) > besideNow) {
    const plan = chargePlans(b, me, { tiles: LEAP.TILES, route: 'leap', mult: 0, only: (f) => f === target })[0];
    if (plan) leapTo(b, me, plan.end, out);
  }
  const hit = foesOf(b, me).filter((f) => Math.abs(f.u - me.u) <= 1 && Math.abs(f.v - me.v) <= 1);
  if (!hit.length) return true;
  const before = me.dealt ?? 0;
  for (const f of hit) hurt(b, me, f, net(atkOf(me) * mult, f), true, false, out, 'skill');
  moveMany(b, me, hit.filter((f) => f.alive), 1, 'shove', out);
  mend(((me.dealt ?? 0) - before) * LEAP.DRINK);
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + hasteMs);
  out.push({ kind: 'haste', to: me.id, ms: hasteMs });
  return true;
}

/** Lancer, Cavalry Charge: he rides up to 7 tiles in a line through every foe on it (`mult` of attack each), each thrown a tile aside. False when
 *  no line holds a foe. */
export function cavalryCharge(b: Battle, me: Unit, out: BattleEvent[], mult: number): boolean {
  const plans = chargePlans(b, me, { tiles: 7, route: 'line', through: true, mult });
  if (!plans.length) return false;
  const plan = plans.sort((x, y) => y.hits.length - x.hits.length || x.way - y.way)[0];
  const from = { u: me.u, v: me.v };
  const h0 = tileOf(b, me).h;
  if (plan.end.u !== from.u || plan.end.v !== from.v) {
    me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms: 70 * Math.max(1, plan.steps) };
    me.u = plan.end.u;
    me.v = plan.end.v;
    out.push({ kind: 'dash', by: me.id, from, to: { ...plan.end } });
  }
  me.facing = plan.way;
  for (const f of plan.hits) {
    if (!f.alive) continue;
    hurt(b, me, f, net(atkOf(me) * mult, f), true, false, out, 'skill');
    if (f.alive) displace(b, me, f, (plan.way + 1) % 4, 1, 'shove', out);
  }
  return true;
}

/** Arc Blade, Lightning Storm: he becomes lightning and slashes through up to six foes within 6 in turn (the toolkit's teleport slash), each
 *  shocked and stunned, then is back where he started. */
export function lightningStorm(b: Battle, me: Unit, out: BattleEvent[], mult: number, stunMs: number): boolean {
  const hit = teleportSlash(b, me, { k: 6, reach: 6, mult, order: (x, y) => x.hp - y.hp || x.id - y.id, home: true }, out);
  for (const f of hit) {
    if (!f.alive) continue;
    out.push({ kind: 'arc', from: me.id, to: f.id, ail: 'shock' });
    shockFor(b, me, f);
    stunFor(b, f, stunMs, true, 'stun', me);
  }
  return hit.length > 0;
}

/** Demon Swordsman, Metamorphosis's chains: the three nearest foes within 4 are dragged to him (the toolkit's pull). */
export function hellChains(b: Battle, me: Unit, out: BattleEvent[]): void {
  const near = foesNear(b, me, 4)
    .filter((f) => apart(me, f) > 1)
    .sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)
    .slice(0, 3);
  for (const f of near) pull(b, me, f, 3, out);
}

/** Queen Dragoon, Inferno Breath's burning line: the free tiles from her towards the farthest foe her breath struck burn for `msLong` (a fire
 *  wall, `toolkit/walls.ts`). */
export function burningLine(b: Battle, me: Unit, far: At, msLong: number, out: BattleEvent[]): void {
  const n = Math.max(Math.abs(far.u - me.u), Math.abs(far.v - me.v));
  const tiles: At[] = [];
  for (let i = 1; i <= n; i++) tiles.push({ u: Math.round(me.u + ((far.u - me.u) * i) / n), v: Math.round(me.v + ((far.v - me.v) * i) / n) });
  // (`raiseWall` lays fire only on the free tiles of the line)
  raiseWall(b, me, tiles, 'fire', msLong, out);
}
