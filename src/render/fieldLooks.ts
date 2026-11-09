// What the hold's field looks like, tile by tile (phase 1b, `docs/notes/assault-1.md`; the art plan's 1.2 to 1.5, `docs/notes/assault-art-plan.md`):
// pure rules the field's renderer (`fieldView.ts`) bakes and draws from, and the tests read. Looks only: nothing here changes a tile the
// battle reads, and nothing draws a random number (the scatter is a hash of the tile).
//
// - The GROUND MATERIAL of every tile, from its zone, its ground and its height, the blueprint's roads, and patches by a smooth noise: heath on
//   the crags and the Warpath, trampled ground round the posts, mud on the bank, the camp's packed dirt and wet mud in the bailey, ash in the
//   burnt village, flagstones in the inner bailey and on the mound, the wall-walk's stone, shingle by the river, planks on the bridge.
// - The FRINGES: where a tile meets a neighbour of a higher-ranked material at its own height, the neighbour's edge overlay is laid over
//   it, turned to face it (and its corner for a diagonal); the water's foam line is laid on the water, facing the land; grass creeps back over
//   some mud.
// - The FACE of a column (a lip, a body of four steps, a foot) by its zone and height: the stone curtain, the corner towers, the mound's
//   terraces, the rampart, the ditch's mud, the river bank, the crags, the Warpath's basalt.
// - The DECALS, by zone: blood and bones by the posts, ash and scorch in the village, mud, puddles and ruts in the bailey, cracks in the
//   flagstones; two tiles apart at most one.
// - The STANDING PIECES: each structure (with its states), the longhouses and huts, the keep, the towers' tops, the stone wall's crenels and
//   braziers, the pens, the barricade, the barrels, the trees and boulders on the solid tiles, the camp's set pieces, a banner at each post
//   and the landmarks of the plan's 1.4. Anything taller than half a tile stands on a tile the rules make solid (or is a pole); the clutter
//   on open ground stays low.

import type { Board, Tile } from '../sim/board';
import type { Blueprint, Spot } from '../sim/assault/blueprint';
import type { FortSpec } from '../sim/assault/fieldMap';
import { GROUND } from './assaultOrcAtlas';

/** The ground materials, by their place in the hold's `ground.webp` (`GROUND`). */
export const MAT = Object.fromEntries(GROUND.map((n, i) => [n, i])) as Record<(typeof GROUND)[number], number>;
/** Deep water: no texture of the sheet (the land's own water, deep-tinted). */
export const DEEP = 255;

/** A material's rank: the higher bleeds over the lower at their seam. */
const RANK: Record<number, number> = {
  [MAT.grass1]: 0, [MAT.grass2]: 0, [MAT.heath]: 1, [MAT.trampled]: 2, [MAT.campDirt]: 3, [MAT.mud1]: 4, [MAT.mud2]: 4, [MAT.wetMud]: 5,
  [MAT.scorched]: 6, [MAT.ash]: 6, [MAT.shingle]: 7, [MAT.cobbles]: 8, [MAT.flagstones]: 9, [MAT.wallWalk]: 10, [MAT.planks]: 11, [MAT.shallows]: 12,
  [DEEP]: 12,
};
/** The edge overlay (`EDGES`, without "Corner") a material lays over a lower neighbour. */
const EDGE: Record<number, string | undefined> = {
  [MAT.heath]: 'grass', [MAT.trampled]: 'path', [MAT.campDirt]: 'path', [MAT.mud1]: 'mud', [MAT.mud2]: 'mud', [MAT.wetMud]: 'mud', [MAT.scorched]: 'scorch', [MAT.ash]: 'scorch',
  [MAT.shingle]: 'shingle', [MAT.cobbles]: 'road', [MAT.flagstones]: 'flags', [MAT.wallWalk]: 'flags',
};

const Z = (c: string) => c.charCodeAt(0);
const isWater = (t: Tile) => t.ground === 'water' || t.ground === 'deep';

/** A hash of a tile and a salt, 0 to 1 (looks only). */
export function hash(u: number, v: number, salt = 0): number {
  let x = Math.imul(u * 374761393 + v * 668265263 + salt * 2246822519, 0x27d4eb2d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}

/** A smooth noise over the field (patches `cell` tiles across), 0 to 1. */
export function noise(u: number, v: number, cell: number, salt = 0): number {
  const x = u / cell;
  const y = v / cell;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, salt);
  const b = hash(x0 + 1, y0, salt);
  const c = hash(x0, y0 + 1, salt);
  const d = hash(x0 + 1, y0 + 1, salt);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
}

/** Every tile's ground material (`MAT`, or `DEEP`). */
export function materialsOf(b: Board, zone: Uint8Array, bp: Blueprint): Uint8Array {
  const { w, d } = b;
  const snowy = bp.army === 'beasts';
  const out = new Uint8Array(w * d);
  const posts = bp.posts.map((p) => p.at);
  const nearPost = (u: number, v: number, r: number) => posts.some((p) => Math.abs(p.u - u) + Math.abs(p.v - v) <= r);
  const wet = (u: number, v: number) => {
    for (let dv = -1; dv <= 1; dv++)
      for (let du = -1; du <= 1; du++) {
        const t = b.tiles[(v + dv) * w + u + du];
        if (t && (du || dv) && isWater(t) && u + du >= 0 && u + du < w) return true;
      }
    return false;
  };
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const i = v * w + u;
      const t = b.tiles[i];
      const z = zone[i];
      const n = noise(u, v, 7, 1);
      let m: number;
      if (t.ground === 'deep') m = DEEP;
      else if (t.ground === 'water') m = MAT.shallows;
      else if (t.bridge) m = MAT.planks;
      else if (t.ground === 'coals') m = MAT.ash;
      else if (z === Z('S')) m = MAT.wallWalk;
      else if (t.paved) m = z === Z('I') || z === Z('M') || t.ramp || t.ground === 'shrine' ? MAT.flagstones : MAT.cobbles;
      else if (t.ground === 'shrine') m = MAT.flagstones;
      else if (t.ground === 'tall') m = MAT.heath;
      else if (z === Z('R') || z === Z('F') || wet(u, v)) m = MAT.shingle;
      else if (z === Z('D')) m = MAT.wetMud;
      else if (z === Z('E')) m = n < 0.5 ? MAT.mud1 : MAT.mud2;
      else if (z === Z('P')) m = MAT.campDirt;
      else if (z === Z('B')) m = n < 0.22 ? MAT.wetMud : n < 0.4 ? MAT.mud2 : nearPost(u, v, 3) ? MAT.trampled : MAT.campDirt;
      else if (z === Z('I')) m = n < 0.3 ? MAT.campDirt : MAT.flagstones;
      else if (z === Z('M')) m = t.h >= 9 ? MAT.flagstones : t.h >= 7 ? MAT.campDirt : MAT.trampled;
      else if (z === Z('N')) m = Math.abs(u - bp.warpath.u) + Math.abs(v - bp.warpath.v) <= 6 ? MAT.ash : n < 0.25 ? MAT.trampled : MAT.heath;
      else if (z === Z('V')) m = n < 0.5 ? MAT.ash : MAT.scorched;
      else if (z === Z('C')) m = n < 0.4 ? MAT.campDirt : MAT.trampled;
      else if (z === Z('T')) m = MAT.grass2;
      else if (t.h >= 6) m = MAT.heath;
      else if (nearPost(u, v, 2)) m = MAT.trampled;
      else m = n < 0.18 ? MAT.heath : noise(u, v, 11, 2) < 0.5 ? MAT.grass1 : MAT.grass2;
      out[i] = snowy ? snowOf(m, z, u, v) : m;
    }
  return out;
}

/** The Howling Den's ground (phase 4): its sheet keeps the Orc slots, but `campDirt` is painted as trodden snow (`tools/assault/cut-sheets.py
 *  beasts`). The ring and all within it lie under snow; the moor's last climb to the ditch is patched with it; our camp at the Landing is
 *  trodden moor, not snow. */
function snowOf(m: number, z: number, u: number, v: number): number {
  const r = Math.max(Math.abs(u - 49.5), Math.abs(v - 49.5));
  if (z === Z('C')) return m === MAT.campDirt ? MAT.trampled : m;
  if (z === Z('B') || z === Z('P') || z === Z('E')) return m === MAT.flagstones || m === MAT.cobbles ? m : MAT.campDirt;
  if (z === Z('I') || z === Z('M')) return m === MAT.flagstones ? m : MAT.campDirt;
  if ((z === Z('K') || z === Z('T')) && r < 32 && noise(u, v, 5, 7) + (32 - r) * 0.08 > 0.75 && m !== MAT.shingle) return MAT.campDirt;
  return m;
}

/** One overlay laid on a tile: the edge or corner (`EDGES` name) turned `turn` quarter turns clockwise (0 faces the -v neighbour). */
export interface Fringe {
  edge: string;
  turn: number;
}

/** The orthogonal neighbours in quarter turns: -v, +u, +v, -u. */
const SIDES: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
/** The diagonal neighbours in quarter turns: (-u, -v), (+u, -v), (+u, +v), (-u, +v) (the corner overlay's top left first). */
const CORNERS: readonly [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/** The overlays a tile takes from its neighbours (empty for most). */
export function fringesOf(b: Board, mats: Uint8Array, u: number, v: number): Fringe[] {
  const { w, d } = b;
  const i = v * w + u;
  const m = mats[i];
  const h = b.tiles[i].h;
  const out: Fringe[] = [];
  const water = m === MAT.shallows || m === DEEP;
  // (a neighbour at this tile's height; for the water, the bank above it too, so the foam and the wet stones follow every bank)
  const at = (du: number, dv: number) => {
    const x = u + du;
    const y = v + dv;
    if (x < 0 || y < 0 || x >= w || y >= d) return -1;
    const j = y * w + x;
    const dh = b.tiles[j].h - h;
    return Math.abs(dh) < 1 || (water && dh > 0 && dh <= 4) ? j : -1;
  };
  const over = new Set<number>();
  SIDES.forEach(([du, dv], turn) => {
    const j = at(du, dv);
    if (j < 0) return;
    const n = mats[j];
    // (the water's foam line lies on the water, facing the land)
    if (water) {
      // (the bank bites into the water: its shingle laid over the water's edge, then the foam line, so the shore is not a stair of diamonds)
      if (n !== MAT.shallows && n !== DEEP) {
        out.push({ edge: 'shingle', turn }, { edge: 'water', turn });
        over.add(turn);
      }
      return;
    }
    if (RANK[n] > RANK[m] && EDGE[n] && n !== MAT.shallows) {
      out.push({ edge: EDGE[n]!, turn });
      over.add(turn);
    } else if (RANK[n] <= 0 && (m === MAT.mud1 || m === MAT.mud2 || m === MAT.wetMud || m === MAT.campDirt) && hash(u, v, 7 + turn) < 0.5) {
      // (grass creeping back over mud, so the mud's islands are not perfect shapes)
      out.push({ edge: 'grass', turn });
      over.add(turn);
    }
  });
  if (water) {
    // (the water's corners: where only the diagonal is land, a rounded corner of foam, so the bank curves)
    CORNERS.forEach(([du, dv], turn) => {
      if (over.has(turn) || over.has((turn + 3) % 4)) return;
      const j = at(du, dv);
      if (j >= 0 && mats[j] !== MAT.shallows && mats[j] !== DEEP) out.push({ edge: 'shingleCorner', turn }, { edge: 'waterCorner', turn });
    });
    return out;
  }
  CORNERS.forEach(([du, dv], turn) => {
    // (a corner only where neither side next to it already took an edge)
    if (over.has(turn) || over.has((turn + 3) % 4)) return;
    const j = at(du, dv);
    if (j < 0) return;
    const n = mats[j];
    if (RANK[n] > RANK[m] && EDGE[n] && n !== MAT.shallows) out.push({ edge: `${EDGE[n]}Corner`, turn });
  });
  return out;
}

/** The face a column shows over its lower neighbour (`FACES` name). */
export function faceOf(b: Board, zone: Uint8Array, i: number, toward: number): string {
  const t = b.tiles[i];
  const z = zone[i];
  const n = toward >= 0 ? b.tiles[toward] : undefined;
  const nz = toward >= 0 ? zone[toward] : 0;
  if (z === Z('S')) return t.perch || t.h >= 10 ? 'tower' : hash(i % b.w, Math.floor(i / b.w), 3) < 0.2 ? 'stoneWallDamaged' : 'stoneWall';
  if (z === Z('M')) return t.h >= 7 ? 'terrace' : 'moundEarth';
  if (t.perch && t.h >= 6) return z === Z('E') || z === Z('P') ? 'rampart' : 'cliff';
  if (t.wall && z === Z('P')) return 'palisade';
  if (n && isWater(n)) return 'riverBank';
  if (nz === Z('D') || z === Z('D')) return 'mudBank';
  if (z === Z('E') || z === Z('P')) return 'rampart';
  if (z === Z('R') || z === Z('F')) return 'riverBank';
  if (z === Z('N')) return 'basalt';
  return t.h >= 6 ? 'cliff' : 'earth';
}

/** A decal laid on a tile (`DECALS` name), turned, at a strength. */
export interface Decal {
  name: string;
  turn: number;
  alpha: number;
}

/** Whether ash lies within two tiles of a tile. */
function ashNear(b: Board, mats: Uint8Array, u: number, v: number): boolean {
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const uu = u + du;
      const vv = v + dv;
      if (uu >= 0 && vv >= 0 && uu < b.w && vv < b.d && mats[vv * b.w + uu] === MAT.ash) return true;
    }
  return false;
}

/** The decal a tile takes, if any: by its zone, near the posts and the drums, on the even tiles only (so two never touch). */
export function decalOf(b: Board, zone: Uint8Array, mats: Uint8Array, bp: Blueprint, u: number, v: number): Decal | null {
  if (u % 2 || v % 2) return null;
  const i = v * b.w + u;
  const t = b.tiles[i];
  if (t.wall || t.rock || isWater(t) || t.ramp) return null;
  const z = zone[i];
  const r = hash(u, v, 11);
  const pick = (names: readonly string[], share: number): Decal | null =>
    r < share ? { name: names[Math.floor(hash(u, v, 12) * names.length)], turn: Math.floor(hash(u, v, 13) * 4), alpha: 0.75 + hash(u, v, 14) * 0.25 } : null;
  const nearPost = bp.posts.some((p) => Math.abs(p.at.u - u) + Math.abs(p.at.v - v) <= 3);
  const m = mats[i];
  // (ash laid on lighter ground, the hot coals by the gates above all: a ring of the hold's soft ash and scorch marks around it, so its edge
  //  frays into the ground instead of ending on a hard diamond)
  if (m !== MAT.ash && m !== MAT.scorched && ashNear(b, mats, u, v)) return pick(['ashPatch', 'scorch', 'ashPatch', 'embers'], 0.95);
  if (m === MAT.cobbles) return pick(['ruts', 'bootTracks'], 0.25);
  if (z === Z('V')) return pick(['ashPatch', 'scorch', 'rubble', 'timber', 'embers'], 0.6);
  if (z === Z('B')) return pick(['mudSplash', 'puddle', 'straw', 'bootTracks', 'ruts'], 0.32);
  if (z === Z('D')) return pick(['puddle', 'mudSplash'], 0.3);
  if (z === Z('I')) return pick(['cracks', 'straw'], 0.25);
  if (z === Z('M')) return pick(['bones', 'embers', 'cracks'], 0.2);
  if (z === Z('N')) return pick(['bones', 'ashPatch', 'wolfTracks'], 0.4);
  if (z === Z('S')) return pick(['cracks', 'rubble'], 0.12);
  if (nearPost && (z === Z('K') || z === Z('T'))) return pick(['bloodSpatter', 'bones', 'bloodSmear', 'bootTracks', 'scorch'], 0.4);
  if (z === Z('K') && Math.abs(u - 86) + Math.abs(v - 30) <= 8) return pick(['wolfTracks'], 0.5);
  if (z === Z('K') || z === Z('T')) return pick(['bones', 'mudSplash', 'bootTracks'], 0.06);
  return null;
}

/** A standing piece of the field: its sprite (`SPRITES` name, or a road-atlas set piece), its foot in tiles (fractional for a big
 *  footprint), the tile it sorts with (its front), whether it is mirrored (a run along v), its scale and tint, and the structure or hut it
 *  shows the state of. */
export interface Placement {
  name: string;
  u: number;
  v: number;
  front: number;
  flip?: boolean;
  scale?: number;
  tint?: number;
  fort?: number;
  hut?: number;
  /** A set piece of the arenas' atlas (`roadArt.ts`), not the hold's. */
  road?: string;
  /** Low clutter: baked into its chunk, not stood among the fighters. */
  low?: boolean;
  /** A palisade run on the ring's back sides, seen from inside (its inner face while whole). */
  inner?: boolean;
  /** The tile it sorts with instead of its front (a tower's top sorts with its back, so the crew on it show). */
  depth?: number;
  /** One of the camp's set pieces of the blueprint (drawn since phase 1 on open ground: the Landing's tents, the fires, the flags). */
  set?: boolean;
}

/** The pieces that may stand on open ground though taller than half a tile: poles and banners a fighter is not hidden behind, and the
 *  wall-walk's parapet and braziers. */
/** The plain runs of maze wall, dressed: a hash of the tile picks one, plain half the time (lab-14's dressed runs; the broken stump and the
 *  open gap are left out, since every maze tile blocks). */
const MAZE_DRESS = ['mazeRun', 'mazeCracked', 'mazeRun', 'mazeVine', 'mazeRun', 'mazeFresco', 'mazeRun', 'mazeGrille', 'mazeRun', 'mazeTorch', 'mazeRun', 'mazeBanner', 'mazeRun', 'mazeSpears', 'mazeRun', 'mazeJar', 'mazeRun', 'mazeNiche'] as const;

/**
 * A maze wall tile's piece from the Heart of the Maze's own sheet (lab-14), by the walls beside it. On the screen u - 1 is up to the
 * left and v - 1 up to the right; a piece painted along u is mirrored for the same shape along v.
 * - a run (walls on one axis only): a plain or dressed run;
 * - the near corner (walls up to the left and up to the right): a corner, one of the two painted;
 * - a T (a run with a branch up the other way): the T;
 * - an end (one wall, up to the left or up to the right): the run ending on its brazier pier, the pier at the open end;
 * - any shape the sheet has no piece for (the far corner, the side corners, a branch downwards, a lone tile): a plain run.
 */
export function mazePiece(tiles: readonly Spot[], p: Spot): { name: string; flip: boolean } {
  const has = (du: number, dv: number) => tiles.some((q) => q.u === p.u + du && q.v === p.v + dv);
  const ul = has(-1, 0);
  const lr = has(1, 0);
  const ur = has(0, -1);
  const ll = has(0, 1);
  const n = +ul + +lr + +ur + +ll;
  const hash = (Math.imul(p.u * 73856093 ^ p.v * 19349663, 0x9e3779b1) >>> 0) % 1000;
  if ((ul || lr) && !ur && !ll) return { name: n === 1 && ul ? 'mazeEnd' : n === 2 ? MAZE_DRESS[hash % MAZE_DRESS.length] : 'mazeRun', flip: false };
  if ((ur || ll) && !ul && !lr) return { name: n === 1 && ur ? 'mazeEnd' : n === 2 ? MAZE_DRESS[hash % MAZE_DRESS.length] : 'mazeRun', flip: true };
  if (n === 2 && ul && ur) return { name: hash % 2 ? 'mazeCornerA' : 'mazeCornerB', flip: false };
  if (n === 3 && ul && lr && ur) return { name: 'mazeTee', flip: false };
  if (n === 3 && ur && ll && ul) return { name: 'mazeTee', flip: true };
  return { name: 'mazeRun', flip: !ul && !lr };
}

export const THIN = new Set(['crenel', 'wallBrazier', 'smallBanner', 'pennantPole', 'spearSign', 'skullTorch', 'wolfTotem', 'tuskTotem', 'greatBanner', 'brazier', 'wallBrazier', 'ladder', 'throne']);

/** The low clutter of a tile, if any (looks only, never on a road, a stair or water; two tiles apart at most one). */
export function clutterOf(b: Board, zone: Uint8Array, mats: Uint8Array, u: number, v: number): string | null {
  if ((u + v) % 2 || u % 3 === 0) return null;
  const i = v * b.w + u;
  const t = b.tiles[i];
  const r = hash(u, v, 21);
  const any = (names: readonly string[]) => names[Math.floor(hash(u, v, 22) * names.length)];
  // (the fords' stepping stones in the shallows)
  if (t.ground === 'water') return r < 0.22 ? 'fordStones' : null;
  if (t.wall || t.rock || isWater(t) || t.ramp || t.paved || t.bush || t.ground === 'tall') return null;
  const z = zone[i];
  if (mats[i] === MAT.shingle) return r < 0.4 ? any(['reeds1', 'reeds2', 'reeds1', 'pebbles', 'wetBoulders']) : null;
  if (z === Z('K') || z === Z('T') || z === Z('L')) return r < (z === Z('T') ? 0.28 : 0.16) ? any(['flowers1', 'flowers2', 'pebbles', 'fern', 'bones1', 'stump1', 'stump2', 'shrub1']) : null;
  if (z === Z('V')) return r < 0.25 ? any(['bones1', 'pebbles', 'stump1']) : null;
  if (z === Z('N')) return r < 0.15 ? any(['bones1', 'bones2', 'pebbles']) : null;
  if (z === Z('B')) return r < 0.06 ? any(['bones1', 'pebbles']) : null;
  return null;
}

/** The tiles of a rectangle. */
const rectTiles = (w: number, r: { u0: number; v0: number; u1: number; v1: number }) => {
  const out: number[] = [];
  for (let v = r.v0; v <= r.v1; v++) for (let u = r.u0; u <= r.u1; u++) out.push(v * w + u);
  return out;
};

/** Every standing piece of the hold (the hold's own art; the arenas' set pieces where it has none). */
export function placementsOf(b: Board, zone: Uint8Array, bp: Blueprint, forts: readonly FortSpec[]): Placement[] {
  const { w } = b;
  const out: Placement[] = [];
  const taken = new Set<number>();
  const mid = (tiles: readonly number[]) => {
    let su = 0;
    let sv = 0;
    let front = tiles[0];
    for (const t of tiles) {
      su += t % w;
      sv += Math.floor(t / w);
      if ((t % w) + Math.floor(t / w) > (front % w) + Math.floor(front / w)) front = t;
    }
    return { u: su / tiles.length, v: sv / tiles.length, front };
  };
  // (a ring side runs along u where its tiles share a v, so the run's sprite is mirrored where they share a u)
  const alongV = (u: number, v: number) => Math.abs(u - 49.5) > Math.abs(v - 49.5);
  // the structures
  forts.forEach((f, n) => {
    for (const t of f.tiles) taken.add(t);
    if (f.kind === 'palisade') {
      for (const t of f.tiles) {
        const u = t % w;
        const v = Math.floor(t / w);
        // (the ring's two back sides are seen from inside: their inner faces)
        out.push({ name: 'palisadeRun', u, v, front: t, flip: alongV(u, v), fort: n, inner: u < 40 || v < 40 });
      }
      return;
    }
    const m = mid(f.tiles);
    const name = f.kind === 'drum' ? 'drumStruck' : f.kind === 'ironGate' ? 'ironGate' : f.kind === 'northGate' ? 'northGate' : f.kind === 'southGate' ? 'southGate' : 'sallyPort';
    // (a sally port is one tile along its wall: its picture stands on the outer of its two tiles)
    if (f.kind === 'sallyPort') {
      const outer = f.tiles.reduce((p, q) => (Math.max(Math.abs((q % w) - 49.5), Math.abs(Math.floor(q / w) - 49.5)) > Math.max(Math.abs((p % w) - 49.5), Math.abs(Math.floor(p / w) - 49.5)) ? q : p));
      out.push({ name, u: outer % w, v: Math.floor(outer / w), front: m.front, flip: alongV(outer % w, Math.floor(outer / w)), fort: n });
      return;
    }
    out.push({ name, u: m.u, v: m.v, front: m.front, flip: f.kind !== 'drum' && alongV(m.u, m.v), fort: n, scale: f.kind === 'drum' ? 0.7 : 1 });
  });
  // the stamps
  let hut = 0;
  for (const s of bp.stamps) {
    if (s.kind === 'solid') {
      const tiles = rectTiles(w, s.rect);
      for (const t of tiles) taken.add(t);
      const m = mid(tiles);
      // (the Barrow Necropolis's own buildings by their names: its mausoleums, charnel houses, coffin heaps and witch fires; the Howling
      //  Den's hide tents, drying racks and great den; Elder Root's leaf tents, and the Elder Root itself, its keep, the owner's painting)
      const name = s.name === 'Longhouse' ? 'longhouse' : s.name === 'Hide hut' || s.name === 'Storehouse' || s.name === 'Armoury' ? 'hideHut' : s.name === 'Log pile' ? 'woodpile' : s.name === 'Reserve tent' || s.name === 'War tent' || s.name === 'Charnel tent' || s.name === 'Hide tent' || s.name === 'Leaf tent' ? 'warTent' : s.name === 'Bonfire' || s.name === 'Witch fire' ? 'bonfire' : s.name === 'Drying rack' ? 'meatRacks' : s.name === 'The Elder Root' || s.name.startsWith('The keep') || / (keep|den)$/.test(s.name) || s.name === 'The Bull Temple' || s.name === 'The Hall of Tusks' || s.name === 'The Demon Spire' || s.name === 'The Shrine of the Moon' || s.name === 'The Great Foundry' ? 'keep' : s.name === 'Mausoleum' ? 'mausoleum' : s.name === 'Charnel house' ? 'crypt' : s.name === 'Coffin heap' ? 'coffinStack' : 'stockpile';
      const flip = s.rect.u1 - s.rect.u0 < s.rect.v1 - s.rect.v0;
      out.push({ name, u: m.u, v: m.v, front: m.front, flip, scale: name === 'keep' ? 0.62 : name === 'longhouse' || name === 'mausoleum' ? 0.95 : name === 'bonfire' ? 0.7 : 1, ...(s.burns ? { hut: hut++ } : {}) });
    } else if (s.kind === 'perch') {
      const tiles = rectTiles(w, s.rect);
      const m = mid(tiles);
      // (the corner towers' crenellated tops, the gate towers' perches, the watchtowers on their crags)
      const name = /corner tower/.test(s.name) ? 'cornerTower' : /Watchtower|Ossuary Tower|Lookout|Watch Tree/.test(s.name) ? 'watchtower' : 'gateTower';
      for (const t of tiles) taken.add(t);
      // (sorted with the perch's back tile: its crew stand on it and are drawn over it, never hidden under its floor)
      out.push({ name, u: m.u, v: m.v, front: m.front, depth: tiles[0], scale: name === 'watchtower' ? 0.9 : name === 'gateTower' ? 0.8 : 1 });
    } else if (s.kind === 'barricade') {
      for (const p of s.tiles) {
        const t = p.v * w + p.u;
        taken.add(t);
        // (the tiles of a run along v, sharing a u with the rest of it, are mirrored; a maze's walls by their neighbours: `mazePiece`)
        if (s.look === 'maze') out.push({ ...mazePiece(s.tiles, p), u: p.u, v: p.v, front: t });
        else out.push({ name: 'barricade', u: p.u, v: p.v, front: t, flip: s.tiles.filter((q) => q.u === p.u).length > 2 });
      }
    } else if (s.kind === 'fence') {
      const m = mid(rectTiles(w, s.rect));
      // (the pens: the kit's warg pen and pig pen drawn low, for a fence that does not block)
      out.push({ name: s.rect.u0 > 70 ? 'wargPen' : 'pigPen', u: m.u, v: m.v, front: m.front, scale: 0.9, low: true });
    } else if (s.kind === 'piece') {
      const t = s.at.v * w + s.at.u;
      const n0 = out.length;
      // (the king's trebuchet stands in our camp at the siege park, in a tent's place: its volleys are thrown from here)
      if (s.piece === 'tent' && bp.park && s.at.u === bp.park.u && s.at.v === bp.park.v) out.push({ name: 'trebuchet', u: s.at.u, v: s.at.v, front: t, scale: 0.9 });
      else if (s.piece === 'tent') out.push({ name: 'conicalTent', u: s.at.u, v: s.at.v, front: t, tint: 0x8fb4ff });
      else if (s.piece === 'skulls') out.push(s.at.u === 48 && s.at.v === 47 ? { name: 'throne', u: s.at.u, v: s.at.v, front: t, scale: 1.2 } : { name: 'skullPile', u: s.at.u, v: s.at.v, front: t });
      else if (s.piece === 'flag') out.push(s.at.u === 49 && s.at.v === 46 ? { name: 'greatBanner', u: s.at.u, v: s.at.v, front: t } : { name: 'flag', road: 'flag', u: s.at.u, v: s.at.v, front: t });
      else if (s.piece === 'campfire') out.push(s.at.u === 34 && s.at.v === 50 ? { name: 'bonefire', u: s.at.u, v: s.at.v, front: t, scale: 0.6 } : { name: 'bonfire', u: s.at.u, v: s.at.v, front: t, scale: 0.6 });
      else if (s.piece === 'brazier') out.push({ name: 'brazier', u: s.at.u, v: s.at.v, front: t });
      else out.push({ name: s.piece, road: s.piece, u: s.at.u, v: s.at.v, front: t });
      for (let k = n0; k < out.length; k++) out[k].set = true;
      taken.add(t);
    }
  }
  // the stone wall's crenels along its outer edge, and a brazier every eighth tile of the walk
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < w; u++) {
      const i = v * w + u;
      if (zone[i] !== Z('S') || taken.has(i) || b.tiles[i].perch || b.tiles[i].ladder) continue;
      const ring = Math.max(Math.abs(u - 49.5), Math.abs(v - 49.5));
      if (ring > 11) out.push({ name: 'crenel', u, v, front: i, flip: alongV(u, v), scale: 0.9 });
      else if ((u + v) % 8 === 0) out.push({ name: 'wallBrazier', u, v, front: i, scale: 0.8 });
    }
  // the tiles themselves: barrels, ruins, boulders and trees on the solid tiles, bushes
  const orcs = bp.army === 'orcs';
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < w; u++) {
      const i = v * w + u;
      if (taken.has(i)) continue;
      const t = b.tiles[i];
      const z = zone[i];
      const r = hash(u, v, 31);
      if (t.barrel) out.push({ name: 'barrels', u, v, front: i, scale: 0.6 });
      // (the ruined walls: Bloodtusk Hold's the kit's ruined arches; every other hold's its own painted ruins, `ruinA` and `ruinB` of its ruins
      //  sheet, or the Orc sheet's burnt shells, recoloured, until it is painted: `lookOf` in fieldView.ts)
      else if (t.wall) out.push(z === Z('V') && r < 0.3 ? { name: 'burntHeap', u, v, front: i, scale: 0.45 } : orcs ? { name: r < 0.5 ? 'ruin1' : 'ruin2', u, v, front: i, scale: 0.75 } : { name: r < 0.5 ? 'ruinA' : 'ruinB', u, v, front: i, scale: 0.45 });
      else if (t.rock) {
        const trees = z === Z('N') ? ['burntTree', 'gnarledTree'] : z === Z('V') ? ['burntTree'] : ['pine1', 'gnarledTree', 'pine1'];
        // (the land's own boulders in the open fields, the kit's dark rocks inside the walls and on the Warpath)
        // (every hold but Bloodtusk takes its own painted boulders in the fields, the wet boulders of its water's sheet, not the land's grey)
        const rocks = z === Z('K') || z === Z('T') || z === Z('L') ? [orcs ? 'landBoulder' : 'wetBoulders'] : ['darkRocks', 'darkRocksB'];
        // (the outer bailey's solid tiles are the war camp's tents in rows)
        if (z === Z('B')) {
          const tents = ['conicalTent', 'conicalTent', 'leanTo', 'hideFrame'];
          out.push({ name: tents[Math.floor(hash(u, v, 33) * tents.length)], u, v, front: i, scale: 0.85 });
          continue;
        }
        const tree = r < (z === Z('K') || z === Z('T') ? 0.35 : z === Z('N') || z === Z('V') ? 0.3 : 0);
        const set = tree ? trees : rocks;
        out.push({ name: set[Math.floor(hash(u, v, 32) * set.length)], u, v, front: i, scale: tree ? 0.85 : 0.7 });
      } else if (t.bush) out.push({ name: ['thornBush', 'shrub1', 'shrub2'][Math.floor(r * 3)], u, v, front: i, scale: 0.6, low: true });
    }
  // a banner at each post outside the walls; the plan's new landmarks (poles and stones, no walls)
  for (const p of bp.posts) {
    if (p.zone !== 'fields') continue;
    out.push({ name: 'smallBanner', u: p.at.u + 0.4, v: p.at.v - 0.4, front: p.at.v * w + p.at.u, scale: 0.8 });
  }
  const mark = (name: string, u: number, v: number, scale = 1) => out.push({ name, u, v, front: v * w + u, scale });
  mark('spearSign', 12, 45);
  mark('wolfTotem', 13, 44);
  mark('spearSign', 11, 47);
  mark('tuskTotem', 45, 12);
  mark('skullTorch', 47, 13, 0.8);
  mark('pennantPole', bp.warpath.u + 2, bp.warpath.v + 2);
  mark('smallBanner', 88, 45);
  return out;
}

/** A structure's picture for its state: whole, battered (under 60%), broken (under 25%, a palisade's), or fallen (its breach). */
export function fortLook(kind: string, hp: number, maxHp: number, broken: boolean, open: boolean): string {
  const share = maxHp > 0 ? hp / maxHp : 0;
  if (kind === 'palisade') return broken ? 'palisadeBreach' : share < 0.25 ? 'palisadeBroken' : share < 0.6 ? 'palisadeBattered' : 'palisadeRun';
  if (kind === 'drum') return broken ? 'drumSilenced' : 'drumStruck';
  const base = kind === 'ironGate' ? 'ironGate' : kind === 'northGate' ? 'northGate' : kind === 'southGate' ? 'southGate' : 'sallyPort';
  if (broken || open) return `${base}Broken`;
  // (the North Gate's sheet has no battered picture)
  if (share < 0.6 && base !== 'northGate') return `${base}Battered`;
  return base;
}
