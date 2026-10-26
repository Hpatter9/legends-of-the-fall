// The long map of an army run: the waves are sections of one winding road. Each section is a board of its own, dimensioned
// by its own board, so a fight, its pathing and its balance are those of a single board. The fight stays in the board's
// own coordinates (`u` across, `v` from the foes' edge at 0 to the heroes' edge at D - 1); the road lays each section in the
// world turned a quarter turn at a time (`turn.ts`), so the heroes deploy on the edge they came in by and fight along the
// road, whichever way the road runs. Pure rules (no Pixi, no DOM): the renderer draws the chain and walks the heroes over
// it, but the sim only ever fights on one section.
//
// The world is a grid of tiles (U runs down to the right on the screen, V down to the left). A section's `origin` is the
// corner of its footprint (width × depth, swapped when turned a quarter), and its tile (u, v) lies at `origin + turnTile(rot, u, v)`.
// A new section goes on the side of the one before: straight on (its foes' side), or either flank, never back over the edge the
// road came in by, and never on top of an earlier section. Its heroes' edge (its board's v = D - 1 row) lies against that side.

import { boardOk, CLIMB_MAX, D, DEPLOY_ROWS, DIRS, makeBoard, RAMP, standable, TOP, W, tileAt, type Area, type Board, type Tile } from './board';
import { walkFrom } from './path';
import { mixSeed, Rng } from './rng';
import { footDims, turnDir, turnTile, unturnTile, type Rot } from './turn';

/** The side of a section the next goes on, by where it lies on the screen (U runs southeast, V southwest). */
export type Join = 'ne' | 'nw' | 'se' | 'sw';
const SIDE: Record<Join, [number, number]> = { ne: [0, -1], nw: [-1, 0], se: [1, 0], sw: [0, 1] };
const JOINS = Object.keys(SIDE) as Join[];

export interface Section {
  /** The wave it hosts (from 1). */
  wave: number;
  board: Board;
  /** How many quarter turns the board is laid in the world. */
  rot: Rot;
  /** Where the corner of its footprint lies, in world tiles. */
  origin: { u: number; v: number };
  /** The side of the section before it that it joins (none for the first). */
  join: Join | null;
  /** A boss arena. */
  boss: boolean;
}

/** How far a joined edge tile may stand above or below the tile it meets (gentler than a cliff). */
export const JOIN_STEP = 1;
/** The fewest tiles a new section's heroes' edge must touch of the section before. */
export const MIN_CONTACT = 5;

/** Where a section lies, before it has a board. */
export interface Place {
  rot: Rot;
  ou: number;
  ov: number;
  join: Join | null;
}
export interface SectionSize { w: number; d: number }
const STANDARD: SectionSize = { w: W, d: D };

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const rectOf = (p: Place, size: SectionSize = STANDARD): Rect => {
  const [w, d] = footDims(p.rot, size.w, size.d);
  return { x0: p.ou, y0: p.ov, x1: p.ou + w, y1: p.ov + d };
};
export const footprint = (s: Section): Rect => rectOf({ rot: s.rot, ou: s.origin.u, ov: s.origin.v, join: s.join }, s.board);
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** The quarter turn that puts a board's heroes' edge against a side whose outward normal is `n` (the board's back, +v, then points at the section before). */
function rotFacing(n: [number, number]): Rot {
  for (const r of [0, 1, 2, 3] as const) {
    const [a, b] = turnDir(r, 0, 1);
    if (a === -n[0] && b === -n[1]) return r;
  }
  return 0;
}

/** Every place the section after `prev` can go: each side but the one the road came in by, each way of sliding along it that keeps `MIN_CONTACT` tiles together. */
export function placesAfter(prev: Place, size: SectionSize = STANDARD): Place[] {
  const back = turnDir(prev.rot, 0, 1);
  const p = rectOf(prev, size);
  const out: Place[] = [];
  for (const join of JOINS) {
    const n = SIDE[join];
    if (n[0] === back[0] && n[1] === back[1]) continue;
    const rot = rotFacing(n);
    const [w, d] = footDims(rot, size.w, size.d);
    // (the new section's heroes' edge is seven tiles; it slides along the side so that at least five touch)
    const alongX = n[1] !== 0;
    const len = alongX ? p.x1 - p.x0 : p.y1 - p.y0;
    for (let t = -(size.w - MIN_CONTACT); t <= len - MIN_CONTACT; t++) {
      const ou = n[0] > 0 ? p.x1 : n[0] < 0 ? p.x0 - w : p.x0 + t;
      const ov = n[1] > 0 ? p.y1 : n[1] < 0 ? p.y0 - d : p.y0 + t;
      out.push({ rot, ou, ov, join });
    }
  }
  return out;
}

/** The road's places for `n` sections: the first as always (not turned, the heroes in the southwest), each after chosen by the seed among those that fit, leaning to a compact road, with a step back (never needed in practice) if a choice paints the road into a corner. */
export function layRoad(seed: number, n: number, size: SectionSize = STANDARD): Place[] {
  const road: Place[] = [{ rot: 0, ou: 0, ov: 0, join: null }];
  let budget = 20000;
  const bounds = (list: Place[]) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of list) {
      const r = rectOf(q, size);
      x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1);
    }
    return (x1 - x0) + (y1 - y0) + 2 * Math.max(x1 - x0, y1 - y0);
  };
  const go = (): boolean => {
    if (road.length >= n) return true;
    if (budget-- <= 0) return false;
    const rng = new Rng(mixSeed(seed, 0xc4a1, road.length + 1));
    const prev = road[road.length - 1];
    const fits = placesAfter(prev, size).filter((c) => road.every((q) => !overlaps(rectOf(c, size), rectOf(q, size))));
    // (a lean to the compact, softened by the seed so the road does not always curl the same way; a straight run of three is a little dearer)
    const run = road.length >= 3 && road[road.length - 1].join === road[road.length - 2].join && road[road.length - 2].join === road[road.length - 3].join;
    const scored = fits.map((c) => ({ c, s: bounds([...road, c]) + rng.next() * 16 + (run && c.join === prev.join ? 4 : 0) })).sort((a, b) => a.s - b.s);
    for (const { c } of scored) {
      road.push(c);
      if (go()) return true;
      road.pop();
    }
    return false;
  };
  if (!go()) throw new Error(`no road of ${n} sections for seed ${seed}`);
  return road;
}

/** The world tile of board tile (u, v) of a section. */
export function worldOf(s: Pick<Section, 'rot' | 'origin'> & { board?: SectionSize }, u: number, v: number): [number, number] {
  const [a, b] = turnTile(s.rot, u, v, s.board?.w, s.board?.d);
  return [a + s.origin.u, b + s.origin.v];
}

/** The board tile of a section at a world tile, or null if the section does not cover it. */
export function boardTileAt(s: Pick<Section, 'rot' | 'origin' | 'board'>, U: number, V: number): [number, number] | null {
  const [u, v] = unturnTile(s.rot, U - s.origin.u, V - s.origin.v, s.board.w, s.board.d);
  return u >= 0 && v >= 0 && u < s.board.w && v < s.board.d ? [u, v] : null;
}

/** Ease the board's heights so no neighbours are more than `limit` apart, never moving a pinned tile. */
function easePinned(b: Board, pinned: ReadonlySet<number>, limit = CLIMB_MAX): void {
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
          if (Math.abs(d) <= limit) continue;
          // (the tile that gives way is the free one; of two free tiles, the higher is lowered)
          const lowerA = pinned.has(j) || (!pinned.has(i) && d > 0);
          if (lowerA) a.h = n.h + Math.sign(d) * limit;
          else n.h = a.h - Math.sign(d) * limit;
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/** Smooth the board's border (the ring of its outer tiles) to no more than a ramp between neighbours, never moving a pinned tile, so a section laid against this one meets gentle ground on whichever side it joins. */
function smoothRing(b: Board, pinned: ReadonlySet<number>): void {
  const ring: number[] = [];
  for (let u = 0; u < b.w; u++) ring.push(u);
  for (let v = 1; v < b.d; v++) ring.push(v * b.w + b.w - 1);
  for (let u = b.w - 2; u >= 0; u--) ring.push((b.d - 1) * b.w + u);
  for (let v = b.d - 2; v >= 1; v--) ring.push(v * b.w);
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let k = 0; k < ring.length; k++) {
      const i = ring[k];
      const j = ring[(k + 1) % ring.length];
      const d = b.tiles[i].h - b.tiles[j].h;
      if (Math.abs(d) <= RAMP) continue;
      const lowerI = pinned.has(j) || (!pinned.has(i) && d > 0);
      if (lowerI) b.tiles[i].h = b.tiles[j].h + Math.sign(d) * RAMP;
      else b.tiles[j].h = b.tiles[i].h - Math.sign(d) * RAMP;
      moved = true;
    }
    if (!moved) break;
  }
}

/** The pairs of tiles that meet where a new section's heroes' edge lies against the section before: the new board's tile, the old board's. */
export function contactPairs(prev: Section, next: Section): { n: [number, number]; p: [number, number] }[] {
  const [bu, bv] = turnDir(next.rot, 0, 1);
  const out: { n: [number, number]; p: [number, number] }[] = [];
  for (let u = 0; u < next.board.w; u++) {
    const [U, V] = worldOf(next, u, next.board.d - 1);
    const p = boardTileAt(prev, U + bu, V + bv);
    if (p) out.push({ n: [u, next.board.d - 1], p });
  }
  return out;
}

/** Join a fresh board onto the one before it: its heroes' edge is cleared of boulders and special ground, each tile of it stands within `JOIN_STEP` of the tile it meets, and the land inside is eased to match. Edits `next.board` only. */
export function joinBoard(prev: Section, next: Section): void {
  const b = next.board;
  const pairs = contactPairs(prev, next);
  const meets = new Map(pairs.map((q) => [q.n[0], q.p]));
  const edge: number[] = [];
  const h: number[] = new Array(b.w).fill(-1);
  let last = -1;
  let first = -1;
  let end = -1;
  for (let u = 0; u < b.w; u++) {
    const t = b.tiles[(b.d - 1) * b.w + u];
    edge.push((b.d - 1) * b.w + u);
    delete t.rock;
    delete t.ground;
    delete t.wall;
    delete t.barrel;
    delete t.bridge;
    const p = meets.get(u);
    if (!p) continue;
    // (a tile that meets another stands within `JOIN_STEP` of it, and within a ramp of the edge tile beside it, which the first clamp can leave out of reach)
    const meet = prev.board.tiles[p[1] * prev.board.w + p[0]].h;
    let lo = Math.max(0, meet - JOIN_STEP);
    let hi = Math.min(TOP, meet + JOIN_STEP);
    if (last >= 0) {
      lo = Math.max(lo, last - RAMP);
      hi = Math.min(hi, last + RAMP);
    }
    h[u] = last = Math.min(hi, Math.max(lo, t.h));
    if (first < 0) first = u;
    end = u;
  }
  // (the tiles of the edge that meet nothing follow their neighbours' heights, outwards from the ones that do)
  for (let u = end + 1; u < b.w; u++) h[u] = Math.min(h[u - 1] + RAMP, Math.max(h[u - 1] - RAMP, b.tiles[(b.d - 1) * b.w + u].h));
  for (let u = first - 1; u >= 0; u--) h[u] = Math.min(h[u + 1] + RAMP, Math.max(h[u + 1] - RAMP, b.tiles[(b.d - 1) * b.w + u].h));
  if (first >= 0) for (let u = 0; u < b.w; u++) b.tiles[(b.d - 1) * b.w + u].h = h[u];
  smoothRing(b, new Set(edge));
  easePinned(b, new Set(edge));
  // (the edge's new heights can cut a staircase off: then the land inside is eased to ramps instead, platforms and all)
  if (!boardOk(b)) easePinned(b, new Set(edge), RAMP);
}

/** The road of `waves` sections for a run: wave n's board is `makeBoard(boardSeed(n), area)`, laid on the road and joined to the one before. */
export function buildChain(seed: number, waves: number, area: Area | ((wave: number) => Area), boardSeed: (wave: number) => number, boss: (wave: number) => boolean, size: SectionSize = STANDARD): Section[] {
  const road = layRoad(seed, waves, size);
  const out: Section[] = [];
  for (let n = 1; n <= waves; n++) {
    const q = road[n - 1];
    const land = typeof area === 'function' ? area(n) : area;
    const s: Section = { wave: n, board: makeBoard(boardSeed(n), land, size.w, size.d), rot: q.rot, origin: { u: q.ou, v: q.ov }, join: q.join, boss: boss(n) };
    // (the first section meets no other, but a later one may be laid against it: its border is smoothed too)
    const settle = () => {
      if (n > 1) joinBoard(out[n - 2], s);
      else smoothRing(s.board, new Set());
    };
    settle();
    // (a shape the join or the smoothing cuts apart, a bridge or gate left without its far side, is laid the old way instead)
    if (!boardOk(s.board)) {
      s.board = makeBoard(boardSeed(n), land, size.w, size.d, 'classic');
      settle();
    }
    out.push(s);
  }
  return out;
}

/** A board of its own for a fight: the section's, copied so the fight can change it freely. */
export const cloneBoard = (b: Board): Board => ({ ...b, tiles: b.tiles.map((t) => ({ ...t })) });

/** Where section `of` lies against section `host`, in world tiles. */
export const against = (of: Section, host: Section): { u: number; v: number } => ({ u: of.origin.u - host.origin.u, v: of.origin.v - host.origin.v });

/** The frame (`render/iso.ts`) a section is drawn in with `host` at the origin. */
export const frameOf = (s: Section, host: Section): { rot: Rot; ou: number; ov: number; w?: number; d?: number } => ({ rot: s.rot, ou: s.origin.u - host.origin.u, ov: s.origin.v - host.origin.v, ...(s.board.w === W && s.board.d === D ? {} : { w: s.board.w, d: s.board.d }) });

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
  const free = (u: number, v: number) => v >= next.d - DEPLOY_ROWS && standable(tileAt(next, u, v)) && !taken.has(v * next.w + u);
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
    for (let v = next.d - DEPLOY_ROWS; v < next.d; v++)
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

/** The two sections as one board of world tiles (a tile neither covers is a wall); `minU`, `minV` are the world tile of its (0, 0). A walker's path over both is found on it. */
export function seam(a: Section, b: Section): { board: Board; minU: number; minV: number } {
  const ra = footprint(a);
  const rb = footprint(b);
  const minU = Math.min(ra.x0, rb.x0);
  const minV = Math.min(ra.y0, rb.y0);
  const w = Math.max(ra.x1, rb.x1) - minU;
  const d = Math.max(ra.y1, rb.y1) - minV;
  const wall: Tile = { h: 0, rock: true, deco: 0 };
  const tiles: Tile[] = [];
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const U = u + minU;
      const V = v + minV;
      const inB = boardTileAt(b, U, V);
      const inA = boardTileAt(a, U, V);
      tiles.push(inB ? b.board.tiles[inB[1] * b.board.w + inB[0]] : inA ? a.board.tiles[inA[1] * a.board.w + inA[0]] : wall);
    }
  return { board: { seed: b.board.seed, area: b.board.area, w, d, tiles }, minU, minV };
}

/** The world tiles a walker takes from `from` on the old section to `to` on the new, both ends included. A walker that jumps `jump` never climbs a cliff; a path that cannot be found is a straight dash. */
export function walkAcross(old: Section, next: Section, from: { u: number; v: number }, to: { u: number; v: number }, jump: number): { u: number; v: number }[] {
  const { board, minU, minV } = seam(old, next);
  const [fu, fv] = worldOf(old, from.u, from.v);
  const [tu, tv] = worldOf(next, to.u, to.v);
  const start = { u: fu - minU, v: fv - minV };
  const w = walkFrom(board, start, jump, new Set());
  const goal = (tv - minV) * board.w + (tu - minU);
  if (!Number.isFinite(w.cost[goal])) return [{ u: fu, v: fv }, { u: tu, v: tv }];
  const path: { u: number; v: number }[] = [];
  for (let j = goal; j >= 0; j = w.from[j]) path.push({ u: (j % board.w) + minU, v: Math.floor(j / board.w) + minV });
  return path.reverse();
}
