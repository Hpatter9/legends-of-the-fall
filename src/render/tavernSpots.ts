// The tavern's floor plan: three rooms side by side (the bar room, the hearth hall and the games room), their furniture and the
// one fixed spot each of the heroes keeps. Plain data (no Pixi, no DOM), so a test can check it. All numbers are in the scene's
// own pixels, across from its left edge; `y` is where the hero's feet stand and what the scene sorts by, front to back (a bigger
// `depth` is drawn later, so nearer).

import { MAX_RANK } from '../sim/meta';
import { formOf, UNITS } from '../sim/units';
import sheets from '../art/units/sheets.json';

/** One room's size (the three walls are each this wide) and how many rooms there are. */
export const ROOM_W = 384;
export const ROOM_H = 296;
export const ROOMS = 3;
/** The whole scene across: the rooms joined into one building. */
export const SCENE_W = ROOM_W * ROOMS;
/** Where the back wall ends and the floor begins. */
export const WALL_H = 128;
/** Dark ceiling above the wall (room pixels), shown only when the view is taller than the rooms. */
export const CEIL_H = 72;
/** Floor below the front row of heroes, where the room names sit (room pixels). */
export const FLOOR_PAD = 26;

/** The rooms in order, with the name the hint under the picture gives each (`x` is the room's left edge, `focus` the spot the view centres on when you go there: the bar room's is the stools, where the starting five sit). */
export const ROOM_NAMES = [
  { id: 'bar', name: 'Bar', x: 0, focus: 256 },
  { id: 'hearth', name: 'Hearth', x: ROOM_W, focus: ROOM_W + 192 },
  { id: 'back', name: 'Back room', x: ROOM_W * 2, focus: ROOM_W * 2 + 190 },
] as const;

/** The doorways between the rooms, at the seams (the arch is centred on the seam). */
export const DOORWAYS: readonly number[] = [ROOM_W, ROOM_W * 2];

export type SeatKind = 'none' | 'stool' | 'chair' | 'bench';

export interface Spot {
  x: number;
  y: number;
  depth: number;
  /** 1 faces right, -1 left (the hero's first look; it turns now and then). */
  facing: 1 | -1;
  /** The seat that stands here empty until the hero is recruited ('none': they just stand about, so there is nothing to leave empty). */
  seat: SeatKind;
}

export interface Prop {
  sprite: 'bar' | 'table' | 'longtable' | 'barrels' | 'crates' | 'stage';
  /** Centre across and the bottom edge (the sort line unless `depth` says otherwise). */
  x: number;
  y: number;
  /** The sort line, when the piece is something heroes stand on (the stage). */
  depth?: number;
}

const H = ROOM_W;

/** The big furniture, drawn in with the heroes so a table hides the legs of whoever sits behind it. */
export const PROPS: readonly Prop[] = [
  // the bar room: the bar, the round table on the left, the long table, barrels and crates
  { sprite: 'bar', x: 254, y: 206 },
  { sprite: 'table', x: 76, y: 280 },
  { sprite: 'longtable', x: 190, y: 282 },
  { sprite: 'barrels', x: 356, y: 226 },
  { sprite: 'crates', x: 24, y: 292 },
  // the hearth hall: a round table at each end
  { sprite: 'table', x: H + 60, y: 280 },
  { sprite: 'table', x: H + 324, y: 280 },
  { sprite: 'crates', x: H + 366, y: 232 },
  { sprite: 'barrels', x: H + 18, y: 232 },
  // the games room: two card tables, the bard's stage, barrels
  { sprite: 'table', x: H * 2 + 150, y: 280 },
  { sprite: 'table', x: H * 2 + 290, y: 288 },
  { sprite: 'stage', x: H * 2 + 330, y: 210, depth: 190 },
  { sprite: 'barrels', x: H * 2 + 16, y: 292 },
];

/** The rugs on the floor (under everything). */
export const RUGS: readonly { x: number; y: number }[] = [
  { x: 190, y: 246 },
  { x: H + 192, y: 210 },
  { x: H * 2 + 150, y: 276 },
];

/** The lamps and the fire that glow in the dark (the glow is drawn over everything): where, how far, how bright. */
export const GLOWS: readonly { x: number; y: number; r: number; al: number }[] = [
  { x: 52, y: 118, r: 110, al: 0.3 },
  ...[108, 143, 228, 277, 312, 361].map((x) => ({ x, y: 22, r: 40, al: 0.16 })),
  { x: H + 192, y: 96, r: 130, al: 0.34 },
  { x: H + 64, y: 52, r: 44, al: 0.18 },
  { x: H + 320, y: 52, r: 44, al: 0.18 },
  { x: H * 2 + 97, y: 50, r: 44, al: 0.16 },
  { x: H * 2 + 287, y: 50, r: 44, al: 0.16 },
];

const S = (x: number, y: number, facing: 1 | -1, seat: SeatKind = 'none', depth = y): Spot => ({ x, y, depth, facing, seat });

/** A spot for every hero (`ALL_HEROES`): the starting five sit along the bar in the first room so a young tavern still looks lived-in. What each
 *  does there, and why that hero at that spot, is `LIFE` in `tavernLife.ts`. */
export const SPOTS: Record<string, Spot> = {
  // ---- the bar room ----
  // at the bar
  archer: S(180, 220, 1, 'stool'),
  knight: S(220, 220, 1, 'stool'),
  kunoichi: S(254, 220, -1, 'stool'),
  samurai: S(292, 220, -1, 'stool'),
  wizard: S(334, 220, 1, 'stool'),
  peasant: S(130, 196, 1),
  // by the little hearth
  ninjaMonk: S(30, 190, 1, 'chair'),
  yamabushi: S(74, 190, -1, 'stool'),
  // the round table on the left
  wanderer: S(48, 258, 1, 'chair'),
  lightningMage: S(104, 258, -1, 'chair'),
  gorgon: S(76, 296, 1, 'stool'),
  // the long table (its two front stools: the arm-wrestle)
  paladin: S(152, 258, 1, 'chair'),
  cleric: S(228, 258, -1, 'chair'),
  barbarian: S(164, 296, 1, 'stool'),
  minotaur: S(216, 296, -1, 'stool'),

  // ---- the hearth hall ----
  // standing at the fire
  mercenary: S(H + 128, 178, 1),
  mummy: S(H + 172, 176, 1),
  buccaneer: S(H + 214, 178, -1),
  rifleBot: S(H + 260, 176, -1),
  // on the benches by the rug
  illusionist: S(H + 146, 214, 1, 'bench'),
  gunslinger: S(H + 238, 214, -1, 'bench'),
  // the round table on the left
  satyr: S(H + 32, 258, 1, 'chair'),
  druid: S(H + 88, 258, -1, 'chair'),
  warlock: S(H + 60, 296, 1, 'stool'),
  // the round table on the right
  samuraiCommander: S(H + 296, 258, 1, 'chair'),
  shambler: S(H + 352, 258, -1, 'chair'),
  kitsune: S(H + 324, 296, -1, 'stool'),
  // standing about between the tables
  werewolf: S(H + 138, 256, 1),
  karasu: S(H + 192, 250, -1),
  ranger: S(H + 246, 250, -1),

  // ---- the games room ----
  // darts: the scorekeeper under the board, the two players at the line
  dreadPirate: S(H * 2 + 88, 184, 1),
  lancer: S(H * 2 + 136, 184, -1),
  dragoon: S(H * 2 + 184, 184, -1),
  // the first card table
  sage: S(H * 2 + 122, 258, 1, 'chair'),
  demonSwordsman: S(H * 2 + 178, 258, -1, 'chair'),
  tyrant: S(H * 2 + 150, 296, 1, 'stool'),
  // the second card table
  siegeBot: S(H * 2 + 262, 262, 1, 'chair'),
  juggernaut: S(H * 2 + 318, 262, -1, 'chair'),
  priestess: S(H * 2 + 290, 296, 1, 'stool'),
  // the bard on the stage, and the crowd round it
  wolfBard: S(H * 2 + 330, 196, -1),
  timeWitch: S(H * 2 + 262, 226, 1),
  arcBlade: S(H * 2 + 368, 230, -1),
  // standing about
  reaper: S(H * 2 + 34, 230, 1),
  kraken: S(H * 2 + 80, 240, 1),
  beastmaster: S(H * 2 + 366, 266, -1),
};

/** The look a hero has in the tavern from their rank: rank 2 wears the second form, the top rank the third. */
export const gradeOfRank = (rank: number): 1 | 2 | 3 => (rank >= MAX_RANK ? 3 : rank >= 2 ? 2 : 1);

interface SheetLayout {
  w: number;
  h: number;
  figure: number;
}

/** Room pixels a hero's figure is drawn at, from its height on the sheet and the unit's scale: the picture's tallest figure is 54, the smallest 34. */
export const figureHeight = (figure: number, scale: number): number => Math.min(54, Math.max(34, figure * scale * 0.9));

/**
 * How big a hero is drawn in the tavern (room pixels per sheet pixel, the figure's height, and the width it takes up). A sheet's
 * frame is wider than the hero (room for the swing of a blade), so the width is the frame's, capped at four fifths of the
 * figure's height. Taken over the three forms, so a hero that grows up never needs a bigger spot.
 */
export function figureBox(kind: string): { k: number; w: number; h: number } {
  const def = UNITS[kind];
  const book = sheets as unknown as Record<string, SheetLayout>;
  let box = { k: 0, w: 0, h: 0 };
  for (const g of [1, 2, 3]) {
    const l = book[formOf(def, g)];
    if (!l) continue;
    const k = figureHeight(l.figure, def.scale) / l.figure;
    const w = Math.min(l.w, l.figure * 0.8) * k;
    if (w > box.w) box = { k, w, h: l.figure * k };
  }
  return box;
}
