// The battlefield: a small FF Tactics style grid of tiles, each standing some whole steps high. `u` runs across the
// board and `v` runs from the foes' edge (v = 0) to the heroes' edge (v = D - 1). The land rolls by a smooth noise of
// the seed, no step between neighbours is taller than a foot can climb (`CLIMB_MAX`), and a few boulders stand in the
// middle ground. The same seed always makes the same board. Adapted from Chronos's raid board (tactics.ts `relief`,
// tacticsTerrain.ts `canStep`, `easeRelief`, `sightClear`).

import { mixSeed, Rng } from './rng';

/** Tiles across. */
export const W = 7;
/** Tiles deep, from the foes' edge to the heroes'. */
export const D = 9;
/** How many rows at each end belong to a side when the fight starts. */
export const DEPLOY_ROWS = 3;
/** The most steps a foot can climb in one tile: a taller face is a cliff, both ways. */
export const CLIMB_MAX = 2;
/** What each step climbed costs besides the tile itself. */
export const CLIMB_COST = 1;
/** The highest the rolling land stands. */
export const TOP = 4;

export interface Tile {
  /** Height in whole steps. */
  h: number;
  /** A boulder stands here: nobody can stand on it, and it blocks low shots. */
  rock?: boolean;
  /** A bush grows here (only for looks). */
  bush?: boolean;
  /** A small number for picking the tile's tufts and flowers. */
  deco: number;
}

export interface Board {
  seed: number;
  w: number;
  d: number;
  tiles: Tile[];
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

/** Lower the higher of any two neighbours more than `CLIMB_MAX` apart, until none are. */
export function easeRelief(b: Board): void {
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const a = b.tiles[v * b.w + u];
        for (const [du, dv] of [DIRS[0], DIRS[1]]) {
          const n = tileAt(b, u + du, v + dv);
          if (!n) continue;
          const d = a.h - n.h;
          if (Math.abs(d) <= CLIMB_MAX) continue;
          if (d > 0) a.h = n.h + CLIMB_MAX;
          else n.h = a.h + CLIMB_MAX;
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/** Whether a fighter can stand on the tile at all. */
export const standable = (t: Tile | null): t is Tile => !!t && !t.rock;

/** A jump this high is flight: no height stops it. */
export const FLY_JUMP = 9;

/** What a step from one tile to the next costs a fighter who can jump `jump`, or null if it's a cliff (too high to
 *  climb, or too far to drop). Each step climbed costs `CLIMB_COST` more. */
export function canStep(from: Tile, to: Tile, jump: number): number | null {
  if (!standable(to)) return null;
  const rise = to.h - from.h;
  // (a flier, with a jump of FLY_JUMP, goes over any height at the cost of a level step)
  if (jump >= FLY_JUMP) return 1;
  if (Math.abs(rise) > Math.min(jump, CLIMB_MAX)) return null;
  return 1 + (rise > 0 ? rise * CLIMB_COST : 0);
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
    const top = t.h + (t.rock ? 1.6 : 0);
    if (top > eye + (mark - eye) * f + 1e-6) return false;
  }
  return true;
}

/** Whether every standable tile on the heroes' rows can walk (jumping 2) to the foes' rows, and back. */
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
      if (!n || seen.has(j) || canStep(b.tiles[i], n, 2) === null) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  // (every standable tile is one region: nobody is walled into a pocket)
  return b.tiles.every((t, i) => !standable(t) || seen.has(i));
}

/** The board for a seed: rolling land, a few boulders in the middle ground, bushes for looks. */
export function makeBoard(seed: number): Board {
  const rng = new Rng(mixSeed(seed, 0xb0a7d));
  const tiles: Tile[] = [];
  for (let v = 0; v < D; v++)
    for (let u = 0; u < W; u++) {
      // (the land rolls more in the middle ground; the two sides' rows stand a little flatter)
      const n = relief(seed, u + 11, v + 7);
      tiles.push({ h: Math.max(0, Math.min(TOP, Math.round(n * (TOP + 1.4) - 0.6))), deco: rng.int(0, 999) });
    }
  const b: Board = { seed, w: W, d: D, tiles };
  easeRelief(b);
  // boulders in the middle ground, kept only if everyone can still get round them
  const rocks = rng.int(1, 3);
  for (let i = 0; i < rocks; i++) {
    const t = tileAt(b, rng.int(0, W - 1), rng.int(DEPLOY_ROWS, D - 1 - DEPLOY_ROWS));
    if (!t || t.rock) continue;
    t.rock = true;
    if (!boardOk(b)) t.rock = false;
  }
  for (const t of b.tiles) if (!t.rock && rng.chance(0.08)) t.bush = true;
  return b;
}
