// The castle courtyard's floor plan: each upgrade's four looks (pictures from Chronos's isometric building kits, put together from parts), where
// every building stands in the two arrangements of the yard (upright and sideways), what smokes, glints or glows, the road, the wall and
// the heroes' strolling band, and the words of the upgrade cards. Plain data (no Pixi, no DOM), so a test can check it. All numbers are in the scene's
// own pixels (the art's own pixels: the scene is drawn whole-number times bigger); `y` is a building's foot line, which the scene sorts by.

import { BUILDING_IDS, BUILDINGS, GOLD_PER_LEVEL, HP_PER_LEVEL, ATK_PER_LEVEL, MANA_PER_LEVEL, maxLevel, spellBudget, type BuildingId } from '../sim/castle';

/** How many looks a building has: 0 an empty plot, 1 small, 2 bigger, 3 grand. */
export const STAGES = 4;

/** The look of a building at a level: the plot at 0, the grand one at the top level, the others spread between. */
export function stageOf(id: BuildingId, level: number): number {
  const top = maxLevel(id);
  const l = Math.max(0, Math.min(top, Math.floor(level)));
  return l === 0 ? 0 : 1 + Math.min(STAGES - 2, Math.floor(((l - 1) * (STAGES - 1)) / top));
}

/** Every picture in `src/art/castle/` and its size (a test checks the table against the files). */
export const SPRITE_SIZE: Record<string, readonly [number, number]> = {
  anvil_stall: [72, 89],
  banner: [25, 79],
  barracks: [138, 129],
  barrels: [33, 44],
  berries: [60, 73],
  brazier: [36, 90],
  bush: [38, 37],
  campfire: [66, 46],
  chapel: [101, 162],
  chests: [70, 54],
  cobble_tile: [90, 60],
  cottage: [103, 101],
  crates: [43, 52],
  crystals: [41, 60],
  flowers: [41, 32],
  forge: [114, 139],
  gate: [214, 99],
  grass_tile: [89, 59],
  great_hall: [146, 147],
  hay: [48, 51],
  longhouse: [119, 112],
  oak: [64, 90],
  pine: [41, 88],
  rocks: [36, 38],
  roses: [38, 51],
  shrine: [77, 86],
  spiral: [68, 128],
  statue: [79, 119],
  stockpile: [87, 89],
  thatch: [129, 118],
  wall: [168, 81],
  watchtower: [79, 134],
  woodpile: [50, 54],
  workshop: [95, 110],
};

/** One picture in a look: its centre across and where its bottom edge sits, from the building's plot (y down, 0 = the foot line). */
export interface Part {
  sprite: string;
  dx: number;
  dy: number;
}
const P = (sprite: string, dx: number, dy = 0): Part => ({ sprite, dx, dy });

/** A look's pictures, drawn in order (later ones in front). */
export interface Look {
  parts: readonly Part[];
}

/** The four looks of each building, all from the isometric kits (one 2:1 view, lit from the upper left). A piece is never used for two
 *  buildings; a building grows by getting a bigger house and more props around it. */
export const LOOKS: Record<BuildingId, readonly Look[]> = {
  treasury: [
    { parts: [P('barrels', -26, 4), P('chests', 8)] },
    { parts: [P('stockpile', 0), P('chests', 62, 8)] },
    { parts: [P('longhouse', 0), P('chests', 70, 8), P('barrels', -70, 6)] },
    { parts: [P('great_hall', 0), P('brazier', 88, 8), P('chests', 46, 20), P('barrels', -50, 18)] },
  ],
  barracks: [
    { parts: [P('campfire', 0, 4), P('hay', -44, 2)] },
    { parts: [P('cottage', 0), P('hay', -60, 8)] },
    { parts: [P('thatch', 0), P('campfire', 78, 14)] },
    { parts: [P('barracks', 0), P('banner', 78, 10), P('hay', -66, 12), P('crates', 56, 26)] },
  ],
  armoury: [
    { parts: [P('rocks', -26, 2), P('crates', 8), P('woodpile', 44, 4)] },
    { parts: [P('anvil_stall', 0), P('crates', 52, 8)] },
    { parts: [P('workshop', 0), P('woodpile', -64, 8), P('crates', 62, 10)] },
    { parts: [P('forge', 24), P('anvil_stall', -66, 12)] },
  ],
  mageTower: [
    { parts: [P('rocks', -20, 2), P('crystals', 16)] },
    { parts: [P('shrine', 0)] },
    { parts: [P('spiral', 26), P('shrine', -40, 8)] },
    { parts: [P('spiral', 54, -6), P('chapel', 0, 6), P('crystals', -48, 16)] },
  ],
};

export const spriteName = (id: BuildingId, stage: number): string => `${id}${stage}`;

/** The box a look fills: across from `x0` to `x1` (from the plot's centre) and `h` up from the foot line. */
export function lookBox(look: Look): { x0: number; x1: number; h: number; w: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let h = 0;
  for (const p of look.parts) {
    const [w, ph] = SPRITE_SIZE[p.sprite];
    x0 = Math.min(x0, p.dx - w / 2);
    x1 = Math.max(x1, p.dx + w / 2);
    h = Math.max(h, ph - p.dy);
  }
  return { x0, x1, h, w: x1 - x0 };
}

/** The thing that comes from a spot on a look (offsets from the plot's foot): smoke from a chimney, a glint on gold, a spark at the forge, runes by the tower. */
export interface Vent {
  dx: number;
  dy: number;
  kind: 'smoke' | 'glint' | 'spark' | 'rune';
}
/** A soft light (offsets as above): `size` across, `tint` a colour, `al` how bright. */
export interface Light {
  dx: number;
  dy: number;
  size: number;
  tint: string;
  al: number;
}

/** A spot given as a fraction across and down one part's picture. */
function onPart(look: Look, index: number, fx: number, fy: number): { dx: number; dy: number } {
  const p = look.parts[index];
  const [w, h] = SPRITE_SIZE[p.sprite];
  return { dx: Math.round(p.dx - w / 2 + fx * w), dy: Math.round(p.dy - h + fy * h) };
}
const smokeAt = (id: BuildingId, stage: number, index: number, fx: number, fy: number): Vent => ({ ...onPart(LOOKS[id][stage], index, fx, fy), kind: 'smoke' });

export const VENTS: Record<BuildingId, readonly (readonly Vent[])[]> = {
  treasury: [
    [{ dx: 8, dy: -30, kind: 'glint' }],
    [{ dx: 62, dy: -30, kind: 'glint' }],
    [smokeAt('treasury', 2, 0, 0.64, 0.04), { dx: 70, dy: -30, kind: 'glint' }],
    [{ dx: 46, dy: -42, kind: 'glint' }, { dx: 30, dy: -38, kind: 'glint' }, { dx: 88, dy: -80, kind: 'smoke' }],
  ],
  barracks: [[{ dx: 0, dy: -30, kind: 'smoke' }], [smokeAt('barracks', 1, 0, 0.7, 0.04)], [{ dx: 78, dy: -34, kind: 'smoke' }], [smokeAt('barracks', 3, 0, 0.5, 0.02)]],
  armoury: [
    [],
    [{ dx: -8, dy: -28, kind: 'spark' }],
    [{ dx: -2, dy: -26, kind: 'spark' }, smokeAt('armoury', 2, 0, 0.5, 0.04)],
    [{ dx: 14, dy: -30, kind: 'spark' }, { dx: -66, dy: -30, kind: 'spark' }, smokeAt('armoury', 3, 0, 0.62, 0.02)],
  ],
  mageTower: [[], [{ dx: 0, dy: -40, kind: 'rune' }], [{ dx: 26, dy: -80, kind: 'rune' }, { dx: -40, dy: -44, kind: 'rune' }], [{ dx: 0, dy: -100, kind: 'rune' }, { dx: 54, dy: -90, kind: 'rune' }]],
};

export const LIGHTS: Record<BuildingId, readonly (readonly Light[])[]> = {
  treasury: [[], [], [{ dx: 0, dy: -40, size: 56, tint: '#ffd24a', al: 0.18 }], [{ dx: 0, dy: -50, size: 80, tint: '#ffd24a', al: 0.25 }]],
  barracks: [[{ dx: 0, dy: -12, size: 40, tint: '#ff9a3c', al: 0.5 }], [], [{ dx: 78, dy: -12, size: 34, tint: '#ff9a3c', al: 0.45 }], []],
  armoury: [[], [{ dx: -8, dy: -26, size: 30, tint: '#ff9a3c', al: 0.5 }], [{ dx: -2, dy: -30, size: 40, tint: '#ff9a3c', al: 0.5 }], [{ dx: 14, dy: -36, size: 52, tint: '#ff9a3c', al: 0.55 }]],
  mageTower: [[], [{ dx: 0, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: 26, dy: -104, size: 40, tint: '#b890ff', al: 0.6 }, { dx: -40, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: 0, dy: -104, size: 56, tint: '#58f0d0', al: 0.55 }, { dx: 54, dy: -96, size: 36, tint: '#b890ff', al: 0.5 }]],
};

export interface Plot {
  /** Centre across and the foot line. */
  x: number;
  y: number;
  /** Where the bottom of the name tag sits (the scene row); by default just above the building's roof. */
  tagY?: number;
}

/** A standing prop of the yard (sorted with the buildings and heroes by its foot line, or by `depth` when given: walls and what stands
 *  beyond them sit behind everything). `flip` mirrors it (a wall run seen from the other side). */
export interface Prop {
  sprite: string;
  x: number;
  y: number;
  flip?: boolean;
  depth?: number;
}

/** A paved patch of the ground: the ground is a lattice of 90 x 52 diamonds (one tile each), and a tile is cobbles when its middle falls inside a
 *  patch. A patch is a rectangle of the scene (`x0`..`y1`), or a run of tiles along the grid's own axes (`u`: down and right, `v`: down and left,
 *  counted from the layout's `grid` tile). */
export type Patch = { x0: number; y0: number; x1: number; y1: number } | { u0: number; v0: number; u1: number; v1: number };

/** One arrangement of the yard. */
export interface Layout {
  /** The scene's size. */
  w: number;
  h: number;
  /** The top of the yard proper: the line the buildings stand below (the back wall is above it). */
  wallY: number;
  /** The middle of one ground tile; the rest of the lattice follows from it. */
  grid: { x: number; y: number };
  plots: Record<BuildingId, Plot>;
  props: readonly Prop[];
  /** The cobbled roads and plaza. */
  roads: readonly Patch[];
  /** Pennant poles: foot of the pole and which way the cloth blows. */
  flags: readonly { x: number; y: number; dir: 1 | -1 }[];
  /** Where the heroes stroll (they pass behind and in front of buildings by their foot line). */
  walk: { x0: number; x1: number; y0: number; y1: number };
  /** The scene row at the top of the view when it opens, for a screen shorter than the scene. */
  openTop: number;
}

/** Ground tiles: a diamond 90 across and 52 down, laid in rows half a tile along and half a tile down from the last. */
export const TILE_W = 90;
export const TILE_H = 52;

/** Upright (a phone standing): 360 wide, a castle wall across the top with its gate, a road down to a plaza with a well and a statue; mage tower and
 *  treasury behind the plaza, barracks and armoury in front. All four show at once. */
export const TALL: Layout = {
  w: 360,
  h: 600,
  wallY: 170,
  grid: { x: 180, y: 414 },
  plots: {
    mageTower: { x: 84, y: 376 },
    treasury: { x: 252, y: 372 },
    barracks: { x: 100, y: 570, tagY: 598 },
    armoury: { x: 270, y: 574, tagY: 598 },
  },
  props: [
    { sprite: 'watchtower', x: 188, y: 178, depth: 1 },
    { sprite: 'gate', x: 92, y: 226, depth: 0 },
    { sprite: 'wall', x: 264, y: 196, flip: true, depth: 0 },
    { sprite: 'statue', x: 180, y: 430 },
    { sprite: 'oak', x: 40, y: 120, depth: -2 },
    { sprite: 'pine', x: 326, y: 100, depth: -2 },
    { sprite: 'flowers', x: 26, y: 470 },
    { sprite: 'bush', x: 340, y: 470 },
    { sprite: 'roses', x: 22, y: 436 },
    { sprite: 'berries', x: 338, y: 440 },
  ],
  roads: [
    { u0: -7, v0: -4, u1: -1, v1: -3 },
    { x0: 120, y0: 270, x1: 250, y1: 300 },
    { x0: -20, y0: 386, x1: 380, y1: 446 },
    { x0: 150, y0: 446, x1: 212, y1: 620 },
  ],
  flags: [
    { x: 28, y: 138, dir: 1 },
    { x: 338, y: 134, dir: -1 },
  ],
  walk: { x0: 28, x1: 332, y0: 398, y1: 436 },
  openTop: 0,
};

/** Sideways (a phone lying down): 756 wide, the four buildings in a row either side of the gate road, the road along their feet. */
export const WIDE: Layout = {
  w: 756,
  h: 300,
  wallY: 60,
  grid: { x: 360, y: 234 },
  plots: {
    mageTower: { x: 90, y: 262 },
    treasury: { x: 262, y: 262 },
    barracks: { x: 502, y: 262 },
    armoury: { x: 672, y: 264 },
  },
  props: [
    { sprite: 'wall', x: 46, y: 210, depth: -3 },
    { sprite: 'wall', x: 212, y: 176, depth: -3 },
    { sprite: 'gate', x: 388, y: 142, depth: -3 },
    { sprite: 'wall', x: 554, y: 108, depth: -3 },
    { sprite: 'wall', x: 720, y: 74, depth: -3 },
    { sprite: 'oak', x: 40, y: 130, depth: -4 },
    { sprite: 'pine', x: 300, y: 50, depth: -4 },
    { sprite: 'statue', x: 378, y: 290 },
    { sprite: 'roses', x: 330, y: 288 },
    { sprite: 'berries', x: 426, y: 290 },
  ],
  roads: [
    { x0: 308, y0: 140, x1: 452, y1: 252 },
    { x0: -20, y0: 262, x1: 780, y1: 320 },
  ],
  flags: [
    { x: 296, y: 100, dir: 1 },
    { x: 470, y: 66, dir: 1 },
  ],
  walk: { x0: 40, x1: 716, y0: 274, y1: 296 },
  openTop: 0,
};

/** The arrangement for a screen: the upright one when it is taller than wide. */
export const layoutFor = (portrait: boolean): Layout => (portrait ? TALL : WIDE);

/** The ground's flat colour: the grass tile's own average, used for the page behind the scene. */
export const GRASS = '#64742f';

/** The words a building's upgrade card shows for a level (0 = nothing built). */
export function effectText(id: BuildingId, level: number): string {
  switch (id) {
    case 'treasury':
      return `+${GOLD_PER_LEVEL * level} starting gold`;
    case 'barracks':
      return `+${Math.round(HP_PER_LEVEL * level * 100)}% hp for every hero`;
    case 'armoury':
      return `+${Math.round(ATK_PER_LEVEL * level * 100)}% attack for every hero`;
    case 'mageTower':
      return `mana fills ${Math.round(MANA_PER_LEVEL * level * 100)}% faster, +${spellBudget({ treasury: 0, barracks: 0, armoury: 0, mageTower: level }) - spellBudget()} spell power`;
  }
}

export const BLURB: Record<BuildingId, string> = {
  treasury: 'Gold in the vault: every run starts richer.',
  barracks: 'Beds and a training yard: your heroes are tougher.',
  armoury: 'Smiths and weapon racks: your heroes hit harder.',
  mageTower: 'The king\'s own spires: mana comes quicker and spells hit harder.',
};

export const NAME_OF = (id: BuildingId): string => BUILDINGS[id].name;
export { BUILDING_IDS };
