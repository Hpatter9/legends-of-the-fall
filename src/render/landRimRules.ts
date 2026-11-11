// LAND-IDENTITY (docs/notes/land-identity.md): what stands round and on a battlefield that says where you are, as plain rules (pure: no
// Pixi, no DOM; `boardView.ts` and `boardLife.ts` draw from them and the tests read them). Looks only: nothing here is a tile of the
// board, nothing here is read by the fight, and nothing draws from a stream (where things stand is a hash of the board's seed).
//
// - THE RIM: columns of the land's own ground laid OUTSIDE the board, along its two far edges (behind every fighter, so they hide
//   nobody): cavern walls rising round the caves, open water round the mire. Each carries the land's set pieces. A land of water may
//   also ring the two near edges, but only below the board and only with things that lie flat.
// - DRESSING: small things on the board's own tiles where nobody is hidden by them: reeds and lilies on water, wet ground on the
//   lowest tiles.
// - LIGHT: how dark a land is, and what lights it. One dark layer over the board with a pool cut out round each light.

import { type Area, type Board, type Tile } from '../sim/board';
import { hash, noise } from './fieldLooks';
import type { Role } from './floorRules';

/** A set piece: a standing sprite of the land's hold sheet (`src/art/assault/<hold>/sprites.webp`, by its name in the atlas). */
export interface RimPiece {
  name: string;
  scale: number;
  /** Px from the tile's middle. */
  dx: number;
  dy: number;
  /** A light it gives (its colour, how far up the piece it sits in px, how far its pool reaches in tiles). */
  light?: { colour: number; up: number; reach: number };
  /** It sways (growth), or drifts and breathes (mist, a wisp). */
  sway?: boolean;
  drift?: boolean;
}

/** One column of the rim: where it stands (outside the board), how high, what it is made of, and what stands on it. */
export interface RimTile {
  u: number;
  v: number;
  h: number;
  role: Role;
  /** The tile it is painted as (its ground, for the painter's marks: water has ripples). */
  ground?: Tile['ground'];
  pieces: RimPiece[];
  /** A light on its face that looks onto the board (a torch in a sconce): px up from its foot. */
  near: boolean;
}

/** How a land's rim is laid. */
export interface RimSpec {
  /** How many columns deep along the two far edges, and along the two near ones (only a land of water has any there). */
  far: number;
  near: number;
  /** A wall rises over the board's edge by this many steps (min, max, by a smooth noise), and one more a ring further out; or the rim
   *  lies at a fixed height (water: at the foot). */
  rise?: [number, number];
  level?: number;
  role: Role;
  second?: Role;
  ground?: Tile['ground'];
}

export const RIMS: Partial<Record<Area, RimSpec>> = {
  // (the caves: rock walls rising along the back and the side, so the board sits inside a cavern)
  crystal: { far: 2, near: 0, rise: [3, 6], role: 'outcrop', second: 'high' },
  // (the mire: open water all round, deeper further out; the board is an island in it)
  swamp: { far: 3, near: 2, level: 0, role: 'water', second: 'deep', ground: 'water' },
};

/** A wall's torches: one about every this many columns along a far edge. */
export const TORCH_EVERY = 3;
/** The most set pieces a rim carries, and the most that give light. */
export const RIM_PIECES_MAX = 40;
export const RIM_LIGHTS_MAX = 10;

const LIGHT_WARM = 0xffa040;
const LIGHT_VIOLET = 0xb090ff;
const LIGHT_WISP = 0x9affd0;

/** The pieces a rim column carries, by land: a hash of the seed and the column says which (most columns carry none). */
function piecesFor(area: Area, b: Board, u: number, v: number, ring: number, nearEdge: boolean, onWater: boolean): RimPiece[] {
  const salt = (b.seed & 0xffff) + 301;
  const r = hash(u + 40, v + 40, salt);
  const r2 = hash(u + 40, v + 40, salt + 9);
  const jx = Math.round((r2 - 0.5) * 14);
  if (area === 'crystal') {
    // crystal spires and broken rock on the walls' tops; a few tall ones further back
    if (r < 0.2) return [{ name: 'darkRocksB', scale: 1.15, dx: jx, dy: 2, light: { colour: LIGHT_VIOLET, up: 30, reach: 1.6 } }];
    if (r < 0.42) return [{ name: 'darkRocks', scale: 1.1, dx: jx, dy: 4 }];
    if (r < 0.52 && ring > 0) return [{ name: 'boulders', scale: 0.9, dx: jx, dy: 2 }];
    return [];
  }
  if (area === 'swamp') {
    if (nearEdge) return r < 0.3 ? [{ name: 'waterFlowers', scale: 0.8, dx: jx, dy: 0 }] : r < 0.42 ? [{ name: 'waterPlants', scale: 0.7, dx: jx, dy: 0, sway: true }] : [];
    if (!onWater) return [];
    // trees standing in the water further out, reeds and lilies nearer the board, a sunken log, wisps and mist over it
    if (ring >= 1 && r < 0.16) return [{ name: r2 < 0.5 ? 'gnarledTree' : 'weepingWillow', scale: r2 < 0.5 ? 0.62 : 0.8, dx: jx, dy: 6, sway: true }];
    if (r < 0.34) return [{ name: 'reeds2', scale: 0.8, dx: jx, dy: 6, sway: true }];
    if (r < 0.5) return [{ name: 'waterFlowers', scale: 0.85, dx: jx, dy: 2 }];
    if (r < 0.6) return [{ name: 'waterPlants', scale: 0.85, dx: jx, dy: 4, sway: true }];
    if (r < 0.66) return [{ name: 'sunkenLog', scale: 0.85, dx: jx, dy: 4 }];
    if (r < 0.72) return [{ name: 'wetBoulders', scale: 0.8, dx: jx, dy: 4 }];
    if (r < 0.79) return [{ name: 'waterProp14', scale: 0.8, dx: jx, dy: -10, drift: true, light: { colour: LIGHT_WISP, up: 8, reach: 1.2 } }];
    if (r < 0.88) return [{ name: 'mist', scale: 1.6, dx: jx, dy: -2, drift: true }];
    return [];
  }
  return [];
}

/** A land's rim for a board: every column outside it, back to front. Empty for a land with none, for an army's road (it has its own
 *  land beside it) and for a field too big to be a battlefield. */
export function rimOf(b: Board): RimTile[] {
  const spec = RIMS[b.area];
  if (!spec || b.w * b.d > 400 || b.tiles.some((t) => t.scene) || b.props?.length) return [];
  const { w, d } = b;
  const salt = b.seed & 0xffff;
  const out: RimTile[] = [];
  const edgeH = (u: number, v: number) => b.tiles[Math.max(0, Math.min(d - 1, v)) * w + Math.max(0, Math.min(w - 1, u))].h;
  let pieces = 0;
  let lights = 0;
  const add = (u: number, v: number, ring: number, nearEdge: boolean) => {
    let h: number;
    if (spec.rise) {
      // (over the highest of the board's edge tiles beside it, so the wall always stands over the board)
      const base = Math.max(edgeH(u - 1, v), edgeH(u, v), edgeH(u + 1, v), edgeH(u, v - 1), edgeH(u, v + 1));
      h = base + spec.rise[0] + Math.round(noise(u + 20, v + 20, 2.6, salt + 5) * (spec.rise[1] - spec.rise[0])) + ring;
    } else h = spec.level ?? 0;
    const role = ring > 0 && spec.second ? spec.second : spec.role;
    const onWater = role === 'water' || role === 'deep';
    let ps = pieces < RIM_PIECES_MAX ? piecesFor(b.area, b, u, v, ring, nearEdge, onWater) : [];
    if (ps.some((p) => p.light) && lights >= RIM_LIGHTS_MAX) ps = ps.map(({ light, ...p }) => (void light, p));
    pieces += ps.length;
    lights += ps.filter((p) => p.light).length;
    out.push({ u, v, h, role, ground: onWater ? (role === 'deep' ? 'deep' : spec.ground) : undefined, pieces: ps, near: nearEdge });
  };
  // the far edges: beyond row 0 (v < 0) and beyond column 0 (u < 0), with the corner between them
  for (let ring = 0; ring < spec.far; ring++) {
    const k = -1 - ring;
    for (let u = k; u < w + (spec.near ? spec.near : 0); u++) add(u, k, ring, false);
    for (let v = k + 1; v < d + (spec.near ? spec.near : 0); v++) add(k, v, ring, false);
  }
  // the near edges (a land of water only): beyond the last row and the last column, below the board
  for (let ring = 0; ring < spec.near; ring++) {
    for (let u = 0; u < w + ring + 1; u++) add(u, d + ring, ring, true);
    for (let v = 0; v < d + ring; v++) add(w + ring, v, ring, true);
  }
  // back to front, as the board is drawn
  return out.sort((x, y) => x.u + x.v - (y.u + y.v) || x.u - y.u);
}

/** The torches on a wall's face that looks onto the board: at the foot of the first ring, one about every `TORCH_EVERY` columns along
 *  each far edge, on the columns whose hash says so. Each is where it hangs (the board tile it stands behind, and which edge). */
export function wallTorches(b: Board): { u: number; v: number; edge: 'v' | 'u' }[] {
  const spec = RIMS[b.area];
  if (!spec?.rise || b.w * b.d > 400 || b.tiles.some((t) => t.scene)) return [];
  const salt = (b.seed & 0xffff) + 811;
  const out: { u: number; v: number; edge: 'v' | 'u' }[] = [];
  const start = Math.floor(hash(1, 2, salt) * TORCH_EVERY);
  for (let u = start; u < b.w; u += TORCH_EVERY) out.push({ u, v: -1, edge: 'v' });
  for (let v = (start + 1) % TORCH_EVERY; v < b.d; v += TORCH_EVERY) out.push({ u: -1, v, edge: 'u' });
  return out;
}

/** The colour of a wall torch's light. */
export const TORCH_LIGHT = LIGHT_WARM;

// ---- dressing on the board's own tiles ----------------------------------------------------------------------------------------------

/** A small thing standing on one of the board's own tiles, at its back corner (behind whoever stands there). */
export interface Dressing {
  i: number;
  piece: RimPiece;
}

/** The dressing a land lays on its own tiles: reeds and lilies on the mire's water. Never on a trap or a strike's tile, and low: a
 *  fighter standing in the water shows over it. */
export function dressingOf(b: Board): Dressing[] {
  if (b.w * b.d > 400 || b.tiles.some((t) => t.scene)) return [];
  const salt = (b.seed & 0xffff) + 517;
  const out: Dressing[] = [];
  if (b.area !== 'swamp') return out;
  b.tiles.forEach((t, i) => {
    if (t.trap || t.risk || t.bridge) return;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    const r = hash(u, v, salt);
    const back = r < 0.5 ? -14 : 14;
    if (t.ground === 'water' && r < 0.45) out.push({ i, piece: { name: 'reeds1', scale: 0.7, dx: back, dy: -5, sway: true } });
    else if (t.ground === 'water' && r < 0.7) out.push({ i, piece: { name: 'waterFlowers', scale: 0.55, dx: back * 0.6, dy: 3 } });
    else if (t.ground === 'deep' && r < 0.5) out.push({ i, piece: { name: 'waterFlowers', scale: 0.7, dx: Math.round((r - 0.25) * 30), dy: 2 } });
    else if (t.ground === 'deep' && r < 0.62) out.push({ i, piece: { name: 'waterPlants', scale: 0.7, dx: back * 0.5, dy: 2, sway: true } });
  });
  return out;
}

/** The lands whose lowest open ground lies wet (looks only: it is drawn as the land's shore, with standing water lying on it; to the
 *  rules it is plain ground). */
export const WET_LOW: readonly Area[] = ['swamp'];
/** Whether a tile is one of a wet land's lowest: at the board's lowest open height, plain ground. */
export function wetLow(b: Board, i: number): boolean {
  if (!WET_LOW.includes(b.area)) return false;
  const t = b.tiles[i];
  if (t.ground || t.rock || t.wall || t.barrel || t.brazier || t.bridge || t.scene || t.trap) return false;
  let low = Infinity;
  for (const x of b.tiles) if (!x.ground && !x.rock && !x.wall && !x.scene) low = Math.min(low, x.h);
  return t.h === low;
}

// ---- light --------------------------------------------------------------------------------------------------------------------------

export interface LandLight {
  /** How dark the land lies under its own roof or sky (the dark layer's alpha, 0 to 1) and in what colour. */
  dark: number;
  colour: number;
}

/** The lands that are dark, lit by their own lights. The alpha is capped by `MAX_DARK`: under it a hero and a dark foe still stand out
 *  from the ground (the test holds the same contrast rule the floors pass). */
export const LAND_LIGHT: Partial<Record<Area, LandLight>> = {
  crystal: { dark: 0.4, colour: 0x0a0824 },
  // (the mire is not darkened: its ground sits just lighter than a hero, and any dark over it brings the two together)
};
export const MAX_DARK = 0.42;

/** One light on the board: where (in tiles, fractions allowed, and how high), its colour, and how far its pool reaches (in tiles). */
export interface LightSpot {
  u: number;
  v: number;
  h: number;
  colour: number;
  reach: number;
  kind: 'torch' | 'lava' | 'magic';
}

/** Every light of a board: its wall torches and its rim's glowing pieces, braziers, lava and coals, shrines, wards and totems. */
export function lightsOf(b: Board, rim: readonly RimTile[] = rimOf(b)): LightSpot[] {
  const out: LightSpot[] = [];
  const w = b.w;
  for (const t of wallTorches(b)) {
    const edge = b.tiles[Math.max(0, t.v) * w + Math.max(0, t.u)];
    out.push({ u: t.u + (t.edge === 'u' ? 0.5 : 0), v: t.v + (t.edge === 'v' ? 0.5 : 0), h: edge.h + 1.6, colour: TORCH_LIGHT, reach: 2.6, kind: 'torch' });
  }
  for (const r of rim) for (const p of r.pieces) if (p.light) out.push({ u: r.u, v: r.v, h: r.h, colour: p.light.colour, reach: p.light.reach, kind: 'magic' });
  b.tiles.forEach((t, i) => {
    const at = { u: i % w, v: Math.floor(i / w), h: t.h };
    if (t.brazier) out.push({ ...at, colour: LIGHT_WARM, reach: 2.4, kind: 'torch' });
    else if (t.ground === 'lava' || t.ground === 'coals') out.push({ ...at, colour: 0xff7a30, reach: 1.5, kind: 'lava' });
    else if (t.ground === 'shrine') out.push({ ...at, colour: 0x90ffe0, reach: 1.8, kind: 'magic' });
    else if (t.trap === 'ward' || t.trap === 'totem') out.push({ ...at, colour: t.trap === 'ward' ? 0xaa82ff : 0xe6963c, reach: 1.3, kind: 'magic' });
  });
  return out;
}
