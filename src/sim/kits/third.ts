// The third skills (the skills overhaul's batch 4, docs/notes/skills-overhaul-design.md section 2, docs/notes/skills-4.md): one for each of the 45
// heroes, open from level 20 (`SKILL3_LEVEL`). Most are jabs (a quick, cheap move used between the big ones), ten are guards (an escape, a ward,
// a save, cast at once when their trigger holds: each guard's cast checks its own trigger, and its slot's `emergency` is the same check) and
// three are utilities. Each is built from parts the game already has: the movement toolkit (shove, pull, blink, the stone wall), the ailments,
// the kits' marks (`kits/effects.ts`) and the plain skill strike.
//
// A cast deals one of the caster's attack a hit (`strike` at 1): its strength is the slot's `tune` (`TUNE3`, the design's "x0.8"), which lifts
// the attack while it casts. What is not an attack (a heal, a shield) is scaled by `castPower()`, as the ultimates' heals are. No randomness:
// every choice is a fixed order (then by id).

import { atkOf, canStrike, hurt, strikeDef, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, foesOf, mendUnit, net } from '../abilities';
import { bleedFor, burnFor, chillFor, cleanse, harmed, shockFor, stunFor, ward, weakFor } from '../ailments';
import { UNITS } from '../units';
import { kx, KIT } from './effects';
import { foesNear, mark, ms, strike } from './common';
import { blinkTo, chokeLine, moveMany, raiseWall, safeTile, shove } from '../toolkit';

// ---- the helpers every third skill shares ----

const on = (t: number | undefined, b: Battle) => t !== undefined && t > b.t;
/** The foes the caster could strike from where it stands, the weakest first (then by id). */
const inReach = (b: Battle, me: Unit): Unit[] => {
  const def = strikeDef(b, me);
  return foesOf(b, me)
    .filter((f) => canStrike(b.board, def, me, f))
    .sort((x, y) => x.hp - y.hp || x.id - y.id);
};
/** The foe before the caster: the weakest it could strike now. */
const before = (b: Battle, me: Unit): Unit | undefined => inReach(b, me)[0];
/** The foes within `n`, nearest first (then the weakest, then by id). */
const nearest = (b: Battle, me: Unit, n: number): Unit[] => foesNear(b, me, n).sort((x, y) => apart(me, x) - apart(me, y) || x.hp - y.hp || x.id - y.id);
/** The caster's living friends (not itself, not summons), the most hurt share first. */
const friends = (b: Battle, me: Unit, reach: number): Unit[] =>
  b.units
    .filter((a) => a.alive && a !== me && a.side === me.side && a.owner === undefined && !UNITS[a.def].summon && apart(a, me) <= reach)
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id);
/** A melee cut: it faces the foe, the swing is drawn, and it is struck for `mult` of the caster's attack. */
function cut(b: Battle, me: Unit, f: Unit, out: BattleEvent[], mult = 1): void {
  me.facing = wayTo(me, f);
  out.push({ kind: 'swing', by: me.id, to: f.id });
  strike(b, me, f, mult, out);
}
/** A missile (a shot, a bolt, a wisp): drawn as a streak from the caster, then struck for `mult`. */
function bolt(b: Battle, me: Unit, f: Unit, out: BattleEvent[], mult = 1): void {
  me.facing = wayTo(me, f);
  out.push({ kind: 'arc', from: me.id, to: f.id });
  strike(b, me, f, mult, out);
}
/** A shield of `share` of a fighter's health for `msLong` (kept if it already holds a bigger one). */
export function shieldOf(b: Battle, u: Unit, share: number, msLong: number): void {
  const hp = Math.round(u.maxHp * share);
  if (u.shield && u.shield.until > b.t && u.shield.hp >= hp) return;
  u.shield = { hp, until: b.t + msLong };
}
/** A fighter's own ailments, dropped (one of its own heals, a ward). */
const shake = (b: Battle, u: Unit) => cleanse(b, u);

/** The guards' triggers, shared by the casts and their slots' `emergency`. */
export const GUARD = {
  /** Knight, Hold Fast: under 40% with a foe beside him. */
  holdFast: (b: Battle, me: Unit) => me.hp < me.maxHp * 0.4 && foesNear(b, me, 1).length > 0,
  /** Paladin, Warding Bond: a friend within 4 under 35%, not already bound. */
  bond: (b: Battle, me: Unit) => friends(b, me, 4).some((a) => a.hp < a.maxHp * 0.35 && !(a.kx?.bond && on(a.kx.bond.until, b))),
  /** Ninja Monk, Step of the Wind: two or more foes beside him. */
  stepWind: (b: Battle, me: Unit) => foesNear(b, me, 1).length >= 2,
  /** Queen Dragoon, Scale Ward: under half her health with a foe within 2. */
  scales: (b: Battle, me: Unit) => me.hp < me.maxHp * 0.5 && foesNear(b, me, 2).length > 0 && !on(me.kx?.scales, b),
  /** Wolf Bard, Countercharm: two friends within 3 (or he and one) carry an ailment. */
  countercharm: (b: Battle, me: Unit) => [me, ...friends(b, me, 3)].filter((a) => harmed(a)).length >= 2,
} as const;

// ---- group 1: the tanks, the melee and the supports ----

/** Knight, Hold Fast (v1's Second Wind, renamed): a fifth of his health comes back and he shakes off his ailments. */
export const HOLD_FAST = { HEAL: 0.2 } as const;
export function holdFast(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!GUARD.holdFast(b, me)) return false;
  shake(b, me);
  mendUnit(me, me.maxHp * HOLD_FAST.HEAL * castPower(), out, me);
  return true;
}

/** Paladin, Warding Bond: the friend in most trouble within 4 is bound to him for 6s: it takes 10% less, and half of every blow on it is his. */
export const BOND = { REACH: 4, MS: 6000 } as const;
export function wardingBond(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const a = friends(b, me, BOND.REACH).find((x) => x.hp < x.maxHp * 0.35 && !(x.kx?.bond && on(x.kx.bond.until, b)));
  if (!a) return false;
  const t = ms(me, BOND.MS);
  kx(a).bond = { by: me.id, until: b.t + t };
  mark(out, me, a, 'bond', t);
  return true;
}

/** Peasant, Pitchfork Jab: a quick thrust at the foe before him, which is shoved a tile back. */
export function pitchforkJab(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive) shove(b, me, f, 1, out);
  return true;
}

/** Juggernaut, Wall of Stone (v1's): three tiles of stone wall rise across the nearest foes' way to his back line, for 6s (the choke rule). */
export const STONE = { LEN: 3, MS: 6000 } as const;
export function wallOfStone(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const line = chokeLine(b, me, STONE.LEN);
  if (!line) return false;
  return raiseWall(b, me, line, 'stone', ms(me, STONE.MS), out).length > 0;
}

/** Samurai, Kesa Cut: a fast diagonal cut on the foe before him; it bleeds 3s. */
export function kesaCut(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  bleedFor(b, me, f, 0.1, ms(me, 3000));
  return true;
}

/** Kunoichi, Shuriken Fan: three shuriken at the three nearest foes within 4; each is slowed 1s. */
export function shurikenFan(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = nearest(b, me, 4).slice(0, 3);
  if (!fs.length) return false;
  for (const f of fs) {
    bolt(b, me, f, out);
    if (f.alive) chillFor(b, f, ms(me, 1000), false, false, me);
  }
  return true;
}

/** Ninja Monk, Step of the Wind: with two or more foes on him, he steps up to 3 tiles to the safest tile and cannot be struck for 1.5s; two Flow
 *  are added on the foe he was building on (his Quivering Palm spends it). */
export const STEP_WIND = { TILES: 3, HIDE_MS: 1500, FLOW: 2 } as const;
export function stepOfWind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!GUARD.stepWind(b, me)) return false;
  const to = safeTile(b, me, STEP_WIND.TILES);
  if (!to) return false;
  blinkTo(b, me, to, out);
  me.hideUntil = Math.max(me.hideUntil ?? 0, b.t + ms(me, STEP_WIND.HIDE_MS));
  const f = me.kx?.flow;
  if (f) kx(me).flow = { to: f.to, n: Math.min(5, f.n + STEP_WIND.FLOW) };
  return true;
}

/** Barbarian, Reckless Swing: a wild overhead blow on the foe before him; he takes 10% more for 2s. */
export const RECKLESS = { MORE: 0.1, MS: 2000 } as const;
export function recklessSwing(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  kx(me).exposed = { until: b.t + RECKLESS.MS, mult: RECKLESS.MORE };
  return true;
}

/** Mercenary, Dirty Trick: sand in the eyes of the foe before him: it misses half its blows for 2s (the Kunoichi's smoke on one foe). */
export function dirtyTrick(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive) {
    kx(f).smoke = Math.max(f.kx?.smoke ?? 0, b.t + ms(me, 2000));
    mark(out, me, f, 'smoke', ms(me, 2000));
  }
  return true;
}

/** Lancer, Lance Sweep: a sweep at the foes beside him, each shoved a tile; it gives him a step of Momentum. */
export function lanceSweep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = foesNear(b, me, 1).sort((x, y) => x.id - y.id);
  if (!fs.length) return false;
  for (const f of fs) cut(b, me, f, out);
  moveMany(b, me, fs.filter((f) => f.alive), 1, 'shove', out);
  const k = kx(me);
  k.momentum = Math.min(KIT.MOMENTUM_MAX, (k.momentum ?? 0) + 1);
  return true;
}

/** Arc Blade, Static Edge: a crackling cut on the foe before him: it is shocked, and a tenth of the cut is stored for his Thunderwave. */
export const STATIC = { STORE: 0.1 } as const;
export function staticEdge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  const was = me.dealt ?? 0;
  cut(b, me, f, out);
  if (f.alive) shockFor(b, me, f, ms(me, 2000));
  const k = kx(me);
  k.stored = Math.min(atkOf(me) * KIT.STORE_CAP, (k.stored ?? 0) + ((me.dealt ?? 0) - was) * STATIC.STORE);
  return true;
}

/** Demon Swordsman, Infernal Brand: brands the foe before him (it burns 3s); his Cleave drinks double from a branded foe. */
export const BRAND = { MS: 4000 } as const;
export function infernalBrand(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (!f.alive) return true;
  burnFor(b, me, f, ms(me, 3000));
  kx(f).brand = b.t + ms(me, BRAND.MS);
  mark(out, me, f, 'brand', ms(me, BRAND.MS));
  return true;
}

/** Buccaneer, Pistol Shot: a flintlock shot at the nearest foe within 4; a shooter it hits is staggered 0.5s. */
export function pistolShot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 4)[0];
  if (!f) return false;
  bolt(b, me, f, out);
  if (f.alive && UNITS[f.def].shot) stunFor(b, f, ms(me, 500), false, 'stun', me);
  return true;
}

/** Queen Dragoon, Scale Ward: under half her health, her scales harden: she takes 30% less for 4s, and whoever strikes her burns. */
export const SCALES = { MS: 4000 } as const;
export function scaleWard(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!GUARD.scales(b, me)) return false;
  kx(me).scales = b.t + ms(me, SCALES.MS * castPower());
  mark(out, me, me, 'scales', ms(me, SCALES.MS));
  return true;
}

/** Samurai Commander, Command Strike: he and the friend nearest him each strike the foe before them at once (the friend at the same strength). */
export function commandStrike(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const mine = before(b, me);
  const ally = friends(b, me, 3).sort((x, y) => apart(x, me) - apart(y, me) || x.id - y.id).find((a) => !!before(b, a) && (a.busyUntil ?? 0) <= b.t);
  if (!mine && !ally) return false;
  if (mine) cut(b, me, mine, out);
  if (ally) {
    const f = before(b, ally)!;
    ally.facing = wayTo(ally, f);
    out.push({ kind: 'swing', by: ally.id, to: f.id });
    hurt(b, ally, f, net(atkOf(ally) * castPower(), f), false, false, out, 'skill');
  }
  return true;
}

/** Wolf Bard, Countercharm: every friend within 3 (and he) is freed of its ailments and shrugs off new ones for 3s. */
export const COUNTER = { REACH: 3, MS: 3000 } as const;
export function countercharm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!GUARD.countercharm(b, me)) return false;
  for (const a of [me, ...friends(b, me, COUNTER.REACH)]) {
    shake(b, a);
    ward(b, a, ms(me, COUNTER.MS));
    mark(out, me, a, 'ward', ms(me, COUNTER.MS));
  }
  return true;
}

/** Tyrant, Scourge: a lash of his chain at the nearest foe within 3; it is weakened 2s. */
export function scourge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 3)[0];
  if (!f) return false;
  bolt(b, me, f, out);
  if (f.alive) weakFor(b, f, ms(me, 2000), me);
  return true;
}
