// Levels for the hero kinds. Each fight gives every hero that fought some XP, and most of it is for what the hero killed:
// a kill is worth a tenth of the foe's max hp (a boss kill, several times that), so the XP grows with the foes' strength.
// A smaller share is for the damage it dealt and the healing it did, and a little for taking part (and for a win). A
// fallen hero keeps all it earned. The XP is kept per kind in the meta, and the level is read from it. Each level above
// the first adds to the kind's hp and attack, up to `MAX_LEVEL`, and the curve rises so each level takes more XP than the
// last. Pure rules: no Pixi, no DOM.

import type { Battle, Unit } from './battle';
import { isBoss } from './foes';
import type { Meta } from './meta';
import { UNITS } from './units';

/** The top of a hero kind's lasting level. Levels 1 to `OLD_MAX_LEVEL` are the curve as it was; past it the curve is steeper and the gains smaller (`docs/notes/level-100.md`). */
export const MAX_LEVEL = 100;
/** The cap before levels went on to 100: levels up to here have the same XP totals and the same gains as they always did. */
export const OLD_MAX_LEVEL = 30;
export const XP_TAKE_PART = 5;
export const XP_WIN = 5;
/** One XP for each this much damage dealt, or healing done. */
export const XP_PER_DAMAGE = 40;
export const XP_PER_HEALING = 40;
/** A kill is worth this share of the foe's max hp (a tenth), and a boss kill `BOSS_KILL` times that. */
export const KILL_HP_SHARE = 0.1;
export const BOSS_KILL = 3;
/** Hp and attack a level adds, as a share of the base, for each level above the first. */
export const LEVEL_HP = 0.22;
export const LEVEL_ATK = 0.18;
/** From this level on, each level adds only `DIM_SHARE` of its gain (diminishing returns, so a team's levels stop being decisive). */
export const DIM_LEVEL = 12;
export const DIM_SHARE = 0.25;
/** The levels a run gives its own heroes (the spire, Calamity) stop at 30; only a hero kind's lasting level goes on to `MAX_LEVEL`. */
export const RUN_MAX_LEVEL = OLD_MAX_LEVEL;
/** The level past which the curve turns steeper: each level costs `LATE_XP` times the plain curve, and a lasting level pays `LATE_SHARE` of a step (it was the run's cap until runs could go on to 30). */
export const LATE_LEVEL = 20;
/** Each lasting level past `LATE_LEVEL` adds this share of its full gain (the levels before it fade to `DIM_SHARE`): the late armies' power, now heroes have no rarity. */
export const LATE_SHARE = 0.3;
/** The extra hp and attack (as shares of the base) a lasting level gives for reaching it. */
export const MILESTONES: readonly { level: number; hp: number; atk: number; point?: true }[] = [
  { level: 25, hp: 0.15, atk: 0.12 },
  { level: 30, hp: 0.25, atk: 0.2 },
  // (the deep milestones: a lump of hp and attack, one more talent point, and a look: a badge frame and an aura, `badgeOf`)
  { level: 40, hp: 0.12, atk: 0.1, point: true },
  { level: 50, hp: 0.14, atk: 0.12, point: true },
  { level: 60, hp: 0.17, atk: 0.14, point: true },
  { level: 70, hp: 0.2, atk: 0.16, point: true },
  { level: 80, hp: 0.23, atk: 0.19, point: true },
  { level: 90, hp: 0.27, atk: 0.22, point: true },
  { level: 100, hp: 0.35, atk: 0.27, point: true },
];
/** Each lasting level past `OLD_MAX_LEVEL` adds this share of its full gain (a tenth: the lumps above carry most of the late power). */
export const DEEP_SHARE = 0.1;
/** The levels that give a badge and an aura, and a talent point: the milestones past `OLD_MAX_LEVEL`. */
export const BADGE_LEVELS: readonly number[] = MILESTONES.filter((m) => m.point).map((m) => m.level);
const CURVE = 30;

/** Each level past `LATE_LEVEL` costs this many times what the plain curve asks, so the late levels are for the long game. */
export const LATE_XP = 4;

/** Past `OLD_MAX_LEVEL` a level costs `DEEP_BASE` XP at 31, `DEEP_GROWTH` more for each level after it, and the first `DEEP_RAMP` levels are eased in (a share of that, so level 31 is not a wall). `tools/levelPace.ts` fits these to the pace: level 50 in about two months, level 100 in about six. */
export const DEEP_BASE = 125000;
export const DEEP_GROWTH = 4700;
export const DEEP_RAMP = 6;

const plainXp = (n: number) => CURVE * (n - 1) * n;
const upTo30 = (n: number) => (n <= LATE_LEVEL ? plainXp(n) : plainXp(LATE_LEVEL) + LATE_XP * (plainXp(n) - plainXp(LATE_LEVEL)));
/** The XP the level `n` (past `OLD_MAX_LEVEL`) costs over the one before. */
const deepStep = (n: number): number => Math.round(((DEEP_BASE + DEEP_GROWTH * (n - OLD_MAX_LEVEL - 1)) * Math.min(1, (n - OLD_MAX_LEVEL) / DEEP_RAMP)) / 100) * 100;
const TOTALS: number[] = [0];
for (let n = 1; n <= MAX_LEVEL; n++) TOTALS[n] = n <= OLD_MAX_LEVEL ? upTo30(n) : TOTALS[n - 1] + deepStep(n);

/** Total XP to reach a level. Up to level 30 it is 30 × (level − 1) × level, so each level costs 60 more than the one before (past `LATE_LEVEL`, `LATE_XP` times that); past 30 each level costs `deepStep`. */
export const xpFor = (level: number): number => TOTALS[Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))] ?? 0;

/** The level a total of XP reaches (1 to `max`, `MAX_LEVEL` unless a run's own cap is given). */
export function levelOf(xp: number, max = MAX_LEVEL): number {
  let level = 1;
  while (level < max && xp >= xpFor(level + 1)) level++;
  return level;
}

/** Progress into the current level: the XP past its start, and the XP the next level needs (both 0 at the top). */
export function progressOf(xp: number): { level: number; into: number; need: number } {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into: xp - xpFor(level), need: xpFor(level + 1) - xpFor(level) };
}

/** The look a level has earned: how many of the deep milestones (`BADGE_LEVELS`: 40 to 100) it has reached. 0 is the plain badge. */
export const badgeOf = (level: number): number => BADGE_LEVELS.filter((l) => level >= l).length;
/** The names of the badge frames, by `badgeOf` (index 0 is the plain one). */
export const BADGE_NAMES: readonly string[] = ['Plain', 'Iron', 'Steel', 'Bronze', 'Silver', 'Gold', 'Ember', 'Arcane'];
/** The talent points the deep milestones have given by a level. */
export const milestonePoints = (level: number): number => badgeOf(level);

/** The XP a killing blow is worth: the foe's max hp times `KILL_HP_SHARE` (a boss, `BOSS_KILL` times that). */
export const killXp = (foe: Pick<Unit, 'def' | 'maxHp'>): number => foe.maxHp * KILL_HP_SHARE * (isBoss(foe.def) ? BOSS_KILL : 1);

/** The levels above the first counted in full: each one past `DIM_LEVEL` counts `DIM_SHARE`. */
const steps = (level: number): number => Math.min(level - 1, DIM_LEVEL - 1) + DIM_SHARE * Math.max(0, level - DIM_LEVEL);

/** Hp and attack multipliers a level gives (x1 at level 1). */
export const levelBoost = (level: number): { hp: number; atk: number } => ({ hp: 1 + LEVEL_HP * steps(level), atk: 1 + LEVEL_ATK * steps(level) });

/** Like `steps`, with the lasting levels' bigger late share. */
const lastingSteps = (level: number): number =>
  steps(Math.min(level, LATE_LEVEL)) + LATE_SHARE * Math.max(0, Math.min(level, OLD_MAX_LEVEL) - LATE_LEVEL) + DEEP_SHARE * Math.max(0, level - OLD_MAX_LEVEL);
const milestone = (level: number, key: 'hp' | 'atk'): number => MILESTONES.reduce((n, m) => (level >= m.level ? n + m[key] : n), 0);

/** Hp and attack multipliers of a hero kind's lasting level (x1 at level 1): `levelBoost`, but the late levels pay more and the milestones add a lump. */
export const lastingBoost = (level: number): { hp: number; atk: number } => ({
  hp: 1 + LEVEL_HP * lastingSteps(level) + milestone(level, 'hp'),
  atk: 1 + LEVEL_ATK * lastingSteps(level) + milestone(level, 'atk'),
});

/** The percentages of hp and attack (of the base) that the levels from `from` to `to` add, in whole numbers. `lasting` is a hero kind's level, not a run's own. */
export function levelGain(from: number, to: number, lasting = true): { hp: number; atk: number } {
  const [a, b] = lasting ? [lastingBoost(from), lastingBoost(to)] : [levelBoost(from), levelBoost(to)];
  return { hp: Math.round((b.hp - a.hp) * 100), atk: Math.round((b.atk - a.atk) * 100) };
}

export const xpOf = (m: Meta, kind: string): number => m.xp[kind] ?? 0;
export const levelOfKind = (m: Meta, kind: string): number => levelOf(xpOf(m, kind));

/** The XP each hero kind earns from a finished fight, by kind: every hero that fought counts once, and a win pays more. `rate` is the castle's Library
 *  (1 without it); it multiplies each hero's pay. */
export function fightXp(b: Battle, rate = 1): Record<string, number> {
  const out: Record<string, number> = {};
  const won = b.phase === 'won';
  const shareOf = (u: Unit) => (u.dealt ?? 0) / XP_PER_DAMAGE + (u.healed ?? 0) / XP_PER_HEALING + (u.slain ?? 0);
  for (const u of b.units) {
    // (a fighter the king's own spell called up (Call the Wolves) has no caller and earns no XP of its own)
    if (u.side !== 'hero' || u.owner !== undefined || UNITS[u.def]?.summon) continue;
    // (what the fighters its skills called up did counts as its own)
    const called = b.units.filter((x) => x.owner === u.id).reduce((n, x) => n + shareOf(x), 0);
    const xp = Math.round((XP_TAKE_PART + (won ? XP_WIN : 0) + shareOf(u) + called) * rate);
    out[u.def] = (out[u.def] ?? 0) + xp;
  }
  return out;
}

export interface LevelUp {
  kind: string;
  from: number;
  to: number;
}

/** Add each kind's XP to the meta. Returns the kinds that reached a new level. */
export function gainXp(m: Meta, gains: Record<string, number>): LevelUp[] {
  const ups: LevelUp[] = [];
  for (const [kind, n] of Object.entries(gains)) {
    const from = levelOfKind(m, kind);
    m.xp[kind] = xpOf(m, kind) + n;
    const to = levelOfKind(m, kind);
    if (to > from) ups.push({ kind, from, to });
  }
  return ups;
}
