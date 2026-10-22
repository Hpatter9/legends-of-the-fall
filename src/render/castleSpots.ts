// The castle courtyard's floor plan: each upgrade's four looks (pictures from Chronos's village art, put together from parts), where
// every building stands in the two arrangements of the yard (upright and sideways), what smokes, glints or glows, the road, the wall and
// the heroes' lawn, and the words of the upgrade cards. Plain data (no Pixi, no DOM), so a test can check it. All numbers are in the scene's
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
  anvil: [20, 14],
  barrel: [20, 22],
  box1: [17, 16],
  box2: [18, 18],
  bush1: [35, 46],
  bush2: [37, 48],
  camp3: [53, 34],
  cart: [48, 26],
  chest_gold: [19, 14],
  cobble: [16, 16],
  crate: [16, 21],
  crate_stack: [27, 30],
  crates_tall: [25, 30],
  fence: [27, 15],
  flower1: [6, 6],
  flower3: [5, 5],
  flower5: [6, 4],
  gate: [32, 32],
  gb_barrels: [38, 42],
  gb_canopy: [129, 87],
  gb_crates: [21, 38],
  gb_house: [139, 160],
  gb_sacks: [42, 29],
  gb_shop: [110, 98],
  gb_signpost: [28, 44],
  gold1: [19, 17],
  gold2: [15, 13],
  house1: [116, 112],
  house2: [156, 135],
  house4: [154, 149],
  lantern: [16, 40],
  log: [34, 21],
  palisade: [32, 32],
  palisade2: [32, 32],
  pebble1: [11, 8],
  pebble3: [11, 7],
  pebble5: [7, 5],
  planks: [26, 17],
  rack: [28, 42],
  sign_sword: [23, 21],
  tower1: [30, 57],
  tower2: [54, 98],
  tower3: [68, 134],
  tree1: [114, 129],
  tree2: [108, 147],
  tt_gable: [48, 132],
  tt_long: [96, 109],
  tuft1: [5, 6],
  tuft2: [9, 6],
  tuft3: [5, 7],
  well: [43, 54],
  yurt1: [79, 76],
  yurt2: [79, 76]
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

/** The four looks of each building. A house is never used for two buildings: the village art has seven, so a building grows by adding
 *  wings, props and neighbours, and the mage tower's three towers are one family (made in the village's palette). */
export const LOOKS: Record<BuildingId, readonly Look[]> = {
  treasury: [
    { parts: [P('crates_tall', -22), P('crate_stack', 6, -2), P('box1', 30, 3)] },
    { parts: [P('house1', 0), P('chest_gold', -38, 7)] },
    { parts: [P('tt_long', 0), P('chest_gold', -60, 6), P('gold1', -40, 9), P('gold2', 42, 9), P('crates_tall', 64)] },
    { parts: [P('gb_house', 0), P('crates_tall', 74), P('lantern', -84), P('gold1', -62, 9), P('gold2', -46, 12), P('chest_gold', -30, 11), P('gold1', 46, 9), P('chest_gold', 34, 12)] },
  ],
  barracks: [
    { parts: [P('camp3', 0)] },
    { parts: [P('yurt1', 0), P('box2', -54, 2), P('rack', 52, 4)] },
    { parts: [P('house2', 0), P('rack', 86, 6), P('lantern', -84)] },
    { parts: [P('house4', 0), P('yurt2', -50, 24), P('rack', 86, 6), P('lantern', -84), P('fence', 64, 14)] },
  ],
  armoury: [
    { parts: [P('planks', -34, -2), P('anvil', -8), P('log', 18)] },
    { parts: [P('gb_canopy', 0), P('anvil', -30, 7), P('rack', 40, 7)] },
    { parts: [P('gb_shop', 0), P('anvil', -44, 8), P('rack', 46, 8), P('sign_sword', 34, -2)] },
    { parts: [P('gb_shop', -26), P('tt_gable', 54), P('anvil', -64, 10), P('rack', -4, 12), P('sign_sword', -46, -2)] },
  ],
  mageTower: [
    { parts: [P('box2', -30, 2), P('pebble1', -12), P('pebble3', 12, 2), P('pebble5', 26, -1)] },
    { parts: [P('tower1', 0), P('pebble5', -24, 2)] },
    { parts: [P('tower2', 0), P('pebble1', -32, 2)] },
    { parts: [P('tower3', 0), P('pebble1', -42, 2), P('pebble3', 44, 3)] },
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
    [],
    [smokeAt('treasury', 1, 0, 0.17, 0.08)],
    [smokeAt('treasury', 2, 0, 0.24, 0.02), { dx: -40, dy: -8, kind: 'glint' }, { dx: 42, dy: -6, kind: 'glint' }],
    [smokeAt('treasury', 3, 0, 0.33, 0.02), { dx: -62, dy: -8, kind: 'glint' }, { dx: -30, dy: -10, kind: 'glint' }, { dx: 46, dy: -8, kind: 'glint' }, { dx: 34, dy: -11, kind: 'glint' }],
  ],
  barracks: [[], [], [smokeAt('barracks', 2, 0, 0.17, 0.23)], [smokeAt('barracks', 3, 0, 0.4, 0.09)]],
  armoury: [
    [],
    [{ dx: -30, dy: -12, kind: 'spark' }],
    [{ dx: -44, dy: -13, kind: 'spark' }],
    [{ dx: -64, dy: -16, kind: 'spark' }, { dx: -60, dy: -16, kind: 'spark' }],
  ],
  mageTower: [[], [], [{ dx: 0, dy: -50, kind: 'rune' }], [{ dx: 0, dy: -70, kind: 'rune' }]],
};

export const LIGHTS: Record<BuildingId, readonly (readonly Light[])[]> = {
  treasury: [[], [], [{ dx: 0, dy: -40, size: 56, tint: '#ffd24a', al: 0.25 }], [{ dx: 0, dy: -50, size: 80, tint: '#ffd24a', al: 0.3 }]],
  barracks: [[], [], [], []],
  armoury: [[], [{ dx: -30, dy: -10, size: 28, tint: '#ff9a3c', al: 0.5 }], [{ dx: -44, dy: -10, size: 30, tint: '#ff9a3c', al: 0.5 }], [{ dx: -64, dy: -12, size: 34, tint: '#ff9a3c', al: 0.55 }]],
  mageTower: [[], [], [{ dx: 0, dy: -52, size: 44, tint: '#58d8ff', al: 0.7 }], [{ dx: 0, dy: -86, size: 40, tint: '#b890ff', al: 0.6 }, { dx: 0, dy: -52, size: 52, tint: '#58d8ff', al: 0.7 }]],
};

export interface Plot {
  /** Centre across and the foot line. */
  x: number;
  y: number;
}

/** A standing prop of the yard (sorted with the buildings and heroes by its foot line). */
export interface Prop {
  sprite: string;
  x: number;
  y: number;
}

/** A cobbled patch (scene pixels). */
export interface Patch {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One arrangement of the yard. */
export interface Layout {
  /** The scene's size. */
  w: number;
  h: number;
  /** The palisade runs across at `wallY` (its top); the gate stands at `gateX`. */
  wallY: number;
  gateX: number;
  plots: Record<BuildingId, Plot>;
  props: readonly Prop[];
  /** The cobbled road and plaza. */
  roads: readonly Patch[];
  /** Pennant poles: foot of the pole and which way the cloth blows. */
  flags: readonly { x: number; y: number; dir: 1 | -1 }[];
  /** Where the heroes stroll (they pass behind and in front of buildings by their foot line). */
  walk: { x0: number; x1: number; y0: number; y1: number };
  /** The scene row at the top of the view when it opens, for a screen shorter than the scene. */
  openTop: number;
}

/** Upright (a phone standing): 360 wide, a road down the middle from the gate; tower and treasury behind the plaza, barracks and armoury in front. All four show at once. */
export const TALL: Layout = {
  w: 360,
  h: 600,
  wallY: 44,
  gateX: 180,
  plots: {
    mageTower: { x: 80, y: 300 },
    treasury: { x: 268, y: 306 },
    barracks: { x: 98, y: 522 },
    armoury: { x: 272, y: 524 },
  },
  props: [
    { sprite: 'lantern', x: 126, y: 80 },
    { sprite: 'lantern', x: 234, y: 80 },
    { sprite: 'well', x: 180, y: 366 },
    { sprite: 'tree1', x: 36, y: 188 },
    { sprite: 'tree2', x: 326, y: 190 },
    { sprite: 'bush1', x: 20, y: 380 },
    { sprite: 'bush2', x: 340, y: 590 },
    { sprite: 'gb_barrels', x: 128, y: 390 },
    { sprite: 'cart', x: 326, y: 432 },
    { sprite: 'gb_sacks', x: 40, y: 440 },
  ],
  roads: [
    { x0: 148, y0: 76, x1: 212, y1: 600 },
    { x0: 112, y0: 322, x1: 248, y1: 374 },
  ],
  flags: [
    { x: 112, y: 56, dir: 1 },
    { x: 248, y: 56, dir: -1 },
  ],
  walk: { x0: 128, x1: 232, y0: 110, y1: 592 },
  openTop: 0,
};

/** Sideways (a phone lying down): 756 wide, the four buildings in a row either side of the gate road, the road along their feet. */
export const WIDE: Layout = {
  w: 756,
  h: 300,
  wallY: 10,
  gateX: 378,
  plots: {
    mageTower: { x: 58, y: 244 },
    treasury: { x: 238, y: 248 },
    barracks: { x: 492, y: 246 },
    armoury: { x: 668, y: 248 },
  },
  props: [
    { sprite: 'lantern', x: 324, y: 46 },
    { sprite: 'lantern', x: 432, y: 46 },
    { sprite: 'well', x: 378, y: 270 },
    { sprite: 'tree1', x: 30, y: 128 },
    { sprite: 'tree2', x: 722, y: 130 },
    { sprite: 'bush1', x: 336, y: 150 },
    { sprite: 'bush2', x: 428, y: 150 },
    { sprite: 'gb_barrels', x: 310, y: 296 },
    { sprite: 'cart', x: 580, y: 296 },
  ],
  roads: [
    { x0: 362, y0: 42, x1: 394, y1: 292 },
    { x0: 24, y0: 252, x1: 732, y1: 284 },
    { x0: 344, y0: 248, x1: 412, y1: 296 },
  ],
  flags: [
    { x: 304, y: 22, dir: 1 },
    { x: 452, y: 22, dir: -1 },
  ],
  walk: { x0: 40, x1: 716, y0: 258, y1: 294 },
  openTop: 40,
};

/** The arrangement for a screen: the upright one when it is taller than wide. */
export const layoutFor = (portrait: boolean): Layout => (portrait ? TALL : WIDE);

/** The grass: one flat colour (the village ground sheet's), and the page behind the scene is the same. */
export const GRASS = '#a0b35a';

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
