// The Calamity's map as a land (the owner's ask: a local isometric land with a defined road through it, fog of war and hidden side
// spots). The node graph of `calamityMap` (rows and `next` links) is kept as it is; this lays its nodes out as spots on an isometric
// lattice, joins them by roads of tiles, scatters trees and rocks round them, and says which spots the fog has lifted from. Everything
// here is a plain function of the run's seed and its state, with its own side streams, so the maps' nodes and the balance are as they
// were. Pure: no Pixi, no DOM, no clock.
//
// The lattice: a cell is (i, j); on screen, with a tile `tw` across and `th` down, a cell's centre is ((i - j) tw/2, (i + j) th/2).
// "Up the screen" is a falling i + j, so the road runs from the start (the portal, at the foot) up to the boss's lair at the head.

import { mixSeed, Rng } from './rng';
import type { MapNode, NodeKind } from './tower';

/** The id of the start spot (the portal the party arrives through), and the first id of the hidden side spots (map nodes have small ids). */
export const START_ID = -1;
export const SIDE_BASE = 100;

export interface Cell {
  i: number;
  j: number;
}

/** What a hidden side spot is: a hoard, or a mini-boss elite. */
export type SideKind = 'treasure' | 'elite';

/** A dead-end detour off the road: one spot, found only once the node it hangs from has been cleared. */
export interface SideSpot {
  id: number;
  /** The map node it hangs from: it shows when that node is cleared, and can be taken while the party stands there. */
  from: number;
  kind: SideKind;
}

export interface LandSpot extends Cell {
  /** A map node's id, `START_ID` for the portal, or a side spot's id. */
  id: number;
  kind: NodeKind | 'start';
  row: number;
  /** A hidden side spot. */
  side?: boolean;
}

/** A road: its cells from one spot's cell to the next's, both ends included. */
export interface Road {
  from: number;
  to: number;
  cells: Cell[];
  /** A side spot's road (a short detour). */
  side?: boolean;
}

export type DecorRole = 'tree' | 'bush' | 'rock';
export interface Decor extends Cell {
  role: DecorRole;
  /** Which of the land's pictures of that role (taken modulo how many it has). */
  v: number;
  flip: boolean;
}

export interface Land {
  act: number;
  spots: LandSpot[];
  roads: Road[];
  decor: Decor[];
  /** The span of the lattice in `a = i + j` (falling is up the screen) and `b = i - j` (across), padded for the picture. */
  aMin: number;
  aMax: number;
  bMax: number;
}

/** Salts for the side streams: the layout, the decoration and the hidden spots. */
const LAND_SALT = 0x1a4d;
const DECOR_SALT = 0xdec0;
const SIDE_SALT = 0x51de;
/** The `a` steps between two rows of the map, and the start's below the first row. */
const ROW_A = 8;
const START_A = 5;
/** The widest the decoration reaches (in `b`): a phone shows about plus or minus 5. */
const DECOR_B = 9;
/** The widest a hidden side spot stands from the middle (in `b`): a sprite there still fits a phone's width. */
const SIDE_B = 3;

const cellOf = (a: number, b: number): Cell => ({ i: (a + b) / 2, j: (a - b) / 2 });
const aOf = (c: Cell): number => c.i + c.j;
const bOf = (c: Cell): number => c.i - c.j;
const keyOf = (c: Cell): string => `${c.i},${c.j}`;

/** Where a row's nodes stand across the land, by how many there are. */
const SLOTS: Record<number, number[]> = { 1: [0], 2: [-2, 2], 3: [-2, 0, 2], 4: [-3, -1, 1, 3] };
/** How far each of them stands below the row's line, in `a` (the middle of three rides higher, the four alternate), so the sprites do not crowd. */
const STAGGER: Record<number, number[]> = { 1: [0], 2: [0, 0], 3: [1, -1, 1], 4: [1, -1, 1, -1] };

/** The side spots the seed asks for (before the layout finds room for them): none on some maps, one or two on others, each on a different row of the first half. */
function rawSides(seed: number, act: number, nodes: readonly MapNode[]): SideSpot[] {
  const rng = new Rng(mixSeed(seed, SIDE_SALT, act));
  const last = Math.max(...nodes.map((n) => n.row));
  const roll = rng.next();
  const want = roll < 0.3 ? 0 : roll < 0.8 ? 1 : 2;
  // (a node that is not the boss's door or the campfire before it, with road ahead of it)
  const pool = nodes.filter((n) => n.row >= 1 && n.row <= last - 3);
  const out: SideSpot[] = [];
  const rows = new Set<number>();
  for (let k = 0; k < want; k++) {
    const left = pool.filter((n) => !rows.has(n.row));
    if (!left.length) break;
    const from = rng.pick(left);
    rows.add(from.row);
    out.push({ id: SIDE_BASE + k, from: from.id, kind: rng.chance(0.55) ? 'treasure' : 'elite' });
  }
  return out;
}

/** The hidden side spots of an act's map: those the seed asks for that the land has room for (a spot with no room is left out, so every one can be seen and taken). */
export function sideSpots(seed: number, act: number, nodes: readonly MapNode[]): SideSpot[] {
  const raw = rawSides(seed, act, nodes);
  if (!raw.length) return raw;
  const land = landOf(seed, act, nodes, raw);
  return raw.filter((s) => land.spots.some((p) => p.id === s.id));
}

/** The cells of a road between two spots: a staircase of single steps, its turns drawn from the stream so the road winds. */
function walk(p: Cell, q: Cell, rng: Rng): Cell[] {
  const cells: Cell[] = [{ ...p }];
  let { i, j } = p;
  while (i !== q.i || j !== q.j) {
    const wi = Math.abs(q.i - i);
    const wj = Math.abs(q.j - j);
    const stepI = !wj || (wi && rng.chance(wi / (wi + wj)));
    if (stepI) i += Math.sign(q.i - i);
    else j += Math.sign(q.j - j);
    cells.push({ i, j });
  }
  return cells;
}

/** The land of an act's map: the nodes as spots, the roads between them and the side spots, the decoration. */
export function landOf(seed: number, act: number, nodes: readonly MapNode[], sides: readonly SideSpot[] = rawSides(seed, act, nodes)): Land {
  const rng = new Rng(mixSeed(seed, LAND_SALT, act));
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const spots: LandSpot[] = [];
  const place = (id: number, kind: LandSpot['kind'], row: number, a: number, b: number, side?: boolean) => {
    // (a cell needs `a` and `b` of the same parity: a spot that is off by one is moved up a half-tile)
    if ((a + b) & 1) a -= 1;
    spots.push({ id, kind, row, ...cellOf(a, b), ...(side ? { side } : {}) });
  };
  const aOfRow = (r: number) => (rows - r) * ROW_A + 3;
  for (let r = 0; r < rows; r++) {
    const here = nodes.filter((n) => n.row === r).sort((x, y) => x.lane - y.lane || x.id - y.id);
    const n = Math.min(here.length, 4);
    const slots = SLOTS[n] ?? SLOTS[4];
    const stag = STAGGER[n] ?? STAGGER[4];
    here.forEach((node, k) => {
      const boss = node.kind === 'boss';
      const wander = boss || n >= 3 ? 0 : rng.pick([-1, 0, 0, 1]);
      place(node.id, node.kind, r, aOfRow(r) + (boss ? 0 : stag[Math.min(k, 3)] ?? 0), boss ? 0 : (slots[Math.min(k, slots.length - 1)] ?? 0) + wander);
    });
  }
  place(START_ID, 'start', -1, aOfRow(-1) + START_A - ROW_A + 2, 0);
  const byId = new Map(spots.map((s) => [s.id, s]));
  const roads: Road[] = [];
  const road = (from: number, to: number, side = false) => {
    const p = byId.get(from)!;
    const q = byId.get(to)!;
    roads.push({ from, to, cells: walk(p, q, rng), ...(side ? { side } : {}) });
  };
  for (const n of nodes) if (n.row === 0) road(START_ID, n.id);
  for (const n of nodes) for (const to of n.next) road(n.id, to);
  // (the side spots: the nearest free cell a few steps from their node, across the middle of the land and clear of every other spot and road)
  const onRoad = new Set<string>();
  for (const r of roads) for (const c of r.cells) onRoad.add(keyOf(c));
  for (const s of sides) {
    const from = byId.get(s.from);
    if (!from) continue;
    const found: { a: number; b: number; d: number }[] = [];
    for (let a = aOf(from) - 5; a <= aOf(from) + 5; a++) {
      for (let b = -SIDE_B; b <= SIDE_B; b++) {
        if ((a + b) & 1) continue;
        const c = cellOf(a, b);
        // (on screen, `b` is half a tile across and `a` half a tile down: stay a sprite's width clear of every other spot)
        const away = (t: Cell) => Math.hypot((bOf(t) - bOf(c)) * 45, (aOf(t) - aOf(c)) * 26);
        if (onRoad.has(keyOf(c)) || spots.some((t) => away(t) < 82)) continue;
        const d = away(from);
        if (d >= 90 && d <= 280) found.push({ a, b, d });
      }
    }
    // (the nearest wins; the stream breaks a tie)
    found.sort((x, y) => x.d - y.d);
    const best = found.filter((f) => f.d === found[0]?.d);
    const spot = best.length ? best[rng.int(0, best.length - 1)] : undefined;
    if (!spot) continue;
    place(s.id, s.kind, from.row, spot.a, spot.b, true);
    byId.set(s.id, spots[spots.length - 1]);
    road(s.from, s.id, true);
    for (const c of roads[roads.length - 1].cells) onRoad.add(keyOf(c));
  }
  // (the decoration: trees, bushes and rocks on the cells off the road, thicker towards the edges)
  const used = new Set<string>();
  for (const r of roads) for (const c of r.cells) used.add(keyOf(c));
  const near = (c: Cell, d: number) => {
    for (let di = -d; di <= d; di++) for (let dj = -d; dj <= d; dj++) if (used.has(`${c.i + di},${c.j + dj}`)) return true;
    return false;
  };
  const roadCells = roads.flatMap((r) => r.cells);
  const aMin = Math.min(...spots.map(aOf)) - 4;
  const aMax = Math.max(...spots.map(aOf)) + 5;
  const decor: Decor[] = [];
  const drng = new Rng(mixSeed(seed, DECOR_SALT, act));
  const taken = new Set<string>();
  for (let a = aMin - 2; a <= aMax + 2; a++) {
    for (let b = -DECOR_B; b <= DECOR_B; b++) {
      if ((a + b) & 1) continue;
      const c = cellOf(a, b);
      const edge = Math.abs(b) / DECOR_B;
      // (every roll is drawn, wherever it lands, so a cell's decoration does not depend on its neighbours' fate)
      const roll = drng.next();
      const role = drng.weighted({ tree: 5 + 6 * edge, bush: 3, rock: 2 });
      const v = drng.int(0, 5);
      const flip = drng.chance(0.5);
      if (near(c, 1) || roll > 0.07 + 0.5 * edge * edge + 0.1 * edge) continue;
      // (a tree is tall: none where a road or a spot stands just behind it on the screen)
      if (role === 'tree' && roadCells.some((r) => aOf(r) < aOf(c) && aOf(r) >= aOf(c) - 4 && Math.abs(bOf(r) - bOf(c)) <= 2)) continue;
      if (taken.has(keyOf(c))) continue;
      taken.add(keyOf(c));
      decor.push({ ...c, role: role as DecorRole, v, flip });
    }
  }
  return { act, spots, roads, decor, aMin, aMax, bMax: DECOR_B };
}

/* ------------------------------------------------------------------ the fog */

/** What the party has seen of an act's map (a view of `TowerState`: its map, the node cleared last, the nodes cleared, the node in play and the side spots taken). */
export interface Seen {
  map: readonly MapNode[];
  at: number;
  path: readonly number[];
  cur?: { id: number };
  sideDone?: readonly number[];
}

export interface Fog {
  /** The ids of the spots the fog has lifted from. */
  spots: Set<number>;
  /** The roads shown, as `from>to`. */
  roads: Set<string>;
}

/**
 * The spots the fog has lifted from: the start, the first floor's spots (the road out of the portal), each cleared spot and the spot or
 * spots (both of a fork) its road leads on to, the spot in play, and a side spot once the node it hangs from is cleared. Nothing further.
 */
export function fogOf(t: Seen, sides: readonly SideSpot[]): Fog {
  const spots = new Set<number>([START_ID]);
  const roads = new Set<string>();
  const cleared = new Set<number>(t.path);
  for (const n of t.map) {
    if (n.row === 0) {
      spots.add(n.id);
      roads.add(`${START_ID}>${n.id}`);
    }
  }
  for (const id of cleared) {
    spots.add(id);
    for (const to of t.map[id]?.next ?? []) {
      spots.add(to);
      roads.add(`${id}>${to}`);
    }
  }
  if (t.cur) spots.add(t.cur.id);
  for (const s of sides) {
    if (!cleared.has(s.from)) continue;
    spots.add(s.id);
    roads.add(`${s.from}>${s.id}`);
  }
  return { spots, roads };
}

/** A spot's state on the map. */
export type SpotState = 'done' | 'here' | 'open' | 'passed' | 'far';

/** The roads' cells that are lit, for the fog's holes: every cell of a shown road. */
export function litCells(land: Land, fog: Fog): Cell[] {
  const out: Cell[] = [];
  for (const r of land.roads) if (fog.roads.has(`${r.from}>${r.to}`)) out.push(...r.cells);
  return out;
}

/** The cells of the road from spot `from` to spot `to` (the walker's way), or null when there is none. */
export function roadBetween(land: Land, from: number, to: number): Cell[] | null {
  return land.roads.find((r) => r.from === from && r.to === to)?.cells ?? null;
}
