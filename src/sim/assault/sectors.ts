// The Assault's long walks (phase 0, `docs/notes/assault-0.md`; the design's section 7.3): the 100 x 100 field is cut into 25 x 25
// sectors of 4 x 4 tiles, and a sector graph says where a walker of each jump class can go. A long walk is an A* over the graph,
// cached until the graph changes; the short walk inside it is `walkNear` (path.ts). The graph is rebuilt only when the field's tiles
// change (a structure broken).
//
// A sector cut by a wall (the stone wall's top and the bailey below it in one sector, say) is not one place: so each sector is split
// into its REGIONS for each jump class, the tiles a walker of that class can walk between both ways without leaving the sector, and
// the graph's nodes are the regions. Most sectors are one region; a wall's sectors are two or three. A one-way drop between regions
// is a one-way edge.

import { canStep, FLY_JUMP, type Board } from '../board';

/** A sector's side, in tiles. */
export const SECTOR = 4;
/** The jump classes the graph keeps: a walker's jump, rounded down to one of these (anything at FLY_JUMP or over flies). */
export const JUMP_CLASSES = [1, 2, 3, 4, FLY_JUMP] as const;
/** The class a fighter who jumps `jump` walks in (an index into `JUMP_CLASSES`). */
export const jumpClass = (jump: number): number => (jump >= FLY_JUMP ? 4 : Math.max(0, Math.min(3, jump - 1)));

const WAYS: readonly [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** One jump class's graph: each tile's region, and each region's sector, middle tile and the regions it leads to. */
export interface ClassGraph {
  /** The region of each tile (-1 for a tile nobody of the class stands on). */
  region: Int32Array;
  /** Each region's sector, its tile nearest the sector's middle (a board index), and its ways out (to other regions). */
  sector: number[];
  mid: number[];
  out: number[][];
}

export interface SectorGraph {
  /** Sectors across and deep. */
  sw: number;
  sd: number;
  /** The board's width (to read board indices). */
  w: number;
  /** One graph for each jump class. */
  classes: ClassGraph[];
  /** How often the graph has been built (the first build counts). */
  builds: number;
  /** The long walks found, by (from, to, class) region: the next region, or -1 where there is no way. Cleared with each build. */
  next: Map<number, number>;
  /** How many A* searches have run (cache misses). */
  searches: number;
}

/** The sector a tile lies in. */
export const sectorOf = (g: SectorGraph, u: number, v: number): number => Math.floor(v / SECTOR) * g.sw + Math.floor(u / SECTOR);

/** Build the graph for a board. */
export function buildSectors(b: Board): SectorGraph {
  const g: SectorGraph = { sw: Math.ceil(b.w / SECTOR), sd: Math.ceil(b.d / SECTOR), w: b.w, classes: [], builds: 0, next: new Map(), searches: 0 };
  rebuildSectors(g, b);
  return g;
}

/** Build the graph again from the board's tiles as they are now (after a structure breaks). Given the tiles that changed, only their
 *  sectors are flooded again (their old regions are left empty) and only the ways out of those sectors and their neighbours are
 *  found again; with none given, the whole graph is built. */
export function rebuildSectors(g: SectorGraph, b: Board, changed?: readonly number[]): void {
  if (!changed || !g.classes.length) {
    g.classes = JUMP_CLASSES.map((jump) => {
      const cg: ClassGraph = { region: new Int32Array(b.w * b.d).fill(-1), sector: [], mid: [], out: [] };
      for (let s = 0; s < g.sw * g.sd; s++) floodSector(g, b, cg, jump, s);
      for (let s = 0; s < g.sw * g.sd; s++) waysOut(g, b, cg, jump, s);
      for (const o of cg.out) o.sort((x, y) => x - y);
      return cg;
    });
  } else {
    // (the sectors the changed tiles lie in, and those and their neighbours, each once and in order)
    const hit = [...new Set(changed.map((i) => sectorOf(g, i % b.w, Math.floor(i / b.w))))].sort((x, y) => x - y);
    const near = new Set<number>();
    for (const s of hit) {
      const su = s % g.sw;
      const sv = Math.floor(s / g.sw);
      near.add(s);
      for (const [du, dv] of WAYS) if (su + du >= 0 && sv + dv >= 0 && su + du < g.sw && sv + dv < g.sd) near.add((sv + dv) * g.sw + su + du);
    }
    const around = [...near].sort((x, y) => x - y);
    JUMP_CLASSES.forEach((jump, c) => {
      const cg = g.classes[c];
      for (const s of hit) {
        // (the sector's old regions are emptied: their numbers are never reused, so a cached walk cannot point into a new one)
        forSector(g, b, s, (i) => {
          const r = cg.region[i];
          if (r >= 0) {
            cg.sector[r] = -1;
            cg.out[r] = [];
          }
          cg.region[i] = -1;
        });
        floodSector(g, b, cg, jump, s);
      }
      const touched = new Set<number>();
      for (const s of around) forSector(g, b, s, (i) => {
        const r = cg.region[i];
        if (r >= 0) touched.add(r);
      });
      for (const r of touched) cg.out[r] = [];
      for (const s of around) waysOut(g, b, cg, jump, s);
      for (const r of touched) cg.out[r].sort((x, y) => x - y);
    });
  }
  g.builds++;
  g.next.clear();
}

/** Call `each` with every board index in sector `s`, row by row. */
function forSector(g: SectorGraph, b: Board, s: number, each: (i: number) => void): void {
  const su = (s % g.sw) * SECTOR;
  const sv = Math.floor(s / g.sw) * SECTOR;
  for (let v = sv; v < Math.min(b.d, sv + SECTOR); v++) for (let u = su; u < Math.min(b.w, su + SECTOR); u++) each(v * b.w + u);
}

const queue = new Int32Array(SECTOR * SECTOR);

/** Split sector `s` into its regions for a walker who jumps `jump`: the tiles walkable both ways from each other inside the sector,
 *  flooded in a fixed order; each new region is numbered after the last. */
function floodSector(g: SectorGraph, b: Board, cg: ClassGraph, jump: number, s: number): void {
  const t = b.tiles;
  const su = (s % g.sw) * SECTOR;
  const sv = Math.floor(s / g.sw) * SECTOR;
  const mu = su + (SECTOR >> 1);
  const mv = sv + (SECTOR >> 1);
  forSector(g, b, s, (i) => {
    // (a tile anyone of the class could stand on: a step onto it from itself is allowed)
    if (cg.region[i] >= 0 || canStep(t[i], t[i], jump) === null) return;
    const r = cg.sector.length;
    cg.sector.push(s);
    cg.out.push([]);
    cg.region[i] = r;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    let best = i;
    let bd = Infinity;
    while (head < tail) {
      const k = queue[head++];
      const ku = k % b.w;
      const kv = (k - ku) / b.w;
      const d = Math.abs(ku - mu) + Math.abs(kv - mv);
      if (d < bd || (d === bd && k < best)) {
        bd = d;
        best = k;
      }
      for (const [du, dv] of WAYS) {
        const nu = ku + du;
        const nv = kv + dv;
        if (nu < su || nv < sv || nu >= su + SECTOR || nv >= sv + SECTOR || nu >= b.w || nv >= b.d) continue;
        const j = nv * b.w + nu;
        if (cg.region[j] >= 0) continue;
        if (canStep(t[k], t[j], jump) === null || canStep(t[j], t[k], jump) === null) continue;
        cg.region[j] = r;
        queue[tail++] = j;
      }
    }
    cg.mid.push(best);
  });
}

/** The ways out of sector `s`'s regions: any step from a tile of one onto a tile of another (one way where only a drop goes). */
function waysOut(g: SectorGraph, b: Board, cg: ClassGraph, jump: number, s: number): void {
  const t = b.tiles;
  forSector(g, b, s, (i) => {
    const r = cg.region[i];
    if (r < 0) return;
    const u = i % b.w;
    const v = (i - u) / b.w;
    for (const [du, dv] of WAYS) {
      const nu = u + du;
      const nv = v + dv;
      if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
      const j = nv * b.w + nu;
      const z = cg.region[j];
      if (z < 0 || z === r || cg.out[r].includes(z)) continue;
      if (canStep(t[i], t[j], jump) !== null) cg.out[r].push(z);
    }
  });
}

/** The region of jump class `c` a board tile lies in (-1 for none). */
export const regionAt = (g: SectorGraph, c: number, i: number): number => g.classes[c].region[i];

/** The next region on the long walk from region `from` to region `to` for jump class `c` (`from` itself when they are one; -1 when
 *  there is no way). An A* over the regions, by their sectors' distance; its route is kept for every region along it until the graph
 *  is rebuilt. */
export function nextRegion(g: SectorGraph, from: number, to: number, c: number): number {
  if (from === to) return from;
  if (from < 0 || to < 0) return -1;
  const cg = g.classes[c];
  const n = cg.sector.length;
  const key = (from * n + to) * JUMP_CLASSES.length + c;
  const hit = g.next.get(key);
  if (hit !== undefined) return hit;
  g.searches++;
  const ts = cg.sector[to];
  const tu = ts % g.sw;
  const tv = Math.floor(ts / g.sw);
  const h = (r: number) => {
    const s = cg.sector[r];
    return Math.abs((s % g.sw) - tu) + Math.abs(Math.floor(s / g.sw) - tv);
  };
  const cost = new Int32Array(n).fill(-1);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  // (the open list as a heap of (f, region): the least f first, ties by the lowest region, so the route is the same every time)
  const hf: number[] = [];
  const hs: number[] = [];
  const less = (a: number, b: number) => hf[a] < hf[b] || (hf[a] === hf[b] && hs[a] < hs[b]);
  const swap = (a: number, b: number) => {
    const f = hf[a];
    hf[a] = hf[b];
    hf[b] = f;
    const s = hs[a];
    hs[a] = hs[b];
    hs[b] = s;
  };
  const push = (f: number, s: number) => {
    hf.push(f);
    hs.push(s);
    let k = hf.length - 1;
    while (k > 0 && less(k, (k - 1) >> 1)) {
      swap(k, (k - 1) >> 1);
      k = (k - 1) >> 1;
    }
  };
  const pop = (): number => {
    const s = hs[0];
    const lf = hf.pop()!;
    const ls = hs.pop()!;
    if (hf.length) {
      hf[0] = lf;
      hs[0] = ls;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        let m = k;
        if (l < hf.length && less(l, m)) m = l;
        if (l + 1 < hf.length && less(l + 1, m)) m = l + 1;
        if (m === k) break;
        swap(k, m);
        k = m;
      }
    }
    return s;
  };
  cost[from] = 0;
  push(h(from), from);
  let found = false;
  while (hf.length) {
    const r = pop();
    if (closed[r]) continue;
    closed[r] = 1;
    if (r === to) {
      found = true;
      break;
    }
    for (const z of cg.out[r]) {
      if (closed[z]) continue;
      const nc = cost[r] + 1;
      if (cost[z] >= 0 && nc >= cost[z]) continue;
      cost[z] = nc;
      came[z] = r;
      push(nc + h(z), z);
    }
  }
  if (!found) {
    g.next.set(key, -1);
    return -1;
  }
  // (the route, kept for every region on it: each one's next step towards `to`)
  let r = to;
  while (came[r] >= 0) {
    const p = came[r];
    g.next.set((p * n + to) * JUMP_CLASSES.length + c, r);
    r = p;
  }
  return g.next.get(key)!;
}

/** Whether a walker of jump class `c` on board tile `a` can walk to board tile `z` at all, by the graph. */
export function reaches(g: SectorGraph, c: number, a: number, z: number): boolean {
  const ra = regionAt(g, c, a);
  const rz = regionAt(g, c, z);
  return ra >= 0 && rz >= 0 && nextRegion(g, ra, rz, c) >= 0;
}
