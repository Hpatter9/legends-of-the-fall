// Calamity mode, King God Castle style: the player picks one starting hero (level 1) and climbs a short run of node maps
// (the tower's machinery, `tower.ts`): a few fights, then a boss, and the boss's fall opens the next map. Along the way the
// run hires the heroes it finds, for gold, at recruit nodes and shops: ten may fight, and none merge. Heroes level within
// the run (`climb.ts`). Each map is a step harder and has its own look (`towerTheme.ts`); beating the last is a clear.
// This file is the mode's numbers and small rules; pure, no Pixi, no DOM.

import { CALAMITY_SQUAD } from './run';

/** The maps of a calamity, and the floors in each (six to eight; the last node of each is its boss). */
export const CAL_ROWS: readonly number[] = [6, 7, 7, 8];
export const CAL_MAPS = CAL_ROWS.length;
/** Foes' hp and attack on a floor are `start` x (1 + `growth` x (floor - 1)), the floors running on through the maps. Each hero past the fifth makes them `perHero` stronger (more heroes would otherwise make every fight easy), and each map after the first adds `step` of itself on top. */
export const CAL_SCALE = { start: 0.2, growth: 0.1, perHero: 0.12, step: 0.45 };
/** The gold a calamity starts with. */
export const CAL_START_GOLD = 40;
/** The foes' extra strength for the heroes on the roster beyond five. */
export const squadFoeMult = (heroes: number): number => 1 + CAL_SCALE.perHero * Math.max(0, Math.min(heroes, CALAMITY_SQUAD) - 5);

/** A fight's band fitted to the party: a lone hero meets two foes, a pair three, and so on to the full band. A boss keeps its place at the head of a band fitted the same way, with one escort more. */
export function fitBand(band: readonly string[], heroes: number, boss: boolean): string[] {
  return band.slice(0, Math.max(boss ? 3 : 2, Math.min(band.length, heroes + (boss ? 2 : 1))));
}
