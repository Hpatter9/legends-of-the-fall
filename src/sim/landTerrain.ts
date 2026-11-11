// LAND-IDENTITY, the terrain proposal (docs/notes/land-identity.md): a land's own ground laid a little thicker on its battlefield, so the
// place is felt in the fight as well as seen. Unlike the rest of LAND-IDENTITY this changes how a fight plays, so it is a rule of its
// own, behind its own switch (`LAND_TERRAIN`, off: nothing is laid and every fight is as it was), laid from its own side stream of the
// seed (`TERRAIN_SALT`: the board, the foes, the traps and the fight's own stream draw nothing more or less for it).
//
// - THE MIRE FLOODS: two or three pools of shallow water lie on its lowest open ground, a few tiles each. Shallow water slows a walker
//   (a step into it takes twice as long) and fliers do not mind, as on any board; nothing is deep, so nobody is cut off.

import { DIRS, standable, tileAt, type Area, type Board } from './board';
import { fieldOk } from './fieldTraps';
import { mixSeed, Rng } from './rng';

/** The switch: with it off no land lays anything more than `makeBoard` did. */
export const LAND_TERRAIN = { on: false };
export const TERRAIN_SALT = 0x3a7e2;

/** How a land floods: how many pools, how many tiles each, and how far over the board's lowest open ground a pool may lie (steps). */
export interface Flood {
  pools: [number, number];
  size: [number, number];
  over: number;
  /** The most of a board's standable tiles that may be shallow water once it has flooded (a share). */
  most: number;
}
export const FLOODS: Partial<Record<Area, Flood>> = {
  swamp: { pools: [2, 3], size: [2, 4], over: 1, most: 0.3 },
};

/** Whether a tile can take a pool: plain open ground with nothing on it. */
const plain = (b: Board, u: number, v: number): boolean => {
  const t = tileAt(b, u, v);
  return standable(t) && !t.ground && !t.bridge && !t.trap && !t.brazier && !t.barrel && !t.rock && !t.wall && !t.perch && !t.ramp;
};

/** Lay a land's own terrain on a board (in place), by its side stream of the seed. Nothing with the switch off, on a land with none,
 *  or on a board that is not an ordinary battlefield. Returns the tiles it changed. */
export function layLandTerrain(b: Board, seed: number): number[] {
  const flood = FLOODS[b.area];
  if (!LAND_TERRAIN.on || !flood || !fieldOk(b) || b.tiles.some((t) => t.scene)) return [];
  const rng = new Rng(mixSeed(seed, TERRAIN_SALT));
  let low = Infinity;
  for (let i = 0; i < b.tiles.length; i++) if (plain(b, i % b.w, Math.floor(i / b.w))) low = Math.min(low, b.tiles[i].h);
  const ok = (u: number, v: number) => plain(b, u, v) && tileAt(b, u, v)!.h <= low + flood.over;
  const open = b.tiles.filter((t) => standable(t)).length;
  let wet = b.tiles.filter((t) => t.ground === 'water').length;
  const laid: number[] = [];
  const pools = rng.int(flood.pools[0], flood.pools[1]);
  for (let p = 0; p < pools; p++) {
    // (a pool starts on one of the lowest open tiles and spreads to its neighbours)
    const starts = b.tiles.map((_, i) => i).filter((i) => ok(i % b.w, Math.floor(i / b.w)) && b.tiles[i].h === low);
    const size = rng.int(flood.size[0], flood.size[1]);
    if (!starts.length) continue;
    let at = rng.pick(starts);
    for (let n = 0; n < size; n++) {
      const [u, v] = [at % b.w, Math.floor(at / b.w)];
      if (ok(u, v) && (wet + 1) / open <= flood.most) {
        const t = b.tiles[at];
        t.ground = 'water';
        delete t.bush;
        laid.push(at);
        wet++;
      }
      const next = DIRS.map(([du, dv]) => [u + du, v + dv] as const).filter(([x, y]) => ok(x, y));
      if (!next.length) break;
      const [nu, nv] = rng.pick(next);
      at = nv * b.w + nu;
    }
  }
  return laid;
}
