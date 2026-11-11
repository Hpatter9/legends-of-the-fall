// LIVING-FIELDS, step 2: what each land's floor is made of, tile by tile, as plain rules (pure: no Pixi, no DOM; `boardView.ts` paints from
// them and the tests read them). Looks only: nothing here changes a tile the battle reads, and nothing draws from a stream (the patches
// are a smooth noise of the board's seed, the path a walk of its own side stream).
//
// Every land takes its floor from one of the nine painted hold sheets (`src/art/assault/<hold>/ground.webp`, `edges.webp`, `faces.webp`:
// sixteen ground textures of 4 x 4 tiles each, the ragged edges where two grounds meet, and the cliff faces), the hold whose army fights
// on that land. A land's set is: its ground, a second ground laid in patches, its path, the top of its raised ground, the rock that shows
// through on a height, its shore, its water and its bridge's planks; and the faces under each kind of top.

import { DEPLOY_ROWS, DIRS, LAVA_LANDS, RAMP, canStep, standable, type Area, type Board, type Tile } from '../sim/board';
import { mixSeed, Rng } from '../sim/rng';
import { hash, noise } from './fieldLooks';

/** The painted hold sheets, by their folder under `src/art/assault/`. */
export const HOLDS = ['orc', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] as const;
export type Hold = (typeof HOLDS)[number];

/** The faces of a hold's `faces.webp`, six across and two down (`FACES` in each atlas: the same names in every hold). */
export const FACE_NAMES = ['cliff', 'earth', 'mudBank', 'rampart', 'palisade', 'stoneWall', 'stoneWallDamaged', 'tower', 'terrace', 'moundEarth', 'riverBank', 'basalt'] as const;
export type FaceName = (typeof FACE_NAMES)[number];

/** What a tile's top is made of: the land's set names a texture (a slot of the hold's 4 x 4 `ground.webp`) for each. */
export type Role = 'ground' | 'second' | 'path' | 'high' | 'outcrop' | 'shore' | 'water' | 'deep' | 'planks' | 'ice' | 'lava' | 'coals' | 'dais';
export const ROLES: readonly Role[] = ['ground', 'second', 'path', 'high', 'outcrop', 'shore', 'water', 'deep', 'planks', 'ice', 'lava', 'coals', 'dais'];

/** A role's rank: where two tops meet at one height, the higher bleeds a ragged edge over the lower, so no two grounds meet on a hard line. */
export const RANK: Record<Role, number> = { ground: 0, second: 1, shore: 2, path: 3, outcrop: 4, high: 5, dais: 6, coals: 7, planks: 8, ice: 9, water: 10, deep: 10, lava: 10 };

export interface FloorSet {
  hold: Hold;
  /** The land's ground, and its second ground (laid in patches over `share` of the plain tiles). */
  ground: number;
  second: number;
  share: number;
  /** The worn path across the middle ground. */
  path: number;
  /** The top of raised ground (three steps up or more). On a land of stone (`stone`) every raised tile takes it; elsewhere a raised tile
   *  keeps the land's own ground, and `outcrop` shows through in patches. */
  high: number;
  stone: boolean;
  outcrop: number;
  /** The ground beside water (mud, shingle, sand), or -1 for none: the bank's ragged edge is laid over the water either way. */
  shore: number;
  /** Shallow water, or -1 for the old shared water picture (toned by `waterTone`): the ashlands' sheet paints its water slot as lava. */
  water: number;
  /** Tones laid over shallow and deep water (CSS colours; none for the sheet's own). */
  waterTone?: string;
  deepTone: string;
  /** Lava and hot coals: slots of the sheet where it paints them (the ashlands), or -1 for the old shared lava picture. */
  lava: number;
  coals: number;
  /** A bridge's planks, and the paving under a shrine. */
  planks: number;
  dais: number;
  /** The faces: under a plain top, under a top three steps up or more, under stone, and under water. */
  faces: { low: FaceName; tall: FaceName; stone: FaceName; wet: FaceName };
  /** Whether the faces' top step is the sheet's painted lip (its grass or snow hanging over): off where the lip's growth is not the land's. */
  lip: boolean;
  /** A tone over every top (a CSS colour), for two lands that share a sheet. */
  tone?: string;
}

// The slots of a sheet, as the atlases name them (`GROUND`): 0 grass1, 1 grass2, 2 heath, 3 trampled, 4 mud1, 5 mud2, 6 wetMud, 7 scorched,
// 8 ash, 9 campDirt, 10 cobbles, 11 flagstones, 12 wallWalk, 13 planks, 14 shingle, 15 shallows. Each hold paints them in its own theme
// (the Howling Den's 8 to 11 are snow, the Labyrinth's 9 is sand, Brimstone Gate's 14 and 15 are lava), so the numbers below are picked by eye.
export const FLOORS: Record<Area, FloorSet> = {
  // (moor: grass, some of it in flower, a dirt track, heather on the heights)
  highlands: { hold: 'orc', ground: 0, second: 1, share: 0.35, path: 9, high: 0, stone: false, outcrop: 2, shore: 14, water: 15, waterTone: 'rgba(40,110,170,0.42)', deepTone: 'rgba(10,40,90,0.5)', lava: -1, coals: 8, planks: 13, dais: 11, faces: { low: 'earth', tall: 'cliff', stone: 'cliff', wet: 'riverBank' }, lip: true },
  // (the wood's floor: grass and ferns, leaf mould on the path, moss and roots on the rises)
  forest: { hold: 'wildwood', ground: 0, second: 2, share: 0.45, path: 5, high: 8, stone: false, outcrop: 7, shore: 14, water: 15, deepTone: 'rgba(6,30,30,0.5)', lava: -1, coals: 4, planks: 12, dais: 11, faces: { low: 'earth', tall: 'cliff', stone: 'cliff', wet: 'riverBank' }, lip: true },
  // (snow, trodden snow on the path, iced rock on the heights)
  snow: { hold: 'beasts', ground: 9, second: 8, share: 0.3, path: 10, high: 9, stone: false, outcrop: 11, shore: 10, water: 15, deepTone: 'rgba(10,40,80,0.45)', lava: -1, coals: 7, planks: 12, dais: 11, faces: { low: 'stoneWall', tall: 'stoneWall', stone: 'stoneWall', wet: 'stoneWall' }, lip: true },
  // (sand and cracked clay, a pebbled track, sandstone blocks on the heights)
  desert: { hold: 'labyrinth', ground: 9, second: 6, share: 0.25, path: 10, high: 9, stone: false, outcrop: 13, shore: 14, water: 15, deepTone: 'rgba(0,40,50,0.45)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'moundEarth', tall: 'moundEarth', stone: 'stoneWall', wet: 'riverBank' }, lip: false },
  // (ash and scorched shards, cracked ground on the heights, basalt; its water slot is lava)
  volcano: { hold: 'infernal', ground: 0, second: 2, share: 0.4, path: 3, high: 4, stone: false, outcrop: 10, shore: -1, water: -1, waterTone: 'rgba(30,14,10,0.6)', deepTone: 'rgba(30,6,0,0.25)', lava: 15, coals: 14, planks: 12, dais: 11, faces: { low: 'earth', tall: 'cliff', stone: 'cliff', wet: 'basalt' }, lip: false },
  // (the crypt: brick and mossed flags, cobbles for its path, dark flooded floor)
  dungeon: { hold: 'undead', ground: 12, second: 11, share: 0.4, path: 10, high: 12, stone: true, outcrop: 11, shore: -1, water: 15, deepTone: 'rgba(4,8,20,0.5)', lava: -1, coals: 8, planks: 13, dais: 11, faces: { low: 'stoneWall', tall: 'stoneWall', stone: 'stoneWall', wet: 'stoneWall' }, lip: false },
  // (meadow: grass in flower, a dirt track)
  plains: { hold: 'orc', ground: 1, second: 0, share: 0.45, path: 9, high: 1, stone: false, outcrop: 3, shore: 14, water: 15, waterTone: 'rgba(50,130,180,0.42)', deepTone: 'rgba(10,40,90,0.5)', lava: -1, coals: 8, planks: 13, dais: 11, faces: { low: 'earth', tall: 'earth', stone: 'cliff', wet: 'riverBank' }, lip: true, tone: 'rgba(170,220,90,0.14)' },
  // (the autumn wood: russet grass and bracken, leaf litter on the path)
  autumn: { hold: 'beasts', ground: 0, second: 2, share: 0.4, path: 13, high: 1, stone: false, outcrop: 14, shore: 14, water: 15, waterTone: 'rgba(60,70,60,0.3)', deepTone: 'rgba(10,30,50,0.5)', lava: -1, coals: 7, planks: 12, dais: 14, faces: { low: 'earth', tall: 'earth', stone: 'earth', wet: 'riverBank' }, lip: false, tone: 'rgba(235,140,40,0.16)' },
  // (the mire: glowing moss and sodden grass, mud for its path and its banks, lily water)
  swamp: { hold: 'wildwood', ground: 8, second: 10, share: 0.4, path: 4, high: 9, stone: false, outcrop: 7, shore: 6, water: 15, deepTone: 'rgba(4,20,10,0.5)', lava: -1, coals: 4, planks: 12, dais: 11, faces: { low: 'mudBank', tall: 'earth', stone: 'earth', wet: 'riverBank' }, lip: true },
  // (the graveyard: grey grass, packed earth, old flags on the rises)
  graveyard: { hold: 'undead', ground: 0, second: 1, share: 0.45, path: 9, high: 3, stone: false, outcrop: 11, shore: 14, water: 15, deepTone: 'rgba(4,8,20,0.5)', lava: -1, coals: 8, planks: 13, dais: 11, faces: { low: 'earth', tall: 'moundEarth', stone: 'stoneWall', wet: 'riverBank' }, lip: true },
  // (the fallen city: block paving and rubble, ash on the path, carved flags on its terraces)
  ruins: { hold: 'labyrinth', ground: 13, second: 10, share: 0.35, path: 8, high: 11, stone: true, outcrop: 11, shore: 14, water: 15, deepTone: 'rgba(0,40,50,0.45)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'stoneWall', tall: 'stoneWallDamaged', stone: 'stoneWallDamaged', wet: 'riverBank' }, lip: false },
  // (the temple in its scrub: green scrub and dry grass, a sand path, carved flags on its terraces)
  temple: { hold: 'labyrinth', ground: 2, second: 0, share: 0.3, path: 9, high: 11, stone: true, outcrop: 11, shore: 14, water: 15, deepTone: 'rgba(0,40,50,0.45)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'earth', tall: 'terrace', stone: 'terrace', wet: 'riverBank' }, lip: false },
  // (the caves: bare rock and cobbled rock under a violet light)
  crystal: { hold: 'golems', ground: 2, second: 10, share: 0.4, path: 14, high: 2, stone: true, outcrop: 8, shore: -1, water: 15, deepTone: 'rgba(10,6,40,0.5)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'cliff', tall: 'cliff', stone: 'cliff', wet: 'cliff' }, lip: false, tone: 'rgba(96,84,220,0.3)' },
  // (the forge: cobbles and iron-banded flags, iron plate for its path)
  forge: { hold: 'golems', ground: 10, second: 9, share: 0.3, path: 13, high: 11, stone: true, outcrop: 11, shore: -1, water: 15, deepTone: 'rgba(30,6,0,0.4)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'stoneWall', tall: 'stoneWall', stone: 'stoneWall', wet: 'stoneWall' }, lip: false },
  // (the shrine by night: blue grass strewn with petals, raked gravel for its path, mossed flags on its terraces, a red bridge)
  shrine: { hold: 'yokai', ground: 0, second: 1, share: 0.45, path: 9, high: 10, stone: true, outcrop: 11, shore: 14, water: 15, deepTone: 'rgba(4,6,30,0.45)', lava: -1, coals: 7, planks: 13, dais: 11, faces: { low: 'earth', tall: 'stoneWall', stone: 'stoneWall', wet: 'riverBank' }, lip: true },
  // (the war camp: trampled grass and churned mud, packed dirt for its path)
  warcamp: { hold: 'orc', ground: 3, second: 4, share: 0.35, path: 9, high: 3, stone: false, outcrop: 10, shore: 6, water: 15, deepTone: 'rgba(20,16,6,0.5)', lava: -1, coals: 8, planks: 13, dais: 11, faces: { low: 'earth', tall: 'rampart', stone: 'rampart', wet: 'mudBank' }, lip: true },
  // (the oasis: green round its water, sand beyond; `oasisRole` says which)
  oasis: { hold: 'labyrinth', ground: 9, second: 2, share: 0, path: 10, high: 9, stone: false, outcrop: 13, shore: 2, water: 15, deepTone: 'rgba(0,40,50,0.4)', lava: -1, coals: 8, planks: 12, dais: 11, faces: { low: 'moundEarth', tall: 'moundEarth', stone: 'stoneWall', wet: 'riverBank' }, lip: false },
};

/** From this height up a tile is raised ground. */
export const RAISED = 3;
/** How far (in tiles) an oasis's green reaches from its water. */
export const OASIS_GREEN = 1;
/** The share of a raised land's tiles (not a land of stone) where rock shows through. */
export const OUTCROP_SHARE = 0.22;

const wet = (t: Tile | undefined) => !!t && (t.ground === 'water' || t.ground === 'deep' || t.scene === 'water');

/** How many tiles a tile lies from the nearest water (the king's-move distance), up to `max` (and `max + 1` beyond). */
function waterNear(b: Board, u: number, v: number, max: number): number {
  for (let r = 0; r <= max; r++)
    for (let dv = -r; dv <= r; dv++)
      for (let du = -r; du <= r; du++) {
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r) continue;
        const x = u + du;
        const y = v + dv;
        if (x >= 0 && y >= 0 && x < b.w && y < b.d && wet(b.tiles[y * b.w + x])) return r;
      }
  return max + 1;
}

/** The worn path across a board's middle ground (looks only): the cheapest walk, for a fighter that climbs one level, from the middle of
 *  the heroes' edge to the middle of the foes', wandering a little by a side stream of the seed (`0xf100a`). The tiles' indices; empty on
 *  an army's road (it has its own track, `Tile.trail`) and on a board no such walk crosses. */
export function pathOf(b: Board): Set<number> {
  const out = new Set<number>();
  if (b.tiles.some((t) => t.scene || t.trail || t.paved)) return out;
  const rng = new Rng(mixSeed(b.seed, 0xf100a));
  const { w, d } = b;
  // (each tile's own extra cost, so the path wanders; ground that is not plain earth costs more, so it keeps to dry land)
  const extra = b.tiles.map((t) => rng.next() * 1.5 + (t.ground ? 3 : 0));
  const pick = (v: number): number => {
    const mid = Math.floor(w / 2) + rng.int(-1, 1);
    for (let k = 0; k < w; k++)
      for (const u of [mid + k, mid - k]) if (u >= 0 && u < w && standable(b.tiles[v * w + u])) return v * w + u;
    return -1;
  };
  const from = pick(d - 1);
  const to = pick(0);
  if (from < 0 || to < 0) return out;
  const cost = new Float64Array(w * d).fill(Infinity);
  const prev = new Int32Array(w * d).fill(-1);
  const done = new Uint8Array(w * d);
  cost[from] = 0;
  for (;;) {
    let i = -1;
    for (let k = 0; k < w * d; k++) if (!done[k] && cost[k] < Infinity && (i < 0 || cost[k] < cost[i])) i = k;
    if (i < 0 || i === to) break;
    done[i] = 1;
    for (const [du, dv] of DIRS) {
      const u = (i % w) + du;
      const v = Math.floor(i / w) + dv;
      if (u < 0 || v < 0 || u >= w || v >= d) continue;
      const j = v * w + u;
      const step = canStep(b.tiles[i], b.tiles[j], RAMP);
      if (step === null) continue;
      const c = cost[i] + step + extra[j];
      if (c < cost[j]) {
        cost[j] = c;
        prev[j] = i;
      }
    }
  }
  if (cost[to] === Infinity) return out;
  // (the path is the middle ground's: it fades out in the two sides' own rows, where the fighters stand)
  for (let i = to; i >= 0; i = prev[i]) {
    const v = Math.floor(i / w);
    if (v >= DEPLOY_ROWS - 1 && v <= d - DEPLOY_ROWS) out.add(i);
  }
  return out;
}

/** What every tile's top is made of (`ROLES`' index), for the land's set. `path` is the worn path's tiles (`pathOf(b)` when not given: a
 *  board drawn turned passes its own, walked before the turn). */
export function floorRoles(b: Board, path: ReadonlySet<number> = pathOf(b)): Uint8Array {
  const set = FLOORS[b.area];
  const { w, d } = b;
  const out = new Uint8Array(w * d);
  const salt = b.seed & 0xffff;
  const R = (r: Role) => ROLES.indexOf(r);
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const i = v * w + u;
      const t = b.tiles[i];
      const n = noise(u, v, 3.1, salt);
      let r: Role;
      if (t.ground === 'deep' || t.scene === 'water') r = LAVA_LANDS.includes(b.area) && t.ground === 'deep' ? 'lava' : 'deep';
      else if (t.scene === 'lava' || t.ground === 'lava') r = 'lava';
      else if (t.ground === 'water') r = 'water';
      else if (t.bridge) r = 'planks';
      else if (t.ground === 'ice') r = 'ice';
      else if (t.ground === 'coals') r = 'coals';
      else if (t.ground === 'shrine') r = 'dais';
      else if (t.paved) r = 'high';
      else if (t.trail || path.has(i)) r = 'path';
      else if (b.area === 'oasis') r = oasisRole(b, u, v, n);
      else if (set.shore >= 0 && !t.scene && waterNear(b, u, v, 1) <= 1 && nearWaterLevel(b, u, v)) r = 'shore';
      else if (t.ground === 'tall') r = 'second';
      else if (t.h >= RAISED && !t.scene) r = set.stone ? (n < set.share ? 'outcrop' : 'high') : noise(u, v, 2.3, salt + 9) < OUTCROP_SHARE ? 'outcrop' : n < set.share ? 'second' : 'high';
      else r = n < set.share ? 'second' : 'ground';
      out[i] = R(r);
    }
  return out;
}

/** Whether a tile next to water stands within a step of it (a bank, not a cliff over the water). */
function nearWaterLevel(b: Board, u: number, v: number): boolean {
  const h = b.tiles[v * b.w + u].h;
  for (let dv = -1; dv <= 1; dv++)
    for (let du = -1; du <= 1; du++) {
      const x = u + du;
      const y = v + dv;
      if (x < 0 || y < 0 || x >= b.w || y >= b.d) continue;
      const t = b.tiles[y * b.w + x];
      if (wet(t) && Math.abs(t.h - h) <= 1) return true;
    }
  return false;
}

/** An oasis is green round its water and sand beyond: scrub within `OASIS_GREEN` tiles of water, ragged a tile further out (by the
 *  noise), then sand, with a green hollow here and there. */
function oasisRole(b: Board, u: number, v: number, n: number): Role {
  const near = waterNear(b, u, v, OASIS_GREEN + 1);
  // (always green beside the water; ragged a tile further out, by the noise)
  if (near <= OASIS_GREEN || (near === OASIS_GREEN + 1 && n < 0.45)) return 'shore';
  if (near > OASIS_GREEN + 1 && n < 0.22) return 'shore';
  return b.tiles[v * b.w + u].h >= RAISED && noise(u, v, 2.3, 9) < OUTCROP_SHARE ? 'outcrop' : 'ground';
}

/** The slot of the land's sheet a role is painted from, or -1 for a picture that is not on the sheet (the shared water, lava or ice). */
export function slotOf(set: FloorSet, role: Role): number {
  switch (role) {
    case 'ground': return set.ground;
    case 'second': return set.second;
    case 'path': return set.path;
    case 'high': return set.high;
    case 'outcrop': return set.outcrop;
    case 'shore': return set.shore >= 0 ? set.shore : set.ground;
    case 'water':
    case 'deep': return set.water;
    case 'planks': return set.planks;
    case 'lava': return set.lava;
    case 'coals': return set.coals;
    case 'dais': return set.dais;
    case 'ice': return -1;
  }
}

/** One ragged edge laid on a tile: the neighbour's ground (its `role`) along the side `turn` quarter turns clockwise (0 faces the -v
 *  neighbour, then +u, +v, -u), or, with `corner`, in the corner between that side and the one before it. `foam` is the waterline. */
export interface Fringe {
  role: Role;
  turn: number;
  corner?: boolean;
  foam?: boolean;
}

const SIDES: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const CORNERS: readonly [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const isLiquid = (r: Role) => r === 'water' || r === 'deep';

/** The edges a tile takes from its neighbours: where a neighbour at its own height is of a higher-ranked ground, that ground's ragged edge
 *  lies over this tile's side (and a corner for a diagonal); water takes its bank's edge and a line of foam, facing the land. */
export function fringesOf(b: Board, roles: Uint8Array, u: number, v: number): Fringe[] {
  const { w, d } = b;
  const i = v * w + u;
  const me = ROLES[roles[i]];
  const h = b.tiles[i].h;
  const out: Fringe[] = [];
  const liquid = isLiquid(me);
  if (me === 'lava' || me === 'ice') return out;
  // (a neighbour at this tile's height; for water, the bank a step or two above it too, so every bank has its foam)
  const at = (du: number, dv: number): number => {
    const x = u + du;
    const y = v + dv;
    if (x < 0 || y < 0 || x >= w || y >= d) return -1;
    const j = y * w + x;
    const dh = b.tiles[j].h - h;
    return dh === 0 || (liquid && dh > 0 && dh <= 2) ? j : -1;
  };
  const over = new Set<number>();
  SIDES.forEach(([du, dv], turn) => {
    const j = at(du, dv);
    if (j < 0) return;
    const n = ROLES[roles[j]];
    if (liquid) {
      if (!isLiquid(n) && n !== 'lava' && n !== 'planks' && n !== 'ice') {
        out.push({ role: n, turn }, { role: 'water', turn, foam: true });
        over.add(turn);
      }
      return;
    }
    if (isLiquid(n) || n === 'lava' || n === 'ice' || n === 'planks' || n === 'coals') return;
    if (RANK[n] > RANK[me]) {
      out.push({ role: n, turn });
      over.add(turn);
    } else if (RANK[n] < RANK[me] && (me === 'path' || me === 'shore') && hash(u, v, 7 + turn) < 0.4) {
      // (the land's own growth creeping back over a path or a bank, so neither is a perfect ribbon)
      out.push({ role: n, turn });
      over.add(turn);
    }
  });
  CORNERS.forEach(([du, dv], turn) => {
    // (a corner only where neither side next to it already took an edge)
    if (over.has(turn) || over.has((turn + 3) % 4)) return;
    const j = at(du, dv);
    if (j < 0) return;
    const n = ROLES[roles[j]];
    if (liquid) {
      if (!isLiquid(n) && n !== 'lava' && n !== 'planks' && n !== 'ice') out.push({ role: n, turn, corner: true }, { role: 'water', turn, corner: true, foam: true });
    } else if (!isLiquid(n) && n !== 'lava' && n !== 'ice' && n !== 'planks' && n !== 'coals' && RANK[n] > RANK[me]) out.push({ role: n, turn, corner: true });
  });
  return out;
}

/** The face under a tile's top, by what the top is made of and how high it stands. */
export function faceOf(set: FloorSet, role: Role, h: number): FaceName {
  if (role === 'water' || role === 'deep' || role === 'lava' || role === 'ice') return set.faces.wet;
  if (role === 'high' && set.stone) return set.faces.stone;
  if (role === 'outcrop' || role === 'dais' || role === 'planks') return set.faces.stone;
  return h >= RAISED ? set.faces.tall : set.faces.low;
}

/** Which sides of a tile show a line: only where the neighbour stands at another height, or is of another kind of ground the rules
 *  care about (water, ice, lava, tall growth, a shrine, a bridge). Two tiles of one ground at one height show none, so a field is a
 *  field. Four flags, in the order of `SIDES` (-v, +u, +v, -u); the board's own edge counts as a change. */
export function seamsOf(b: Board, u: number, v: number): boolean[] {
  const t = b.tiles[v * b.w + u];
  const kind = (x: Tile) => (x.bridge ? 'bridge' : x.ground ?? '');
  return SIDES.map(([du, dv]) => {
    const x = u + du;
    const y = v + dv;
    if (x < 0 || y < 0 || x >= b.w || y >= b.d) return true;
    const n = b.tiles[y * b.w + x];
    return n.h !== t.h || kind(n) !== kind(t) || !!n.scene !== !!t.scene;
  });
}
