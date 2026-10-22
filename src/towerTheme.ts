// How each act of the tower looks and is called (pure: no DOM, so the tests can read it). Act 1 is a dark crypt, act 2 castle halls
// hung with banners, act 3 a summit in the storm; later acts reuse the three looks, tinted by `tint` (a hue turn) and numbered.

import { BOSS_BANDS, FOE_BANDS } from './sim/foes';

export interface ActLook {
  /** Which of the three looks: 0 crypt, 1 halls, 2 summit. */
  look: 0 | 1 | 2;
  /** "The Haunted Halls", and a line under it. */
  name: string;
  blurb: string;
  /** A hue turn in degrees for the looks reused past act 3 (0 for the first three acts). */
  tint: number;
}

const LOOKS: readonly { name: string; blurb: string }[] = [
  { name: 'The Sunken Crypt', blurb: 'Cold stone, old bones, and torches left burning.' },
  { name: 'The Haunted Halls', blurb: 'Banners hang over halls that remember their lords.' },
  { name: 'The Storm Summit', blurb: 'Wind and thunder at the top of the world.' },
];

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

export function actLook(act: number): ActLook {
  const a = Math.max(1, Math.floor(act));
  const i = (a - 1) % LOOKS.length;
  const lap = Math.floor((a - 1) / LOOKS.length);
  return { look: i as 0 | 1 | 2, name: LOOKS[i].name + (ROMAN[lap] ?? ` ${lap + 1}`), blurb: LOOKS[i].blurb, tint: (lap * 50) % 360 };
}

/** The unit id of the boss that waits at the top of the act (the first foe of its band, as `fightSpec` picks it). */
export const bossOfAct = (act: number): string => FOE_BANDS[BOSS_BANDS[(Math.max(1, act) - 1) % BOSS_BANDS.length]][0];
