// The long map of an army run: the waves are sections of one winding road. Each section is a board of its own, seven
// across by nine deep, so a fight, its pathing and its balance are those of a single board; the sections are joined
// edge to edge, each new one on the northeast or the northwest edge of the one before. Pure rules (no Pixi, no DOM): the
// renderer draws the chain and walks the heroes over it, but the sim only ever fights on one section.
//
// Placement: `origin` is where a section's tile (0, 0) lies, in tiles, measured from the first section's. The northeast
// edge of a board is its v = 0 row, the northwest edge its u = 0 column. A northeast join puts the new section's back row
// (v = D - 1, where the heroes deploy) against the old section's foes' row; a northwest join puts the new section's
// u = W - 1 column against the old u = 0 column. Both steps move up the screen, one a way right and one left, so every
// section has its own place on the lattice and the road can never cross itself.

import { CLIMB_MAX, D, DIRS, DEPLOY_ROWS, makeBoard, standable, tileAt, TOP, W, type Area, type Board, type Tile } from './board';
import { walkFrom } from './path';
import { mixSeed, Rng } from './rng';

export type Join = 'ne' | 'nw';

export interface Section {
  /** The wave it hosts (from 1). */
  wave: number;
  board: Board;
  /** Where its tile (0, 0) lies against the first section's, in tiles. */
  origin: { u: number; v: number };
  /** How it joins the section before it (none for the first). */
  join: Join | null;
  /** A boss arena. */
  boss: boolean;
}

/** The most the road may drift to one side before the next join steers it back (northeast steps minus northwest steps). */
export const DRIFT_MAX = 2;
/** How far a joined edge tile may stand above or below the tile it joins (gentler than a cliff). */
export const JOIN_STEP = 1;

/** The joins of a road of `n` sections (the first has none): seeded, but steered back once the road has drifted `DRIFT_MAX` to a side. */
export function joinsOf(seed: number, n: number): (Join | null)[] {
  const out: (Join | null)[] = [null];
  let drift = 0;
  for (let k = 2; k <= n; k++) {
    let j: Join = new Rng(mixSeed(seed, 0xc4a1, k)).chance(0.5) ? 'ne' : 'nw';
    if (drift >= DRIFT_MAX) j = 'nw';
    else if (drift <= -DRIFT_MAX) j = 'ne';
    drift += j === 'ne' ? 1 : -1;
    out.push(j);
  }
  return out;
}

/** Where the section `join` puts it lies against the one before, in tiles. */
export const stepOf = (join: Join): { u: number; v: number } => (join === 'ne' ? { u: 0, v: -D } : { u: -W, v: 0 });

/** Ease the board's heights so no neighbours are more than `CLIMB_MAX` apart, never moving a pinned tile. */
function easePinned(b: Board, pinned: ReadonlySet<number>): void {
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const i = v * b.w + u;
        for (const [du, dv] of [DIRS[0], DIRS[1]]) {
          const n = tileAt(b, u + du, v + dv);
          if (!n) continue;
          const a = b.tiles[i];
          const j = (v + dv) * b.w + u + du;
          const d = a.h - n.h;
          if (Math.abs(d) <= CLIMB_MAX) continue;
          // (the tile that gives way is the free one; of two free tiles, the higher is lowered)
          const lowerA = pinned.has(j) || (!pinned.has(i) && d > 0);
          if (lowerA) a.h = n.h + Math.sign(d) * CLIMB_MAX;
          else n.h = a.h - Math.sign(d) * CLIMB_MAX;
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/** The indices of a board's edge that meets the section before, in walking order. */
export function edgeOf(b: Board, join: Join): number[] {
  const out: number[] = [];
  if (join === 'ne') for (let u = 0; u < b.w; u++) out.push((b.d - 1) * b.w + u);
  else for (let v = 0; v < b.d; v++) out.push(v * b.w + b.w - 1);
  return out;
}

/** The tiles of the old board that face `edgeOf` of the new one, in the same order. */
function facingOf(old: Board, join: Join): Tile[] {
  const out: Tile[] = [];
  if (join === 'ne') for (let u = 0; u < old.w; u++) out.push(old.tiles[u]);
  else for (let v = 0; v < old.d; v++) out.push(old.tiles[v * old.w]);
  return out;
}

/** Join a fresh board onto the one before it: the joined edge is cleared of boulders and special ground, each of its tiles stands within `JOIN_STEP` of the tile it meets, and the land inside is eased to match. Edits `next` only. */
export function joinBoard(old: Board, next: Board, join: Join): void {
  const edge = edgeOf(next, join);
  const facing = facingOf(old, join);
  let prev = -1;
  edge.forEach((idx, k) => {
    const t = next.tiles[idx];
    delete t.rock;
    delete t.ground;
    let lo = Math.max(0, facing[k].h - JOIN_STEP);
    let hi = Math.min(TOP, facing[k].h + JOIN_STEP);
    // (and within a climb of the edge tile beside it, which the first clamp can leave out of reach)
    if (prev >= 0) {
      lo = Math.max(lo, prev - CLIMB_MAX);
      hi = Math.min(hi, prev + CLIMB_MAX);
    }
    t.h = Math.min(hi, Math.max(lo, t.h));
    prev = t.h;
  });
  easePinned(next, new Set(edge));
}

/** The road of `waves` sections for a run: wave n's board is `makeBoard(boardSeed(n), area)`, joined to the one before. */
export function buildChain(seed: number, waves: number, area: Area, boardSeed: (wave: number) => number, boss: (wave: number) => boolean): Section[] {
  const joins = joinsOf(seed, waves);
  const out: Section[] = [];
  for (let n = 1; n <= waves; n++) {
    const board = makeBoard(boardSeed(n), area);
    const join = joins[n - 1];
    let origin = { u: 0, v: 0 };
    if (join) {
      const prev = out[n - 2];
      joinBoard(prev.board, board, join);
      const s = stepOf(join);
      origin = { u: prev.origin.u + s.u, v: prev.origin.v + s.v };
    }
    out.push({ wave: n, board, origin, join, boss: boss(n) });
  }
  return out;
}

/** A board of its own for a fight: the section's, copied so the fight can change it freely. */
export const cloneBoard = (b: Board): Board => ({ ...b, tiles: b.tiles.map((t) => ({ ...t })) });

/** Where section `of` lies against section `host`, in tiles (the host's tile (0, 0) is the origin of the frame the renderer draws in). */
export const against = (of: Section, host: Section): { u: number; v: number } => ({ u: of.origin.u - host.origin.u, v: of.origin.v - host.origin.v });

/** Where the old section's tiles lie in the frame of the section that follows it, given how that one joined. */
export const behind = (join: Join): { u: number; v: number } => (join === 'ne' ? { u: 0, v: D } : { u: W, v: 0 });

// ---- the heroes' walk --------------------------------------------------------------------------------------------------

/** A hero that is to take its place: any id, and a tile. */
export interface Spot {
  id: string;
  u: number;
  v: number;
}

/** Where a formation goes on a new board: each hero to the same tile if it is a free deploy tile there, else the nearest free one (by walk, ties by row then column). Heroes are taken in id order. A hero with nowhere free is left out. */
export function transferFormation(next: Board, formation: readonly Spot[]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const taken = new Set<number>();
  const free = (u: number, v: number) => v >= D - DEPLOY_ROWS && standable(tileAt(next, u, v)) && !taken.has(v * next.w + u);
  const ordered = [...formation].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // (those whose own tile is free keep it first, so a displaced hero never takes another's place)
  const rest: Spot[] = [];
  for (const h of ordered) {
    if (free(h.u, h.v)) {
      taken.add(h.v * next.w + h.u);
      out.set(h.id, [h.u, h.v]);
    } else rest.push(h);
  }
  for (const h of rest) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let v = D - DEPLOY_ROWS; v < D; v++)
      for (let u = 0; u < next.w; u++) {
        if (!free(u, v)) continue;
        const d = Math.abs(u - h.u) + Math.abs(v - h.v);
        if (d < bestD) {
          bestD = d;
          best = [u, v];
        }
      }
    if (!best) continue;
    taken.add(best[1] * next.w + best[0]);
    out.set(h.id, best);
  }
  return out;
}

/** The two sections as one board, in the frame of the new one (its tile (0, 0) is the origin); the old section's tiles are shifted by `offset`. A walker's path over both is found on it. */
export function seam(old: Board, next: Board, join: Join): { board: Board; offset: { u: number; v: number } } {
  const off = behind(join);
  if (join === 'ne') return { board: { seed: next.seed, area: next.area, w: next.w, d: next.d + old.d, tiles: [...next.tiles, ...old.tiles] }, offset: off };
  const w = next.w + old.w;
  const tiles: Tile[] = [];
  for (let v = 0; v < next.d; v++) for (let u = 0; u < w; u++) tiles.push(u < next.w ? next.tiles[v * next.w + u] : old.tiles[v * old.w + u - next.w]);
  return { board: { seed: next.seed, area: next.area, w, d: next.d, tiles }, offset: off };
}

/** The tiles a walker takes from `from` on the old section to `to` on the new, in the new section's frame (both ends included). A walker that jumps `jump` never climbs a cliff; a path that cannot be found is a straight dash. */
export function walkAcross(old: Board, next: Board, join: Join, from: { u: number; v: number }, to: { u: number; v: number }, jump: number): { u: number; v: number }[] {
  const { board, offset } = seam(old, next, join);
  const start = { u: from.u + offset.u, v: from.v + offset.v };
  const w = walkFrom(board, start, jump, new Set());
  const goal = to.v * board.w + to.u;
  if (!Number.isFinite(w.cost[goal])) return [start, to];
  const path: { u: number; v: number }[] = [];
  for (let j = goal; j >= 0; j = w.from[j]) path.push({ u: j % board.w, v: Math.floor(j / board.w) });
  return path.reverse();
}
