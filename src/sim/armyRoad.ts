// The road of an army's long map (WORLD-ROAD): each section's walkable ground is a winding road that follows the route,
// six to ten tiles wide, bending, widening and narrowing, with the land beside it (a wood, crags, ruins, a pool...) left as
// scenery nobody stands on (`Tile.scene`). Where the road leaves a section the next one's road comes in, so the two meet at the
// join. A boss wave's section is the army's own arena at the road's end instead (`ARENAS`): a war camp's palisade, a
// mausoleum's courtyard, a ring of lava... Pure rules: no Pixi, no DOM; every choice by a side stream of the plan's seed.

import { DIRS, tileAt, type Board, type PieceKind, type Scenery, type Tile } from './board';
import { mixSeed, Rng } from './rng';
import { turnDir, turnTile, unturnTile, type Rot } from './turn';

/** Where a section lies (the chain's `Place`, kept here so this file does not import chain.ts). */
interface Lies {
  rot: Rot;
  ou: number;
  ov: number;
}
type At = [number, number];

/** The tiles of `a` and of `b` that touch, where b's heroes' edge (its board's last row) lies against a side of a: each in its own board's coordinates. */
export function touching(a: Lies, b: Lies, w: number, d: number): { a: At[]; b: At[] } {
  const [bu, bv] = turnDir(b.rot, 0, 1);
  const out = { a: [] as At[], b: [] as At[] };
  for (let u = 0; u < w; u++) {
    const [x, y] = turnTile(b.rot, u, d - 1, w, d);
    const [pu, pv] = unturnTile(a.rot, x + b.ou + bu - a.ou, y + b.ov + bv - a.ov, w, d);
    if (pu < 0 || pv < 0 || pu >= w || pv >= d) continue;
    out.a.push([pu, pv]);
    out.b.push([u, d - 1]);
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The road's ends in a board's coordinates: where it comes in (the middle of the tiles touching the section before, or the heroes' edge's middle for
 *  the first), and where it leaves (the middle of the tiles touching the next, a little past the edge; the foes' edge's middle for the last). */
function ends(w: number, d: number, entry: At[] | null, exit: At[] | null, rng: Rng): { start: At; end: At; flank: number } {
  const start: At = [entry?.length ? mean(entry.map((p) => p[0])) : (w - 1) / 2, d - 0.4];
  if (!exit?.length) return { start, end: [(w - 1) / 2 + rng.range(-1.5, 1.5), -0.6], flank: 0 };
  const us = exit.map((p) => p[0]);
  const vs = exit.map((p) => p[1]);
  // (the next section touches the foes' edge, or one flank)
  if (vs.every((v) => v === 0) && exit.length > 1 && new Set(us).size > 1) return { start, end: [mean(us), -0.6], flank: 0 };
  const side = us[0] === 0 ? -1 : 1;
  return { start, end: [side < 0 ? -0.6 : w - 0.4, mean(vs)], flank: side };
}

/** A Catmull-Rom curve through the points, sampled every quarter tile. */
function curve(pts: At[]): At[] {
  const out: At[] = [];
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const [a, b, c, e] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 4));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (j: 0 | 1) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + e[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Mark the tiles within `r(i)` of the curve's samples. */
function brush(road: boolean[], w: number, d: number, line: At[], r: (i: number) => number): void {
  line.forEach(([x, y], i) => {
    const rad = r(i);
    for (let v = Math.max(0, Math.floor(y - rad)); v <= Math.min(d - 1, Math.ceil(y + rad)); v++)
      for (let u = Math.max(0, Math.floor(x - rad)); u <= Math.min(w - 1, Math.ceil(x + rad)); u++)
        if ((u - x) ** 2 + (v - y) ** 2 <= rad * rad) road[v * w + u] = true;
  });
}

/** The road narrows to this half-width at its narrowest... */
export const ROAD_MIN = 3.0;
/** ...and widens to this (a road six to ten tiles across). */
export const ROAD_MAX = 4.3;

/** Which tiles of a w x d section are the road: a winding band from where it comes in to where it leaves, through the foes' rows, bending
 *  by the seed and swelling and narrowing as it goes (`ROAD_MIN` to `ROAD_MAX`). `entry` and `exit` are the tiles touching the sections before and after. */
export function roadMask(w: number, d: number, entry: At[] | null, exit: At[] | null, seed: number): boolean[] {
  const rng = new Rng(mixSeed(seed, 0x20ad));
  const { start, end, flank } = ends(w, d, entry, exit, rng);
  const lo = 3.5;
  const hi = w - 4.5;
  const clamp = (x: number) => Math.max(lo, Math.min(hi, x));
  // (the foes' camp: the road always crosses the foes' three rows, even when it leaves by a flank)
  const camp: At = [flank ? clamp(flank < 0 ? 4 : w - 5) : clamp(end[0]), 1.2];
  const pts: At[] = [start];
  for (const f of [0.7, 0.4]) pts.push([clamp(start[0] + (camp[0] - start[0]) * (1 - f) + rng.range(-3, 3)), d * f]);
  pts.push(camp);
  pts.push(end);
  const line = curve(pts);
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const road = new Array<boolean>(w * d).fill(false);
  brush(road, w, d, line, (i) => {
    const s = i / 4;
    const swell = (0.5 + 0.5 * Math.sin(s * 0.9 + p1)) * (0.65 + 0.35 * Math.sin(s * 0.37 + p2));
    // (wide enough where the heroes come in for five of them and room to choose)
    return Math.max(s < 3 ? 3.4 : 0, ROAD_MIN + (ROAD_MAX - ROAD_MIN) * swell);
  });
  return road;
}

/** Each theme's land beside the road: the share of each kind (the rest of the table's weights). */
const BESIDE: Record<string, [Scenery, number][]> = {
  orcs: [['wood', 5], ['rocks', 3.9], ['fence', 0.8], ['bones', 0.3]],
  undead: [['ruin', 3], ['grave', 3], ['wood', 2.5], ['rocks', 1.5]],
  necropolis: [['ruin', 3], ['grave', 3], ['wood', 2.5], ['rocks', 1.5]],
  beasts: [['wood', 4.5], ['rocks', 3], ['bones', 2.5]],
  wildwood: [['wood', 7.5], ['water', 1.5], ['rocks', 1]],
  labyrinth: [['ruin', 5], ['water', 3], ['rocks', 2]],
  temple: [['ruin', 4], ['water', 4], ['wood', 2]],
  ogres: [['rocks', 5.5], ['wood', 3.5], ['stones', 1]],
  mountain: [['rocks', 5], ['wood', 4.5], ['stones', 0.5]],
  infernal: [['lava', 4], ['rocks', 4], ['wood', 2]],
  yokai: [['wood', 5], ['water', 2], ['stones', 1.5], ['rocks', 1.5]],
  golems: [['crystal', 4], ['rocks', 3.5], ['lava', 2.5]],
};

/** Smooth noise in [0, 1) over the world, so the land beside the road comes in patches and runs on from one section into the next. */
function patch(seed: number, salt: number, U: number, V: number): number {
  const at = (x: number, y: number) => (mixSeed(seed, salt, x, y) >>> 0) / 4294967296;
  const fx = U / 2.6;
  const fy = V / 2.6;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const sx = fx - ix;
  const sy = fy - iy;
  const a = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
  const b = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
  return a * (1 - sy) + b * sy;
}

/** The scenery at a world tile beside the road, for a theme. */
export function besideAt(theme: string, seed: number, U: number, V: number): Scenery {
  const table = BESIDE[theme] ?? BESIDE.mountain;
  const total = table.reduce((a, [, n]) => a + n, 0);
  // (patches of one kind, with a stray tile of another now and then)
  const n = patch(seed, 0x5ce7, U, V) * 0.85 + ((mixSeed(seed, 0x5ce8, U, V) >>> 0) / 4294967296) * 0.15;
  let x = n * total * 1.08 - total * 0.04;
  for (const [kind, share] of table) {
    if (x < share) return kind;
    x -= share;
  }
  return table[table.length - 1][0];
}

/** How each army's arena is made. `round` or `square`; the ring's kind and width; a floor of flagstones; what stands inside; the set pieces round it. */
export interface Arena {
  shape: 'round' | 'square';
  ring: Scenery;
  /** The ring is this many tiles thick (the infernal host's moat of lava is two). */
  ringW: number;
  /** Every `gap`th ring tile is left open (a standing-stone ring); 0 for none. */
  gap: number;
  paved: boolean;
  inner?: 'graves' | 'maze' | 'lavaRunnels' | 'barrels' | 'bones' | 'shrine' | 'lanterns' | 'stone';
  pieces: PieceKind[];
  /** For the note and the codex: what it is. */
  name: string;
}
export const ARENAS: Record<string, Arena> = {
  orcs: { shape: 'round', ring: 'fence', ringW: 1, gap: 0, paved: false, inner: 'barrels', pieces: ['warGate', 'drum', 'tent', 'flag', 'campfire'], name: 'The war camp' },
  undead: { shape: 'square', ring: 'ruin', ringW: 1, gap: 0, paved: true, inner: 'graves', pieces: ['mausoleum', 'lamp', 'skulls'], name: 'The mausoleum court' },
  necropolis: { shape: 'square', ring: 'ruin', ringW: 1, gap: 0, paved: true, inner: 'graves', pieces: ['mausoleum', 'lamp', 'skulls'], name: 'The mausoleum court' },
  infernal: { shape: 'round', ring: 'lava', ringW: 2, gap: 0, paved: true, inner: 'lavaRunnels', pieces: ['brazier', 'brazier', 'skulls'], name: 'The ring of fire' },
  wildwood: { shape: 'round', ring: 'wood', ringW: 1, gap: 0, paved: false, inner: 'shrine', pieces: ['arch', 'circle'], name: 'The grove circle' },
  golems: { shape: 'square', ring: 'crystal', ringW: 1, gap: 0, paved: true, inner: 'lavaRunnels', pieces: ['foundry', 'lamp'], name: 'The foundry floor' },
  yokai: { shape: 'square', ring: 'wood', ringW: 1, gap: 0, paved: true, inner: 'lanterns', pieces: ['shrine', 'lamp', 'lamp'], name: 'The shrine court' },
  beasts: { shape: 'round', ring: 'bones', ringW: 1, gap: 0, paved: false, inner: 'bones', pieces: ['den', 'skulls', 'skulls'], name: 'The bone ring' },
  ogres: { shape: 'round', ring: 'stones', ringW: 1, gap: 2, paved: false, inner: 'stone', pieces: ['circle', 'campfire'], name: 'The stone ring' },
  mountain: { shape: 'round', ring: 'stones', ringW: 1, gap: 2, paved: false, inner: 'stone', pieces: ['campfire'], name: 'The stone ring' },
  labyrinth: { shape: 'square', ring: 'ruin', ringW: 1, gap: 0, paved: true, inner: 'maze', pieces: ['lamp', 'lamp'], name: 'The maze heart' },
  temple: { shape: 'square', ring: 'ruin', ringW: 1, gap: 0, paved: true, inner: 'maze', pieces: ['lamp', 'lamp'], name: 'The maze heart' },
};

/** A boss's arena laid in a w x d section: which tiles are its floor, its ring, the road in (and on out, for a mid-boss), and what stands inside. */
export interface ArenaPlan {
  road: boolean[];
  floor: boolean[];
  ring: (Scenery | null)[];
  /** Tiles inside that are not floor: graves, an inner wall, a lantern (scenery); or ground (lava runnels, a shrine), or a barrel. */
  inner: Map<number, { scene?: Scenery; ground?: 'lava' | 'shrine'; barrel?: boolean }>;
  /** Where the road crosses the ring (a gate; a bridge over a moat of lava). */
  gates: Set<number>;
  centre: At;
}

export function arenaMask(theme: string, w: number, d: number, entry: At[] | null, exit: At[] | null, seed: number): ArenaPlan {
  const a = ARENAS[theme] ?? ARENAS.mountain;
  const rng = new Rng(mixSeed(seed, 0xa2e7));
  const { start, end } = ends(w, d, entry, exit, rng);
  const cx = (w - 1) / 2 + rng.range(-1, 1);
  const cy = 6.0;
  const rad = 5.3;
  const n = w * d;
  // how far a tile lies out from the floor's edge, in tiles (0 or less is the floor)
  const out = (u: number, v: number) =>
    a.shape === 'round' ? Math.hypot(u - cx, v - cy) - rad : Math.max(Math.abs(u - cx), Math.abs(v - cy)) - (rad - 0.7);
  const floor = new Array<boolean>(n).fill(false);
  const ring = new Array<Scenery | null>(n).fill(null);
  const road = new Array<boolean>(n).fill(false);
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const o = out(u, v);
      if (o <= 0) floor[v * w + u] = road[v * w + u] = true;
      else if (o <= a.ringW) ring[v * w + u] = a.ring;
    }
  // the road in, and on out for a mid-boss
  const inLine = curve([start, [cx + (start[0] - cx) * 0.4, d - 3.5], [cx, cy]]);
  const necked = new Array<boolean>(n).fill(false);
  // (seven tiles wide where the heroes come in, so a squad of five is not bottled up, narrowing to five at the arena's mouth)
  brush(necked, w, d, inLine, (i) => 3.6 - (1 * i) / inLine.length);
  if (exit?.length) brush(necked, w, d, curve([[cx, cy], end]), () => 2.6);
  const gates = new Set<number>();
  for (let i = 0; i < n; i++)
    if (necked[i] && !floor[i]) {
      road[i] = true;
      if (ring[i]) gates.add(i);
      ring[i] = null;
    }
  // a standing-stone ring has gaps (they lead nowhere: the land beyond is scenery)
  if (a.gap) {
    let k = 0;
    for (let i = 0; i < n; i++) if (ring[i] && k++ % a.gap === 1) ring[i] = null;
  }
  const inner = new Map<number, { scene?: Scenery; ground?: 'lava' | 'shrine'; barrel?: boolean }>();
  const at = (u: number, v: number) => Math.round(v) * w + Math.round(u);
  const put = (u: number, v: number, x: { scene?: Scenery; ground?: 'lava' | 'shrine'; barrel?: boolean }) => {
    const i = at(u, v);
    if (u >= 0 && v >= 0 && u < w && v < d && floor[i] && !necked[i]) inner.set(i, x);
  };
  switch (a.inner) {
    case 'graves':
      for (const du of [-3, 3]) for (const dv of [-2, 2]) put(cx + du, cy + dv, { scene: 'grave' });
      break;
    case 'maze': {
      // (an inner wall half way in, broken at four places, so the heart is reached by turns)
      for (let v = 0; v < d; v++)
        for (let u = 0; u < w; u++) {
          const r = Math.max(Math.abs(u - cx), Math.abs(v - cy));
          if (Math.abs(r - 2.6) < 0.5 && Math.abs(u - cx) > 1.2 !== Math.abs(v - cy) > 1.2) put(u, v, { scene: 'ruin' });
          else if (Math.abs(r - 2.6) < 0.5 && (u + v) % 3 === 0) put(u, v, { scene: 'ruin' });
        }
      break;
    }
    case 'lavaRunnels':
      for (let u = 0; u < w; u++) for (const dv of [-2, 2]) if ((u + Math.round(dv)) % 4 !== 1) put(u, cy + dv, { ground: 'lava' });
      break;
    case 'barrels':
      put(cx - 3, cy + 1, { barrel: true });
      put(cx + 3, cy - 1, { barrel: true });
      break;
    case 'bones':
      put(cx - 3, cy - 2, { scene: 'bones' });
      put(cx + 2, cy + 2, { scene: 'bones' });
      break;
    case 'shrine':
      put(cx, cy, { ground: 'shrine' });
      break;
    case 'lanterns':
      for (const du of [-3, 3]) for (const dv of [-3, 3]) put(cx + du, cy + dv, { scene: 'stones' });
      put(cx, cy, { ground: 'shrine' });
      break;
    case 'stone':
      put(cx, cy - 1, { scene: 'stones' });
      break;
  }
  return { road, floor, ring, inner, gates, centre: [cx, cy] };
}

/** Level an arena's floor: every tile's height is drawn towards the floor's middle (`level`) the nearer it lies to the floor, but kept within one
 *  step of each neighbour and equal to the land's own height on `fixed` tiles (where the road meets the sections either side). Each height is the middle
 *  of three bounds that each move at most one step a tile, so no two neighbours end more than a step apart. */
export function levelArena(heights: number[], w: number, d: number, floor: boolean[], fixed: number[], level: number): number[] {
  const n = w * d;
  const grid = (seeds: number[]) => {
    const dist = new Array<number>(n).fill(Infinity);
    const queue = [...seeds];
    for (const i of seeds) dist[i] = 0;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k];
      for (const [du, dv] of DIRS) {
        const u = (i % w) + du;
        const v = Math.floor(i / w) + dv;
        if (u < 0 || v < 0 || u >= w || v >= d || dist[v * w + u] <= dist[i] + 1) continue;
        dist[v * w + u] = dist[i] + 1;
        queue.push(v * w + u);
      }
    }
    return dist;
  };
  const toFloor = grid(floor.flatMap((f, i) => (f ? [i] : [])));
  const fromFixed = fixed.map((f) => grid([f]));
  const med = (a: number, b: number, c: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  return heights.map((h, i) => {
    const want = med(h, level - toFloor[i], level + toFloor[i]);
    let lo = -Infinity;
    let hi = Infinity;
    fixed.forEach((f, k) => {
      lo = Math.max(lo, heights[f] - fromFixed[k][i]);
      hi = Math.min(hi, heights[f] + fromFixed[k][i]);
    });
    return med(want, lo, hi);
  });
}

/** How far each tile of a board lies from the road (0 on it; scenery a tile off is 1, and so on): the renderer sinks and trims the land far from it. */
export function sceneDepth(b: Board): number[] {
  const n = b.w * b.d;
  const dist = new Array<number>(n).fill(Infinity);
  const queue: number[] = [];
  b.tiles.forEach((t, i) => {
    if (!t.scene) {
      dist[i] = 0;
      queue.push(i);
    }
  });
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    for (const [du, dv] of DIRS) {
      const u = (i % b.w) + du;
      const v = Math.floor(i / b.w) + dv;
      const t: Tile | null = tileAt(b, u, v);
      if (!t || dist[v * b.w + u] <= dist[i] + 1) continue;
      dist[v * b.w + u] = dist[i] + 1;
      queue.push(v * b.w + u);
    }
  }
  return dist;
}
