// The shooters' new skills (COMBAT-002): the Archer's pin, the Ranger's caltrops, the Gunslinger's fanned hammer, the Rifle Bot's suppressing
// fire, the Siege Bot's anchor and the Dread Pirate's powder kegs.

import { KEG_THROWS, blastThrows, leapBack, rollAway } from './ranged';
import { canStrike, strikeDef, wayTo, atkOf, blast, type Battle, type BattleEvent, type Pending, type Unit } from '../battle';
import { apart, crowd, foesOf, landArea, slowFor } from '../abilities';
import { kx, KIT } from './effects';
import { foesNear, mark, ms, nearestFoe, strike, stun } from './common';

/** Archer, Pinning Shot: the farthest foe in reach is pinned 2s and takes a quarter more from shots for 4s. */
export function pinningShot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  // (RPG-SPELLS batch 5, Aimed Shot: with a foe beside her she leaps back first, to higher ground if she can)
  if (foesOf(b, me).some((x) => canStrike(b.board, strikeDef(b, me), me, x))) leapBack(b, me, out);
  const def = strikeDef(b, me);
  const f = foesOf(b, me)
    .filter((x) => canStrike(b.board, def, me, x))
    .sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 + apart(me, f) * 40 });
  strike(b, me, f, 1.2, out, true);
  if (!f.alive) return true;
  stun(b, f, ms(me, 2000));
  kx(f).pinned = b.t + ms(me, 4000);
  mark(out, me, f, 'pinned', ms(me, 4000));
  return true;
}

/** How long the Ranger's caltrops last. */
export const SPIKE_MS = 4000;
/** Ranger, Spike Field: caltrops on the 3x3 round the nearest foe for 4s (6s until the joint rebalance trimmed the Ranger at level 10): whoever
 *  stands in it is slowed and bleeds. */
export function spikeField(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestFoe(b, me);
  if (!f || apart(me, f) > strikeDef(b, me).range + 3) return false;
  if (b.zones.some((z) => z.by === me.id && z.slow && Math.abs(z.u - f.u) <= 1 && Math.abs(z.v - f.v) <= 1)) return false;
  const until = b.t + ms(me, SPIKE_MS);
  b.zones.push({ u: f.u, v: f.v, side: me.side, by: me.id, until, next: b.t + 500, dmg: Math.max(1, Math.round(atkOf(me) * 0.18)), slow: 800 });
  out.push({ kind: 'zone', u: f.u, v: f.v, ms: until - b.t, what: 'spikes' });
  return true;
}

/** Gunslinger, Fan the Hammer: three fast shots at the nearest foe in reach, then a long reload (the cast's time). */
export function fanTheHammer(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  // (RPG-SPELLS batch 5: with a foe within 2 she rolls clear first)
  if (foesOf(b, me).some((x) => canStrike(b.board, strikeDef(b, me), me, x))) rollAway(b, me, out);
  const def = strikeDef(b, me);
  const f = foesOf(b, me)
    .filter((x) => canStrike(b.board, def, me, x))
    .sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  for (let i = 0; i < 3 && f.alive; i++) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'bullet', ms: 120 + apart(me, f) * 40 + i * 90 });
    strike(b, me, f, 0.95, out, i === 2);
  }
  return true;
}

/** The foes in the three-wide lane from `me` through `aim`, no further than `len`. */
function lane(foes: Unit[], me: Unit, aim: Unit, len: number): Unit[] {
  const du = aim.u - me.u;
  const dv = aim.v - me.v;
  const l = Math.hypot(du, dv) || 1;
  return foes.filter((f) => {
    const proj = ((f.u - me.u) * du + (f.v - me.v) * dv) / l;
    const perp = Math.abs((f.u - me.u) * dv - (f.v - me.v) * du) / l;
    return proj > 0 && proj <= len && perp <= 1.5;
  });
}

/** Rifle Bot, Suppressing Fire: 3s of fire on the three-wide lane with most foes: each is struck a little, slowed, and its skill meter stops filling. */
export function suppressingFire(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const foes = foesOf(b, me);
  let best: Unit[] = [];
  for (const aim of foes.filter((f) => canStrike(b.board, def, me, f))) {
    const hit = lane(foes, me, aim, def.range + 2);
    if (hit.length > best.length) best = hit;
  }
  if (!best.length) return false;
  me.facing = wayTo(me, best[0]);
  const until = b.t + ms(me, 3000);
  for (const f of best.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'bullet', ms: 120 + apart(me, f) * 40 });
    strike(b, me, f, 0.55, out);
    if (!f.alive) continue;
    slowFor(b, f, until - b.t);
    const k = kx(f);
    k.suppressed = until;
    k.frozen = f.charge;
    mark(out, me, f, 'suppressed', until - b.t);
  }
  return true;
}

/** Siege Bot, Siege Mode: anchors for 8s: it cannot walk, reaches two tiles further, its shells splash and come a quarter faster; it unanchors early when a foe stands beside it. */
export function siegeMode(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (me.kx?.siege !== undefined && me.kx.siege > b.t) return false;
  const def = strikeDef(b, me);
  if (foesNear(b, me, 1).length || !foesNear(b, me, def.range + KIT.SIEGE_RANGE).length) return false;
  kx(me).siege = b.t + ms(me, 8000);
  mark(out, me, me, 'siege', ms(me, 8000));
  return true;
}

/** Dread Pirate, Powder Keg: rolls a keg to the thickest crowd within 6; 1.2s later it bursts on the 3x3 and sets off every powder barrel and keg within 2. */
export function powderKeg(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= 6);
  if (!aim) return false;
  b.pending.push({ at: b.t + 1200, kind: 'keg', by: me.id, to: aim.id, dmg: atkOf(me) * 1.6, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 1200 });
  me.facing = wayTo(me, aim);
  return true;
}
/** A keg bursts: the 3x3 is struck, and every powder barrel and keg waiting within 2 tiles goes off with it, chain after chain. */
export function settleKeg(b: Battle, p: Pending, out: BattleEvent[]): void {
  const by = b.units.find((x) => x.id === p.by);
  if (!by) return;
  out.push({ kind: 'boom', u: p.u!, v: p.v! });
  landArea(b, 'rain', by, p.u!, p.v!, p.dmg, out);
  // (RPG-SPELLS batch 5: the blast throws its 3x3 a tile outward, and 2 at its heart)
  blastThrows(b, by, { u: p.u!, v: p.v! }, KEG_THROWS, out);
  const within = (u: number, v: number) => Math.max(Math.abs(u - p.u!), Math.abs(v - p.v!)) <= 2;
  if (b.barrels) for (const i of b.barrels.filter((i) => within(i % b.board.w, Math.floor(i / b.board.w)))) blast(b, i, out);
  const chained = b.pending.filter((q) => q.kind === 'keg' && within(q.u!, q.v!));
  if (!chained.length) return;
  b.pending = b.pending.filter((q) => !chained.includes(q));
  for (const q of chained) settleKeg(b, q, out);
}
