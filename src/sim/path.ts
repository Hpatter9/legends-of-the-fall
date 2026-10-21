// Finding the way over the board: the cheapest walk (by `canStep`'s costs) from a tile to every other, around the
// other fighters standing in the way. Adapted from Chronos's raid board (tactics.ts `reachable`, `pathTo`).

import { canStep, DIRS, tileAt, type At, type Board } from './board';

export interface Walk {
  /** The walk's cost to each tile (Infinity where it can't go), by tile index. */
  cost: number[];
  /** The tile each was reached from (-1 for the start and the unreached). */
  from: number[];
}

/** The cheapest walks from `start` for a fighter who jumps `jump`, never through a tile in `blocked`. */
export function walkFrom(b: Board, start: At, jump: number, blocked: ReadonlySet<number>): Walk {
  const n = b.w * b.d;
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
      const step = canStep(b.tiles[i], t, jump);
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
