// Calamity ascension: every full clear opens the next level (to ten). Each level adds one lasting rule on top of the ones
// before it, and pays a better reward for a clear. The rules are plain numbers (`ascRules`) that the calamity's map, fights, shops and
// pay read; level 0 is the calamity as it was. Pure data and rules: no Pixi, no DOM, no random choice.

import type { Meta } from './meta';

export const ASC_MAX = 10;

/** What the rules of a level, all together, do. Each field is neutral (1, 0 or false) at level 0. */
export interface AscRules {
  /** Foes' hp and attack are multiplied by these. */
  foeHp: number;
  foeAtk: number;
  /** What a hero for hire in a shop costs, as a multiple (the recruit spot's free choice is not changed). */
  hires: number;
  /** The share of its health at which a boss changes form. */
  phaseAt: number;
  /** The weight of elites on a map, as a multiple of the usual. */
  elites: number;
  /** What the shops charge, as a multiple. */
  shops: number;
  /** All healing (in a fight, a win's mending, a campfire, a draught) is multiplied by this. */
  heal: number;
  /** Gold less at the start. */
  startGold: number;
  /** Every boss floor carries a curse twist. */
  bossCurse: boolean;
  /** Foes in the field hit harder (folded into `foeAtk`); and bosses begin behind a shield of this share of their health. */
  bossShield: number;
}

/** The rule each level adds, in words. Index 0 is level 1. */
export const ASC_TEXT: readonly string[] = [
  'Foes have 20% more health.',
  'Heroes for hire in the shops cost 40% more.',
  'Bosses change form sooner: at 65% health.',
  'Elites turn up twice as often.',
  'Shops charge 25% more.',
  'All healing is halved.',
  'You begin with 15 less gold.',
  'Every boss fight carries a curse.',
  'Foes hit 15% harder.',
  'Bosses begin the fight behind a shield.',
];

/** The rules at an ascension level (all the levels up to it, together). */
export function ascRules(level: number): AscRules {
  const n = Math.max(0, Math.min(ASC_MAX, Math.floor(level || 0)));
  return {
    foeHp: n >= 1 ? 1.2 : 1,
    foeAtk: n >= 9 ? 1.15 : 1,
    hires: n >= 2 ? 1.4 : 1,
    phaseAt: n >= 3 ? 0.65 : 0.5,
    elites: n >= 4 ? 2 : 1,
    shops: n >= 5 ? 1.25 : 1,
    heal: n >= 6 ? 0.5 : 1,
    startGold: n >= 7 ? 15 : 0,
    bossCurse: n >= 8,
    bossShield: n >= 10 ? 0.1 : 0,
  };
}

/** The ascension level of a run (0 for anything that is not an ascended calamity). */
export const ascOf = (run: { mode?: { kind: string; ascension?: number } }): number => (run.mode?.kind === 'calamity' ? run.mode.ascension ?? 0 : 0);

/** The crowns a calamity pays are multiplied by this at a level. */
export const ascCrowns = (level: number): number => 1 + 0.2 * Math.max(0, Math.min(ASC_MAX, level));
/** Gold chests a full clear pays at a level: one, then another at 2, 5 and 8. */
export const ascChests = (level: number): number => 1 + Math.floor((Math.max(0, Math.min(ASC_MAX, level)) + 1) / 3);

/** The highest level cleared whole (-1 for none; a clear from before ascension counts as level 0). */
export function ascCleared(m: Pick<Meta, 'calamity'>): number {
  const c = m.calamity;
  if (!c) return -1;
  return c.asc ?? (c.clears > 0 ? 0 : -1);
}

/** The highest level the player may pick: one past the best cleared (level 0 until a calamity has been cleared). */
export const ascUnlocked = (m: Pick<Meta, 'calamity'>): number => Math.min(ASC_MAX, ascCleared(m) + 1);

/** A line for the reward a level pays. */
export function ascReward(level: number): string {
  const chests = ascChests(level);
  return `Clear: crowns x${ascCrowns(level).toFixed(1)}, ${chests === 1 ? 'a gold chest' : `${chests} gold chests`}, summoning stones, ${level >= 6 ? 'a Mythic' : 'a Legendary'} piece of gear and a title`;
}
