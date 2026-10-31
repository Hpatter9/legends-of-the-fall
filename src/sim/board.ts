// The battlefield: a small FF Tactics style grid of tiles, each standing some whole steps high. `u` runs across the
// board and `v` runs from the foes' edge (v = 0) to the heroes' edge (v = D - 1). The land rolls by a smooth noise of
// the seed (hills no steeper than a ramp), with raised platforms, ledges and pits set into it: a platform's or a pit's
// faces are cliffs of two to four levels, and one side of each has a staircase, so every tile can be reached by a
// walker that climbs a single level (`boardOk`) while a good jumper can take the cliff itself (`canStep`). A few
// boulders stand in the middle ground. The same seed always makes the same board. Adapted from Chronos's raid board
// (tactics.ts `relief`, tacticsTerrain.ts `canStep`, `easeRelief`, `sightClear`).

import { applyLayout, layoutFor, type LayoutId } from './layouts';
import { mixSeed, Rng } from './rng';

/** The usual board's size, in tiles across and deep (the foes' edge to the heroes'): the armies, the daily and the spire fight on it.
 *  It was 7 x 9 until 0.140.0; the Calamity's fights are on a bigger one (`CAL_BOARD`). The build can set it (`--board 7x9`) to compare. */
const SIZE = (typeof __BOARD__ === 'string' ? __BOARD__ : '8x11').split('x').map(Number);
export const BOARD_W = SIZE[0];
export const BOARD_D = SIZE[1];
/** Tiles across. */
export const W = BOARD_W;
/** Tiles deep, from the foes' edge to the heroes'. */
export const D = BOARD_D;
/** The board `areaScale` counts from: the old 7 x 9 (a board of this area lays this many platforms, pits and boulders). */
export const BASE_AREA = 7 * 9;
/** How many rows at each end belong to a side when the fight starts. */
export const DEPLOY_ROWS = 3;
/** The tallest face any board makes between neighbours (the best walking jumper climbs it; a flier goes over anything). */
export const CLIMB_MAX = 4;
/** The gentle slope of a ramp or stair: a step every walker, even a jump-1 one, can take. */
export const RAMP = 1;
/** A drop may be this much further than a climb (as in FF Tactics: a fighter jumps `jump` up and `jump + DROP_EXTRA` down). */
export const DROP_EXTRA = 1;
/** What each step climbed costs besides the tile itself. */
export const CLIMB_COST = 1;
/** The highest a platform stands. */
export const TOP = 6;
/** The highest the rolling land stands before platforms are set into it. */
export const HILL_TOP = 4;

/** Every land a fight can be on: the first six are the climb's and the Calamity's (new lands are added at the end, so a seed's boards on the old ones stay as they were). */
export const AREAS = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon', 'plains', 'autumn', 'swamp', 'graveyard', 'ruins', 'temple', 'crystal', 'forge', 'shrine', 'warcamp', 'oasis'] as const;
export type Area = (typeof AREAS)[number];
/** The six lands a run passes through, in turn (`areaFor` in run.ts picks by stage) and the Calamity's maps keep. */
export const CLASSIC_AREAS: readonly Area[] = AREAS.slice(0, 6);

/** What can cover a tile: shallows slow a walker, deep water stops all but fliers, ice speeds one (and may slide it on), lava slows and burns one,
 *  tall growth hides a tile from shots and gives a little dodge, a shrine heals whoever stands on it. */
export type Ground = 'water' | 'deep' | 'ice' | 'lava' | 'tall' | 'shrine' | 'coals';
/** What stepping onto each costs besides the tile itself (ice is a faster step). */
export const GROUND_COST: Record<Ground, number> = { water: 1, deep: 0, ice: -0.5, lava: 2, tall: 0, shrine: 0, coals: 1 };
/** The share of its hp a fighter loses each time a step ends on lava. */
export const LAVA_BURN = 0.08;
/** The share it loses each second it stands on lava. */
export const LAVA_STAND = 0.04;
/** The share of its hp a fighter loses each time a step ends on hot coals. */
export const COALS_BURN = 0.05;
/** The share it loses each second it stands on hot coals. */
export const COALS_STAND = 0.03;
/** How high tall growth stands for a shot's line (a shooter's eye is at 1.6 above its tile). */
export const TALL_TOP = 1.7;
/** How high a ruined wall stands for a shot's line (above a boulder, so a shooter a level up still cannot see over it). */
export const WALL_TOP = 2.6;
/** The chance a blow on a fighter in tall growth misses it. */
export const TALL_DODGE = 0.12;
/** The share of its hp a fighter on a shrine mends each second. */
export const SHRINE_HEAL = 0.05;
/** What a barrel's blast takes from each fighter within a tile of it (a share of the fighter's hp). */
export const BARREL_BLAST = 0.12;

/** How many patches of each ground an area lays (min, max), each patch of one to three tiles. */
const TERRAIN: Record<Area, Partial<Record<Ground, [number, number]>>> = {
  highlands: { water: [0, 1], tall: [1, 2] },
  forest: { water: [0, 1], tall: [2, 3] },
  snow: { ice: [1, 2], water: [0, 1] },
  desert: { water: [1, 1], tall: [0, 1] },
  volcano: { lava: [1, 2], tall: [0, 1] },
  dungeon: { water: [1, 2], tall: [1, 2] },
  plains: { water: [0, 1], tall: [1, 2] },
  autumn: { water: [0, 1], tall: [1, 2] },
  swamp: { water: [2, 3], tall: [1, 2] },
  graveyard: { water: [0, 1], tall: [1, 2] },
  ruins: { water: [0, 1], tall: [0, 1] },
  temple: { water: [0, 1], tall: [1, 2] },
  crystal: { ice: [1, 2], water: [0, 1] },
  forge: { lava: [1, 2], tall: [0, 1] },
  shrine: { water: [1, 1], tall: [1, 2] },
  warcamp: { water: [0, 1], tall: [0, 1] },
  oasis: { water: [2, 3], tall: [1, 2] },
};
/** How many shrines and powder barrels each area lays in the middle ground (min, max). Nothing for an area not named. */
const SPECIALS: Partial<Record<Area, { shrine: [number, number]; barrel: [number, number] }>> = {
  highlands: { shrine: [0, 1], barrel: [0, 2] },
  forest: { shrine: [0, 1], barrel: [0, 1] },
  snow: { shrine: [0, 1], barrel: [0, 0] },
  desert: { shrine: [0, 1], barrel: [0, 1] },
  volcano: { shrine: [0, 0], barrel: [1, 3] },
  dungeon: { shrine: [0, 1], barrel: [1, 2] },
  plains: { shrine: [0, 1], barrel: [0, 2] },
  autumn: { shrine: [0, 1], barrel: [0, 1] },
  swamp: { shrine: [0, 0], barrel: [0, 0] },
  graveyard: { shrine: [0, 1], barrel: [0, 1] },
  ruins: { shrine: [0, 1], barrel: [0, 2] },
  temple: { shrine: [1, 1], barrel: [0, 0] },
  crystal: { shrine: [0, 1], barrel: [0, 0] },
  forge: { shrine: [0, 0], barrel: [1, 3] },
  shrine: { shrine: [1, 1], barrel: [0, 0] },
  warcamp: { shrine: [0, 0], barrel: [1, 3] },
  oasis: { shrine: [0, 1], barrel: [0, 0] },
};
/** The lands whose lakes (deep water, to the rules) are drawn as molten rock, and whose rings have a lava pit. */
export const LAVA_LANDS: readonly Area[] = ['volcano', 'forge'];

export interface Tile {
  /** Height in whole steps. */
  h: number;
  /** A boulder stands here: nobody can stand on it, and it blocks low shots. */
  rock?: boolean;
  /** A ruined wall stands here: nobody can stand on it, and it blocks shots (`WALL_TOP`). */
  wall?: boolean;
  /** A powder barrel stands here: nobody can stand on it; a blow on a fighter beside it sets it off (it is gone after). */
  barrel?: boolean;
  /** A raised wall of the movement toolkit stands here (`toolkit/walls.ts`): ice, thorns or light. Nobody walks through it (it does not
   *  block shots or sight), except the side `barSide` names: a Wall of Light lets its caster's side through. */
  bar?: 'ice' | 'thorns' | 'light';
  barSide?: 'hero' | 'foe';
  /** Planks over a gap (looks only: the tile is plain ground to the rules). */
  bridge?: boolean;
  /** A bush grows here (only for looks). */
  bush?: boolean;
  /** A tree stands here (paired with `rock` when solid, or scenic on a corner). */
  tree?: 'oak' | 'pine' | 'birch';
  /** An elevated steep hill crest or archer redoubt: sheer cliffs on 3 sides, climbable only via a ramp. */
  perch?: boolean;
  /** Stepped ramp tile providing the sole jump-1 access up onto an elevated steep hill. */
  ramp?: boolean;
  /** Shallows, deep water, ice, lava, tall growth or a shrine covers the tile. */
  ground?: Ground;
  /** Off the road (an army's long map, `armyRoad.ts`): the land beside it, a wood, crags, ruins, a pool... Nobody on foot stands on it
   *  (a flier flies over it, as over deep water), and it blocks low shots like a boulder (a pool or lava none). */
  scene?: Scenery;
  /** Laid with flagstones (an arena's floor: looks only). */
  paved?: boolean;
  /** Part of an arena's ring (looks only: drawn as a run of wall, fence or stones). */
  ring?: boolean;
  /** Part of a section's river (looks only: drawn running the board's `flow` way). */
  stream?: boolean;
  /** Deep ground drawn as a drop into the void, not water (a Calamity zone's chasm, `calZones.ts`; looks only: to the rules it is deep). */
  chasm?: boolean;
  /** A small number for picking the tile's tufts and flowers. */
  deco: number;
}

/** The things a Calamity zone stands on its tiles (`calZones.ts`; looks only). A tall one (a pillar, a statue) stands on a tile nobody stands on
 *  (a wall or a boulder to the rules); a low one (bones, candles, a rune) lies on open ground and never hides a fighter. */
export type PropKind = 'pillar' | 'brokenPillar' | 'statue' | 'brazier' | 'coffin' | 'crystal' | 'shards' | 'chain' | 'banner' | 'rubble' | 'bones' | 'skeleton' | 'candles' | 'rune' | 'totem' | 'drip';
export interface Prop {
  u: number;
  v: number;
  kind: PropKind;
}

/** The kinds of land beside an army's road (`armyRoad.ts`), and of an arena's ring. */
export type Scenery = 'wood' | 'rocks' | 'ruin' | 'water' | 'lava' | 'bones' | 'fence' | 'stones' | 'grave' | 'crystal';
/** A set piece of an arena drawn on its scenery (looks only): the war camp's gate, the mausoleum, the den... */
export type PieceKind = 'riftPortal' | 'warGate' | 'drum' | 'tent' | 'flag' | 'mausoleum' | 'den' | 'arch' | 'circle' | 'foundry' | 'shrine' | 'brazier' | 'lamp' | 'campfire' | 'skulls';
export interface Piece {
  u: number;
  v: number;
  kind: PieceKind;
}

/** The living land's kinds (`hazards.ts`): strikes told a moment before, a spring that mends, a river's current. */
export type HazardKind = 'flare' | 'rockfall' | 'geyser' | 'spikes' | 'grasp' | 'stampede' | 'spring' | 'current';
/** One of the land's hazards: its tiles (by index), and its clock: it goes off at `offset` and every `period` ms after, told `tell` ms before. */
export interface Hazard {
  kind: HazardKind;
  tiles: number[];
  period: number;
  offset: number;
  tell: number;
  /** The way a current runs, a step across the board. */
  flow?: [number, number];
}
/** Where water (or lava) runs off an open edge of a section as a fall: the tile, and the way it pours out (looks only). */
export interface Fall {
  u: number;
  v: number;
  du: number;
  dv: number;
  lava: boolean;
}

export interface Board {
  riftWorld?: import('./sanctuary').RiftWorld;
  /** An arena's set pieces, on its scenery (looks only). */
  pieces?: Piece[];
  /** The land's hazards (an army's road: `hazards.ts`). */
  hazards?: Hazard[];
  /** The way the section's river runs, a step across the board (looks, and the current). */
  flow?: [number, number];
  /** Where its water runs off an open edge (looks only). */
  falls?: Fall[];
  /** Scenic destination, outside collision tiles; only included from the final approach onwards. */
  landmark?: 'fortress' | 'temple' | 'mausoleum' | 'warcamp' | 'den' | 'grove' | 'citadel' | 'shrine' | 'foundry';
  landmarkAt?: { u: number; v: number; h: number };
  /** A boss arena's middle (an army's boss section, `scenario.ts`): its boss starts there and its band round it (`arenaDeploy.ts`). */
  arenaMid?: At;
  seed: number;
  area: Area;
  w: number;
  d: number;
  tiles: Tile[];
  /** A Calamity zone's things on its tiles (`calZones.ts`; looks only). */
  props?: Prop[];
  /** The shape the land was laid in (`layouts.ts`); absent on a board made by hand. */
  layout?: LayoutId;
}

export interface At {
  u: number;
  v: number;
}

export const DIRS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export const tileAt = (b: Board, u: number, v: number): Tile | null => (u >= 0 && v >= 0 && u < b.w && v < b.d ? b.tiles[v * b.w + u] : null);

/** Smooth noise in [0, 1) by the seed: bilinear over a lattice three tiles apart. */
function relief(seed: number, x: number, y: number): number {
  const at = (cx: number, cy: number) => (mixSeed(seed, 0x7ac, cx, cy) >>> 0) / 4294967296;
  const fx = x / 3;
  const fy = y / 3;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const sx = fx - ix;
  const sy = fy - iy;
  const a = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
  const b = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
  return a * (1 - sy) + b * sy;
}

/** Lower the higher of any two neighbours more than `limit` apart, until none are. */
export function easeRelief(b: Board, limit = CLIMB_MAX): void {
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const a = b.tiles[v * b.w + u];
        for (const [du, dv] of [DIRS[0], DIRS[1]]) {
          const n = tileAt(b, u + du, v + dv);
          if (!n) continue;
          const d = a.h - n.h;
          if (Math.abs(d) <= limit) continue;
          if (d > 0) a.h = n.h + limit;
          else n.h = a.h + limit;
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/** How many times the usual board's area (`W` x `D`) a board covers. */
export const areaScale = (b: Pick<Board, 'w' | 'd'>): number => (b.w * b.d) / BASE_AREA;

/** Whether something solid stands on the tile (a boulder, a wall, a barrel, a raised wall): not even a flier passes it. */
export const solid = (t: Tile | null): boolean => !t || !!t.rock || !!t.wall || !!t.barrel || !!t.bar;
/** The same, for a walker of `side`: a raised wall that lets its side through (`barSide`) is open to it. */
export const solidFor = (t: Tile | null, side?: 'hero' | 'foe'): boolean => !t || !!t.rock || !!t.wall || !!t.barrel || (!!t.bar && (side === undefined || t.barSide !== side));
/** Whether a fighter on foot can stand on the tile at all (deep water is only for fliers, and so is the land beside an army's road, `Tile.scene`). */
export const standable = (t: Tile | null): t is Tile => !solid(t) && t!.ground !== 'deep' && !t!.scene;

/** A jump this high is flight: no height stops it. */
export const FLY_JUMP = 9;

/** What a step from one tile to the next costs a fighter who can jump `jump`, or null if it's a cliff: more than `jump`
 *  to climb, or more than `jump + DROP_EXTRA` to drop. Each step climbed costs `CLIMB_COST` more. */
export function canStep(from: Tile, to: Tile, jump: number, side?: 'hero' | 'foe'): number | null {
  // (a flier, with a jump of FLY_JUMP, goes over any height, and over deep water, at the cost of a level step)
  if (jump >= FLY_JUMP) return solidFor(to, side) ? null : 1;
  // (`side` opens a raised wall that lets that side through, RPG-SPELLS; with none, it is `standable`)
  if (solidFor(to, side) || to.ground === 'deep' || to.scene) return null;
  const rise = to.h - from.h;
  if (rise > jump || -rise > jump + DROP_EXTRA) return null;
  return 1 + (rise > 0 ? rise * CLIMB_COST : 0) + (to.ground ? GROUND_COST[to.ground] : 0);
}

/** Whether a shot flies from one tile to the other: no tile between stands over the line from the shooter's eye to
 *  the mark (a boulder, a hill's brow). */
export function sightClear(b: Board, a: At, z: At): boolean {
  const ta = tileAt(b, a.u, a.v);
  const tz = tileAt(b, z.u, z.v);
  if (!ta || !tz) return false;
  const n = Math.max(Math.abs(z.u - a.u), Math.abs(z.v - a.v));
  if (n <= 1) return true;
  const eye = ta.h + 1.6;
  const mark = tz.h + 1;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const t = tileAt(b, Math.round(a.u + (z.u - a.u) * f), Math.round(a.v + (z.v - a.v) * f));
    if (!t) continue;
    const top = t.h + (t.wall ? WALL_TOP : t.rock || (t.scene && t.scene !== 'water' && t.scene !== 'lava') ? 1.6 : t.ground === 'tall' ? TALL_TOP : 0);
    if (top > eye + (mark - eye) * f + 1e-6) return false;
  }
  return true;
}

/** Whether every standable tile can be walked to from the heroes' rows by a fighter who climbs a single level (`RAMP`),
 *  and so by any other: nobody is walled into a pocket, and no deploy tile or perch can be reached only by a jumper. */
export function boardOk(b: Board): boolean {
  const seen = new Set<number>();
  const start = b.tiles.findIndex((t, i) => standable(t) && Math.floor(i / b.w) === b.d - 1);
  if (start < 0) return false;
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const i = queue.shift()!;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const n = tileAt(b, u + du, v + dv);
      const j = (v + dv) * b.w + u + du;
      if (!n || seen.has(j) || canStep(b.tiles[i], n, RAMP) === null) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  // (every standable tile is one region: nobody is walled into a pocket)
  return b.tiles.every((t, i) => !standable(t) || seen.has(i));
}

/** Lay the area's patches of ground on the board by a side stream of the seed (so the land and boulders are the same
 *  whatever the area). Lava stays out of the deploy rows; nothing lies under a boulder. */
function layGround(b: Board, area: Area): void {
  const rng = new Rng(mixSeed(b.seed, 0xa7ea, AREAS.indexOf(area)));
  for (const kind of ['water', 'ice', 'lava', 'tall'] as const) {
    const range = TERRAIN[area][kind];
    if (!range) continue;
    const patches = rng.int(range[0], range[1]) + Math.round(areaScale(b) - 1);
    const rows = kind === 'lava' ? [DEPLOY_ROWS, b.d - 1 - DEPLOY_ROWS] : [0, b.d - 1];
    for (let i = 0; i < patches; i++) {
      let at = { u: rng.int(0, b.w - 1), v: rng.int(rows[0], rows[1]) };
      for (let n = rng.int(1, 3); n > 0; n--) {
        const t = tileAt(b, at.u, at.v);
        if (standable(t) && !t.bridge && !t.ground) {
          t.ground = kind;
          delete t.bush;
        }
        const [du, dv] = rng.pick(DIRS as [number, number][]);
        const next = { u: at.u + du, v: at.v + dv };
        if (next.v >= rows[0] && next.v <= rows[1]) at = next;
      }
    }
  }
}

/** The staircase from a block of tiles outwards in direction `dir` from the edge tile `from`: each step climbs (or, for a
 *  pit, falls) one level, until it meets the land. Returns the tiles to set and their heights, or null if it runs off
 *  the board or over `used` before it meets the land. `top` is true for a platform (the stairs come down). */
function stairs(b: Board, from: At, dir: readonly [number, number], level: number, top: boolean, used: ReadonlySet<number>): [number, number][] | null {
  const out: [number, number][] = [];
  for (let k = 1; k <= 6; k++) {
    const u = from.u + dir[0] * k;
    const v = from.v + dir[1] * k;
    const t = tileAt(b, u, v);
    if (!t || used.has(v * b.w + u)) return null;
    const step = top ? level - k : level + k;
    const meets = top ? step <= t.h : step >= t.h;
    // (the last stair is the land itself, left as it is, unless the stair is a level off it)
    out.push([v * b.w + u, meets ? t.h : step]);
    if (meets) return out;
  }
  return null;
}

/** Set a platform (`up`) or a pit into the land: a block of tiles `size` across, `cliff` levels above or below the lowest (or
 *  highest) land round it, with a staircase down one side. Returns whether it was laid (nothing changes if not). */
function setBlock(b: Board, rng: Rng, up: boolean, size: [number, number], cliff: number, rows: [number, number], used: Set<number>): boolean {
  const [bw, bd] = size;
  // (the board's border stays plain hills, so a section joined to another meets it on gentle ground)
  const u0 = rng.int(1, b.w - 1 - bw);
  const v0 = rng.int(Math.max(1, rows[0]), Math.min(b.d - 1 - bd, rows[1] - bd + 1));
  const block: number[] = [];
  const ring: number[] = [];
  for (let v = v0 - 1; v <= v0 + bd; v++)
    for (let u = u0 - 1; u <= u0 + bw; u++) {
      const t = tileAt(b, u, v);
      if (!t) continue;
      const inside = u >= u0 && u < u0 + bw && v >= v0 && v < v0 + bd;
      if (used.has(v * b.w + u)) return false;
      (inside ? block : ring).push(v * b.w + u);
    }
  if (block.length !== bw * bd) return false;
  const rim = ring.filter((i) => {
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    return (u >= u0 && u < u0 + bw) || (v >= v0 && v < v0 + bd);
  });
  const heights = rim.map((i) => b.tiles[i].h);
  const level = up ? Math.min(TOP, Math.min(...heights) + cliff) : Math.max(0, Math.max(...heights) - cliff);
  // (a platform must stand above the land round it, a pit below it, or it is not worth setting)
  if (up ? level <= Math.max(...heights) - 1 : level >= Math.min(...heights) + 1) return false;
  if (up ? level - Math.min(...heights) > CLIMB_MAX : Math.max(...heights) - level > CLIMB_MAX) return false;
  // a staircase down one side, from a tile of the block's edge chosen by the stream
  const start = rng.int(0, 3);
  for (let n = 0; n < 4; n++) {
    const dir = DIRS[(start + n) % 4];
    const along = dir[0] !== 0 ? rng.int(0, bd - 1) : rng.int(0, bw - 1);
    const from = dir[0] > 0 ? { u: u0 + bw - 1, v: v0 + along } : dir[0] < 0 ? { u: u0, v: v0 + along } : dir[1] > 0 ? { u: u0 + along, v: v0 + bd - 1 } : { u: u0 + along, v: v0 };
    const flight = stairs(b, from, dir, level, up, new Set([...used, ...block]));
    if (!flight) continue;
    for (const i of block) b.tiles[i].h = level;
    for (const [i, h] of flight) b.tiles[i].h = h;
    for (const i of block) used.add(i);
    for (const [i] of flight) used.add(i);
    return true;
  }
  return false;
}

/** Lay the area's shrines and powder barrels in the middle ground, by a side stream of the seed. A barrel stands only where everyone can still get round it. */
function laySpecials(b: Board, area: Area): void {
  const cfg = SPECIALS[area];
  if (!cfg) return;
  const rng = new Rng(mixSeed(b.seed, 0x5b3c, AREAS.indexOf(area)));
  const extra = Math.round(areaScale(b) - 1);
  const free = (): Tile | null => {
    const t = tileAt(b, rng.int(0, b.w - 1), rng.int(DEPLOY_ROWS, b.d - 1 - DEPLOY_ROWS));
    return standable(t) && !t.ground && !t.bridge ? t : null;
  };
  for (let n = rng.int(cfg.shrine[0], cfg.shrine[1]); n > 0; n--) {
    const t = free();
    if (t) t.ground = 'shrine';
  }
  for (let n = rng.int(cfg.barrel[0], cfg.barrel[1]) + (cfg.barrel[1] ? extra : 0); n > 0; n--) {
    const t = free();
    if (!t) continue;
    t.barrel = true;
    if (!boardOk(b)) delete t.barrel;
  }
}

/** The board for a seed: land rolled by the seed, laid in one of the shapes of `layouts.ts` (picked by the area and the seed, or told by `layout`), boulders in the middle ground, bushes for looks, the area's ground, and its shrines and barrels. */
export function makeBoard(seed: number, area: Area = 'highlands', w = W, d = D, layout?: LayoutId): Board {
  const rng = new Rng(mixSeed(seed, 0xb0a7d));
  const tiles: Tile[] = [];
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      // (the land rolls more in the middle ground; the two sides' rows stand a little flatter)
      const n = relief(seed, u + 11, v + 7);
      tiles.push({ h: Math.max(0, Math.min(HILL_TOP, Math.round(n * (HILL_TOP + 1.4) - 0.6))), deco: rng.int(0, 999) });
    }
  const b: Board = { seed, area, w, d, tiles };
  // (a bigger board lays more platforms, pits and boulders, in step with its area)
  const extra = Math.round(areaScale(b) - 1);
  // (the hills are no steeper than a ramp, so every tile can be walked to)
  easeRelief(b, RAMP);
  const hills = b.tiles.map((t) => t.h);
  // a shape: a river, a hill, a canyon... (a shape that cannot be laid on this seed leaves the rolling land to go on as it was)
  const want = layout ?? layoutFor(seed, area);
  const shaped = want !== 'classic' && applyLayout(b, want);
  b.layout = shaped ? want : 'classic';
  if (!shaped) {
    // platforms (two or three of them, a staircase down one side each) and pits, from a side stream of the seed
    const feat = new Rng(mixSeed(seed, 0xf3a7));
    const used = new Set<number>();
    const sizes: [number, number][] = [[2, 2], [3, 2], [2, 3], [3, 3], [1, 2], [2, 1]];
    const platforms = feat.int(2, 3) + extra;
    for (let i = 0; i < platforms; i++)
      for (let tries = 0; tries < 6; tries++) {
        if (setBlock(b, feat, true, feat.pick(sizes), feat.int(2, 4), [1, d - 2], used)) break;
      }
    const pits = feat.int(1, 2) + extra;
    for (let i = 0; i < pits; i++)
      for (let tries = 0; tries < 6; tries++) {
        if (setBlock(b, feat, false, feat.pick([[1, 1], [1, 2], [2, 1], [2, 2]] as [number, number][]), feat.int(2, 3), [DEPLOY_ROWS - 1, d - 1 - DEPLOY_ROWS + 1], used)) break;
      }
    // (a board that somehow cannot be walked is left as plain hills)
    if (!boardOk(b)) b.tiles.forEach((t, i) => (t.h = hills[i]));
  }
  // boulders in the middle ground, kept only if everyone can still get round them
  const rocks = rng.int(1, 3) + extra * 2;
  for (let i = 0; i < rocks; i++) {
    const t = tileAt(b, rng.int(0, w - 1), rng.int(DEPLOY_ROWS, d - 1 - DEPLOY_ROWS));
    if (!t || !standable(t) || t.bridge || t.ground) continue;
    t.rock = true;
    if (!boardOk(b)) t.rock = false;
  }
  for (const t of b.tiles) if (!solid(t) && t.ground !== 'deep' && rng.chance(0.08)) t.bush = true;
  layGround(b, area);
  laySpecials(b, area);
  return b;
}
