// How each act of the tower looks and is called (pure: no DOM, so the tests can read it). Act 1 is a dark crypt, act 2 castle halls
// hung with banners, act 3 a summit in the storm; later acts reuse the three looks, tinted by `tint` (a hue turn) and numbered.

import { BOSS_BANDS, FOE_BANDS } from './sim/foes';
import { CAL_BOSSES } from './sim/calamity';

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
export const bossOfAct = (act: number, calamity = false): string => (calamity ? FOE_BANDS[CAL_BOSSES[Math.min(Math.max(1, act), CAL_BOSSES.length) - 1]][0] : FOE_BANDS[BOSS_BANDS[(Math.max(1, act) - 1) % BOSS_BANDS.length]][0]);

/** The calamity's maps, each with its own name over one of the three looks (the fourth reuses the first, tinted). */
const CAL_LOOKS: readonly { look: 0 | 1 | 2; name: string; blurb: string; tint: number }[] = [
  { look: 0, name: 'The Ashen Road', blurb: 'Cinders drift over a road the calamity walked first.', tint: 0 },
  { look: 1, name: 'The Broken Keep', blurb: 'A fortress with its banners burnt and its halls open to the wind.', tint: 0 },
  { look: 2, name: 'The Burning Spire', blurb: 'The calamity\'s tower, lit from within.', tint: 0 },
  { look: 1, name: 'The Hollow Court', blurb: 'A court of the fallen, still holding audience.', tint: 200 },
  { look: 2, name: 'The Black Summit', blurb: 'The storm bends round something very old.', tint: 120 },
  { look: 0, name: 'The Hollow Heart', blurb: 'Where the calamity sleeps, and waits.', tint: 300 },
];

/** How a calamity's map `n` (1-based) looks and is called. */
export function calamityLook(n: number): ActLook {
  return { ...CAL_LOOKS[Math.min(Math.max(1, Math.floor(n)), CAL_LOOKS.length) - 1] };
}
