// STATS batch 6, "The rest" (docs/notes/stats-6.md; the design is docs/notes/rpg-stats-design.md, sections 3.1, 3.4, 6 and 7). What the
// scores do besides power, AC, to hit and saves:
//
// - **Pools** (CON for a stamina hero, its casting ability for a mana hero): the pool's top, +3 SP or +5 MP a point, and what fills it, 4%
//   faster a point (`heroKits.ts`: `topOf`, `incomeOf`).
// - **Quick wits** (INT): every skill's cooldown 2% shorter a point, at most 10% either way, and never out of its class's range.
// - **Inspiration** (CHA): the ultimate's meter fills 3% faster a point.
// - **Perception** (WIS): the misses a hero suffers from cover (tall grass) and from smoke, ink and sand are 10% less likely a point.
// - **Athletics** (STR): at STR +4 or more a hero climbs a step higher (`jump` +1), so it can walk up to, and strike, a foe a level further up.
// - **The herald** (CHA): an Eidolon's rider lasts 5% longer a point of the highest CHA modifier among the heroes on the field.
//
// The scores show from level 1 (the owner's rule: no level-1 fit on the heroes): a CHA 8 hero waits longer for its ultimate than a CHA 17
// one from its first fight. As batch 2 does for power (`trimOf`), the pools, cooldowns and the ultimate's fill are measured against the
// roster's mean at the same level, so the mean hero is where it was and only how the 45 differ moves; the modes stay where they are until
// the joint rebalance. Ranks, grades, talents and gear are not trimmed: they are what the hero has earned. Perception, Athletics and the
// herald are D&D's own rules, small, and kept whole.
//
// The foes: their families are evened (the owner's rule until the joint rebalance), so a foe has no pool, cooldown, fill, perception or
// climb from its block; a summon neither.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { ABILITIES, derivedOf, modOf, PER_POINT, profileOf, scoresAtLevel, STAT_PROFILES, type Ability, type Derived, type StatInput, type StatProfile } from './stats';
import { UNITS } from './units';
import type { Unit } from './battle';

/** Each rule of this batch on (the game) or off (batch 5's fight exactly), for measuring one at a time and for the tests that stage a skill's
 *  written numbers. */
export const REST = {
  pools: true,
  cooldown: true,
  ultFill: true,
  perception: true,
  athletics: true,
  herald: true,
  /** The AI's picks: a quick melee hero goes round to a foe's side or back, a quick shooter steps back from a brute, a control skill picks the
   *  weakest save among targets it values the same. */
  flank: true,
  kite: true,
  savePick: true,
};

/** Athletics: the STR modifier a hero needs to climb a step higher. */
export const ATHLETICS_MOD = 4;
/** The herald: an Eidolon's rider lasts this much longer a point of the highest CHA modifier among the heroes. */
export const HERALD_SHARE = 0.05;

/** Whether a fighter is a hero with a profile of its own (not a summon, not a foe). */
const profiled = (u: Unit): boolean => u.side === 'hero' && !UNITS[u.def]?.summon && !!profileOf(u.def);
const inputOf = (u: Unit): StatInput => ({ level: u.level ?? 1, grade: u.grade ?? 1, rank: u.rank ?? 0, extra: u.eq?.scores });

const derived = new WeakMap<Unit, Derived | null>();
/** A placed hero's derived numbers (worked out once a fighter: nothing they read changes in a fight); undefined for a foe or a summon. */
export function heroDerived(u: Unit): Derived | undefined {
  let d = derived.get(u);
  if (d === undefined) {
    d = profiled(u) ? derivedOf(profileOf(u.def)!, inputOf(u)) : null;
    derived.set(u, d);
  }
  return d ?? undefined;
}

const means = new Map<string, number>();
/** The mean of `f` over the profiles in `kinds` (every hero when unset) at a level, rank 1, grade 1, with nothing extra: what the trims read. */
export function rosterMean(tag: string, level: number, f: (p: StatProfile, mods: Record<Ability, number>) => number, kinds?: readonly string[]): number {
  const key = `${tag}|${level}`;
  let m = means.get(key);
  if (m === undefined) {
    const ps = (kinds ?? Object.keys(STAT_PROFILES)).map((k) => STAT_PROFILES[k]).filter(Boolean);
    m = ps.reduce((n, p) => {
      const s = scoresAtLevel(p, level);
      const mods = Object.fromEntries(ABILITIES.map((a) => [a, modOf(s[a])])) as Record<Ability, number>;
      return n + f(p, mods);
    }, 0) / Math.max(1, ps.length);
    means.set(key, m);
  }
  return m;
}

// ---- Quick wits (INT) ----

/** The cooldown share INT gives a modifier: 2% shorter a point, at most 10% either way. */
export const cdShare = (intMod: number): number => 1 - Math.max(-PER_POINT.COOLDOWN_CAP, Math.min(PER_POINT.COOLDOWN_CAP, PER_POINT.COOLDOWN * intMod));
/** What a hero's cooldowns are multiplied by at a level: its INT's share over the roster's mean (the page reads it too). */
export const cooldownShare = (d: Derived, level: number): number => d.cooldown / rosterMean('cd', level, (_p, m) => cdShare(m.int));
/** A fighter's cooldowns are multiplied by this (1 for a foe, a summon, or with the rule off). */
export function cooldownOf(u: Unit): number {
  const d = REST.cooldown ? heroDerived(u) : undefined;
  return d ? cooldownShare(d, u.level ?? 1) : 1;
}

// ---- Inspiration (CHA) ----

/** How much faster a hero's ultimate fills at a level: its CHA's share over the roster's mean (the page reads it too). */
export const ultFillShare = (d: Derived, level: number): number => d.ultFill / rosterMean('ult', level, (_p, m) => 1 + PER_POINT.ULT_FILL * m.cha);
/** A fighter's ultimate fills this much faster (1 for a foe or with the rule off). */
export function ultFillOf(u: Unit): number {
  const d = REST.ultFill ? heroDerived(u) : undefined;
  return d ? ultFillShare(d, u.level ?? 1) : 1;
}

// ---- Perception (WIS) ----

/** The share of the misses from cover, smoke, ink and sand a fighter sees through: 10% a point of WIS (a −1 is 10% more), for a hero only. */
export function perceptionOf(u: Unit): number {
  const d = REST.perception ? heroDerived(u) : undefined;
  return d ? Math.max(-1, Math.min(1, PER_POINT.PERCEPTION * d.mods.wis)) : 0;
}

// ---- Athletics (STR) ----

/** The steps more a hero climbs: 1 at STR +4 or more (not a flier, which goes over anything). */
export function athleticsOf(u: Unit): number {
  if (!REST.athletics || UNITS[u.def]?.flies) return 0;
  const d = heroDerived(u);
  return d && d.mods.str >= ATHLETICS_MOD ? 1 : 0;
}

// ---- The herald (CHA) ----

/** An Eidolon's rider lasts this much longer: 5% a point of the highest CHA modifier among the living heroes (1 with none). */
export function heraldOf(units: readonly Unit[]): number {
  if (!REST.herald) return 1;
  let best: number | undefined;
  for (const u of units) {
    if (!u.alive) continue;
    const d = heroDerived(u);
    if (d && (best === undefined || d.mods.cha > best)) best = d.mods.cha;
  }
  return best === undefined ? 1 : Math.max(0.5, 1 + HERALD_SHARE * best);
}
