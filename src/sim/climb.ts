// Heroes that level within a run. A tower climb and a calamity start every hero at level 1, with no worn equipment and no
// talents (the meta's levels, gear and talents are not read, and not changed); the hero's level comes from the XP it earns
// in the run (`Owned.xp`), by the same curve as the lasting levels (`levels.ts`), and its gear is what the run finds.
// Pure rules: no Pixi, no DOM.

import type { Battle, Boost, Unit } from './battle';
import { ALL_HEROES, UNITS } from './units';
import { CAL_TIER, tierOfLevel } from './calamity';
import { canJoin, gradeMult, isClone, ownHeroes, recruit, squadLimit, type Owned, type Run } from './run';
import { gearBoost } from './gear';
import { XP_PER_DAMAGE, XP_PER_HEALING, XP_TAKE_PART, XP_WIN, levelBoost, levelOf, RUN_MAX_LEVEL, type LevelUp } from './levels';


/** What a hero's run-level XP is worth on top of the lasting rate: the climb is tuned on this. */
export const CLIMB_XP = 4;
/** The same for a Calamity: its heroes level much faster than the spire's, so a full clear ends with the starting hero well past level 20 (`docs/notes/balance-pass.md`). */
export const CALAMITY_XP = 10;
/** A Calamity fight pays the XP of a band of this many foes: a bigger band (the party past five heroes meets up to thirteen) pays the same in all, shared out by what each foe is worth, so the levels run at the pace they were tuned for. */
export const CAL_XP_BAND = 5;
export const calXpShare = (foes: number): number => Math.min(1, CAL_XP_BAND / Math.max(1, foes));
/** A hired hero joins with this share of the roster's mean XP, so it is not left a level-1 passenger behind a levelled squad. */
export const HIRE_CATCH_UP = 0.7;

/** Whether a run's heroes level within it. */
export const isLocal = (run: Run): boolean => !!run.local;

/** A hero's level in the run (1 for a hero with no XP). */
export const heroLevel = (h: Owned): number => levelOf(h.xp ?? 0, RUN_MAX_LEVEL);

/**
 * A run hero's whole boost: its grade and level, its gear and training bumps, and the skill charge it keeps. No rank, no
 * lasting equipment or talents, and no kind-by-kind multipliers: every hero starts the climb alike.
 */
export function localBoost(h: Owned): Boost {
  const k = h.tiered ? CAL_TIER.mult ** (h.grade - 1) : gradeMult(h.grade);
  const lv = levelBoost(heroLevel(h));
  const g = gearBoost(h.gear);
  return { hp: k * lv.hp * g.hp! + (h.bump?.hp ?? 0), atk: k * lv.atk * g.atk! + (h.bump?.atk ?? 0), grade: h.grade, level: heroLevel(h), ...(h.charge ? { charge: h.charge } : {}), ...(h.charge2 ? { charge2: h.charge2 } : {}) };
}

/** The XP each hero (by roster id) earned in a finished fight: the same pay as `fightXp`, but kept for the hero, not its kind. `rate` is the castle's Library. */
export function fightXpByHero(b: Battle, rate = 1, climbXp = CLIMB_XP): Record<number, number> {
  const out: Record<number, number> = {};
  const won = b.phase === 'won';
  const shareOf = (u: Unit) => (u.dealt ?? 0) / XP_PER_DAMAGE + (u.healed ?? 0) / XP_PER_HEALING + (u.slain ?? 0);
  for (const u of b.units) {
    if (u.side !== 'hero' || u.owner !== undefined || u.tag === undefined) continue;
    const called = b.units.filter((x) => x.owner === u.id).reduce((n, x) => n + shareOf(x), 0);
    out[Number(u.tag)] = (out[Number(u.tag)] ?? 0) + Math.round((XP_TAKE_PART + (won ? XP_WIN : 0) + shareOf(u) + called) * rate * climbXp);
  }
  return out;
}

/** Add XP to the run's heroes (by roster id). Returns those that reached a new level. */
export function gainRunXp(run: Run, gains: Record<number, number>): (LevelUp & { id: number })[] {
  const ups: (LevelUp & { id: number })[] = [];
  for (const [id, n] of Object.entries(gains)) {
    const h = run.roster.find((x) => x.id === Number(id));
    if (!h || !(n > 0)) continue;
    const from = heroLevel(h);
    h.xp = (h.xp ?? 0) + n;
    const to = heroLevel(h);
    if (to > from) ups.push({ id: h.id, kind: h.kind, from, to });
  }
  return ups;
}

/** A hero moved up a tier by its level (a Calamity's stand-in for a merge's promotion). */
export interface Promotion {
  id: number;
  kind: string;
  from: number;
  to: number;
}

/** Raise the grade of every Calamity hero whose run level has reached the next tier's (`CAL_TIER`). Returns the promotions, for the page to give the same promotion moment as a merge. Nothing else changes: the hero keeps its gear, its place and its charge. A run that is not a Calamity has none (it merges instead). */
export function promoteByLevel(run: Run): Promotion[] {
  if (run.mode?.kind !== 'calamity') return [];
  const out: Promotion[] = [];
  for (const h of run.roster) {
    const to = tierOfLevel(heroLevel(h));
    if (to <= h.grade) continue;
    out.push({ id: h.id, kind: h.kind, from: h.grade, to });
    h.grade = to;
    h.tiered = true;
  }
  return out;
}

/** Add XP to every hero of a kind (a campfire's lesson, a trainer's). */
export function gainKindXp(run: Run, kind: string, n: number): void {
  for (const h of run.roster) if (h.kind === kind) h.xp = (h.xp ?? 0) + n;
}

/** The XP a hired hero joins with: `HIRE_CATCH_UP` of the mean of the party's own heroes (a mirror's clone is not counted). */
export function hireXp(run: Run): number {
  const own = ownHeroes(run);
  if (!own.length) return 0;
  return Math.floor((own.reduce((n, h) => n + (h.xp ?? 0), 0) / own.length) * HIRE_CATCH_UP);
}

/** Whether the run's roster holds a hero of this kind. */
export const ownsKind = (run: Run, kind: string): boolean => run.roster.some((h) => h.kind === kind);

/** The hero kinds a Calamity can still hire: all of them (the player's own and the ones it has not unlocked), each only once a run, so not those already on the roster. A run that is not a Calamity hires from its pool as ever. */
export function hireable(run: Run): string[] {
  if (run.mode?.kind !== 'calamity') return (run.pool?.length ? run.pool : ALL_HEROES).filter((k) => !!UNITS[k]);
  return ALL_HEROES.filter((k) => !!UNITS[k] && !ownsKind(run, k));
}

/** Hire a hero for `paid` gold: it joins at the run's catch-up XP (and the tier that level earns, in a calamity), and (in a calamity, unless told otherwise) takes a place in the squad if there is room. */
export function hireHero(run: Run, kind: string, paid: number, toSquad = run.mode?.kind === 'calamity'): Owned {
  const xp = run.local ? hireXp(run) : 0;
  const h = recruit(run, kind, paid);
  if (run.local && xp) h.xp = xp;
  promoteByLevel(run);
  // (a mirror's clone gives up its place in a full squad to a hero who stays)
  const guest = run.squad.find((id) => run.roster.some((x) => x.id === id && isClone(x)));
  if (toSquad && run.squad.length >= squadLimit(run) && guest !== undefined) run.squad = run.squad.filter((id) => id !== guest);
  if (toSquad && canJoin(run, h.id)) run.squad.push(h.id);
  return h;
}


/** What the last fight taught the run's heroes, in the shape the result screen draws (by kind: the XP it earned, and the XP it had before): its level-ups too. */
export function climbXpView(run: Run): { gains: Record<string, number>; from: Record<string, number>; ups: LevelUp[] } {
  const gains: Record<string, number> = {};
  const from: Record<string, number> = {};
  const ups: LevelUp[] = [];
  for (const g of run.tower?.gains ?? []) {
    if (g.kind in gains) continue;
    const h = run.roster.find((x) => x.id === g.id);
    gains[g.kind] = g.xp;
    from[g.kind] = Math.max(0, (h?.xp ?? 0) - g.xp);
    if (g.to > g.from) ups.push({ kind: g.kind, from: g.from, to: g.to });
  }
  return { gains, from, ups };
}
