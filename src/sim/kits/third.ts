// The third skills (the skills overhaul's batch 4, docs/notes/skills-overhaul-design.md section 2, docs/notes/skills-4.md): one for each of the 45
// heroes, open from level 20 (`SKILL3_LEVEL`). Most are jabs (a quick, cheap move used between the big ones), ten are guards (an escape, a ward,
// a save, cast at once when their trigger holds: each guard's cast checks its own trigger, and its slot's `emergency` is the same check) and
// three are utilities. Each is built from parts the game already has: the movement toolkit (shove, pull, blink, the stone wall), the ailments,
// the kits' marks (`kits/effects.ts`) and the plain skill strike.
//
// A cast deals one of the caster's attack a hit (`strike` at 1): its strength is the slot's `tune` (`TUNE3`, the design's "x0.8"), which lifts
// the attack while it casts. What is not an attack (a heal, a shield) is scaled by `castPower()`, as the ultimates' heals are. No randomness:
// every choice is a fixed order (then by id).

import { saveAware } from '../saves';
import { atkOf, canStrike, hurt, strikeDef, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, foesOf, HEX_EVERY, mendUnit, net } from '../abilities';
import { bleedFor, burnFor, charmFor, chillFor, cleanse, curseFor, fearFor, harmed, hasAil, poisonFor, setDot, shockFor, stunFor, ward, weakFor } from '../ailments';
import { smiteBane } from './tanks';
import { UNITS } from '../units';
import { kx, KIT } from './effects';
import { foesNear, mark, ms, strike } from './common';
import { blinkTo, chokeLine, displace, moveMany, pull, raiseWall, safeTile, shove } from '../toolkit';

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
  // (his own cut may have felled the friend's foe: then the friend has nothing to strike)
  const f = ally && before(b, ally);
  if (ally && f) {
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

// ---- group 2: the ranged, the casters and the healers ----

/** A caster's "nearest foe": within a tile past its reach (its spells carry a little further than its blows). */
const nearestCast = (b: Battle, me: Unit): Unit | undefined => nearest(b, me, UNITS[me.def].range + 1)[0];
/** The nearest foe it could shoot or strike from where it stands. */
const nearestIn = (b: Battle, me: Unit): Unit | undefined => inReach(b, me).sort((x, y) => apart(me, x) - apart(me, y) || x.hp - y.hp || x.id - y.id)[0];
/** Held: slowed or stunned (the Ranger's snare and caltrops hold and slow). */
const held = (b: Battle, f: Unit) => hasAil(f, 'chill', b.t) || hasAil(f, 'stun', b.t) || (f.stunUntil ?? 0) > b.t;

/** Archer, Double Shot: two fast arrows at the nearest foe in reach. */
export function doubleShot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestIn(b, me);
  if (!f) return false;
  bolt(b, me, f, out);
  if (f.alive) bolt(b, me, f, out);
  return true;
}

/** Ranger, Barbed Arrow: an arrow at the nearest foe in reach that bleeds 3s; a held foe (snared, slowed, in caltrops) takes double. */
export function barbedArrow(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestIn(b, me);
  if (!f) return false;
  bolt(b, me, f, out, held(b, f) ? 2 : 1);
  bleedFor(b, me, f, 0.1, ms(me, 3000));
  return true;
}

/** Gunslinger, Skip Shot: a shot that skips off the nearest foe in reach to a second within 2 of it. */
export function skipShot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestIn(b, me);
  if (!f) return false;
  bolt(b, me, f, out);
  const g = foesOf(b, me)
    .filter((x) => x !== f && apart(x, f) <= 2)
    .sort((x, y) => apart(x, f) - apart(y, f) || x.hp - y.hp || x.id - y.id)[0];
  if (g) {
    out.push({ kind: 'arc', from: f.id, to: g.id });
    strike(b, me, g, 1, out);
  }
  return true;
}

/** Rifle Bot, Barrier Drone: a drone shields it and the friend nearest it for 5s (a fifth of each one's health), when either falls under 40%. */
export const DRONE = { SHARE: 0.2, MS: 5000, UNDER: 0.4, REACH: 4 } as const;
const droneFriend = (b: Battle, me: Unit) => friends(b, me, DRONE.REACH).sort((x, y) => apart(x, me) - apart(y, me) || x.id - y.id)[0];
export const droneNeeded = (b: Battle, me: Unit): boolean => {
  const a = droneFriend(b, me);
  return foesOf(b, me).length > 0 && (me.hp < me.maxHp * DRONE.UNDER || (!!a && a.hp < a.maxHp * DRONE.UNDER));
};
export function barrierDrone(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!droneNeeded(b, me)) return false;
  for (const u of [me, droneFriend(b, me)]) {
    if (!u) continue;
    shieldOf(b, u, DRONE.SHARE * castPower(), ms(me, DRONE.MS));
    mark(out, me, u, 'shield', ms(me, DRONE.MS));
  }
  return true;
}

/** Siege Bot, Flak Burst: with a foe beside it, a point-blank charge hurts the foes within 1 and shoves them 2 tiles back. */
export const flakNeeded = (b: Battle, me: Unit): boolean => foesNear(b, me, 1).length > 0;
export function flakBurst(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = foesNear(b, me, 1).sort((x, y) => x.id - y.id);
  if (!fs.length) return false;
  for (const f of fs) strike(b, me, f, 1, out);
  moveMany(b, me, fs.filter((f) => f.alive), 2, 'shove', out);
  return true;
}

/** Dread Pirate, Grapeshot: a blast over the three tiles before him (the foe before him and the tiles either side of it, across his aim): each
 *  foe hit is slowed 1s. */
export function grapeshot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me) ?? nearest(b, me, 2)[0];
  if (!f) return false;
  const way = wayTo(me, f);
  const across = way % 2 === 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
  const hit = [f, ...foesOf(b, me).filter((x) => across.some(([du, dv]) => x.u === f.u + du && x.v === f.v + dv))];
  me.facing = way;
  for (const x of hit) {
    out.push({ kind: 'arc', from: me.id, to: x.id });
    strike(b, me, x, 1, out);
    if (x.alive) chillFor(b, x, ms(me, 1000), false, false, me);
  }
  return true;
}

/** Fire Wizard, Fire Bolt: a quick bolt at the nearest foe; a burning foe takes half as much again. */
export function fireBolt(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestCast(b, me);
  if (!f) return false;
  bolt(b, me, f, out, hasAil(f, 'burn', b.t) ? 1.5 : 1);
  return true;
}

/** Lightning Mage, Spark: a spark at the nearest foe, which is Charged (so Storm Surge can set it off). */
export function spark(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestCast(b, me);
  if (!f) return false;
  bolt(b, me, f, out);
  if (f.alive) {
    kx(f).charged = b.t + ms(me, 10000);
    mark(out, me, f, 'charged', ms(me, 10000));
  }
  return true;
}

/** Warlock, Curse of Weakness: the three strongest foes within 6 not yet cursed are weakened for 6s (the weaken ailment: they deal 30% less),
 *  and take a fifth more from him while it lasts. */
export const CURSE_WEAK = { REACH: 6, N: 3, MS: 6000, MORE: 0.2 } as const;
const curseable = (b: Battle, me: Unit) =>
  foesNear(b, me, CURSE_WEAK.REACH)
    .filter((f) => !(f.kx?.exposed && f.kx.exposed.by === me.id && on(f.kx.exposed.until, b)))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id);
export const curseWork = (b: Battle, me: Unit): boolean => curseable(b, me).length > 0;
export function curseOfWeakness(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  // (STATS batch 6: among the foes he values the same, the weakest STR saves first)
  const fs = saveAware(b, me, curseable(b, me), atkOf, 'weak').slice(0, CURSE_WEAK.N);
  if (!fs.length) return false;
  const t = ms(me, CURSE_WEAK.MS);
  for (const f of fs) {
    weakFor(b, f, t, me);
    kx(f).exposed = { until: b.t + t, mult: CURSE_WEAK.MORE, by: me.id };
    out.push({ kind: 'arc', from: me.id, to: f.id });
    mark(out, me, f, 'weak', t);
  }
  return true;
}

/** Great Sage, Arcane Ward: the friend in most trouble within 5 (or he) is warded for 5s (a fifth of its health), when one falls under 35%. */
export const ARCANE = { REACH: 5, SHARE: 0.2, MS: 5000, UNDER: 0.35 } as const;
const wardFor = (b: Battle, me: Unit) =>
  [me, ...friends(b, me, ARCANE.REACH)].filter((a) => a.hp < a.maxHp * ARCANE.UNDER && !(a.shield && a.shield.until > b.t)).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
export const wardNeeded = (b: Battle, me: Unit): boolean => foesOf(b, me).length > 0 && !!wardFor(b, me);
export function arcaneWard(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const a = foesOf(b, me).length ? wardFor(b, me) : undefined;
  if (!a) return false;
  shieldOf(b, a, ARCANE.SHARE * castPower(), ms(me, ARCANE.MS));
  mark(out, me, a, 'shield', ms(me, ARCANE.MS));
  return true;
}

/** Time Witch, Hourglass Bolt: a bolt of sand at the nearest foe: slowed 1.5s, and its skill meter loses a tenth. */
export function hourglassBolt(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestCast(b, me);
  if (!f) return false;
  bolt(b, me, f, out);
  if (!f.alive) return true;
  chillFor(b, f, ms(me, 1500), false, false, me);
  f.charge = Math.max(0, f.charge - 10);
  return true;
}

/** Illusionist, Phantasmal Blade: a blade of illusion at the nearest foe within 3, past its defence; for 1s it strikes at random (charmed). */
export function phantasmalBlade(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 3)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  out.push({ kind: 'arc', from: me.id, to: f.id });
  hurt(b, me, f, Math.max(1, Math.round(atkOf(me))), false, false, out, 'skill');
  if (f.alive) charmFor(b, f, ms(me, 1000));
  return true;
}

/** Cleric, Healing Word: a quick word of healing: the most hurt friend within 6 (or she) heals 8% of its health. */
export const WORD = { REACH: 6, SHARE: 0.08, UNDER: 0.9 } as const;
export function healingWord(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const a = [me, ...friends(b, me, WORD.REACH)].filter((x) => x.hp < x.maxHp * WORD.UNDER).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (!a) return false;
  mendUnit(a, a.maxHp * WORD.SHARE * castPower(), out, me);
  return true;
}

/** High Priestess, Sacred Flame: a pillar of light on the nearest foe (the undead and the fiends take half again); its next blow misses. */
export function sacredFlame(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestCast(b, me);
  if (!f) return false;
  bolt(b, me, f, out, smiteBane(f) ? 1.5 : 1);
  if (f.alive) kx(f).missNext = true;
  return true;
}

/** Wanderer, Acid Flask: a flask of acid at the nearest foe; its armour eaten, it takes a fifth more for 4s. */
export const ACID = { MORE: 0.2, MS: 4000 } as const;
export function acidFlask(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestCast(b, me);
  if (!f) return false;
  bolt(b, me, f, out);
  if (!f.alive) return true;
  kx(f).exposed = { until: b.t + ms(me, ACID.MS), mult: ACID.MORE };
  mark(out, me, f, 'acid', ms(me, ACID.MS));
  return true;
}

// ---- group 3: the summoners and the monsters ----

/** A hero's own living summons of these kinds. */
const ownSummons = (b: Battle, me: Unit, kinds: readonly string[]) => b.units.filter((x) => x.alive && x.owner === me.id && kinds.includes(x.def));
const WOLVES = ['wolf', 'direWolf'] as const;

/** Druid, Thorn Whip: a whip of thorns at the nearest foe within 4 drags it a tile towards her treant (towards her, with none). */
export function thornWhip(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 4)[0];
  if (!f) return false;
  bolt(b, me, f, out);
  if (!f.alive) return true;
  const tree = ownSummons(b, me, ['treant']).sort((x, y) => apart(x, f) - apart(y, f) || x.id - y.id)[0];
  const to = tree ?? me;
  // (a drag heads for the dragger, so a pull towards the treant is a one-tile push its way)
  if (apart(f, to) > 1) displace(b, me, f, wayTo(f, to), 1, to === me ? 'drag' : 'shove', out);
  return true;
}

/** Beastmaster, Mend the Pack: every wolf of hers heals a third and is shielded 3s (a fifth of its health); with none, she heals a tenth. At
 *  once when a wolf falls under 30% (or, with none, when she falls under 40% with a foe near). */
export const PACK_MEND = { HEAL: 1 / 3, SHIELD: 0.2, MS: 3000, SELF: 0.1 } as const;
export const packNeeded = (b: Battle, me: Unit): boolean => {
  const wolves = ownSummons(b, me, WOLVES);
  if (wolves.length) return wolves.some((w) => w.hp < w.maxHp * 0.3);
  return me.hp < me.maxHp * 0.4 && foesNear(b, me, 2).length > 0;
};
export function mendThePack(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!packNeeded(b, me)) return false;
  const wolves = ownSummons(b, me, WOLVES);
  for (const w of wolves) {
    mendUnit(w, w.maxHp * PACK_MEND.HEAL * castPower(), out, me);
    shieldOf(b, w, PACK_MEND.SHIELD, ms(me, PACK_MEND.MS));
  }
  if (!wolves.length) mendUnit(me, me.maxHp * PACK_MEND.SELF * castPower(), out, me);
  return true;
}

/** Reaper, Soul Snare: a spectral hook drags the weakest foe within 4 a tile towards him and cuts it; a foe under 30% is dragged into his reach. */
export function soulSnare(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 4).sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return false;
  const d = apart(me, f);
  if (d > 1) pull(b, me, f, f.hp < f.maxHp * 0.3 ? d - 1 : 1, out);
  if (f.alive) bolt(b, me, f, out);
  return true;
}

/** Kitsune, Fox Wisps: three wisps of fox fire at the three nearest foes within 4, each burning 2s. */
export function foxWisps(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = nearest(b, me, 4).slice(0, 3);
  if (!fs.length) return false;
  for (const f of fs) {
    bolt(b, me, f, out);
    burnFor(b, me, f, ms(me, 2000));
  }
  return true;
}

/** Karasu Tengu, Feather Darts: razor feathers at the two nearest foes within 4; each bleeds 2s. */
export function featherDarts(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = nearest(b, me, 4).slice(0, 2);
  if (!fs.length) return false;
  for (const f of fs) {
    bolt(b, me, f, out);
    bleedFor(b, me, f, 0.1, ms(me, 2000));
  }
  return true;
}

/** Yamabushi Tengu, Ringing Staff: a blow of his ringed staff on the foe before him; it is stunned 0.5s. */
export function ringingStaff(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive) stunFor(b, f, ms(me, 500), false, 'stun', me);
  return true;
}

/** Werewolf, Rend (v1's): claws rake the foe before him and it bleeds 4s; in the Hunter form he rakes twice. */
export function rend(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive && (me.kx?.wolf === 'hunter' || on(me.kx?.moon, b))) cut(b, me, f, out);
  bleedFor(b, me, f, 0.1, ms(me, 4000));
  return true;
}

/** Minotaur, Bellow: every foe within 3 is frightened for 2s (it runs from him) and takes 15% more from him for 5s. */
export const BELLOW = { REACH: 3, FEAR_MS: 2000, MORE: 0.15, MS: 5000 } as const;
export const bellowWork = (b: Battle, me: Unit): boolean => foesNear(b, me, BELLOW.REACH).length > 0;
export function bellow(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fs = foesNear(b, me, BELLOW.REACH);
  if (!fs.length) return false;
  for (const f of fs) {
    fearFor(b, f, ms(me, BELLOW.FEAR_MS), me);
    kx(f).exposed = { until: b.t + ms(me, BELLOW.MS), mult: BELLOW.MORE, by: me.id };
    mark(out, me, f, 'fear', ms(me, BELLOW.FEAR_MS));
  }
  return true;
}

/** Satyr, Butting Horns: butts the foe before him and shoves it a tile. */
export function buttingHorns(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive) shove(b, me, f, 1, out);
  return true;
}

/** Gorgon, Serpent Bite: her serpent hair bites the nearest foe within 2: poisoned 3s and slowed 1s (so Flesh to Stone can take it). */
export function serpentBite(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 2)[0];
  if (!f) return false;
  bolt(b, me, f, out);
  if (!f.alive) return true;
  poisonFor(b, me, f, undefined, ms(me, 3000));
  chillFor(b, f, ms(me, 1000), false, false, me);
  return true;
}

/** Shambler, Bile Spit: spits bile at the nearest foe within 3; it rots 3s (his rot, a curse that ticks). */
export function bileSpit(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 3)[0];
  if (!f) return false;
  bolt(b, me, f, out);
  if (!f.alive) return true;
  const t = ms(me, 3000);
  setDot(b, f, { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * 0.15)), every: HEX_EVERY, ms: t, by: me.id, next: b.t + HEX_EVERY, until: b.t + t });
  return true;
}

/** Mummy, Tomb Rot: a touch of grave-rot on the foe before him; it is cursed 3s (it heals less). */
export function tombRot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out);
  if (f.alive) curseFor(b, me, f, ms(me, 3000));
  return true;
}

/** Kraken Mate, Ink Cloud: when two or more foes crowd him, a cloud of ink: the foes within 2 miss half their blows for 3s, and he slips a
 *  tile back. */
export const inkNeeded = (b: Battle, me: Unit): boolean => foesNear(b, me, 1).length >= 2;
export function inkCloud(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!inkNeeded(b, me)) return false;
  for (const f of foesNear(b, me, 2)) {
    kx(f).smoke = Math.max(f.kx?.smoke ?? 0, b.t + ms(me, 3000));
    mark(out, me, f, 'smoke', ms(me, 3000));
  }
  const to = safeTile(b, me, 1);
  if (to) blinkTo(b, me, to, out);
  return true;
}
