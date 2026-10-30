// The tanks' and supports' reworked moves (RPG-SPELLS batch 3, docs/notes/rpg-spells-design.md sections 4.1 and 4.6, docs/notes/spells-b3.md),
// built on the movement toolkit (`toolkit/`): the Knight's Shield Rush, the Paladin's Divine Smite and Aura of Protection, the Peasant's
// Spear Wall, the Juggernaut's Seismic Slam and Tunnel Strike, and the Tyrant's Bane; and the pieces the ultimates add (the Knight's
// aura, the Peasant's charge, the Fissure's spires, the Commander's charge, the Bard's thunderclap). No randomness: every choice is a
// fixed order.

import { DIRS, type At } from '../board';
import { atkOf, defOf, hurt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, foesOf, mendUnit, net } from '../abilities';
import { resistOf, weakFor } from '../ailments';
import { kx } from './effects';
import { foesNear, mark, ms, nearestFoe, strike, stun, toughest } from './common';
import { burrow, charge, chargePlans, chargeScore, chokeLine, moveMany, pull, raiseAura, raiseWall, type ChargeOpts } from '../toolkit';

const alliesNear = (b: Battle, me: Unit, reach: number) => b.units.filter((a) => a.alive && a.side === me.side && !a.under && apart(me, a) <= reach);

/** Knight, Shield Rush: charges up to 3 tiles in a line at a foe, bashes it (x1.2, stunned 1s) and drives it 2 tiles back. */
export const RUSH: ChargeOpts = { tiles: 3, route: 'line', mult: 1.2, stun: 1000, shove: 2 };
export function shieldRush(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const o: ChargeOpts = { ...RUSH, tiles: RUSH.tiles + Math.round(me.eq?.tal?.reach ?? 0), stun: ms(me, RUSH.stun!) };
  // (a hero guarding a post in the Last Stand charges only as far as its leash lets it)
  const post = me.post;
  const plans = chargePlans(b, me, o).filter((p) => !post || Math.abs(p.end.u - post.u) + Math.abs(p.end.v - post.v) <= post.leash);
  if (!plans.length) return false;
  const best = plans.map((p) => ({ p, s: chargeScore(b, me, p, o) })).sort((x, y) => y.s - x.s || x.p.steps - y.p.steps || x.p.hits[0].id - y.p.hits[0].id)[0].p;
  return charge(b, me, o, out, best);
}

/** Paladin, Divine Smite (it was Holy Challenge): a radiant blow on the foe before him (x1.2, half as much again on the undead and fiends), then,
 *  as before, the foes within 3 must attack him for 3s and the allies beside him are healed. */
export const SMITE = { MULT: 1.2, BANE: 1.5, REACH: 3, TAUNT_MS: 3000, HEAL: 2.5 } as const;
/** Undead and fiends: what Divine Smite bites harder (the undead resist fear; the fiends are the fire beings). */
export const smiteBane = (f: Unit): boolean => {
  const r = resistOf(f.def);
  // (the undead: fearless, and not golems, which also shrug off half a stun; the fiends: the fire beings, which never burn)
  return (r.immune.has('fear') && !r.half.has('stun')) || r.immune.has('burn');
};
export function divineSmite(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const reach = SMITE.REACH + Math.round(me.eq?.tal?.reach ?? 0);
  const near = foesNear(b, me, reach);
  if (!near.length) return false;
  const front = near.filter((f) => apart(me, f) === 1).sort(toughest)[0];
  if (front) {
    me.facing = wayTo(me, front);
    strike(b, me, front, SMITE.MULT * (smiteBane(front) ? SMITE.BANE : 1), out, true);
  }
  for (const f of near) if (f.alive) f.taunt = { to: me.id, until: b.t + ms(me, SMITE.TAUNT_MS) };
  for (const a of alliesNear(b, me, 2)) mendUnit(a, atkOf(me) * SMITE.HEAL, out, me);
  return true;
}

/** Paladin, Aura of Protection (it was Martyr's Vow): for 8s the allies within 2 of him take 15% less, heal 1% of their health a second, and each
 *  shrugs off the next ailment. Cast when a foe is within 4 and a friend is near him. */
export const PROTECTION = { MS: 8000, REACH: 2, GUARD: 0.15, HEAL: 0.01 } as const;
export function auraOfProtection(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 4).length || alliesNear(b, me, PROTECTION.REACH).length < 2) return false;
  raiseAura(b, me, { what: 'Aura of Protection', reach: PROTECTION.REACH + Math.round(me.eq?.tal?.reach ?? 0), ms: ms(me, PROTECTION.MS), every: 1000, ally: { guard: PROTECTION.GUARD, heal: PROTECTION.HEAL, ward: true } }, out);
  return true;
}

/** Peasant, Spear Wall (it was Brace Spears): a line of sharpened stakes, 3 tiles across his front (towards the nearest foe), for 6s: a thorn
 *  wall (`toolkit/walls.ts`) foes cannot walk through; one beside a stake at the end of a second is pricked and bleeds. */
export const SPEARS = { LEN: 3, MS: 6000, FAR: 5 } as const;
export function spearWall(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestFoe(b, me);
  if (!f || apart(me, f) > SPEARS.FAR) return false;
  const way = wayTo(me, f);
  const [du, dv] = DIRS[way];
  const [su, sv] = DIRS[(way + 1) % 4];
  const front = { u: me.u + du, v: me.v + dv };
  const line: At[] = [front, { u: front.u + su, v: front.v + sv }, { u: front.u - su, v: front.v - sv }];
  const laid = raiseWall(b, me, line, 'thorns', ms(me, SPEARS.MS), out);
  if (!laid.length) return false;
  me.facing = way;
  return true;
}

/** Juggernaut, Seismic Slam (it was Earthquake): the foes beside him are launched 2 tiles away; every foe within 3 is hurt (x0.8) and held 0.8s. */
export const SLAM = { REACH: 3, MULT: 0.8, HOLD_MS: 800, LAUNCH: 2 } as const;
export function seismicSlam(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const reach = SLAM.REACH + Math.round(me.eq?.tal?.reach ?? 0);
  const near = foesNear(b, me, reach);
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * SLAM.MULT, f), false, false, out, 'skill');
    if (f.alive) stun(b, f, ms(me, SLAM.HOLD_MS));
  }
  moveMany(b, me, near.filter((f) => f.alive && apart(me, f) === 1), SLAM.LAUNCH, 'launch', out);
  return true;
}

/** Juggernaut, Tunnel Strike (it was Raise Rampart): drills into the ground and comes up under the foe within 6 with most foes round it: x1.6 to
 *  it and it is launched 2 tiles; the foes beside it take x0.6 and are shoved a tile. Only when that foe is not already beside him. */
export const TUNNEL = { reach: 6, mult: 1.6, launch: 2, splash: 0.6 } as const;
export function tunnelStrike(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (foesNear(b, me, 1).length >= 2) return false;
  // (the eruption comes after the cast, so the cast's strength, its `tune`, is carried into it)
  const k = castPower();
  return burrow(b, me, { ...TUNNEL, mult: TUNNEL.mult * k, splash: TUNNEL.splash * k }, out);
}

/** Tyrant, Bane (it was Condemn): iron chains drag the toughest foe within 6 up to 3 tiles towards him and mark it for 6s (every hero goes for
 *  it and deals 20% more; if it falls, every hero gains pool; the mark weakens it, `ailmentSources.ts`); the two foes nearest it are weakened 4s. */
export const BANE = { REACH: 6, DRAG: 3, MARK_MS: 6000, WEAK_MS: 4000, SPREAD: 2 } as const;
export function bane(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, BANE.REACH)
    .filter((x) => !(x.kx?.condemned && x.kx.condemned.until > b.t))
    .sort(toughest)[0];
  if (!f) return false;
  if (apart(me, f) > 1) pull(b, me, f, BANE.DRAG, out);
  if (!f.alive) return true;
  kx(f).condemned = { by: me.id, until: b.t + ms(me, BANE.MARK_MS) };
  mark(out, me, f, 'condemned', ms(me, BANE.MARK_MS));
  const others = foesOf(b, me)
    .filter((x) => x !== f)
    .sort((x, y) => apart(x, f) - apart(y, f) || x.id - y.id)
    .slice(0, BANE.SPREAD);
  for (const x of others) weakFor(b, x, ms(me, BANE.WEAK_MS), me);
  return true;
}

// ---- what the ultimates add ----

/** The Knight's Indomitable adds an Aura of Protection: the allies within 2 take 20% less for 6s. */
export function knightsAura(b: Battle, me: Unit, msLong: number, out: BattleEvent[]): void {
  raiseAura(b, me, { what: 'Indomitable', reach: 2, ms: msLong, every: 500, ally: { guard: 0.2 } }, out);
}

/** A charge to the nearest foe within `tiles` (the Peasant's Call to Arms, the Commander's Rallying Cry): along a walk, `mult` of attack. */
export function chargeNearest(b: Battle, me: Unit, tiles: number, mult: number, out: BattleEvent[]): boolean {
  if (!me.alive || defOf(me).still || defOf(me).shot) return false;
  return charge(b, me, { tiles, route: 'path', mult }, out);
}

/** The Fissure's spires: rock spires (stone walls) where the rift is widest, by the choke rule, for `msLong`. */
export function fissureSpires(b: Battle, me: Unit, msLong: number, out: BattleEvent[]): void {
  const line = chokeLine(b, me, 3);
  if (line) raiseWall(b, me, line, 'stone', msLong, out);
}

/** The Wolf Bard's opening thunderclap: the foes within 2 are shoved 2 tiles back. */
export function thunderclap(b: Battle, me: Unit, out: BattleEvent[]): void {
  moveMany(b, me, foesNear(b, me, 2), 2, 'shove', out);
}
