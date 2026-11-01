// STATS batch 4, "AC and the blow" (docs/notes/stats-4.md; the design is docs/notes/rpg-stats-design.md, section 3.2). Every ordinary blow
// rolls a d20 + its striker's to hit against the target's Armour Class: a natural 20 crits, meeting the AC hits, missing by 1 to 5 glances
// (half damage), and missing by more or a natural 1 misses. On any blow that lands, the striker's DEX crit (1% a point) and its kit's,
// traits' and gear's crit chance may crit it as well (a keen glance strikes home in full). Armour (`def`) still soaks what lands, as before.
// A miss still builds the striker's pool, as a blow does (`onDodged`).
//
// What adds to a target's AC beside its armour and DEX: the old dodge shares (a kit's, a trait's, gear's and the relics'), +1 for each 7%
// (a part of a point is a whole one that part of the time); tall grass, +2 (cover, in place of its 12% dodge); and higher ground, +1 a level
// above the striker, to three (in place of `guardMult`'s 3% a level).
//
// Today's numbers are each hero's level 1 (the design's rule, as batch 1 fitted health and attack): a hero's blows and the blows it takes
// are fitted (`fit`, `guard`) so that at level 1 its average blow and the average blow on it are the roster's; its to hit and AC still decide
// how often it misses, glances and is missed, and what they gain with levels shows in full.
//
// The foes use their family's block (`foeStatsOf`; a boss's +2 to hit and AC wait, `BOSS_BLOCK`). So that this batch moves no mode (the joint
// rebalance is later), the foes are matched to the heroes they fight: their AC rises by as much as the placed heroes' to hit has grown since
// level 1, and their to hit by as much as the heroes' AC has (`matchOf`); at level 1 the blocks are as written. A hero's summon takes the
// block of its kind's family and the heroes' own growth.
//
// Randomness: the d20, the crit, the part of a point of AC and the initiative d20 are hashes of the fight's seed and the moment (`STATS_SALT`,
// `INIT_SALT`), never draws from `b.rng` or `b.skillRng`, so a fight replays from its seed, its placing and its orders. Pure rules: no Pixi,
// no DOM.

import { mixSeed } from './rng';
import { BASE_CRIT, blowResult, d20At, derivedOf, foeStatsOf, initiativeRoll, profileOf, STATS_SALT, STAT_PROFILES, type BlowResult, type StatInput } from './stats';
import { kitOf } from './abilities';
import { relicDodge } from './relicFight';
import { TALL_AC } from './board';
import { UNITS } from './units';
import type { Battle, Unit } from './battle';

/** The global knob on every ordinary blow's damage, which puts the average blow back where it was before hits, glances and misses. */
export const BLOW_SCALE = 1.23;
/** Whether a boss's block has its +2 to hit and +2 AC in the blow (`foeStatsOf`). Off in this batch: with it, the armies came out about a
 *  wave harder than main at their levels (measured, docs/notes/stats-4.md), and the modes are the joint rebalance's to retune. */
export const BOSS_BLOCK = false;
/** A glancing blow deals this share. */
export const GLANCE_SHARE = 0.5;
/** Each 7% of an old dodge share is +1 AC. (The design said 5%; but with glances a point of AC takes about 7% off a blow's average,
 *  so at 5% every hero with a dodge came out stronger than before, measured: at 7% a slipped share is worth what it was.) */
export const DODGE_PER_AC = 0.07;
/** Higher ground is cover: +1 AC a level the target stands above the striker, to three. */
export const HIGH_AC = 1;
export const HIGH_AC_MAX = 3;
/** The fits' yardstick: an ordinary foe's AC 13, and a +5 foe's blow (proficiency +2 and a 16). */
export const FIT_TO_HIT = 5;
export const FIT_AC = 13;

/** The share of its damage a blow deals on average at this to hit against this AC (a hit 1, a glance `GLANCE_SHARE`, a natural 20 1.5). */
export function blowShare(toHit: number, ac: number): number {
  let n = 0;
  for (let roll = 1; roll <= 20; roll++) {
    const r = blowResult(roll, toHit, ac);
    n += r === 'crit' ? 1.5 : r === 'hit' ? 1 : r === 'glance' ? GLANCE_SHARE : 0;
  }
  return n / 20;
}

/** The roster's average blow share at level 1, dealt (against `FIT_AC`) and taken (from a `FIT_TO_HIT` foe): the fits' 1. */
let roster: { dealt: number; taken: number } | undefined;
function rosterShares(): { dealt: number; taken: number } {
  if (roster) return roster;
  const ps = Object.values(STAT_PROFILES).map((p) => derivedOf(p));
  roster = {
    dealt: ps.reduce((n, d) => n + blowShare(d.toHit, FIT_AC), 0) / ps.length,
    taken: ps.reduce((n, d) => n + blowShare(FIT_TO_HIT, d.ac), 0) / ps.length,
  };
  return roster;
}

/** Initiative: the fighters act in turn at the fight's start, this many ms a point behind the best roll, at most `INIT_MAX_MS`. */
export const INIT_MS = 30;
export const INIT_MAX_MS = 600;

/** A fighter's own numbers for the blow: its to hit, its AC (before cover and dodge), its crit on a hit from DEX, how much quicker its
 *  blows are than its kind's at level 1 (from DEX), and its initiative modifier. */
export interface BlowStats {
  toHit: number;
  /** The fitted aim and guard (as batch 1 fitted health and attack to today's numbers): a hero's blows are multiplied by `fit`, and the
   *  blows it takes by `guard`, so that at level 1 its average blow against `FIT_AC`, and a `FIT_TO_HIT` foe's average blow on it, are the
   *  roster's average. Its to hit and AC still decide how often it misses, glances and is missed, and what they gain from there shows. */
  fit: number;
  guard: number;
  ac: number;
  dexCrit: number;
  quick: number;
  init: number;
}

/** What the placed heroes' to hit and AC have grown since level 1, on average: the foes answer it (this batch only, see the header). */
export interface BlowMatch {
  aim: number;
  ac: number;
}

const cache = new WeakMap<Unit, BlowStats>();

/** What a hero is, for its scores: its level, rank, grade and its talents' and gear's score points, as batch 2 reads them (`statMults`). */
export const statInputOf = (u: Unit): StatInput => ({ level: u.level ?? 1, grade: u.grade ?? 1, rank: u.rank ?? 0, extra: u.eq?.scores });

/** Whether a fighter is a hero with a profile of its own (not a summon kind). */
const profiled = (u: Unit) => u.side === 'hero' && !UNITS[u.def].summon && !!profileOf(u.def);

/** The heroes' growth since level 1, worked out once when the fight starts (from the heroes then on the field). */
export function matchOf(b: Battle): BlowMatch {
  if (b.blowMatch) return b.blowMatch;
  const heroes = b.units.filter((u) => profiled(u) && u.owner === undefined);
  let aim = 0;
  let ac = 0;
  for (const h of heroes) {
    const p = profileOf(h.def)!;
    const now = derivedOf(p, statInputOf(h));
    const one = derivedOf(p);
    aim += now.toHit - one.toHit;
    ac += now.ac - one.ac;
  }
  const n = Math.max(1, heroes.length);
  b.blowMatch = { aim: Math.round(aim / n), ac: Math.round(ac / n) };
  return b.blowMatch;
}

/** A fighter's blow numbers (worked out once a fighter: nothing they read changes in a fight). */
export function blowStatsOf(b: Battle, u: Unit): BlowStats {
  const had = cache.get(u);
  if (had) return had;
  let s: BlowStats;
  const def = UNITS[u.def];
  if (profiled(u)) {
    const p = profileOf(u.def)!;
    const now = derivedOf(p, statInputOf(u));
    const one = derivedOf(p);
    const r = rosterShares();
    s = { toHit: now.toHit, fit: r.dealt / blowShare(one.toHit, FIT_AC), guard: r.taken / blowShare(FIT_TO_HIT, one.ac), ac: now.ac, dexCrit: now.crit - BASE_CRIT, quick: now.blowSpeed / one.blowSpeed, init: now.initiative };
  } else {
    const f = foeStatsOf(def, 0, BOSS_BLOCK ? undefined : false);
    const m = matchOf(b);
    // (a foe answers the heroes' growth; a hero's summon grows with them)
    const foe = u.side === 'foe';
    s = { toHit: f.toHit + (foe ? m.ac : m.aim), fit: 1, guard: 1, ac: f.ac + (foe ? m.aim : m.ac), dexCrit: f.crit - BASE_CRIT, quick: 1, init: f.initiative };
  }
  cache.set(u, s);
  return s;
}

/** The old dodge shares on a fighter (its kit's, its side's traits', its gear's, the relics'). */
export function dodgeShareOf(b: Battle, to: Unit): number {
  const team = to.side === 'hero' ? b.traits : undefined;
  return (kitOf(to)?.passive.dodge ?? 0) + (team?.dodge ?? 0) + (to.eq?.dodge ?? 0) + relicDodge(b, to);
}

/** What a target's AC is worth now, struck from height `hBy`: its own AC, the dodge shares as AC, and cover (tall grass, higher ground). Also
 *  how much of it is the dodge and the cover, for a miss they turned. A share that is not a whole 5% leaves a part of a point (`ac` is then
 *  not whole): the blow's roll makes it +1 that part of the time (`rollBlow`), so a 3% dodge on gear is still worth 3%. */
export function acAgainst(b: Battle, to: Unit, hBy: number, hTo: number, tall: boolean): { ac: number; cover: number } {
  const dodge = Math.round((dodgeShareOf(b, to) / DODGE_PER_AC) * 1e6) / 1e6;
  const cover = dodge + (tall ? TALL_AC : 0) + HIGH_AC * Math.max(0, Math.min(HIGH_AC_MAX, hTo - hBy));
  return { ac: blowStatsOf(b, to).ac + cover, cover };
}

/** A blow's roll: what it does (`res`), the crit multiplier it carries (1 for none), and whether a miss was the dodge's or the cover's
 *  doing (it would not have missed without them). */
export interface BlowRoll {
  res: BlowResult;
  crit: number;
  turned: boolean;
}

/** A hash of the blow's moment, 0 to 1 (salt 1 the crit, 2 the part of a point of AC). */
const unit = (b: Battle, by: Unit, to: Unit, salt: number): number => (mixSeed(b.seed, STATS_SALT, b.t, by.id, to.id, salt) >>> 0) / 4294967296;

/** Roll a blow from `by` on `to` now. `critChance` and `critMult` are the striker's kit, traits and gear crit (`critOf`). */
export function rollBlow(b: Battle, by: Unit, to: Unit, hBy: number, hTo: number, tall: boolean, critChance: number, critMult: number): BlowRoll {
  const roll = d20At(b.seed, b.t, by.id, to.id);
  const me = blowStatsOf(b, by);
  const at = acAgainst(b, to, hBy, hTo, tall);
  // (a part of a point of AC is a whole point that part of the time: its own hash of the moment)
  const part = at.ac - Math.floor(at.ac);
  const ac = Math.floor(at.ac) + (part > 0 && unit(b, by, to, 2) < part ? 1 : 0);
  const cover = Math.ceil(at.cover);
  const res = blowResult(roll, me.toHit, ac);
  const turned = res === 'miss' && at.cover > 0 && blowResult(roll, me.toHit, ac - cover) !== 'miss';
  if (res === 'crit') return { res, crit: critMult, turned };
  // (DEX's and the kit's, traits' and gear's crit find the gap in any blow that lands: a keen glance strikes home as a crit)
  if (res !== 'miss') {
    const chance = me.dexCrit + critChance;
    if (chance > 0 && unit(b, by, to, 1) < chance) return { res: 'hit', crit: critMult, turned };
  }
  return { res, crit: 1, turned };
}

/** Initiative, as the fight starts: every fighter rolls d20 + DEX, and each waits `INIT_MS` a point behind the best roll (at most
 *  `INIT_MAX_MS`) before it first acts. The wait of each fighter on the field, by id. */
export function initiativeWaits(b: Battle): Map<number, number> {
  const live = b.units.filter((u) => u.alive);
  const rolls = live.map((u) => initiativeRoll(b.seed, u.id, blowStatsOf(b, u).init));
  const top = Math.max(...rolls);
  return new Map(live.map((u, i) => [u.id, Math.min(INIT_MAX_MS, (top - rolls[i]) * INIT_MS)]));
}

/** Roll initiative: each fighter's wait comes on top of any it has already (the Siege Drum's on the foes). */
export function rollInitiative(b: Battle): void {
  for (const [id, wait] of initiativeWaits(b)) {
    const u = b.units.find((x) => x.id === id)!;
    u.busyUntil += wait;
  }
}
