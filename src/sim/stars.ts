// Stars for a won stage: one for the win, one more if no hero fell, and one more if the stage was won within a time
// (a little longer on a boss stage). Each star pays a little crowns and gold on top of the stage's own pay, and the
// best stars for each stage are kept in the meta. Pure rules: no Pixi, no DOM; a rating reads only the finished fight.

import type { Battle } from './battle';
import { UNITS } from './units';

export const MAX_STARS = 3;
export const STAR_TIME_MS = 30_000;
export const BOSS_STAR_TIME_MS = 45_000;
export const STAR_CROWNS = 3;
export const STAR_GOLD = 5;

export interface StarRule {
  /** The reason, in plain words. */
  text: string;
  earned: boolean;
}

export interface Rating {
  /** 0 for a lost fight; 1 to 3 for a win. */
  stars: number;
  /** The three rules in order: the win, no one fell, under the time. */
  rules: StarRule[];
}

/** The stars a finished fight is worth (`boss` is whether the stage was a boss stage). */
export function ratingOf(b: Battle, boss: boolean): Rating {
  const won = b.phase === 'won';
  const limit = boss ? BOSS_STAR_TIME_MS : STAR_TIME_MS;
  const rules: StarRule[] = [
    { text: 'Victory', earned: won },
    { text: 'No one fell', earned: won && b.units.every((u) => u.side !== 'hero' || u.alive || UNITS[u.def].summon) },
    { text: `Under ${limit / 1000} s`, earned: won && b.t < limit },
  ];
  return { stars: rules.filter((r) => r.earned).length, rules };
}

/** Crowns the stars of one win pay on top of the stage's own. */
export const starCrowns = (stars: number) => STAR_CROWNS * stars;
/** Gold the stars of one win pay on top of the stage's own. */
export const starGold = (stars: number) => STAR_GOLD * stars;
