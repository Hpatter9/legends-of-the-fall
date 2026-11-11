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
   *  lies at a fixed height (water: at the foot); or it is open country that follows the board's own edge, up or down by a step or two
   *  (min, max, by the same noise). */
  rise?: [number, number];
  level?: number;
  follow?: [number, number];
  role: Role;
  second?: Role;
  /** The rings past the first lie at this fixed height (a river of lava beyond the rocks). */
  secondLevel?: number;
  ground?: Tile['ground'];
  /** The colour of a wall's torches (a walled land only); warm fire unless given. */
  torch?: number;
}

export const RIMS: Record<Area, RimSpec> = {
  // (the caves: rock walls rising along the back and the side, so the board sits inside a cavern)
  crystal: { far: 2, near: 0, rise: [3, 6], role: 'outcrop', second: 'high' },
  // (the mire: open water all round, deeper further out; the board is an island in it)
  swamp: { far: 3, near: 2, level: 0, role: 'water', second: 'deep', ground: 'water' },
  // (the crypt: walls of dressed stone, tombs and angels along their tops, cold lamps)
  dungeon: { far: 2, near: 0, rise: [3, 5], role: 'outcrop', second: 'high', torch: 0x70e8c8 },
  // (the forge: stone walls hung with pipes, gears and furnaces)
  forge: { far: 2, near: 0, rise: [3, 5], role: 'outcrop', second: 'high' },
  // (open country: the land's own ground runs on past the far edges, and carries what grows and stands there)
  highlands: { far: 2, near: 0, follow: [0, 2], role: 'outcrop', second: 'high' },
  forest: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'high' },
  snow: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'high' },
  desert: { far: 2, near: 0, follow: [0, 2], role: 'ground', second: 'outcrop' },
  oasis: { far: 2, near: 0, follow: [0, 1], role: 'shore', second: 'ground' },
  plains: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'second' },
  autumn: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'second' },
  graveyard: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'high' },
  ruins: { far: 2, near: 0, follow: [0, 2], role: 'outcrop', second: 'high' },
  // (the temple: a raised terrace of pale stone behind the lawns)
  temple: { far: 2, near: 0, follow: [1, 2], role: 'high', second: 'outcrop' },
  shrine: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'high' },
  warcamp: { far: 2, near: 0, follow: [0, 1], role: 'ground', second: 'second' },
  // (the ashlands: black rock at the edge, and a river of lava beyond it)
  volcano: { far: 3, near: 0, follow: [0, 1], role: 'outcrop', second: 'lava', secondLevel: 0 },
};

/** A wall's torches: one about every this many columns along a far edge. */
export const TORCH_EVERY = 3;
/** The most set pieces a rim carries, and the most that give light. */
export const RIM_PIECES_MAX = 40;
export const RIM_LIGHTS_MAX = 10;

const LIGHT_WARM = 0xffa040;
const LIGHT_VIOLET = 0xb090ff;
const LIGHT_WISP = 0x9affd0;
const LIGHT_COLD = 0x70e8c8;
const LIGHT_LAVA = 0xff7a30;
const LIGHT_LANTERN = 0xffd890;

/** One line of a land's list: the piece, its share of the columns, and where it may stand (which ring; trees and tents stand further
 *  back, fences and low things at the board's edge). */
interface Pick {
  name: string;
  share: number;
  scale: number;
  ring?: 0 | 1;
  dy?: number;
  sway?: boolean;
  drift?: boolean;
  light?: { colour: number; up: number; reach: number };
  /** Only on the rim's liquid (lava), or only off it. */
  wet?: boolean;
}

/** What stands on each land's rim, from its own hold sheet (the shares of a ring add to under 1: the rest of the columns are bare). */
const PICKS: Partial<Record<Area, Pick[]>> = {
  // (the high country: boulders, pines and a standing stone)
  highlands: [
    { name: 'boulders', share: 0.2, scale: 0.85 },
    { name: 'pine1', share: 0.16, scale: 0.95, ring: 1, sway: true },
    { name: 'pine2', share: 0.1, scale: 0.9, ring: 1, sway: true },
    { name: 'rocks', share: 0.1, scale: 0.9 },
    { name: 'standingStone', share: 0.05, scale: 0.7, ring: 1 },
    { name: 'darkRocks', share: 0.06, scale: 0.9 },
  ],
  // (the wood: great oaks and pines standing thick behind the board, ferns, a hollow log, toadstools)
  forest: [
    { name: 'greatOak', share: 0.2, scale: 0.85, ring: 1, sway: true },
    { name: 'pine1', share: 0.14, scale: 0.95, ring: 1, sway: true },
    { name: 'pine2', share: 0.16, scale: 0.9, sway: true },
    { name: 'boulders', share: 0.08, scale: 0.75 },
    { name: 'prop14', share: 0.1, scale: 0.9, ring: 0, sway: true },
    { name: 'prop13', share: 0.08, scale: 0.9, ring: 0, sway: true },
    { name: 'prop5', share: 0.06, scale: 0.9, ring: 0 },
    { name: 'prop6', share: 0.05, scale: 0.85, ring: 0 },
  ],
  // (the snows: white pines, drifts, bare trees, and a frozen fall now and then)
  snow: [
    { name: 'snowyPine', share: 0.24, scale: 0.95, sway: true },
    { name: 'pine2', share: 0.08, scale: 0.9, ring: 1 },
    { name: 'snowyBush', share: 0.1, scale: 0.9 },
    { name: 'prop15', share: 0.12, scale: 0.9 },
    { name: 'bareTree', share: 0.08, scale: 0.9 },
    { name: 'boulders', share: 0.08, scale: 0.8 },
    { name: 'landmarkD', share: 0.03, scale: 0.75, ring: 1 },
  ],
  // (the dunes: red rock, dead thorn, old bones, a fallen column of something older)
  desert: [
    { name: 'boulders', share: 0.14, scale: 0.75 },
    { name: 'thornBush', share: 0.1, scale: 0.75 },
    { name: 'bareTree', share: 0.07, scale: 0.8, ring: 1 },
    { name: 'prop8', share: 0.09, scale: 0.9 },
    { name: 'rocks', share: 0.08, scale: 0.9 },
    { name: 'prop4', share: 0.05, scale: 0.85 },
    { name: 'landmarkD', share: 0.03, scale: 0.7, ring: 1 },
  ],
  // (the oasis: shade trees on the green, tents and jars of a caravan)
  oasis: [
    { name: 'pine1', share: 0.14, scale: 0.7, ring: 1, sway: true },
    { name: 'prop2', share: 0.16, scale: 0.9, sway: true },
    { name: 'prop3', share: 0.1, scale: 0.9, sway: true },
    { name: 'pine2', share: 0.1, scale: 0.9, sway: true },
    { name: 'pavilionTent', share: 0.05, scale: 0.7, ring: 1 },
    { name: 'campTent', share: 0.04, scale: 0.7, ring: 1 },
    { name: 'prop1', share: 0.07, scale: 0.85, ring: 0 },
  ],
  // (the meadows: long grass, a far copse, a well and a wood stack)
  plains: [
    { name: 'tallGrass', share: 0.22, scale: 0.8, sway: true },
    { name: 'pine1', share: 0.16, scale: 0.9, ring: 1, sway: true },
    { name: 'fallenLog', share: 0.05, scale: 0.8 },
    { name: 'woodpile', share: 0.04, scale: 0.75, ring: 1 },
    { name: 'well', share: 0.03, scale: 0.75, ring: 1 },
    { name: 'stump1', share: 0.05, scale: 0.9 },
  ],
  // (the autumn wood: gold birches, red brush, logs and stumps)
  autumn: [
    { name: 'prop13', share: 0.3, scale: 1, sway: true },
    { name: 'prop14', share: 0.16, scale: 0.95, sway: true },
    { name: 'fallenLog', share: 0.07, scale: 0.8 },
    { name: 'stump1', share: 0.06, scale: 0.9 },
    { name: 'woodpile', share: 0.04, scale: 0.75, ring: 1 },
    { name: 'prop9', share: 0.03, scale: 0.9, ring: 1 },
  ],
  // (the graveyard: headstones and crosses, an iron fence, dead trees, a mausoleum, lamps and mist)
  graveyard: [
    { name: 'kitStakeFence', share: 0.2, scale: 0.8, ring: 0 },
    { name: 'prop1', share: 0.14, scale: 0.9 },
    { name: 'prop2', share: 0.12, scale: 0.9 },
    { name: 'gnarledTree', share: 0.12, scale: 0.9, ring: 1 },
    { name: 'bareTree', share: 0.08, scale: 0.9, ring: 1 },
    { name: 'prop9', share: 0.05, scale: 0.9 },
    { name: 'mausoleum', share: 0.04, scale: 0.7, ring: 1 },
    { name: 'prop10', share: 0.05, scale: 0.9, light: { colour: LIGHT_COLD, up: 34, reach: 1.4 } },
    { name: 'mist', share: 0.1, scale: 1.5, drift: true, dy: -2 },
  ],
  // (the ruins: standing and fallen columns, broken walls under ivy, a statue)
  ruins: [
    { name: 'prop5', share: 0.16, scale: 1 },
    { name: 'prop4', share: 0.1, scale: 0.9 },
    { name: 'mazeVine', share: 0.08, scale: 0.9, ring: 0 },
    { name: 'mazeBroken', share: 0.08, scale: 0.9, ring: 0 },
    { name: 'mazeCracked', share: 0.06, scale: 0.9, ring: 0 },
    { name: 'ruinA', share: 0.05, scale: 0.6, ring: 1 },
    { name: 'ruinB', share: 0.05, scale: 0.6, ring: 1 },
    { name: 'prop7', share: 0.05, scale: 0.9 },
    { name: 'prop2', share: 0.08, scale: 0.85, sway: true },
  ],
  // (the temple: a colonnade, braziers, banners, an altar and its bull)
  temple: [
    { name: 'prop5', share: 0.26, scale: 1.1 },
    { name: 'prop6', share: 0.12, scale: 1, light: { colour: LIGHT_WARM, up: 24, reach: 1.6 } },
    { name: 'mazeBanner', share: 0.1, scale: 0.9, ring: 0 },
    { name: 'prop7', share: 0.06, scale: 0.9 },
    { name: 'prop3', share: 0.1, scale: 0.95, ring: 1, sway: true },
    { name: 'landmarkC', share: 0.04, scale: 0.6, ring: 1 },
    { name: 'landmarkB', share: 0.03, scale: 0.6, ring: 1 },
  ],
  // (the shrine: blossom and wish trees, bamboo, stone lanterns, small gates, a fox)
  shrine: [
    { name: 'prop1', share: 0.2, scale: 0.95, sway: true },
    { name: 'prop3', share: 0.12, scale: 0.95, sway: true },
    { name: 'prop2', share: 0.08, scale: 0.9, ring: 1 },
    { name: 'prop4', share: 0.1, scale: 0.9, light: { colour: LIGHT_LANTERN, up: 30, reach: 1.5 } },
    { name: 'prop5', share: 0.08, scale: 1, ring: 0 },
    { name: 'prop8', share: 0.06, scale: 0.9, light: { colour: LIGHT_LANTERN, up: 40, reach: 1.4 } },
    { name: 'prop6', share: 0.05, scale: 0.9 },
    { name: 'prop12', share: 0.05, scale: 0.9, ring: 1, sway: true },
    { name: 'landmarkA', share: 0.03, scale: 0.6, ring: 1 },
  ],
  // (the war camp: a stake line at the board's edge; tents, banners, fires and a watchtower behind it)
  warcamp: [
    { name: 'stakeLine', share: 0.34, scale: 0.9, ring: 0 },
    { name: 'smallBanner', share: 0.1, scale: 0.85, ring: 0, sway: true },
    { name: 'warTent', share: 0.12, scale: 0.6, ring: 1 },
    { name: 'conicalTent', share: 0.12, scale: 0.75, ring: 1 },
    { name: 'greatBanner', share: 0.1, scale: 0.85, ring: 1, sway: true },
    { name: 'bonfire', share: 0.06, scale: 0.7, ring: 1, light: { colour: LIGHT_WARM, up: 20, reach: 1.8 } },
    { name: 'watchtower', share: 0.05, scale: 0.75, ring: 1 },
    { name: 'woodpile', share: 0.05, scale: 0.7, ring: 1 },
  ],
  // (the ashlands: burnt and burning trees and spires of glowing rock on the black edge; vents smoking in the lava beyond)
  volcano: [
    { name: 'burntTree', share: 0.14, scale: 0.9, wet: false },
    { name: 'prop10', share: 0.1, scale: 0.9, wet: false, light: { colour: LIGHT_LAVA, up: 20, reach: 1.3 } },
    { name: 'prop5', share: 0.14, scale: 1, wet: false, light: { colour: LIGHT_LAVA, up: 16, reach: 1.2 } },
    { name: 'prop9', share: 0.1, scale: 0.9, wet: false },
    { name: 'prop11', share: 0.05, scale: 0.9, wet: false },
    { name: 'landmarkD', share: 0.04, scale: 0.7, wet: false, light: { colour: LIGHT_LAVA, up: 30, reach: 1.8 } },
    { name: 'waterProp13', share: 0.16, scale: 1, wet: true, drift: true, dy: -6 },
    { name: 'prop5', share: 0.1, scale: 0.8, wet: true },
  ],
  // (the crypt's wall tops: tombs, coffins, angels, skulls and cold lamps)
  dungeon: [
    { name: 'prop3', share: 0.12, scale: 0.9 },
    { name: 'coffinStack', share: 0.08, scale: 0.85 },
    { name: 'prop9', share: 0.08, scale: 0.9 },
    { name: 'skullPile', share: 0.08, scale: 0.8 },
    { name: 'prop10', share: 0.1, scale: 0.9, light: { colour: LIGHT_COLD, up: 34, reach: 1.4 } },
    { name: 'wallDrift', share: 0.05, scale: 0.9 },
  ],
  // (the forge's wall tops: pipes and gauges, gears, a furnace, a crane, chains)
  forge: [
    { name: 'prop5', share: 0.14, scale: 0.9 },
    { name: 'prop4', share: 0.1, scale: 0.9 },
    { name: 'forgeFire', share: 0.08, scale: 0.75, light: { colour: LIGHT_WARM, up: 20, reach: 1.6 } },
    { name: 'prop7', share: 0.06, scale: 0.85 },
    { name: 'prop15', share: 0.08, scale: 0.9 },
    { name: 'landmarkA', share: 0.04, scale: 0.65, ring: 1, light: { colour: LIGHT_LAVA, up: 24, reach: 1.8 } },
    { name: 'waterProp13', share: 0.05, scale: 0.9, ring: 0 },
  ],
};

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
  // (the other lands: down the land's list, taking the lines that may stand on this ring and this ground)
  let at = 0;
  for (const p of PICKS[area] ?? []) {
    if (p.ring !== undefined && (p.ring === 0) !== (ring === 0)) continue;
    if (p.wet !== undefined && p.wet !== onWater) continue;
    if (p.wet === undefined && onWater) continue;
    at += p.share;
    if (r < at) return [{ name: p.name, scale: p.scale, dx: jx, dy: p.dy ?? 3, ...(p.sway ? { sway: true } : {}), ...(p.drift ? { drift: true } : {}), ...(p.light ? { light: p.light } : {}) }];
  }
  return [];
}

/** The names a land's rim can carry (the tests check each against the land's sheet). */
export const rimNames = (area: Area): string[] => (PICKS[area] ?? []).map((p) => p.name);

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
    } else if (ring > 0 && spec.secondLevel !== undefined) h = spec.secondLevel;
    else if (spec.follow) h = Math.max(0, edgeH(u, v) + spec.follow[0] + Math.round(noise(u + 20, v + 20, 2.6, salt + 5) * (spec.follow[1] - spec.follow[0])));
    else h = spec.level ?? 0;
    const role = ring > 0 && spec.second ? spec.second : spec.role;
    const onWater = role === 'water' || role === 'deep' || role === 'lava';
    let ps = pieces < RIM_PIECES_MAX ? piecesFor(b.area, b, u, v, ring, nearEdge, onWater) : [];
    if (ps.some((p) => p.light) && lights >= RIM_LIGHTS_MAX) ps = ps.map(({ light, ...p }) => (void light, p));
    pieces += ps.length;
    lights += ps.filter((p) => p.light).length;
    out.push({ u, v, h, role, ground: onWater ? (role === 'deep' ? 'deep' : role === 'lava' ? 'lava' : spec.ground) : undefined, pieces: ps, near: nearEdge });
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

/** The colour of a wall torch's light: warm fire, or the land's own (the crypt's lamps burn cold). */
export const TORCH_LIGHT = LIGHT_WARM;
export const torchLight = (area: Area): number => RIMS[area].torch ?? TORCH_LIGHT;

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
  dungeon: { dark: 0.32, colour: 0x06081a },
  forge: { dark: 0.3, colour: 0x140804 },
  // (the graveyard lies under a dusk of its own, lighter than a roof's)
  graveyard: { dark: 0.24, colour: 0x060a14 },
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
    out.push({ u: t.u + (t.edge === 'u' ? 0.5 : 0), v: t.v + (t.edge === 'v' ? 0.5 : 0), h: edge.h + 1.6, colour: torchLight(b.area), reach: 2.6, kind: 'torch' });
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

// ---- daylight, cold light and underglow ---------------------------------------------------------------------------------------------

/** The lands under an open sky: on a clear day the sun lies on them and the shadows of clouds drift across (how many at once). */
export const CLOUDS: Partial<Record<Area, number>> = { highlands: 2, plains: 2, forest: 1, desert: 1, oasis: 1, autumn: 2, ruins: 2, temple: 1, warcamp: 2, snow: 1 };
/** How long a cloud's shadow takes to cross the board (ms), and how dark it lies. */
export const CLOUD_CROSS_MS = 42000;
export const CLOUD_DARK = 0.12;
/** The clouds over a board in a weather: only on a clear day; one fewer on a battery saver (reduced motion holds them where they lie). */
export const cloudsFor = (area: Area, weather: string, saver: boolean): number => (weather === 'clear' ? Math.max(0, (CLOUDS[area] ?? 0) - (saver ? 1 : 0)) : 0);

/** A wash of light over a whole land: the snows' cold light, the dunes' and the oasis's heat, the ashlands' red glow from below (which
 *  breathes). Weak: a tint, never a veil (`WASH_MAX`). Not at night or in fog, which have their own light. */
export interface LandWash {
  colour: number;
  alpha: number;
  /** Laid over (a tint) or added (a glow); a glow from below is strongest at the board's foot. */
  mode: 'tint' | 'glow';
  below?: boolean;
}
export const LAND_WASH: Partial<Record<Area, LandWash>> = {
  snow: { colour: 0xa8c8ff, alpha: 0.07, mode: 'tint' },
  desert: { colour: 0xffd070, alpha: 0.06, mode: 'glow' },
  oasis: { colour: 0xffe090, alpha: 0.05, mode: 'glow' },
  volcano: { colour: 0xff4a18, alpha: 0.1, mode: 'glow', below: true },
  shrine: { colour: 0xc8a0ff, alpha: 0.05, mode: 'glow' },
};
export const WASH_MAX = 0.1;
export const washFor = (area: Area, weather: string): LandWash | null => (weather === 'night' || weather === 'fog' ? null : LAND_WASH[area] ?? null);
