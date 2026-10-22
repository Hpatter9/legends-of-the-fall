// The countryside below the village: the main road that runs out of the yard's open front down to the bottom edge of the screen, with farm fields, a farm,
// a pond and a stream (the road crosses it on a little bridge), an orchard, a corral and a pen, fences, haystacks and woods that thicken towards the
// edges. Plain data on the village's tile lattice (no Pixi, no DOM, no randomness beyond a fixed hash of the tile, so it is the same every time): tiles
// are (u, v) as in castleSpots.ts; `d = u - v` is the column across the screen (45 scene pixels a step) and `s = u + v` the row down (26 a step).

import type { Block } from './castleSpots';

export interface LandProp {
  sprite: string;
  u: number;
  v: number;
  flip?: boolean;
  dx?: number;
  dy?: number;
}

export interface Land {
  /** The main road, as one-tile blocks, from the village's south street to the bottom of the land. */
  road: Block[];
  /** Water tiles (the stream and the pond). The road crosses the stream on the tile `bridge`. */
  water: { u: number; v: number }[];
  bridge: { u: number; v: number };
  /** Flat things drawn on the ground (field beds): under every standing prop. */
  ground: LandProp[];
  /** Standing scenery, sorted with the village's props by its foot. */
  scenery: LandProp[];
  /** The signpost by the road near the bottom, where the Armies place stands, and the road tile its door opens onto. */
  sign: { u: number; v: number; door: { u: number; v: number } };
}

/** The rows of tiles the countryside runs down to (`s = u + v`): far enough for the tallest phone. */
export const LAND_ROWS = 100;
/** Where the road crosses the stream (the bridge's tile) and the stream's column. */
const STREAM_U = 10;

const key = (u: number, v: number): string => `${u},${v}`;

/** A fixed pseudo-random number in [0, 1) for a tile and a salt. */
function rnd(u: number, v: number, salt: number): number {
  let h = (Math.imul(u + 1000, 73856093) ^ Math.imul(v + 1000, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967296;
}

/** The tiles of a rectangle on the screen's own columns and rows (`d` across, `s` down), where a tile exists (`d` and `s` of one parity). */
function cellsIn(d0: number, d1: number, s0: number, s1: number): { u: number; v: number }[] {
  const out: { u: number; v: number }[] = [];
  for (let s = s0; s <= s1; s++) for (let d = d0; d <= d1; d++) if ((s + d) % 2 === 0) out.push({ u: (s + d) / 2, v: (s - d) / 2 });
  return out;
}

/** `blocked(u, v)`: whether the village (a plot, the plaza, the wall, its props) holds a tile; nothing is laid there. */
export function buildLand(blocked: (u: number, v: number) => boolean): Land {
  const taken = new Set<string>();
  const take = (u: number, v: number): void => void taken.add(key(u, v));
  const free = (u: number, v: number): boolean => !blocked(u, v) && !taken.has(key(u, v));

  // the stream: along `v` at `STREAM_U`, from near the village down-left off the screen
  const water: { u: number; v: number }[] = [];
  const wet = new Set<string>();
  const wetAdd = (u: number, v: number): void => {
    if (!wet.has(key(u, v))) {
      wet.add(key(u, v));
      water.push({ u, v });
    }
  };
  for (let v = 9; v <= 30; v++) wetAdd(STREAM_U, v);
  // a pond to the right of the road lower down
  for (const c of cellsIn(0, 8, 44, 52)) if (Math.abs(c.u - 24) + Math.abs(c.v - 20) <= 3 && !(Math.abs(c.u - 24) === 3 && Math.abs(c.v - 20) === 0)) wetAdd(c.u, c.v);

  // the main road: from the village's south street, a zigzag of one tile steps down the screen (`u` then `v`), two tiles wide; where it meets the stream it
  // goes straight along `u` for two tiles (the bridge) and comes back
  const roadSet = new Set<string>();
  const road: Block[] = [];
  const addRoad = (u: number, v: number): void => {
    if (roadSet.has(key(u, v))) return;
    roadSet.add(key(u, v));
    road.push({ u0: u, v0: v, u1: u, v1: v });
  };
  let [u, v] = [3, 6];
  const moves = 'uv'.repeat(6) + 'uu' + 'vv' + 'uv'.repeat(40);
  addRoad(u, v);
  addRoad(u + 1, v);
  for (const m of moves) {
    if (m === 'u') u++;
    else v++;
    if (u + v > LAND_ROWS) break;
    addRoad(u, v);
    if (!wet.has(key(u + 1, v))) addRoad(u + 1, v);
  }
  // (the stream under the road is not water: the bridge carries the road across)
  const crossing = road.filter((r) => r.u0 === STREAM_U && wet.has(key(r.u0, r.v0))).map((r) => ({ u: r.u0, v: r.v0 }));
  if (!crossing.length) throw new Error('the road misses the stream');
  const bridge = crossing[0];
  const stream = water.filter((w) => !roadSet.has(key(w.u, w.v)));
  for (const r of road) take(r.u0, r.v0);
  for (const w of stream) take(w.u, w.v);

  const ground: LandProp[] = [];
  const scenery: LandProp[] = [];
  const near = (a: number, b: number, r: number): boolean => {
    for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) if (roadSet.has(key(a + du, b + dv)) || wet.has(key(a + du, b + dv))) return true;
    return false;
  };

  // fields: blocks of beds on the village's own axes, each with a fence along its two road-facing sides and a haystack or two
  const field = (u0: number, v0: number, u1: number, v1: number, fences: boolean): void => {
    for (let a = u0; a <= u1; a++)
      for (let b = v0; b <= v1; b++) {
        if (!free(a, b)) continue;
        ground.push({ sprite: rnd(a, b, 1) < 0.5 ? 'field' : 'field2', u: a, v: b });
        take(a, b);
      }
    if (!fences) return;
    for (let a = u0; a <= u1; a += 2) if (free(a, v0 - 1)) {
      scenery.push({ sprite: 'fence', u: a, v: v0 - 1, flip: true });
      take(a, v0 - 1);
    }
    for (let b = v0; b <= v1; b += 2) if (free(u0 - 1, b)) {
      scenery.push({ sprite: 'fence', u: u0 - 1, v: b });
      take(u0 - 1, b);
    }
  };
  const one = (sprite: string, a: number, b: number, o: Partial<LandProp> = {}): void => {
    if (!free(a, b)) return;
    scenery.push({ sprite, u: a, v: b, ...o });
    take(a, b);
  };

  // the farm, west of the road, just below the village
  one('farmhouse', 4, 11);
  one('silo', 3, 13);
  one('hay', 6, 11);
  one('haybig', 5, 13);
  one('barrels', 6, 13);
  field(5, 15, 8, 18, true);
  field(11, 23, 14, 26, true);
  // east of the road: a field block and the corral
  field(12, 7, 15, 10, true);
  one('corral', 14, 14);
  one('hay', 12, 13);
  field(22, 13, 25, 16, true);
  // the pond's shore
  for (const c of cellsIn(-2, 12, 42, 54)) if (!wet.has(key(c.u, c.v)) && free(c.u, c.v) && near(c.u, c.v, 1) && !roadSet.has(key(c.u, c.v)) && rnd(c.u, c.v, 5) < 0.45) one(rnd(c.u, c.v, 6) < 0.5 ? 'rocks' : 'bush', c.u, c.v);
  // the orchard, east of the road: oaks in rows, two tiles apart
  for (let a = 30; a <= 38; a += 2) for (let b = 18; b <= 24; b += 2) one(rnd(a, b, 7) < 0.8 ? 'oak' : 'berries', a, b);
  // a pen for animals, west of the road, lower down
  one('pen', 22, 33);
  one('hay', 24, 33);
  field(14, 31, 17, 34, true);

  // the signpost by the road near the bottom, on the road's east side where a row of the road is two tiles along `u`
  let signAt: { u: number; v: number } | null = null;
  for (const r of road) {
    const s = r.u0 + r.v0;
    if (s >= 47 && roadSet.has(key(r.u0 + 1, r.v0)) && free(r.u0 + 2, r.v0) && roadSet.has(key(r.u0 + 2, r.v0 + 1))) {
      signAt = { u: r.u0 + 2, v: r.v0 };
      break;
    }
  }
  if (!signAt) throw new Error('no place for the signpost');
  take(signAt.u, signAt.v);

  // woods: trees thicken towards the edges of the screen and with every row down; none within two tiles of the road, the water or a building
  for (let s = 6; s <= LAND_ROWS; s++)
    for (let d = -14; d <= 14; d++) {
      if ((s + d) % 2 !== 0) continue;
      const a = (s + d) / 2;
      const b = (s - d) / 2;
      if (!free(a, b) || near(a, b, 1)) continue;
      // (the village's own wall and ring of grass are left clear)
      if (a >= -6 && a <= 8 && b >= -6 && b <= 9) continue;
      const edge = Math.min(1, Math.max(0, (Math.abs(d) - 4) / 9));
      const p = 0.06 + 0.5 * edge * edge + Math.min(0.12, s / 600);
      const r = rnd(a, b, 11);
      if (r >= p) continue;
      const k = rnd(a, b, 12);
      const sprite = Math.abs(d) > 9 && k < 0.14 ? 'great' : k < 0.45 ? 'oak' : k < 0.72 ? 'pine' : k < 0.85 ? 'birch' : k < 0.93 ? 'bush' : 'flowers';
      scenery.push({ sprite, u: a, v: b, flip: rnd(a, b, 13) < 0.5 });
      take(a, b);
    }

  return { road, water: stream, bridge, ground, scenery, sign: { ...signAt, door: { u: signAt.u, v: signAt.v + 1 } } };
}
