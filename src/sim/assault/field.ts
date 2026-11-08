// The Assault's field state, phase 0 (`docs/notes/assault-0.md`; the design's section 7.3): what a fight on the 100 x 100 field keeps
// besides the `Battle` itself, so that no decision scans every fighter or the whole board. It hangs on `Battle.field`, which is absent
// on every other fight: nothing outside `src/sim/assault/` reads it, and no existing function changes when it is absent.
//
// - The OCCUPANCY GRID: the id of the fighter standing on each tile (-1 for none), kept as fighters step and fall, so "who stands
//   here" is one read.
// - The BUCKETS: 8 x 8-tile squares, each listing its living fighters in id order, rebuilt each tick (a counting sort), so "who is
//   near" looks only at the squares within reach.
// - The SECTOR GRAPH for long walks (`sectors.ts`).

import type { UnitDef } from '../units';
import type { Unit } from '../battle';
import type { Board } from '../board';
import { buildSectors, type SectorGraph } from './sectors';

/** A bucket's side, in tiles. */
export const BUCKET = 8;

/** A fighter's part in the field: a leader walks real walks; a soldier steers to its slot behind its leader. */
export type FieldRole = 'leader' | 'soldier';

/** What the field knows of each fighter, by its id. */
export interface FieldInfo {
  /** Its stats (a hero's or a foe's own def; a troop's from the troop table). */
  def: UnitDef;
  /** The sheet it is drawn with. */
  sheet: string;
  role: FieldRole;
  /** Its group (a platoon, or a foe post) and its place in the group's formation. */
  group: number;
  slot: number;
  /** When it last found no step towards where it wants to be (a soldier asks for a bounded walk after `STUCK_MS`). */
  stuck?: number;
}

/** A group of fighters: one of our platoons (a hero and its soldiers) or one of the garrison's posts. */
export interface FieldGroup {
  id: number;
  side: 'hero' | 'foe';
  name: string;
  /** Its leader's id, and every member's (the leader first). */
  leader: number;
  members: number[];
  /** Where the post stands (a foe post's home) or the platoon mustered. */
  home: { u: number; v: number };
  /** A sleeping post does not decide at all until it wakes (the design's 7.3, point 5); our platoons are always awake. */
  awake: boolean;
  /** Where the group is going: a platoon's waypoints in turn, a post's mark once awake. */
  route: { u: number; v: number }[];
  /** The formation's facing (an index into `DIRS`). */
  heading: number;
  /** How long its leader has waited for stragglers (a leader waits a little, then goes on). */
  waited?: number;
}

export interface FieldStats {
  /** Bounded walks (`walkNear`) run, in all and this tick. */
  walks: number;
  tickWalks: number;
  /** Fighters that decided, in all and this tick (the most in one tick is kept too). */
  decided: number;
  tickDecided: number;
  mostDecided: number;
  /** Sector graph rebuilds after the first build. */
  rebuilds: number;
  /** Ticks stepped. */
  ticks: number;
}

export interface FieldState {
  w: number;
  d: number;
  /** The id standing on each tile, or -1. */
  occ: Int32Array;
  /** The buckets across and deep, and their lists: bucket `k`'s fighters are `items[start[k]]` to `items[start[k + 1] - 1]`, in id order. */
  bw: number;
  bd: number;
  start: Int32Array;
  items: Int32Array;
  /** The counting sort's scratch. */
  count: Int32Array;
  sectors: SectorGraph;
  /** Each tile's zone (its stencil character's code). */
  zone: Uint8Array;
  /** The field's fighters by id (the battle's own `Unit`s), and what the field knows of each. */
  byId: Unit[];
  info: FieldInfo[];
  groups: FieldGroup[];
  stats: FieldStats;
}

/** A fresh field state for a board. */
export function newField(board: Board, zone: Uint8Array): FieldState {
  const bw = Math.ceil(board.w / BUCKET);
  const bd = Math.ceil(board.d / BUCKET);
  return {
    w: board.w,
    d: board.d,
    occ: new Int32Array(board.w * board.d).fill(-1),
    bw,
    bd,
    start: new Int32Array(bw * bd + 1),
    count: new Int32Array(bw * bd + 1),
    items: new Int32Array(0),
    sectors: buildSectors(board),
    zone,
    byId: [],
    info: [],
    groups: [],
    stats: { walks: 0, tickWalks: 0, decided: 0, tickDecided: 0, mostDecided: 0, rebuilds: 0, ticks: 0 },
  };
}

/** Who stands on a tile: one read of the grid. */
export const occAt = (f: FieldState, u: number, v: number): number => (u >= 0 && v >= 0 && u < f.w && v < f.d ? f.occ[v * f.w + u] : -1);

/** Put a fighter on its tile in the grid (as it joins the field). */
export function occPut(f: FieldState, me: Unit): void {
  f.occ[me.v * f.w + me.u] = me.id;
}

/** Move a fighter's mark in the grid from its tile to board tile `i` (its `u`, `v` are set by the caller after). */
export function occMove(f: FieldState, me: Unit, i: number): void {
  const was = me.v * f.w + me.u;
  if (f.occ[was] === me.id) f.occ[was] = -1;
  f.occ[i] = me.id;
}

/** Take a fallen fighter off the grid. */
export function occClear(f: FieldState, me: Unit): void {
  const i = me.v * f.w + me.u;
  if (f.occ[i] === me.id) f.occ[i] = -1;
}

/** The bucket a tile lies in. */
export const bucketOf = (f: FieldState, u: number, v: number): number => Math.floor(v / BUCKET) * f.bw + Math.floor(u / BUCKET);

/** Rebuild the buckets from the living fighters (in id order, so every list is in id order): a counting sort, one pass to count and
 *  one to place. */
export function rebuildBuckets(f: FieldState, units: readonly Unit[]): void {
  const n = f.bw * f.bd;
  const count = f.count;
  count.fill(0);
  let live = 0;
  for (const x of units) {
    if (!x.alive) continue;
    count[bucketOf(f, x.u, x.v) + 1]++;
    live++;
  }
  for (let k = 0; k < n; k++) count[k + 1] += count[k];
  f.start.set(count);
  if (f.items.length < live) f.items = new Int32Array(live);
  const at = count;
  for (const x of units) if (x.alive) f.items[at[bucketOf(f, x.u, x.v)]++] = x.id;
}

/** Call `see` for each living fighter (as the buckets were built this tick) within `r` tiles (by steps, `apart`) of (u, v), bucket by
 *  bucket in order and each bucket in id order. `see` returns true to stop. */
export function forNear(f: FieldState, u: number, v: number, r: number, see: (x: Unit) => boolean | void): void {
  const b0 = Math.max(0, Math.floor((u - r) / BUCKET));
  const b1 = Math.min(f.bw - 1, Math.floor((u + r) / BUCKET));
  const c0 = Math.max(0, Math.floor((v - r) / BUCKET));
  const c1 = Math.min(f.bd - 1, Math.floor((v + r) / BUCKET));
  for (let c = c0; c <= c1; c++)
    for (let b = b0; b <= b1; b++) {
      const k = c * f.bw + b;
      for (let i = f.start[k]; i < f.start[k + 1]; i++) {
        const x = f.byId[f.items[i]];
        if (!x.alive || Math.abs(x.u - u) + Math.abs(x.v - v) > r) continue;
        if (see(x)) return;
      }
    }
}
