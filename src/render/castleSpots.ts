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
  /** The tiles of the wall's four corner towers (the ring runs between them). */
  yard: Block;
  plots: Record<BuildingId, Plot>;
  props: readonly Prop[];
  /** The plaza and the roads, as blocks of tiles. */
  plaza: Block;
  roads: readonly Block[];
  /** Pennant poles: foot of the pole and which way the cloth blows. */
  flags: readonly { x: number; y: number; dir: 1 | -1 }[];
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
  yard: Block;
  plots: Record<BuildingId, PlotSpec>;
  /** [sprite, u, v, options]: `u`, `v` may be halves for a wall piece that spans two tiles. */
  props: readonly (readonly [string, number, number, { flip?: boolean; depth?: number; dx?: number; dy?: number }?])[];
  plaza: Block;
  roads: readonly Block[];
  /** [u, v, up from the tile's foot, which way the cloth blows, across from the tile's middle] */
  flags: readonly (readonly [number, number, number, 1 | -1, number?])[];
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
  return { w: spec.w, h: spec.h, grid: g, yard: spec.yard, plots, props, plaza: spec.plaza, roads: spec.roads, flags: spec.flags.map(([u, v, dy, dir, dx]) => ({ x: Math.round(cellX(g, u, v) + (dx ?? 0)), y: Math.round(cellY(g, u, v) + dy), dir })) };
}

const BEHIND = -1000;

type PropSpec = Spec['props'][number];

/** A closed ring of wall around the yard: a tower at each of the four corners `(u0, v0)` (north), `(u1, v0)` (east), `(u0, v1)` (west) and `(u1, v1)`
 *  (south), and a straight run of wall pieces (each two tiles long) along every side, the same pieces on all four (mirrored on the two sides that run
 *  down-right). The north-west and north-east runs are behind the yard, so they are drawn behind everything; the two near runs and the side towers are
 *  sorted with the rest by their feet. The gatehouse stands in the south-east run at tile `v = gateV` (it takes the place of two pieces). */
function ring(u0: number, v0: number, u1: number, v1: number, gateV: number): PropSpec[] {
  const out: PropSpec[] = [
    ['watchtower', u0, v0, { depth: BEHIND + 2 }],
    ['watchtower', u1, v0],
    ['watchtower', u0, v1],
    ['watchtower', u1, v1],
  ];
  for (let c = 2; c < v1 - v0; c += 2) {
    const v = v0 + c;
    // north-west run (inner face seen), along `v` at `u0`
    out.push(['wall', u0, v, { depth: BEHIND }]);
    // south-east run (outer face seen), along `v` at `u1`, with the gate in it
    if (Math.abs(v - gateV) > 1.6) out.push(['wall', u1, v]);
  }
  for (let c = 2; c < u1 - u0; c += 2) {
    const u = u0 + c;
    // north-east run, along `u` at `v0`; south-west run, along `u` at `v1`
    out.push(['wall', u, v0, { flip: true, depth: BEHIND }]);
    out.push(['wall', u, v1, { flip: true }]);
  }
  out.push(['gatehouse', u1, gateV]);
  return out;
}

/** The village, for every screen: a walled yard 11 x 11 tiles with its four corner towers, the gatehouse in the near right-hand run and a road from
 *  it to the plaza (a clear 3 x 3 of paving, the statue in the middle, a brazier on each corner). Two roads wrap the plaza's north side: the mage
 *  tower and the barracks stand on the one at its left (their pictures mirrored so the doors face it), the treasury and the armoury on the one at its
 *  right. The scene is drawn a whole number of device pixels per scene pixel, as large as lets the whole village show (`pickScale`). The wall is far
 *  enough from every plot that the near runs hide none of it. */
export const YARD: Layout = build({
  w: 1040,
  h: 708,
  grid: { x: 520, y: 340 },
  yard: { u0: -4, v0: -4, u1: 6, v1: 6 },
  plaza: { u0: 0, v0: 0, u1: 2, v1: 2 },
  roads: [
    { u0: -1, v0: -1, u1: 4, v1: -1 },
    { u0: -1, v0: -1, u1: -1, v1: 4 },
    { u0: 3, v0: 1, u1: 5, v1: 1 },
  ],
  plots: {
    mageTower: { u: -2, v: 0, w: 1, d: 2, flip: true, door: { u: -1, v: 0 } },
    treasury: { u: 0, v: -2, w: 2, d: 1, flip: false, door: { u: 0, v: -1 } },
    barracks: { u: -2, v: 3, w: 1, d: 2, flip: true, door: { u: -1, v: 3 } },
    armoury: { u: 3, v: -2, w: 2, d: 1, flip: false, door: { u: 3, v: -1 } },
  },
  props: [
    ...ring(-4, -4, 6, 6, 1),
    // the plaza
    ['statue', 1, 1],
    ['brazier', 0, 0],
    ['brazier', 2, 0],
    ['brazier', 0, 2],
    ['brazier', 2, 2],
    // beyond the wall
    ['oak', -6, -5, { depth: BEHIND - 2 }],
    ['pine', 1, -9, { depth: BEHIND - 2 }],
    ['pine', -1, -8, { depth: BEHIND - 2 }],
    // lamps along the roads
    ['lamp', -2, -1],
    ['lamp', 4, 0],
    ['lamp', 4, 2],
    // by the treasury and the armoury: crates and barrels
    ['barrels', -1, -2],
    ['crates', 2, -2],
    ['crates', 3, -3],
    ['barrels', 5, -2],
    // by the mage tower: crystals
    ['crystals', -3, 1, { dx: 8 }],
    ['flowers', -3, -2],
    // by the barracks: a weapon rack and hay
    ['rack', 0, 3],
    ['hay', 0, 4],
    ['hay', -3, 4],
    // flowerbeds, bushes and trees along the walls and the grass edges
    ['roses', -3, -3],
    ['berries', 3, 0],
    ['bush', -3, 5, { dx: 4 }],
    ['flowers', 1, 5],
    ['oak', 2, 5],
    ['pine', 4, 4],
    ['bush', 5, 3],
    ['flowers', 5, 5],
    ['roses', 3, 4],
  ],
  flags: [
    [-4, -4, -96, 1],
    [6, -4, -96, -1],
    [-4, 6, -96, 1],
    [6, 6, -96, -1],
    [6, 1, -92, 1, 52],
    [6, 1, -98, -1, -52],
  ],
});

/** The village is the same on every screen (the scale does the fitting). */
export const layoutFor = (): Layout => YARD;

/** How big to draw the scene: the largest whole number `k` of device pixels per scene pixel that still shows all of it in a `boxW` x `boxH` frame
 *  (css pixels) on a screen with `dpr` device pixels per css pixel. On a phone (dpr about 2.7) that is 1 for the whole village; on a dpr-1 desktop it
 *  is a whole css scale. If even 1 does not fit the frame pans. `css` is the size of one scene pixel in css pixels. */
export function pickScale(boxW: number, boxH: number, dpr: number, sceneW: number, sceneH: number): { k: number; css: number } {
  let k = 1;
  for (let n = 2; n <= 12; n++) if ((sceneW * n) / dpr <= boxW && (sceneH * n) / dpr <= boxH) k = n;
  return { k, css: k / dpr };
}

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
