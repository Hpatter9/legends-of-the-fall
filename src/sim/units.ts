// The fighters: five heroes and the skeleton band they meet. Times are in milliseconds; `range` is in tiles
// (Manhattan). A unit with `shot` fires from afar (its range grows on high ground); the rest strike in melee, and can
// only reach a foe no more than their `jump` above or below them.

import { FOES } from './foes';

export type Side = 'hero' | 'foe';
export type Shot = 'arrow' | 'bone' | 'fire';

export interface UnitDef {
  id: string;
  name: string;
  side: Side;
  /** The sprite sheet (`src/art/units/<sheet>.png`). */
  sheet: string;
  /** How big the sheet's frames are drawn on the board. */
  scale: number;
  hp: number;
  atk: number;
  def: number;
  range: number;
  /** Time for one step on level ground (a climb takes longer, by the step's cost). */
  moveMs: number;
  /** Time between blows. */
  atkMs: number;
  /** How many steps up or down it can climb in one tile. */
  jump: number;
  shot?: Shot;
  /** Its blow also lands, at `SPLASH_SHARE`, on the target's foes next to it. */
  splash?: boolean;
  /** Extra shot reach per step of height above the target (default 0.7). */
  heightReach?: number;
  /** One line for the bench card. */
  role: string;
}

/** The share of a splash blow that lands on each tile beside the target. */
export const SPLASH_SHARE = 0.5;

export const UNITS: Record<string, UnitDef> = {
  ...FOES,
  knight: { id: 'knight', name: 'Knight', side: 'hero', sheet: 'knight_1', scale: 0.74, hp: 380, atk: 19, def: 11, range: 1, moveMs: 760, atkMs: 1100, jump: 2, role: 'Holds the line' },
  samurai: { id: 'samurai', name: 'Samurai', side: 'hero', sheet: 'samurai', scale: 0.72, hp: 225, atk: 34, def: 6, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Heavy blade' },
  kunoichi: { id: 'kunoichi', name: 'Kunoichi', side: 'hero', sheet: 'kunoichi', scale: 0.74, hp: 165, atk: 17, def: 4, range: 1, moveMs: 420, atkMs: 550, jump: 3, role: 'Quick, climbs well' },
  archer: { id: 'archer', name: 'Archer', side: 'hero', sheet: 'samurai_archer', scale: 0.6, hp: 142, atk: 24, def: 3, range: 4, moveMs: 650, atkMs: 1300, jump: 2, shot: 'arrow', heightReach: 1.4, role: 'Long shots, twice as far from high' },
  wizard: { id: 'wizard', name: 'Fire Wizard', side: 'hero', sheet: 'fire_wizard', scale: 0.79, hp: 135, atk: 26, def: 2, range: 3, moveMs: 700, atkMs: 1700, jump: 2, shot: 'fire', splash: true, role: 'Fire that spreads' },

  skeleton: { id: 'skeleton', name: 'Skeleton', side: 'foe', sheet: 'skeleton_warrior', scale: 0.79, hp: 320, atk: 26, def: 7, range: 1, moveMs: 650, atkMs: 1100, jump: 2, role: 'Sword and shield' },
  spearman: { id: 'spearman', name: 'Skeleton Spearman', side: 'foe', sheet: 'skeleton_spearman', scale: 0.67, hp: 270, atk: 28, def: 5, range: 2, moveMs: 650, atkMs: 1250, jump: 2, role: 'Reaches two tiles' },
  boneArcher: { id: 'boneArcher', name: 'Skeleton Archer', side: 'foe', sheet: 'skeleton_archer', scale: 0.79, hp: 200, atk: 23, def: 3, range: 4, moveMs: 700, atkMs: 1400, jump: 2, shot: 'bone', role: 'Bone arrows' },
};

/** The heroes on the bench, in order. */
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'] as const;
