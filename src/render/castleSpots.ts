// The castle courtyard's floor plan: each upgrade's four looks (pictures from Chronos's isometric building kits, put together from parts), where
// every building stands in the two arrangements of the yard, what smokes, glints or glows, the road, the wall and
// the heroes' strolling band, and the words of the upgrade cards. Plain data (no Pixi, no DOM), so a test can check it. All numbers are in the scene's
// own pixels (the art's own pixels: the scene is drawn whole-number times bigger); `y` is a building's foot line, which the scene sorts by.

import { buildLand, type Land } from './castleLand';
import { BUILDING_IDS, BUILDINGS, GOLD_PER_LEVEL, HP_PER_LEVEL, ATK_PER_LEVEL, MANA_PER_LEVEL, MOVE_PER_LEVEL, XP_PER_LEVEL, maxLevel, newCastle, spellBudget, type BuildingId } from '../sim/castle';

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
  atelier: [93, 105],
  banner: [25, 79],
  barracks: [138, 129],
  barrels: [33, 44],
  baskets: [41, 59],
  bench: [41, 36],
  berries: [60, 73],
  birch: [55, 135],
  brazier: [36, 90],
  bush: [38, 37],
  campfire: [66, 46],
  cart: [82, 60],
  chapel: [101, 162],
  chests: [70, 54],
  church: [99, 158],
  cobble_tile: [90, 60],
  cottage: [103, 101],
  crates: [43, 52],
  crystals: [41, 60],
  field: [97, 65],
  field2: [106, 63],
  flagstone: [94, 61],
  flowers: [41, 32],
  forge: [114, 139],
  fountain: [108, 94],
  granary: [72, 99],
  grass_tile: [89, 59],
  great: [136, 153],
  great_hall: [146, 147],
  hay: [48, 51],
  hedge: [112, 95],
  herb: [94, 59],
  lamp: [26, 81],
  longhouse: [119, 112],
  manor: [121, 142],
  oak: [64, 90],
  pine: [41, 88],
  pots: [45, 53],
  rack: [86, 84],
  rocks: [36, 38],
  roses: [38, 51],
  shed: [82, 76],
  shrine: [77, 86],
  sign: [34, 64],
  signpost: [37, 74],
  spiral: [68, 128],
  stable: [176, 135],
  stall: [69, 75],
  stall2: [100, 80],
  stall3: [106, 83],
  stockpile: [87, 89],
  tavern: [119, 125],
  thatch: [129, 118],
  wall: [93, 121],
  watchtower: [79, 134],
  well: [50, 81],
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
    { parts: [P('thatch', -4), P('campfire', 40, 22)] },
    { parts: [P('barracks', -4)] },
  ],
  armoury: [
    { parts: [P('rocks', -26, 2), P('crates', 8), P('woodpile', 44, 4)] },
    { parts: [P('anvil_stall', -6), P('crates', 46, 10)] },
    { parts: [P('workshop', 4), P('crates', 58, 12)] },
    { parts: [P('forge', 0), P('crates', 44, 12)] },
  ],
  mageTower: [
    { parts: [P('rocks', -20, 2), P('crystals', 16)] },
    { parts: [P('shrine', 0)] },
    { parts: [P('spiral', 18), P('shrine', -34, 8)] },
    { parts: [P('spiral', 28, -6), P('chapel', -10, 6)] },
  ],
  stable: [
    { parts: [P('hay', -16, 2), P('woodpile', 22, 4)] },
    { parts: [P('cart', 0, 6), P('hay', -50, 8)] },
    { parts: [P('shed', -10), P('cart', 58, 14)] },
    { parts: [P('stable', 0)] },
  ],
  library: [
    { parts: [P('baskets', -14, 4), P('crates', 22, 6)] },
    { parts: [P('granary', 0), P('baskets', -46, 10)] },
    { parts: [P('atelier', 0), P('baskets', -58, 10)] },
    { parts: [P('manor', 0)] },
  ],
};

/** The places that are not upgrades: tapping the tavern goes to the Heroes tab (the tavern scene), the chapel to the Spells tab, the signpost down the road to the Armies screen. */
export type PlaceId = 'tavern' | 'chapel' | 'armies';
export const PLACE_IDS: PlaceId[] = ['tavern', 'chapel', 'armies'];
/** Anything with a plot in the yard: the six upgrades and the two places. */
export type PlotId = BuildingId | PlaceId;
export const PLOT_IDS: PlotId[] = [...BUILDING_IDS, ...PLACE_IDS];
/** What a place is called on its tag, and what it leads to. */
export const PLACES: Record<PlaceId, { name: string; to: string }> = {
  tavern: { name: 'Tavern', to: 'your heroes' },
  chapel: { name: 'Chapel', to: 'spells' },
  armies: { name: 'Armies', to: 'to battle' },
};
/** A place's one look (it does not grow): the tavern with its sign, barrels and lantern; the chapel on its own. */
export const PLACE_LOOK: Record<PlaceId, Look> = {
  tavern: { parts: [P('tavern', 0), P('lamp', -58, 8), P('barrels', 52, 22), P('signpost', 84, 14)] },
  chapel: { parts: [P('church', 3)] },
  armies: { parts: [P('sign', 0)] },
};
/** The Chapel's plot until it is bought: a few rocks and a woodpile where the walls will rise (kit pieces; the owner's call, 200 crowns). */
export const CHAPEL_SITE: Look = { parts: [P('rocks', -16, 2), P('woodpile', 18, 4)] };
export const isPlaceId = (id: PlotId): id is PlaceId => (PLACE_IDS as string[]).includes(id);
/** The look of a plot: a building's at a stage, or a place's own. */
export const lookFor = (id: PlotId, stage: number): Look => (id === 'chapel' && stage === 0 ? CHAPEL_SITE : isPlaceId(id) ? PLACE_LOOK[id] : LOOKS[id][stage]);

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
  barracks: [[{ dx: 0, dy: -30, kind: 'smoke' }], [smokeAt('barracks', 1, 0, 0.7, 0.04)], [{ dx: 40, dy: -20, kind: 'smoke' }], [smokeAt('barracks', 3, 0, 0.5, 0.02)]],
  armoury: [
    [],
    [{ dx: -14, dy: -28, kind: 'spark' }],
    [{ dx: 2, dy: -26, kind: 'spark' }, smokeAt('armoury', 2, 0, 0.5, 0.04)],
    [{ dx: -4, dy: -30, kind: 'spark' }, smokeAt('armoury', 3, 0, 0.62, 0.02)],
  ],
  stable: [[], [], [{ dx: -10, dy: -60, kind: 'smoke' }], [{ dx: 30, dy: -120, kind: 'smoke' }]],
  library: [[], [{ dx: 0, dy: -100, kind: 'smoke' }], [{ dx: 0, dy: -60, kind: 'rune' }, { dx: -20, dy: -80, kind: 'rune' }], [{ dx: 0, dy: -110, kind: 'rune' }, { dx: 30, dy: -80, kind: 'rune' }, { dx: -30, dy: -60, kind: 'rune' }]],
  mageTower: [[], [{ dx: 0, dy: -40, kind: 'rune' }], [{ dx: 18, dy: -80, kind: 'rune' }, { dx: -34, dy: -44, kind: 'rune' }], [{ dx: -10, dy: -100, kind: 'rune' }, { dx: 28, dy: -96, kind: 'rune' }]],
};

export const LIGHTS: Record<BuildingId, readonly (readonly Light[])[]> = {
  stable: [[], [], [], []],
  library: [[], [], [{ dx: 0, dy: -70, size: 40, tint: '#b890ff', al: 0.5 }], [{ dx: 0, dy: -80, size: 56, tint: '#58f0d0', al: 0.5 }]],
  treasury: [[], [], [{ dx: 0, dy: -40, size: 56, tint: '#ffd24a', al: 0.18 }], [{ dx: 0, dy: -50, size: 80, tint: '#ffd24a', al: 0.25 }]],
  barracks: [[{ dx: 0, dy: -12, size: 40, tint: '#ff9a3c', al: 0.5 }], [], [{ dx: 40, dy: -12, size: 34, tint: '#ff9a3c', al: 0.45 }], []],
  armoury: [[], [{ dx: -14, dy: -26, size: 30, tint: '#ff9a3c', al: 0.5 }], [{ dx: 2, dy: -30, size: 40, tint: '#ff9a3c', al: 0.5 }], [{ dx: 4, dy: -36, size: 52, tint: '#ff9a3c', al: 0.55 }]],
  mageTower: [[], [{ dx: 0, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: 18, dy: -104, size: 40, tint: '#b890ff', al: 0.6 }, { dx: -34, dy: -50, size: 44, tint: '#58d8ff', al: 0.6 }], [{ dx: -10, dy: -104, size: 56, tint: '#58f0d0', al: 0.55 }, { dx: 28, dy: -96, size: 36, tint: '#b890ff', al: 0.5 }]],
};

/** What smokes at a place: the tavern's chimney. */
export const PLACE_VENTS: Record<PlaceId, readonly Vent[]> = { tavern: [{ dx: 22, dy: -118, kind: 'smoke' }], chapel: [], armies: [] };

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
  /** How far the tag sits across from the building's middle (to keep neighbours' tags apart). */
  tagDx?: number;
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
  /** Draw only the columns `[from, to)` of the picture as seen (the last piece of a wall run, cut where the tower covers it). */
  cut?: readonly [number, number];
}

/** One arrangement of the yard. */
export interface Layout {
  /** The scene's size. */
  w: number;
  h: number;
  /** How far down the town reaches (the lane runs on below it, to `h`): the page scrolls to it when the frame is shorter. */
  contentH: number;
  grid: Grid;
  /** The road that leaves the village's front, and the Armies signpost beside it. */
  land: Land;
  /** The tiles of the wall's four corner towers (the ring runs between them). */
  yard: Block;
  plots: Record<PlotId, Plot>;
  props: readonly Prop[];
  /** The plaza and the roads, as blocks of tiles. */
  plaza: Block;
  roads: readonly Block[];
  /** Pennant poles: foot of the pole and which way the cloth blows. */
  flags: readonly { x: number; y: number; dir: 1 | -1 }[];
}

export const inBlock = (b: Block, u: number, v: number): boolean => u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1;
/** Whether a tile is paved (the plaza or a road). */
const pavedSets = new WeakMap<Layout, Set<string>>();
export const isPaved = (lay: Layout, u: number, v: number): boolean => {
  let set = pavedSets.get(lay);
  if (!set) {
    set = new Set();
    for (const b of [lay.plaza, ...lay.roads]) for (let a = b.u0; a <= b.u1; a++) for (let c = b.v0; c <= b.v1; c++) set.add(`${a},${c}`);
    pavedSets.set(lay, set);
  }
  return set.has(`${u},${v}`);
};
/** Standing things a hero walks round on the paving. */
const NOT_WALKED = new Set(['fountain', 'bench', 'brazier', 'stall', 'stall2', 'stall3', 'lamp', 'banner', 'well', 'pots', 'crates', 'barrels']);
/** The tiles a hero may stroll on: the paving, but not where something stands. */
export function walkTiles(lay: Layout): { u: number; v: number }[] {
  const blocked = new Set(lay.props.filter((p) => NOT_WALKED.has(p.sprite)).map((p) => `${p.u},${p.v}`));
  const out: { u: number; v: number }[] = [];
  const seen = new Set<string>();
  for (const b of [lay.plaza, ...lay.roads])
    for (let u = b.u0; u <= b.u1; u++)
      for (let v = b.v0; v <= b.v1; v++) {
        const k = `${u},${v}`;
        if (blocked.has(k) || seen.has(k)) continue;
        seen.add(k);
        out.push({ u, v });
      }
  return out;
}
/** The picture a paved tile is laid with: the square in flagstones and cobbles, the roads in cobbles; null when the tile is not paved. */
export function pavingAt(lay: Layout, u: number, v: number): 'flagstone' | 'cobble_tile' | null {
  if (!isPaved(lay, u, v)) return null;
  if (!inBlock(lay.plaza, u, v)) return 'cobble_tile';
  // (the square: a border of flagstones all round it, and inside a chequer of flagstones and cobbles)
  const edge = u === lay.plaza.u0 || u === lay.plaza.u1 || v === lay.plaza.v0 || v === lay.plaza.v1;
  return edge || (u + v) % 2 === 0 ? 'flagstone' : 'cobble_tile';
}

/** The tiles under a plot. */
export const footprint = (p: Plot): { u: number; v: number }[] => {
  const out: { u: number; v: number }[] = [];
  for (let i = 0; i < p.w; i++) for (let j = 0; j < p.d; j++) out.push({ u: p.u + i, v: p.v + j });
  return out;
};

type PlotSpec = { u: number; v: number; w: number; d: number; flip: boolean; door: { u: number; v: number }; tag?: 'below'; tagDx?: number; tagDy?: number; tagAt?: readonly [number, number] };
interface Spec {
  w: number;
  h: number;
  grid: Grid;
  land: Land;
  yard: Block;
  plots: Record<PlotId, PlotSpec>;
  /** [sprite, u, v, options]: `u`, `v` may be halves for a wall piece that spans two tiles. */
  props: readonly (readonly [string, number, number, { flip?: boolean; depth?: number; dx?: number; dy?: number; cut?: readonly [number, number] }?])[];
  plaza: Block;
  roads: readonly Block[];
  /** [u, v, up from the tile's foot, which way the cloth blows, across from the tile's middle] */
  flags: readonly (readonly [number, number, number, 1 | -1, number?])[];
}

function build(spec: Spec): Layout {
  const g = spec.grid;
  const plots = {} as Record<PlotId, Plot>;
  for (const id of PLOT_IDS) {
    const q = spec.plots[id];
    const cu = q.u + (q.w - 1) / 2;
    const cv = q.v + (q.d - 1) / 2;
    const x = Math.round(cellX(g, cu, cv));
    const y = Math.round(cellY(g, cu, cv) + PLOT_FOOT);
    const box = lookBox(lookFor(id, STAGES - 1), q.flip);
    plots[id] = { u: q.u, v: q.v, w: q.w, d: q.d, flip: q.flip, door: q.door, x, y, tagY: q.tagAt ? q.tagAt[1] : (q.tag === 'below' ? y + 46 : y - box.h - 4) + (q.tagDy ?? 0), tagDx: q.tagAt ? q.tagAt[0] - (x + (box.x0 + box.x1) / 2) : q.tagDx };
  }
  const props: Prop[] = spec.props.map(([sprite, u, v, o]) => ({
    sprite,
    u,
    v,
    x: Math.round(cellX(g, u, v) + (o?.dx ?? 0)),
    y: Math.round(cellY(g, u, v) + TILE_H / 2 + (o?.dy ?? 0)),
    flip: o?.flip,
    depth: o?.depth,
    cut: o?.cut,
  }));
  return { w: spec.w, h: spec.h, contentH: Math.max(...PLOT_IDS.map((id) => plots[id].y)) + 40, land: spec.land, grid: g, yard: spec.yard, plots, props, plaza: spec.plaza, roads: spec.roads, flags: spec.flags.map(([u, v, dy, dir, dx]) => ({ x: Math.round(cellX(g, u, v) + (dx ?? 0)), y: Math.round(cellY(g, u, v) + dy), dir })) };
}

const BEHIND = -1000;

type PropSpec = Spec['props'][number];

/** One wall cell butts the next at this offset along a run (a run's top and foot lines are exactly straight, at the lattice's slope of 26 down for
 *  45 across); `WALL_RISE` is how much higher a cell's far end stands than its near one (its lowest point is the near end of the foot). */
export const WALL_STEP = { dx: 93, dy: 54 };
export const WALL_RISE = 53;
/** How far above a tower's foot line a run's foot meets it (the tower's base is about a dozen pixels deep). */
const WALL_JOIN = 12;

/** The back wall: the north-west and north-east sides only, meeting at the tower on the north corner `(u0, v0)`, each a straight run of identical wall
 *  cells laid exactly `WALL_STEP` apart from that tower to the tower at its far end, `(u1, v0)` and `(u0, v1)` (the last cell is cut where the tower
 *  covers it). The runs start and end under the towers' bases, so every joint is covered by a tower, and the gatehouse, drawn over the north-east run, takes the
 *  place of nothing: the wall goes on behind it. The front of the village is open. Both runs are behind the yard, so they are drawn behind everything. */
function ring(u0: number, v0: number, u1: number, v1: number): PropSpec[] {
  const out: PropSpec[] = [];
  const W = SPRITE_SIZE.wall[0];
  const run = (lengthTiles: number, side: 'nw' | 'ne'): void => {
    const length = lengthTiles * (TILE_W / 2);
    const n = Math.ceil(length / WALL_STEP.dx);
    for (let i = 0; i < n; i++) {
      const rem = length - i * WALL_STEP.dx;
      // (the north-west run goes down-left from the corner tower, its cell's high end nearer the tower; the north-east one goes down-right, mirrored)
      const dx = side === 'nw' ? -i * WALL_STEP.dx - (W - 1) / 2 : i * WALL_STEP.dx + (W - 1) / 2;
      const cut = rem >= W ? undefined : side === 'nw' ? ([W - rem, W] as const) : ([0, rem] as const);
      out.push(['wall', u0, v0, { dx, dy: WALL_RISE - WALL_JOIN + i * WALL_STEP.dy, flip: side === 'ne', depth: BEHIND, cut }]);
    }
  };
  run(v1 - v0, 'nw');
  run(u1 - u0, 'ne');
  out.push(['watchtower', u0, v0, { depth: BEHIND + 2 }]);
  out.push(['watchtower', u1, v0, { depth: BEHIND + 2 }]);
  out.push(['watchtower', u0, v1]);
  return out;
}

/** The town, for every screen: a yard walled on its two back sides (north-west and north-east, plain wall with a tower at the north corner and one at each run's far
 *  end), a town square of 5 x 5 tiles with the fountain in the middle and the eight buildings round it (`PLOTS`), gardens and scenery between them, and a lane
 *  that leaves the front. The scene is drawn a whole number of device pixels per scene pixel (`pickScale`); the front is open grass. */
/** The lawn below the town: tiles from this row of the lattice (`u + v`) down are scattered with scenery whether or not they are inside the wall's box. */
export const FRONT_ROW = 27;
/** A fixed pseudo-random number in [0, 1) for a tile and a salt. */
function rnd(u: number, v: number, salt: number): number {
  let h = (Math.imul(u + 1000, 73856093) ^ Math.imul(v + 1000, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const VILLAGE_YARD: Block = { u0: -1, v0: -1, u1: 15, v1: 15 };
const LAND = buildLand();
/** The town square: 5 x 5 tiles of paving (about three times the old plaza) with a flagstone border. */
const SQUARE: Block = { u0: 2, v0: 2, u1: 6, v1: 6 };
const ROADS: Block[] = [
  // short paths from the square's edge: out to the north-west and north-east (to the gardens), and down to the south ring road
  { u0: 0, v0: 4, u1: 1, v1: 4 },
  { u0: 4, v0: 0, u1: 4, v1: 1 },
  { u0: 2, v0: 1, u1: 3, v1: 1 },
  { u0: 4, v0: 7, u1: 4, v1: 10 },
  { u0: 7, v0: 4, u1: 10, v1: 4 },
  // the ring road behind the south side's buildings (their doors look away from the square), and the lane that leaves the town at the bottom
  { u0: 4, v0: 10, u1: 10, v1: 10 },
  { u0: 10, v0: 4, u1: 10, v1: 10 },
  // the side paths to the two buildings down the lane
  { u0: 8, v0: 11, u1: 10, v1: 11 },
  { u0: 11, v0: 9, u1: 11, v1: 9 },
  ...LAND.road,
];
/** The eight buildings round the square: two on each of the north-west and north-east sides facing it (backed by the wall), two on the south sides (their doors on
 *  the ring road behind them), and two down the lane. */
const PLOTS: Record<PlotId, PlotSpec> = {
  mageTower: { u: 1, v: 2, w: 1, d: 1, flip: true, door: { u: 2, v: 2 } },
  barracks: { u: 1, v: 5, w: 1, d: 1, flip: true, door: { u: 2, v: 5 } },
  treasury: { u: 1, v: 0, w: 2, d: 1, flip: false, door: { u: 2, v: 1 } },
  armoury: { u: 5, v: 1, w: 1, d: 1, flip: false, door: { u: 5, v: 2 } },
  stable: { u: 7, v: 9, w: 2, d: 1, flip: false, door: { u: 7, v: 10 } },
  tavern: { u: 9, v: 6, w: 1, d: 1, flip: true, door: { u: 10, v: 6 } },
  chapel: { u: 7, v: 11, w: 1, d: 1, flip: true, door: { u: 8, v: 11 } },
  library: { u: 11, v: 8, w: 2, d: 1, flip: false, door: { u: 11, v: 9 } },
  armies: { u: LAND.sign.u, v: LAND.sign.v, w: 1, d: 1, flip: false, door: LAND.sign.door, tagDx: -100, tagDy: 62 },
};

/** Scenery between the buildings, picked tile by tile from a fixed hash (never on the square, a road, a plot, within a tile of one of those, or on a tile with
 *  a prop of its own): hedges of bushes and flowers, hay, rocks and, where there is room, trees. */
function scatter(taken: ReadonlySet<string>): PropSpec[] {
  const y = VILLAGE_YARD;
  const paved = new Set<string>();
  for (const b of [SQUARE, ...ROADS]) for (let u = b.u0; u <= b.u1; u++) for (let v = b.v0; v <= b.v1; v++) paved.add(`${u},${v}`);
  const solid = new Set<string>(paved);
  for (const id of PLOT_IDS) for (let i = 0; i < PLOTS[id].w; i++) for (let j = 0; j < PLOTS[id].d; j++) solid.add(`${PLOTS[id].u + i},${PLOTS[id].v + j}`);
  const near = (u: number, v: number, r: number): boolean => {
    for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) if (solid.has(`${u + du},${v + dv}`)) return true;
    return false;
  };
  const out: PropSpec[] = [];
  for (let u = y.u0 + 1; u < y.u1; u++)
    for (let v = y.v0 + 1; v < y.v1; v++) {
      if (u + v >= FRONT_ROW || taken.has(`${u},${v}`) || near(u, v, 1)) continue;
      const r = rnd(u, v, 21);
      if (r >= 0.16) continue;
      const k = rnd(u, v, 22);
      const roomy = !near(u, v, 2);
      const sprite = roomy && k < 0.45 ? (k < 0.2 ? 'oak' : k < 0.34 ? 'pine' : 'birch') : k < 0.6 ? 'bush' : k < 0.8 ? 'flowers' : k < 0.9 ? 'rocks' : 'hay';
      out.push([sprite, u, v, { flip: rnd(u, v, 23) < 0.5 }]);
    }
  return out;
}

/** What stands in and round the square and in the gardens (by tile). */
const FIXTURES: PropSpec[] = [
  // the square: the fountain in the middle with a walk all round it, braziers on three corners, lamp posts beside it, benches on the two north sides facing
  // the fountain, market stalls along the two south sides
  ['fountain', 4, 4, { dy: -4 }],
  ['bench', 3, 2],
  ['bench', 2, 3, { flip: true }],
  ['brazier', 6, 2],
  ['brazier', 2, 6],
  ['brazier', 6, 6],
  ['lamp', 1, 6],
  ['lamp', 7, 7],
  ['lamp', 6, 1],
  ['stall', 3, 6],
  ['stall2', 5, 6],
  ['stall3', 6, 3],
  ['stall', 6, 5, { flip: true }],
  // barrels and crates by the stalls, banners and pots round the edge
  ['barrels', 3, 7],
  ['crates', 7, 3],
  ['barrels', 7, 2],
  ['banner', 6, 9],
  ['banner', 9, 5],
  ['pots', 2, 7],
  ['pots', 8, 3],
  // the garden in the north corner, between the walls and the two buildings nearest them
  ['field', 0, 0],
  ['field2', 0, 1],
  ['herb', 1, 1],
  ['hedge', 0, 8],
  ['hedge', 8, 0, { flip: true }],
  ['roses', 0, 2],
  ['hay', 3, 9],
  ['well', 3, 8],
  ['rack', 5, 8],
  ['berries', 9, 8],
  // lanterns along the ring road and the lane
  ['lamp', 3, 10],
  ['lamp', 10, 3],
  ['lamp', 12, 9],
  ['lamp', 9, 12],
];
const taken = new Set<string>(FIXTURES.map(([, u, v]) => `${u},${v}`));
export const YARD: Layout = build({
  w: 1600,
  h: 1300,
  grid: { x: 800, y: 340 },
  land: LAND,
  yard: VILLAGE_YARD,
  plaza: SQUARE,
  roads: ROADS,
  plots: PLOTS,
  props: [...ring(-1, -1, 15, 15), ...FIXTURES, ...scatter(taken)],
  flags: [
    [-1, -1, -96, 1],
    [15, -1, -96, -1],
    [-1, 15, -96, 1],
  ],
});

/** The village is the same on every screen (the scale does the fitting). */
export const layoutFor = (): Layout => YARD;

/** The outer edges of the wall from side to side (the left and right towers' outer edges) and the top of the back corner tower, in scene pixels. */
export function wallBounds(lay: Layout): { x0: number; x1: number; top: number } {
  const towers = lay.props.filter((p) => p.sprite === 'watchtower');
  const [tw, th] = SPRITE_SIZE.watchtower;
  return { x0: Math.min(...towers.map((p) => p.x - tw / 2)), x1: Math.max(...towers.map((p) => p.x + tw / 2)), top: Math.min(...towers.map((p) => p.y - th)) };
}

/** How many scene pixels across the frame shows, about: the village is a close-up, the wall running off both edges of the screen. */
export const VIEW_W = 560;

/** The one scale the village is drawn at: the whole number `k` of device pixels per scene pixel (at least 1) that shows about `VIEW_W` scene pixels across a
 *  frame `boxW` css pixels wide on a screen with `dpr` device pixels per css pixel, so it stays sharp at any pixel ratio: 2 on a phone standing (393 css wide at
 *  a ratio of 2.75 to 3), the whole css scale of about the same look on a screen with a ratio of 1. `css` is the size of a scene pixel in css pixels. */
export function pickScale(boxW: number, dpr: number): { k: number; css: number } {
  const k = Math.max(1, Math.round((boxW * dpr) / VIEW_W));
  return { k, css: k / dpr };
}

/** Css pixels between the top of the frame (under the chips bar) and the back corner tower (treetops show above the wall in this gap). */
export const TOP_GAP = 26;

/** Where the scene sits in a frame `boxW` x `boxH` css pixels on a screen with `dpr` device pixels per css pixel: the scale (`pickScale`), the canvas in scene pixels
 *  (`w`, `h`: the frame, or taller when the town does not fit it, when the page scrolls up and down from the top, never sideways) and where the scene's origin lies in it
 *  (`ox`: the town square's column, which is the back corner tower's, in the middle; `oy`: the tower `TOP_GAP` under the top). A scene point `(x, y)` is at
 *  `((ox + x) * css, (oy + y) * css)` css pixels in the canvas. */
export function viewFor(lay: Layout, boxW: number, boxH: number, dpr: number): { k: number; css: number; w: number; h: number; ox: number; oy: number; frameH: number } {
  const { k, css } = pickScale(boxW, dpr);
  const w = Math.ceil(boxW / css);
  const oy = Math.round(TOP_GAP / css) - Math.round(wallBounds(lay).top);
  const frameH = Math.ceil(boxH / css);
  return { k, css, w, h: Math.max(frameH, oy + lay.contentH), ox: Math.round(w / 2 - lay.grid.x), oy, frameH };
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
    case 'stable':
      return `heroes walk ${Math.round(MOVE_PER_LEVEL * level * 100)}% faster`;
    case 'library':
      return `heroes earn ${Math.round(XP_PER_LEVEL * level * 100)}% more XP from every fight`;
    case 'mageTower':
      return `mana fills ${Math.round(MANA_PER_LEVEL * level * 100)}% faster, +${spellBudget({ ...newCastle(), mageTower: level }) - spellBudget()} spell power`;
  }
}

export const BLURB: Record<BuildingId, string> = {
  treasury: 'Gold in the vault: every run starts richer. Nobody tell the goat where the key is.',
  barracks: 'Beds and a training yard: your heroes are tougher. The beds are, reportedly, a bit short.',
  armoury: 'Smiths and weapon racks: your heroes hit harder. The smiths ask that you stop returning them bent.',
  mageTower: 'The king\'s own spires: mana comes quicker and spells hit harder. Mind the pigeons.',
  stable: 'Horses and a farrier: your heroes cover the ground quicker. The horses have opinions on pay.',
  library: 'Shelves of old campaigns: every hero learns more from every fight. Duchess has eaten the index.',
};

export const NAME_OF = (id: BuildingId): string => BUILDINGS[id].name;
export { BUILDING_IDS };

const takenSets = new WeakMap<Layout, Set<string>>();

/** The scenery on a ground tile outside the village (beyond the wall: woods that peek over it; in front: bushes, flowers and trees by the lawn's edge), picked by
 *  a fixed hash of the tile; null on paving, a plot, a village prop, inside the wall, or within a tile of the road. */
export function decorAt(lay: Layout, u: number, v: number): { sprite: string; mirror: boolean } | null {
  let taken = takenSets.get(lay);
  if (!taken) {
    taken = new Set();
    for (const id of PLOT_IDS) for (const t of footprint(lay.plots[id])) taken.add(`${t.u},${t.v}`);
    for (const p of lay.props) taken.add(`${p.u},${p.v}`);
    takenSets.set(lay, taken);
  }
  const { yard } = lay;
  if (taken.has(`${u},${v}`) || isPaved(lay, u, v)) return null;
  for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) if (isPaved(lay, u + du, v + dv)) return null;
  const behind = u < yard.u0 || v < yard.v0;
  const front = !behind && (u > yard.u1 || v > yard.v1 || u + v >= FRONT_ROW);
  if (!behind && !front) return null;
  const r = rnd(u, v, 1);
  const k = rnd(u, v, 2);
  const mirror = rnd(u, v, 3) < 0.5;
  if (behind) {
    // (woods right behind the wall, so their crowns show over it; the great oaks stand a little way back)
    const back = Math.max(yard.u0 - u, yard.v0 - v);
    if (r >= 0.5) return null;
    const sprite = back >= 3 && k < 0.15 ? 'great' : k < 0.4 ? 'oak' : k < 0.7 ? 'pine' : k < 0.88 ? 'birch' : 'bush';
    return { sprite, mirror };
  }
  // (in front: low things near the road and the village, trees further out)
  const out = Math.max(u - yard.u1, v - yard.v1, (u + v - FRONT_ROW) / 2, 0);
  if (r >= 0.1 + Math.min(0.25, out * 0.03)) return null;
  const sprite = out > 2 && k < 0.45 ? (k < 0.22 ? 'oak' : 'pine') : k < 0.5 ? 'bush' : k < 0.75 ? 'flowers' : k < 0.88 ? 'rocks' : 'hay';
  return { sprite, mirror };
}
