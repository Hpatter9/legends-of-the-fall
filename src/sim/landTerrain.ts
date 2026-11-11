// LAND-IDENTITY, the terrain proposal (docs/notes/land-identity.md): a land's own ground laid a little thicker on its battlefield, so the
// place is felt in the fight as well as seen. Unlike the rest of LAND-IDENTITY this changes how a fight plays, so it is a rule of its
// own, behind its own switch (`LAND_TERRAIN`; with it off nothing is laid and every fight is as it was), laid from its own side stream of the
// seed (`TERRAIN_SALT`: the board, the foes, the traps and the fight's own stream draw nothing more or less for it).
//
// - THE MIRE FLOODS: two or three pools of shallow water lie on its lowest open ground, a few tiles each. Shallow water slows a walker
//   (a step into it takes twice as long) and fliers do not mind, as on any board; nothing is deep, so nobody is cut off.
// - THE SNOWS (more ice), THE ASHLANDS (more lava) and THE HIGHLANDS (more boulders) are laid the same way, each with its own `on`
//   and its own numbers: the snows' is on; the other two are off (what met the balance rule did not show at phone size) (docs/notes/land-identity.md, "The other three lands").

import { boardOk, DEPLOY_ROWS, DIRS, standable, tileAt, type Area, type Board, type Tile } from './board';
import { fieldOk } from './fieldTraps';
import { mixSeed, Rng } from './rng';

/** The switch: with it off no land lays anything more than `makeBoard` did. ON (the owner's call, 2026-11-11). */
export const LAND_TERRAIN = { on: true };
export const TERRAIN_SALT = 0x3a7e2;

/** How a land's own terrain is laid thicker: what it is, how many patches, how many tiles each, how far over the board's lowest open
 *  ground a patch may lie (steps; 99 for anywhere), and whether this land's is on (a land ships on only when its measure allows it:
 *  docs/notes/land-identity.md). */
export interface Flood {
  kind: 'water' | 'ice' | 'lava' | 'rock';
  on: boolean;
  pools: [number, number];
  size: [number, number];
  over: number;
  /** The most of a board's standable tiles that may be this ground once it is laid (a share). */
  most: number;
}
export const FLOODS: Partial<Record<Area, Flood>> = {
  // (the mire floods: pools of shallow water on its lowest ground)
  swamp: { kind: 'water', on: true, pools: [2, 3], size: [2, 4], over: 1, most: 0.3 },
  // (the snows freeze over: sheets of ice, which a walker slides across)
  snow: { kind: 'ice', on: true, pools: [2, 3], size: [2, 4], over: 99, most: 0.3 },
  // (the ashlands crack open: one more run of lava in the middle ground, never in either side's rows. OFF. As first built (one or two
  //  patches of two to three tiles) it moved the whole by 3.4 points and two bands by more than 10; at these lighter numbers it is
  //  within the rule (+1.6, no band over 6), but a tile or two more of lava does not show at phone size, so it is not worth a rule)
  volcano: { kind: 'lava', on: false, pools: [1, 1], size: [1, 2], over: 99, most: 0.22 },
  // (the high country has one more boulder in the middle ground, kept only where everyone can still get round it. OFF. Two or three
  //  clumps moved the whole by 4.6 points and the minotaurs by 13.5, and even two boulders moved them by 8; one is within the rule
  //  (-0.1, no band over 4.5), but one boulder more does not show at phone size)
  highlands: { kind: 'rock', on: false, pools: [1, 1], size: [1, 1], over: 99, most: 0.2 },
};

/** Whether a tile can take a patch: plain open ground with nothing on it. */
const plain = (b: Board, u: number, v: number): boolean => {
  const t = tileAt(b, u, v);
  return standable(t) && !t.ground && !t.bridge && !t.trap && !t.brazier && !t.barrel && !t.rock && !t.wall && !t.perch && !t.ramp;
};

/** Lay a land's own terrain on a board (in place), by its side stream of the seed. Nothing with the switch off, on a land with none
 *  (or whose own is off), or on a board that is not an ordinary battlefield. Returns the tiles it changed. */
export function layLandTerrain(b: Board, seed: number): number[] {
  const flood = FLOODS[b.area];
  if (!LAND_TERRAIN.on || !flood?.on || !fieldOk(b) || b.tiles.some((t) => t.scene)) return [];
  const rng = new Rng(mixSeed(seed, TERRAIN_SALT));
  let low = Infinity;
  for (let i = 0; i < b.tiles.length; i++) if (plain(b, i % b.w, Math.floor(i / b.w))) low = Math.min(low, b.tiles[i].h);
  // (lava and boulders keep to the middle ground, as the board's own do)
  const mid = flood.kind === 'lava' || flood.kind === 'rock';
  const ok = (u: number, v: number) => plain(b, u, v) && tileAt(b, u, v)!.h <= low + flood.over && (!mid || (v >= DEPLOY_ROWS && v <= b.d - 1 - DEPLOY_ROWS));
  const has = (t: Tile) => (flood.kind === 'rock' ? !!t.rock : t.ground === flood.kind);
  // (the share is of the board's open tiles; for boulders, of the open tiles and the boulders together)
  const stands = (t: Tile): boolean => standable(t);
  const open = b.tiles.filter((t) => stands(t) || (flood.kind === 'rock' && !!t.rock)).length;
  let n = b.tiles.filter(has).length;
  const laid: number[] = [];
  const pools = rng.int(flood.pools[0], flood.pools[1]);
  for (let p = 0; p < pools; p++) {
    // (a patch starts on an open tile, one of the lowest where the land asks for that, and spreads to its neighbours)
    const starts = b.tiles.map((_, i) => i).filter((i) => ok(i % b.w, Math.floor(i / b.w)) && (flood.over >= 99 || b.tiles[i].h === low));
    const size = rng.int(flood.size[0], flood.size[1]);
    if (!starts.length) continue;
    let at = rng.pick(starts);
    for (let k = 0; k < size; k++) {
      const [u, v] = [at % b.w, Math.floor(at / b.w)];
      if (ok(u, v) && (n + 1) / open <= flood.most) {
        const t = b.tiles[at];
        if (flood.kind === 'rock') {
          // (a boulder that cannot stay leaves the tile exactly as it was found)
          const had = 'rock' in t;
          t.rock = true;
          // (a boulder stays only if every tile can still be walked to)
          if (boardOk(b)) {
            delete t.bush;
            laid.push(at);
            n++;
          } else if (had) t.rock = false;
          else delete t.rock;
        } else {
          t.ground = flood.kind;
          delete t.bush;
          laid.push(at);
          n++;
        }
      }
      const next = DIRS.map(([du, dv]) => [u + du, v + dv] as const).filter(([x, y]) => ok(x, y));
      if (!next.length) break;
      const [nu, nv] = rng.pick(next);
      at = nv * b.w + nu;
    }
  }
  return laid;
}
