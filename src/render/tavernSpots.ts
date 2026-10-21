// The tavern's floor plan: the room's size, its furniture and the one fixed spot each of the 25 heroes keeps. Plain data
// (no Pixi, no DOM), so a test can check it. All numbers are in the room's own pixels; `y` is where the hero's feet stand
// and what the room sorts by, front to back (a bigger `depth` is drawn later, so nearer).

import { MAX_RANK } from '../sim/meta';

export const ROOM_W = 384;
export const ROOM_H = 296;
/** Where the back wall ends and the floor begins. */
export const WALL_H = 176;

export type SeatKind = 'stool' | 'chair';

export interface Spot {
  x: number;
  y: number;
  depth: number;
  /** 1 faces right, -1 left (the hero's first look; it turns now and then). */
  facing: 1 | -1;
  /** The seat that stands here empty until the hero is recruited. */
  seat: SeatKind;
}

export interface Prop {
  sprite: 'bar' | 'table' | 'longtable' | 'barrels' | 'crates';
  /** Centre across and the bottom edge (the sort line). */
  x: number;
  y: number;
}

/** The big furniture, drawn in with the heroes so a table hides the legs of whoever sits behind it. */
export const PROPS: readonly Prop[] = [
  { sprite: 'bar', x: 254, y: 206 },
  { sprite: 'table', x: 76, y: 280 },
  { sprite: 'table', x: 304, y: 276 },
  { sprite: 'longtable', x: 190, y: 282 },
  { sprite: 'barrels', x: 356, y: 226 },
  { sprite: 'crates', x: 24, y: 292 },
];

/** The rug on the floor (under everything). */
export const RUG = { x: 190, y: 246 };

const S = (x: number, y: number, facing: 1 | -1, seat: SeatKind = 'stool', depth = y): Spot => ({ x, y, depth, facing, seat });

/** A spot for every hero (`ALL_HEROES`): the starting five sit in the middle of things so a young tavern still looks lived-in. */
export const SPOTS: Record<string, Spot> = {
  // at the bar
  archer: S(166, 220, 1),
  knight: S(196, 220, 1),
  kunoichi: S(226, 220, -1),
  samurai: S(256, 220, -1),
  wizard: S(286, 220, 1),
  peasant: S(316, 220, -1),
  // by the hearth
  ninjaMonk: S(28, 214, 1, 'chair'),
  yamabushi: S(64, 228, 1),
  kitsune: S(102, 212, -1),
  // the round table on the left
  wanderer: S(48, 264, 1, 'chair'),
  lightningMage: S(106, 264, -1, 'chair'),
  gorgon: S(76, 294, 1),
  // the round table on the right
  satyr: S(274, 260, 1, 'chair'),
  druid: S(334, 260, -1, 'chair'),
  warlock: S(304, 292, -1),
  // the long table
  paladin: S(152, 266, 1, 'chair'),
  samuraiCommander: S(190, 264, -1, 'chair'),
  cleric: S(228, 266, -1, 'chair'),
  barbarian: S(164, 294, 1),
  ranger: S(216, 294, -1),
  // standing about
  karasu: S(352, 236, -1),
  werewolf: S(22, 262, 1),
  minotaur: S(344, 292, -1),
  illusionist: S(124, 240, 1),
  gunslinger: S(364, 262, -1),
};

/** The look a hero has in the tavern from their rank: rank 2 wears the second form, the top rank the third. */
export const gradeOfRank = (rank: number): 1 | 2 | 3 => (rank >= MAX_RANK ? 3 : rank >= 2 ? 2 : 1);
