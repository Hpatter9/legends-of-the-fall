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
  gatehouse: [137, 127],
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
  wall: [120, 114],
  lamp: [26, 81],
  rack: [86, 84],
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
    { parts: [P('barrels', -22, 4), P('chests', 12)] },
    { parts: [P('stockpile', -6), P('chests', 44, 10)] },
    { parts: [P('longhouse', 6), P('barrels', -60, 8)] },
    { parts: [P('great_hall', 0)] },
  ],
  barracks: [
    { parts: [P('campfire', 0, 4), P('hay', -44, 2)] },
    { parts: [P('cottage', 8), P('hay', -50, 8)] },
    { parts: [P('thatch', -4), P('campfire', 52, 22)] },
    { parts: [P('barracks', 2), P('banner', -70, 16)] },
  ],
  armoury: [
    { parts: [P('rocks', -26, 2), P('crates', 8), P('woodpile', 44, 4)] },
    { parts: [P('anvil_stall', -6), P('crates', 46, 10)] },
    { parts: [P('workshop', 4), P('woodpile', -56, 10), P('crates', 58, 12)] },
    { parts: [P('forge', 14), P('anvil_stall', -48, 14)] },
  ],
  mageTower: [
    { parts: [P('rocks', -20, 2), P('crystals', 16)] },
    { parts: [P('shrine', 0)] },
    { parts: [P('spiral', 18), P('shrine', -34, 8)] },
    { parts: [P('spiral', 38, -6), P('chapel', -10, 6)] },
  ],
};

export const spriteName = (id: BuildingId, stage: number): string => `${id}${stage}`;

/** The box a look fills: across from `x0` to `x1` (from the plot's centre) and `h` up from the foot line. */
export function lookBox(look: Look, flip = false): { x0: number; x1: number; h: number; w: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let h = 0;
  for (const p of look.parts) {
    const [w, ph] = SPRITE_SIZE[p.sprite];
    x0 = Math.min(x0, p.dx - w / 2);
    x1 = Math.max(x1, p.dx + w / 2);
    h = Math.max(h, ph - p.dy);
  }
  return flip ? { x0: -x1, x1: -x0, h, w: x1 - x0 } : { x0, x1, h, w: x1 - x0 };
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
    [{ dx: 12, dy: -30, kind: 'glint' }],
    [{ dx: 44, dy: -30, kind: 'glint' }],
    [smokeAt('treasury', 2, 0, 0.64, 0.04)],
    [{ dx: -4, dy: -34, kind: 'glint' }, { dx: -22, dy: -28, kind: 'glint' }],
  ],
  barracks: [[{ dx: 0, dy: -30, kind: 'smoke' }], [smokeAt('barracks', 1, 0, 0.7, 0.04)], [{ dx: 52, dy: -20, kind: 'smoke' }], [smokeAt('barracks', 3, 0, 0.5, 0.02)]],
  armoury: [
    [],
    [{ dx: -14, dy: -28, kind: 'spark' }],
    [{ dx: 2, dy: -26, kind: 'spark' }, smokeAt('armoury', 2, 0, 0.5, 0.04)],
    [{ dx: 4, dy: -30, kind: 'spark' }, { dx: -48, dy: -30, kind: 'spark' }, smokeAt('armoury', 3, 0, 0.62, 0.02)],
  ],
  mageTower: [[], [{ dx: 0, dy: -40, kind: 'rune' }], [{ dx: 18, dy: -80, kind: 'rune' }, { dx: -34, dy: -44, kind: 'rune' }], [{ dx: -10, dy: -100, kind: 'rune' }, { dx: 38, dy: -96, kind: 'rune' }]],
};

export const LIGHTS: Record<BuildingId, readonly (readonly Light[])[]> = {
  treasury: [[], [], [{ dx: 0, dy: -40, size: 56, tint: '#ffd24a', al: 0.18 }], [{ dx: 0, dy: -50, size: 80, tint: '#ffd24a', al: 0.25 }]],
  barracks: [[{ dx: 0, dy: -12, size: 40, tint: '#ff9a3c', al: 0.5 }], [], [{ dx: 52, dy: -12, size: 34, tint: '#ff9a3c', al: 0.45 }], []],
  armoury: [[], [{ dx: -14, dy: -26, size: 30, tint: '#ff9a3c', al: 0.5 }], [{ dx: 2, dy: -30, size: 40, tint: '#ff9a3c', al: 0.5 }], [{ dx: 4, dy: -36, size: 52, tint: '#ff9a3c', al: 0.55 }]],
  mageTower: [[], [{ dx: 0, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: 18, dy: -104, size: 40, tint: '#b890ff', al: 0.6 }, { dx: -34, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: -10, dy: -104, size: 56, tint: '#58f0d0', al: 0.55 }, { dx: 38, dy: -96, size: 36, tint: '#b890ff', al: 0.5 }]],
};

/** Ground tiles: a diamond 90 across and 52 down, laid in rows half a tile along and half a tile down from the last. */
export const TILE_W = 90;
export const TILE_H = 52;

/** The yard is a lattice of ground tiles on the isometric grid: a tile is `(u, v)`, `u` running down and to the right, `v` down and to the left.
 *  `grid` is the screen position of the middle of tile (0, 0). Everything that stands in the yard is snapped to a tile. */
export interface Grid {
  x: number;
  y: number;
}
export const cellX = (g: Grid, u: number, v: number): number => g.x + ((u - v) * TILE_W) / 2;
export const cellY = (g: Grid, u: number, v: number): number => g.y + ((u + v) * TILE_H) / 2;

/** A block of tiles, both ends included. */
export interface Block {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** How far below a plot's middle tile the picture's foot line sits (a building's own base is about a tile and a half across). */
const PLOT_FOOT = 40;

/** A building's plot: the tiles it stands on (`u`, `v` the first, `w` across in `u`, `d` in `v`), which tile its door opens onto, and whether its
 *  picture is mirrored so the door faces its road (the pictures' doors face down-left; mirrored, down-right). `x`, `y` are the foot line. */
export interface Plot {
  u: number;
  v: number;
  w: number;
  d: number;
  flip: boolean;
  door: { u: number; v: number };
  /** Centre across and the foot line. */
  x: number;
  y: number;
  /** Where the bottom of the name tag sits (the scene row); by default just above the building's roof. */
  tagY?: number;
}

/** A standing prop of the yard on its own tile (sorted with the buildings and heroes by its foot, or by `depth` when given: the wall and what
 *  stands beyond it sit behind everything). `flip` mirrors it (a wall run seen from the other side). `x`, `y` are the foot, from the tile. */
export interface Prop {
  sprite: string;
  u: number;
  v: number;
  x: number;
  y: number;
  flip?: boolean;
  depth?: number;
}

/** One arrangement of the yard. */
export interface Layout {
  /** The scene's size. */
  w: number;
  h: number;
  grid: Grid;
  plots: Record<BuildingId, Plot>;
  props: readonly Prop[];
  /** The plaza and the roads, as blocks of tiles. */
  plaza: Block;
  roads: readonly Block[];
  /** Pennant poles: foot of the pole and which way the cloth blows. */
  flags: readonly { x: number; y: number; dir: 1 | -1 }[];
  /** The scene row at the top of the view when it opens, for a screen shorter than the scene. */
  openTop: number;
}

export const inBlock = (b: Block, u: number, v: number): boolean => u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1;
/** Whether a tile is paved (the plaza or a road). */
export const isPaved = (lay: Layout, u: number, v: number): boolean => inBlock(lay.plaza, u, v) || lay.roads.some((r) => inBlock(r, u, v));
/** The tiles a hero may stroll on: the paving, but not where the statue or a brazier stands. */
export function walkTiles(lay: Layout): { u: number; v: number }[] {
  const blocked = new Set(lay.props.filter((p) => p.sprite === 'statue' || p.sprite === 'brazier').map((p) => `${p.u},${p.v}`));
  const out: { u: number; v: number }[] = [];
  for (const b of [lay.plaza, ...lay.roads])
    for (let u = b.u0; u <= b.u1; u++) for (let v = b.v0; v <= b.v1; v++) if (!blocked.has(`${u},${v}`) && !out.some((t) => t.u === u && t.v === v)) out.push({ u, v });
  return out;
}
/** The tiles under a plot. */
export const footprint = (p: Plot): { u: number; v: number }[] => {
  const out: { u: number; v: number }[] = [];
  for (let i = 0; i < p.w; i++) for (let j = 0; j < p.d; j++) out.push({ u: p.u + i, v: p.v + j });
  return out;
};

type PlotSpec = { u: number; v: number; w: number; d: number; flip: boolean; door: { u: number; v: number }; tag?: 'below' };
interface Spec {
  w: number;
  h: number;
  grid: Grid;
  plots: Record<BuildingId, PlotSpec>;
  /** [sprite, u, v, options]: `u`, `v` may be halves for a wall piece that spans two tiles. */
  props: readonly (readonly [string, number, number, { flip?: boolean; depth?: number; dx?: number; dy?: number }?])[];
  plaza: Block;
  roads: readonly Block[];
  /** [u, v, up from the tile's foot, which way the cloth blows, across from the tile's middle] */
  flags: readonly (readonly [number, number, number, 1 | -1, number?])[];
  openTop: number;
}

function build(spec: Spec): Layout {
  const g = spec.grid;
  const plots = {} as Record<BuildingId, Plot>;
  for (const id of BUILDING_IDS) {
    const q = spec.plots[id];
    const cu = q.u + (q.w - 1) / 2;
    const cv = q.v + (q.d - 1) / 2;
    const x = Math.round(cellX(g, cu, cv));
    const y = Math.round(cellY(g, cu, cv) + PLOT_FOOT);
    const box = lookBox(LOOKS[id][STAGES - 1]);
    plots[id] = { u: q.u, v: q.v, w: q.w, d: q.d, flip: q.flip, door: q.door, x, y, tagY: q.tag === 'below' ? y + 46 : y - box.h - 4 };
  }
  const props: Prop[] = spec.props.map(([sprite, u, v, o]) => ({
    sprite,
    u,
    v,
    x: Math.round(cellX(g, u, v) + (o?.dx ?? 0)),
    y: Math.round(cellY(g, u, v) + TILE_H / 2 + (o?.dy ?? 0)),
    flip: o?.flip,
    depth: o?.depth,
  }));
  return { w: spec.w, h: spec.h, grid: g, plots, props, plaza: spec.plaza, roads: spec.roads, flags: spec.flags.map(([u, v, dy, dir, dx]) => ({ x: Math.round(cellX(g, u, v) + (dx ?? 0)), y: Math.round(cellY(g, u, v) + dy), dir })), openTop: spec.openTop };
}

const BEHIND = -1000;

/** Upright (a phone standing): 392 wide, 584 tall, so all four buildings show at once on a 393x852 phone. A castle wall closes the yard at the top (corner
 *  tower at the north corner, the gatehouse in the left run, a plain run on the right); the gate road winds down to the plaza, a clear 3 x 3 of paving
 *  with the statue in the middle and a brazier at each corner. Mage tower (left) and treasury (right) front the roads that wrap the plaza's north
 *  side; barracks and armoury front short roads that leave its south side. Each door opens onto a paved tile. */
export const TALL: Layout = build({
  w: 392,
  h: 584,
  grid: { x: 196, y: 376 },
  plaza: { u0: 0, v0: 0, u1: 2, v1: 2 },
  roads: [
    { u0: -4, v0: -3, u1: -3, v1: -3 },
    { u0: -3, v0: -3, u1: -3, v1: -1 },
    { u0: -3, v0: -1, u1: 1, v1: -1 },
    { u0: -1, v0: -1, u1: -1, v1: 2 },
    { u0: 2, v0: 3, u1: 2, v1: 4 },
    { u0: 3, v0: 2, u1: 4, v1: 2 },
  ],
  plots: {
    mageTower: { u: -2, v: 0, w: 1, d: 2, flip: true, door: { u: -1, v: 0 } },
    treasury: { u: 0, v: -2, w: 2, d: 1, flip: false, door: { u: 0, v: -1 } },
    barracks: { u: 1, v: 3, w: 1, d: 2, flip: true, door: { u: 2, v: 3 }, tag: 'below' },
    armoury: { u: 3, v: 1, w: 2, d: 1, flip: false, door: { u: 3, v: 2 }, tag: 'below' },
  },
  props: [
    // the wall: corner tower, the gatehouse in the left run, a plain run on the right
    ['watchtower', -5, -5, { depth: BEHIND + 2 }],
    ['gatehouse', -5, -3, { depth: BEHIND + 1 }],
    ['wall', -3, -5, { flip: true, depth: BEHIND }],
    ['wall', -1, -5, { flip: true, depth: BEHIND }],
    // the plaza
    ['statue', 1, 1],
    ['brazier', 0, 0],
    ['brazier', 2, 0],
    ['brazier', 0, 2],
    ['brazier', 2, 2],
    // beyond the wall
    ['oak', -6, -2, { depth: BEHIND - 2 }],
    ['pine', -4, -8, { depth: BEHIND - 2 }],
    // lamps, flowerbeds and trees along the wall and the grass edges
    ['lamp', -3, -4],
    ['flowers', -4, -4],
    ['roses', -4, -2],
    // by the treasury
    ['crates', 2, -2],
    ['barrels', -1, -2],
    // by the mage tower
    ['crystals', -3, 1, { dx: 8 }],
    // by the barracks and the armoury
    ['rack', 3, 3],
    ['hay', 3, 4],
    ['barrels', 4, 3],
    ['lamp', 2, 5],
    ['flowers', 5, 2, { dx: -14 }],
    ['bush', 1, 5, { dx: 8 }],
    ['berries', 3, 0],
  ],
  flags: [
    [-5, -5, -96, 1],
    [-5, -3, -98, -1, -52],
    [-5, -3, -92, 1, 52],
  ],
  openTop: 0,
});

/** Sideways (a phone lying down): 756 wide; the same plaza and roads, but the barracks and armoury stand at the far ends of the two roads that wrap its
 *  north side, so the yard is wide and shallow. A short vertical pan reaches the wall and its tower; it opens framed on the plaza. */
export const WIDE: Layout = build({
  w: 756,
  h: 520,
  grid: { x: 378, y: 376 },
  plaza: { u0: 0, v0: 0, u1: 2, v1: 2 },
  roads: [
    { u0: -4, v0: -3, u1: -3, v1: -3 },
    { u0: -3, v0: -3, u1: -3, v1: -1 },
    { u0: -3, v0: -1, u1: 4, v1: -1 },
    { u0: -1, v0: -1, u1: -1, v1: 4 },
  ],
  plots: {
    mageTower: { u: -2, v: 0, w: 1, d: 2, flip: true, door: { u: -1, v: 0 } },
    treasury: { u: 0, v: -2, w: 2, d: 1, flip: false, door: { u: 0, v: -1 } },
    barracks: { u: -2, v: 3, w: 1, d: 2, flip: true, door: { u: -1, v: 3 } },
    armoury: { u: 3, v: -2, w: 2, d: 1, flip: false, door: { u: 3, v: -1 } },
  },
  props: [
    ['watchtower', -5, -5, { depth: BEHIND + 2 }],
    ['gatehouse', -5, -3, { depth: BEHIND + 1 }],
    ['wall', -3, -5, { flip: true, depth: BEHIND }],
    ['wall', -1, -5, { flip: true, depth: BEHIND }],
    ['wall', 1, -5, { flip: true, depth: BEHIND }],
    ['wall', 3, -5, { flip: true, depth: BEHIND }],
    ['wall', -5, -1, { depth: BEHIND }],
    ['wall', -5, 1, { depth: BEHIND }],
    ['wall', -5, 3, { depth: BEHIND }],
    ['statue', 1, 1],
    ['brazier', 0, 0],
    ['brazier', 2, 0],
    ['brazier', 0, 2],
    ['brazier', 2, 2],
    ['oak', -6, -2, { depth: BEHIND - 2 }],
    ['pine', 0, -7, { depth: BEHIND - 2 }],
    ['lamp', -3, -4],
    ['flowers', -4, -4],
    ['roses', -4, -2],
    ['crates', 2, -2],
    ['barrels', -1, -2],
    ['barrels', 5, -2],
    ['berries', 3, 0],
    ['crystals', -3, 1, { dx: 8 }],
    ['rack', 0, 3],
    ['hay', 0, 4],
    ['crates', 3, -3],
    ['lamp', 3, 1],
    ['bush', -4, 3, { dx: 6 }],
  ],
  flags: [
    [-5, -5, -96, 1],
    [-5, -3, -98, -1, -52],
    [-5, -3, -92, 1, 52],
  ],
  openTop: 168,
});

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
