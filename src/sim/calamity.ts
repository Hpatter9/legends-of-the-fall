// Calamity mode, King God Castle style: the player picks one starting hero (level 1) and climbs a short run of node maps
// (the tower's machinery, `tower.ts`): a few fights, then a boss, and the boss's fall opens the next map. Along the way the
// run hires the heroes it finds, for gold, at recruit nodes and shops: ten may fight, and none merge. Heroes level within
// the run (`climb.ts`). Each map is a step harder and has its own look (`towerTheme.ts`); beating the last is a clear.
// This file is the mode's numbers and small rules; pure, no Pixi, no DOM.

import { CALAMITY_SQUAD } from './run';

/** A map's boss is drawn bigger and tougher the further on (map 1 is a plain boss). */
export const calBossBoost = (map: number, phaseAt = 0.5, shield = 0): { size: number; hp: number; atk: number; phase: number; shield?: number } => ({ size: 1.5 + 0.06 * (map - 1), hp: CAL_SCALE.bossHp + CAL_SCALE.bossStep * (map - 1), atk: 1 + 0.03 * (map - 1), phase: phaseAt, ...(shield ? { shield } : {}) });

/** The maps of a calamity, and the floors in each (six to eight; the last node of each is its boss). */
export const CAL_ROWS: readonly number[] = [6, 7, 7, 8, 8, 8];
export const CAL_MAPS = CAL_ROWS.length;
/** Foes' hp and attack on a floor are `start` x (1 + `growth` x (floor - 1)), the floors running on through the maps. Each hero past the fifth makes them `perHero` stronger (more heroes would otherwise make every fight easy), and each map after the first adds `step` of itself on top. From the second map on the foes' attack (not their hp) is `atkBias` more, so the fights draw blood: the heroes end them hurt, as the bigger squads and tiers would otherwise let them walk through. */
export const CAL_SCALE = { start: 0.425, growth: 0.05, perHero: 0.06, step: 0.55, bossHp: 1, bossStep: 0.05, atkBias: 0.35 };
/** A built castle makes a Calamity's foes answer it by this much more power than the spire's (`CASTLE_ANSWER`): the castle's hp and attack boost, to the power `CASTLE_ANSWER.share` + this. A Calamity's heroes also gain tiers, so with the same answer a built castle would carry them through the middle maps. */
export const CAL_CASTLE_EXTRA = 0.3;

/** The gold a calamity starts with. */
export const CAL_START_GOLD = 40;
/** The foes' extra strength for the heroes on the roster beyond five. */
export const squadFoeMult = (heroes: number): number => 1 + CAL_SCALE.perHero * Math.max(0, Math.min(heroes, CALAMITY_SQUAD) - 5);

/** A calamity's fights are on a bigger board than the usual one (10 x 13 against `W` x `D`, 8 x 11, and twice the old 7 x 9; the deploy rows are the same three at each end), so the ten heroes and the foes they meet have room. */
export const CAL_BOARD = { w: 10, d: 13 };
/** The most foes a fight meets (a boss and its escort included). */
export const CAL_FOES_MAX = 13;

/** A fight's band fitted to the party: a lone hero meets two foes, a pair three, and so on, one more than the heroes. A boss keeps its place at the head of a band fitted the same way, with one escort more.
 *  Past the band's own five, the band comes round again (without its leader), so ten heroes meet eleven foes, up to `CAL_FOES_MAX`. */
export function fitBand(band: readonly string[], heroes: number, boss: boolean): string[] {
  const want = Math.max(boss ? 3 : 2, Math.min(CAL_FOES_MAX, heroes + (boss ? 2 : 1)));
  const out = band.slice(0, Math.min(band.length, want));
  const again = band.slice(1);
  for (let i = 0; out.length < want && again.length; i++) out.push(again[i % again.length]);
  return out;
}

/** A hero's tier (its grade, shown as stars) follows its level in the run: a Calamity has no merging. `levels` are the run levels that give tier 2 and tier 3; tier 3 is meant for late in the run (maps 5 and 6), the starting hero
 *  reaching it around the end of map 4 and the heroes hired later after it (`docs/notes/cal-roster.md`). `mult` is what each tier above the first multiplies a hero's hp and attack by (a merge's `GRADE_MULT` is far bigger: a tier here comes on top of the levels that earned it). */
export const CAL_TIER = { levels: [12, 22] as number[], mult: 1.2 };
/** The tier a run level earns. */
export const tierOfLevel = (level: number): number => 1 + CAL_TIER.levels.filter((l) => level >= l).length;

/** The opening of a calamity is gentler: its first floors' foes are this share of their strength (floor 1, 2, 3...), so a lone level-1 hero is not lost in the very first fight. The strength is put back in the later floors (`CAL_SCALE`). */
export const CAL_OPENING: readonly number[] = [0.6, 0.75, 0.9];
