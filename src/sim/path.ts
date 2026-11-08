// Finding the way over the board: the cheapest walk (by `canStep`'s costs) from a tile to every other, around the
// other fighters standing in the way. Adapted from Chronos's raid board (tactics.ts `reachable`, `pathTo`).

import { canStep, DIRS, tileAt, type At, type Board } from './board';

export interface Walk {
  /** The walk's cost to each tile (Infinity where it can't go), by tile index. */
  cost: number[];
  /** The tile each was reached from (-1 for the start and the unreached). */
  from: number[];
}

/** The cheapest walks from `start` for a fighter who jumps `jump`, never through a tile in `blocked` (nor a raised wall, unless it lets
 *  `side` through). */
export function walkFrom(b: Board, start: At, jump: number, blocked: ReadonlySet<number>, side?: 'hero' | 'foe'): Walk {
  const n = b.w * b.d;
  // (the Assault's big field: a walk bounded to the window round the walker, `walkWindow`; no other board is near this big)
  if (n > BIG_WALK) return walkWindow(b, start, jump, blocked, side);
  const cost = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  const s = start.v * b.w + start.u;
  cost[s] = 0;
  const open = [s];
  while (open.length) {
    // (a small board: the cheapest open tile is found by a plain look through the list; ties by index, so the
    // walk is the same every time)
    let k = 0;
    for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[k]] || (cost[open[i]] === cost[open[k]] && open[i] < open[k])) k = i;
    const i = open.splice(k, 1)[0];
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const t = tileAt(b, u + du, v + dv);
      if (!t) continue;
      const j = (v + dv) * b.w + u + du;
      if (blocked.has(j)) continue;
      const step = canStep(b.tiles[i], t, jump, side);
      if (step === null) continue;
      const c = cost[i] + step;
      if (c >= cost[j]) continue;
      if (cost[j] === Infinity) open.push(j);
      cost[j] = c;
      from[j] = i;
    }
  }
  return { cost, from };
}

/** The first tile of the walk to `goal` (null if it isn't reached, or is the start). */
export function firstStep(w: Walk, goal: number): number | null {
  if (w.cost[goal] === Infinity || w.from[goal] < 0) return null;
  let j = goal;
  while (w.from[j] >= 0 && w.cost[w.from[j]] > 0) j = w.from[j];
  return j;
}

/** NEAR WALKS (the Assault's big field, `docs/notes/assault-0.md`): the cheapest walks inside a square window round the walker. */
export interface NearWalk {
  /** The window's corner and size, in tiles (clipped to the board). */
  u0: number;
  v0: number;
  w: number;
  d: number;
  /** The walk's cost to each tile of the window (Infinity where it can't go), by the window's own index. */
  cost: Float64Array;
  /** The board index each window tile was reached from (-1 for the start and the unreached). */
  from: Int32Array;
  /** The board index the walk starts on. */
  start: number;
}

/** A binary heap of (cost, tile) pairs, the least first, ties by the lowest tile: the same order `walkFrom`'s straight look takes. */
class Heap {
  c: number[] = [];
  i: number[] = [];
  private less(a: number, b: number): boolean {
    return this.c[a] < this.c[b] || (this.c[a] === this.c[b] && this.i[a] < this.i[b]);
  }
  private swap(a: number, b: number): void {
    const c = this.c[a];
    this.c[a] = this.c[b];
    this.c[b] = c;
    const i = this.i[a];
    this.i[a] = this.i[b];
    this.i[b] = i;
  }
  clear(): void {
    this.c.length = 0;
    this.i.length = 0;
  }
  push(cost: number, tile: number): void {
    this.c.push(cost);
    this.i.push(tile);
    let k = this.c.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (!this.less(k, p)) break;
      this.swap(k, p);
      k = p;
    }
  }
  /** Take the least pair off; its tile is returned and its cost left in `top`. */
  top = 0;
  pop(): number {
    const tile = this.i[0];
    this.top = this.c[0];
    const lc = this.c.pop()!;
    const li = this.i.pop()!;
    if (this.c.length) {
      this.c[0] = lc;
      this.i[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < this.c.length && this.less(l, m)) m = l;
        if (r < this.c.length && this.less(r, m)) m = r;
        if (m === k) break;
        this.swap(k, m);
        k = m;
      }
    }
    return tile;
  }
  get size(): number {
    return this.c.length;
  }
}

/** The near walks' scratch: one heap and one set of arrays, used again by each walk (the field runs a few hundred walks a minute, and
 *  a fresh set each time is only work for the garbage collector). */
const nearHeap = new Heap();
let nearCost = new Float64Array(0);
let nearFrom = new Int32Array(0);
let nearDone = new Uint8Array(0);

/** The cheapest walks from `start` inside the window of `half` tiles either way (16 x 16 at the usual 8), for a fighter who jumps
 *  `jump`, never through a tile `blocked` says is taken. Inside its window it walks exactly as `walkFrom` would on a board cut to the
 *  window: a heap takes the cheapest open tile, ties by the lowest board index, as `walkFrom`'s plain look does. Used only on the
 *  Assault's field, where `walkFrom` (the whole board, a look through the list) would be far too slow. The walk's arrays are the
 *  near walks' scratch: they hold until the next `walkNear`, so a caller that keeps one copies it. */
export function walkNear(b: Board, start: At, jump: number, blocked: (i: number) => boolean, half = 8, side?: 'hero' | 'foe'): NearWalk {
  const u0 = Math.max(0, start.u - half);
  const v0 = Math.max(0, start.v - half);
  const u1 = Math.min(b.w - 1, start.u + half - 1);
  const v1 = Math.min(b.d - 1, start.v + half - 1);
  const w = u1 - u0 + 1;
  const d = v1 - v0 + 1;
  if (nearCost.length < w * d) {
    nearCost = new Float64Array(w * d);
    nearFrom = new Int32Array(w * d);
    nearDone = new Uint8Array(w * d);
  }
  const cost = nearCost.subarray(0, w * d).fill(Infinity);
  const from = nearFrom.subarray(0, w * d).fill(-1);
  const done = nearDone.subarray(0, w * d).fill(0);
  const s = start.v * b.w + start.u;
  cost[(start.v - v0) * w + start.u - u0] = 0;
  const open = nearHeap;
  open.clear();
  open.push(0, s);
  while (open.size) {
    const i = open.pop();
    const u = i % b.w;
    const v = (i - u) / b.w;
    const k = (v - v0) * w + u - u0;
    // (a tile met again at a cost it has since bettered is passed over: the heap keeps the old entry)
    if (done[k] || open.top > cost[k]) continue;
    done[k] = 1;
    for (const [du, dv] of DIRS) {
      const nu = u + du;
      const nv = v + dv;
      if (nu < u0 || nv < v0 || nu > u1 || nv > v1) continue;
      const j = nv * b.w + nu;
      if (blocked(j)) continue;
      const step = canStep(b.tiles[i], b.tiles[j], jump, side);
      if (step === null) continue;
      const kj = (nv - v0) * w + nu - u0;
      const c = cost[k] + step;
      if (c >= cost[kj]) continue;
      cost[kj] = c;
      from[kj] = i;
      open.push(c, j);
    }
  }
  return { u0, v0, w, d, cost, from, start: s };
}

/** A board tile's place in a near walk's window (-1 outside it). */
export function nearIndex(w: NearWalk, boardW: number, i: number): number {
  const u = i % boardW;
  const v = (i - u) / boardW;
  if (u < w.u0 || v < w.v0 || u >= w.u0 + w.w || v >= w.v0 + w.d) return -1;
  return (v - w.v0) * w.w + u - w.u0;
}

/** The first tile (a board index) of a near walk to `goal` (null if it isn't reached, or is the start). */
export function nearFirstStep(w: NearWalk, boardW: number, goal: number): number | null {
  let k = nearIndex(w, boardW, goal);
  if (k < 0 || w.cost[k] === Infinity || w.from[k] < 0) return null;
  let j = goal;
  for (;;) {
    const f = w.from[k];
    if (f < 0 || f === w.start) return j;
    j = f;
    k = nearIndex(w, boardW, j);
  }
}

/** The tiles (board indexes) of a near walk to `goal`, its first step first, at most `max` of them (empty if it isn't reached). */
export function nearPath(w: NearWalk, boardW: number, goal: number, max: number): number[] {
  const back: number[] = [];
  let k = nearIndex(w, boardW, goal);
  if (k < 0 || w.cost[k] === Infinity) return back;
  let j = goal;
  while (j !== w.start && k >= 0 && back.length < 64) {
    back.push(j);
    j = w.from[k];
    if (j < 0) return [];
    k = nearIndex(w, boardW, j);
  }
  return back.reverse().slice(0, max);
}

/** A board bigger than this many tiles (only the Assault's 100 x 100 field: the biggest other board is 252) is walked by `walkWindow`. */
export const BIG_WALK = 2500;
/** How far either way the big field's `walkFrom` looks (a 25 x 25 window). */
export const WINDOW_HALF = 12;
/** The big field's walks are written into these, four in turn (a caller holds at most two at once, as `decide` does), so a walk on a
 *  10,000-tile field makes no garbage. They hold until the fourth `walkFrom` after. */
const windowPool: Walk[] = [];
/** The tiles each pooled walk wrote (cleared before it is used again, not all 10,000). */
const windowDirty: number[][] = [];
let windowNext = 0;

/** `walkFrom` on the Assault's big field (phase 1, `docs/notes/assault-1.md`): the same walk inside a window of `WINDOW_HALF` tiles round
 *  the walker (`walkNear`, a heap in the same order), written into a whole-board walk with every tile outside the window unreached. So
 *  the battle's own minds and kits (a kite, a flank, a perch, a feared step, a charge) work on the field as on a board, a window's walk
 *  away, at a window's cost. */
function walkWindow(b: Board, start: At, jump: number, blocked: ReadonlySet<number>, side?: 'hero' | 'foe'): Walk {
  const n = b.w * b.d;
  let walk = windowPool[windowNext];
  let dirty = windowDirty[windowNext];
  if (!walk || walk.cost.length !== n) {
    walk = windowPool[windowNext] = { cost: new Array<number>(n).fill(Infinity), from: new Array<number>(n).fill(-1) };
    dirty = windowDirty[windowNext] = [];
  }
  windowNext = (windowNext + 1) % 4;
  // (only the tiles its last walk wrote are cleared: the rest of the 10,000 still hold Infinity and -1)
  for (const i of dirty) {
    walk.cost[i] = Infinity;
    walk.from[i] = -1;
  }
  dirty.length = 0;
  const near = walkNear(b, start, jump, (i) => blocked.has(i), WINDOW_HALF, side);
  for (let k = 0; k < near.cost.length; k++) {
    if (near.cost[k] === Infinity) continue;
    const i = (near.v0 + Math.floor(k / near.w)) * b.w + near.u0 + (k % near.w);
    walk.cost[i] = near.cost[k];
    walk.from[i] = near.from[k];
    dirty.push(i);
  }
  return walk;
}
