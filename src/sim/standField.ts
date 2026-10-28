// The Last Stand's field: the inside of a room of the castle (STAND-003; the rooms are `standHalls.ts`). A stone floor, the walls round the
// edge of the field with their breaches (the only ways in: the foes come in by those), the room's pillars, cover and raised floor, and in the
// middle the king's dais: a 5x5 top round his throne and a broad step down from it on every side. Pure rules: no Pixi, no DOM, and the only
// randomness is the room's plan (its own side stream of the seed).

import { canStep, DIRS, RAMP, standable, tileAt, type Area, type At, type Board, type Tile } from './board';
import { breachTiles, hallOf, hallPlan, type HallKind } from './standHalls';

/** The field's side, in tiles (about 24 x 24: the owner's ask). */
export const FIELD = 24;
/** Where the king stands: the middle of the field. */
export const KING_AT: At = { u: FIELD / 2, v: FIELD / 2 };
/** The dais's top (a 5x5 round the king), and the step down from it. */
export const KEEP_TOP = 3;
const DAIS = 2;
/** The heights of the walls (and the pillars), and of a wall's broken end beside a breach. */
export const WALL_H = 8;
export const STUB_H = 5;
/** The floor's height. */
export const FLOOR_H = 1;
/** How far from the king a hero may be posted; the throne's own tiles (within `THRONE` of him) are his alone. */
export const POST_RANGE = 6;
export const THRONE = 1;

/** The four edges, as the foes name them: where `u` or `v` is 0 or the last. */
export const EDGES = ['north', 'east', 'south', 'west'] as const;
export type Edge = (typeof EDGES)[number];

/** How far a tile is from the king, in tiles (the larger of the two ways). */
export const ringOf = (a: At): number => Math.max(Math.abs(a.u - KING_AT.u), Math.abs(a.v - KING_AT.v));

/** The land of a seed's field (its sounds and weather): the room's, a stone room or the courtyard's open sky. */
export const standArea = (seed: number, hall: HallKind = hallOf(seed)): Area => hallPlan(seed, hall).area;

/** Whether every standable tile of a room can be walked to from the king's (a one-step climber; nobody walled into a pocket). */
export function fieldOk(b: Board): boolean {
  const start = KING_AT.v * b.w + KING_AT.u;
  const seen = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const n = tileAt(b, u + du, v + dv);
      const j = (v + dv) * b.w + u + du;
      if (!n || seen.has(j) || !standable(n) || canStep(b.tiles[i], n, RAMP) === null || canStep(n, b.tiles[i], RAMP) === null) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return b.tiles.every((t, i) => !standable(t) || seen.has(i));
}

/** The field for a seed: the room `hall` (drawn from the seed when not given) laid out on a 24 x 24 board. `area` is kept for older callers. */
export function standBoard(seed: number, area?: Area, hall: HallKind = hallOf(seed)): Board {
  const plan = hallPlan(seed, hall);
  const tiles: Tile[] = [];
  for (let v = 0; v < FIELD; v++)
    for (let u = 0; u < FIELD; u++) {
      const r = ringOf({ u, v });
      const t: Tile = { h: r <= DAIS ? KEEP_TOP : r === DAIS + 1 ? KEEP_TOP - 1 : FLOOR_H, deco: (u * 7 + v * 13 + seed) & 0xff };
      if (u === 0 || v === 0 || u === FIELD - 1 || v === FIELD - 1) Object.assign(t, { h: WALL_H, wall: true });
      tiles.push(t);
    }
  const b: Board = { seed, area: area ?? plan.area, w: FIELD, d: FIELD, tiles };
  const at = (p: At) => tiles[p.v * FIELD + p.u];
  // (raised floor steps down towards a breach, so the way in is never a cliff)
  const gapAt = plan.breaches.flatMap((br) => breachTiles(br));
  for (const p of plan.raised) {
    if (ringOf(p) <= DAIS + 1) continue;
    const d = Math.min(...gapAt.map((g) => Math.abs(g.u - p.u) + Math.abs(g.v - p.v)));
    at(p).h = Math.min(p.h, FLOOR_H + Math.max(0, d - 1));
  }
  for (const br of plan.breaches) {
    const gap = breachTiles(br);
    for (const p of gap) Object.assign(at(p), { h: FLOOR_H, wall: undefined });
    // (the wall's broken ends either side stand lower)
    const [a, z] = [gap[0], gap[gap.length - 1]];
    const along = br.edge === 'north' || br.edge === 'south' ? [1, 0] : [0, 1];
    for (const [p, s] of [[a, -1], [z, 1]] as const) {
      const end = tileAt(b, p.u + along[0] * s, p.v + along[1] * s);
      if (end?.wall) end.h = STUB_H;
    }
  }
  for (const t of tiles) if (!t.wall) delete t.wall;
  // (the pillars, then the cover, one at a time: a piece that would shut a tile off is left out, so every tile is always a way in)
  for (const p of plan.pillars) {
    const t = at(p);
    const was = t.h;
    Object.assign(t, { h: WALL_H, wall: true });
    if (!fieldOk(b)) {
      delete t.wall;
      t.h = was;
    }
  }
  for (const c of plan.cover) {
    const t = at(c);
    if (t.wall) continue;
    t.rock = true;
    if (!fieldOk(b)) delete t.rock;
  }
  return b;
}

/** Whether a tile is a place a hero may be posted: standable, near the dais, and not the throne's own tiles. */
export function canPost(b: Board, u: number, v: number): boolean {
  const r = ringOf({ u, v });
  return r > THRONE && r <= POST_RANGE && standable(tileAt(b, u, v));
}

/** The standable tiles along an edge, in order. */
export function edgeTiles(b: Board, edge: Edge): At[] {
  const out: At[] = [];
  for (let i = 0; i < FIELD; i++) {
    const at = edge === 'north' ? { u: i, v: 0 } : edge === 'south' ? { u: i, v: FIELD - 1 } : edge === 'west' ? { u: 0, v: i } : { u: FIELD - 1, v: i };
    if (standable(tileAt(b, at.u, at.v))) out.push(at);
  }
  return out;
}

/** The middle of an edge, as a point on the board's floor (tile coordinates, for the page's arrows). */
export const edgeMid = (edge: Edge): At => (edge === 'north' ? { u: FIELD / 2, v: 0 } : edge === 'south' ? { u: FIELD / 2, v: FIELD - 1 } : edge === 'west' ? { u: 0, v: FIELD / 2 } : { u: FIELD - 1, v: FIELD / 2 });

/** A kind's job in the ring: a tank stands out front, a shooter or a healer nearer the king, the rest between. */
export type Role = 'tank' | 'inner' | 'mid';

/**
 * Where a party stands round the keep, in the order given: tanks out front, one to a side (the four compass points of the field,
 * four tiles from the king), fighters between them on the diagonals, shooters and healers on the dais's edge near the king.
 * `taken` are tiles already in use. Each slot falls back to the nearest free post to it, so a boulder or a pool never leaves a hero out.
 */
export function ringPlan(b: Board, kinds: readonly string[], roleOf: (kind: string) => Role, taken: readonly At[] = []): At[] {
  // (the tanks face the breaches first: the sides with a way in, then the rest)
  const SIDES: [number, number][] = ([[0, -4, 'north'], [4, 0, 'east'], [0, 4, 'south'], [-4, 0, 'west']] as const)
    .map(([du, dv, e], i) => ({ at: [du, dv] as [number, number], open: edgeTiles(b, e).length > 0, i }))
    .sort((x, y) => +y.open - +x.open || x.i - y.i)
    .map((x) => x.at);
  const DIAG: [number, number][] = [[3, -3], [3, 3], [-3, 3], [-3, -3]];
  // (the inner ring stands on the dais's edge, off the throne's own tiles, so the king is seen: the owner's call)
  const INNER: [number, number][] = [[2, -2], [-2, 2], [2, 2], [-2, -2], [2, 0], [-2, 0], [0, 2], [0, -2]];
  const used = [...taken];
  const free = (at: At) => canPost(b, at.u, at.v) && !used.some((t) => t.u === at.u && t.v === at.v);
  const nearest = (want: At): At | null => {
    for (let r = 0; r <= 6; r++)
      for (let dv = -r; dv <= r; dv++)
        for (let du = -r; du <= r; du++) if (Math.max(Math.abs(du), Math.abs(dv)) === r && free({ u: want.u + du, v: want.v + dv })) return { u: want.u + du, v: want.v + dv };
    return null;
  };
  const counts = { tank: 0, mid: 0, inner: 0 };
  return kinds.map((k) => {
    const role = roleOf(k);
    const n = counts[role]++;
    const [du, dv] = role === 'tank' ? SIDES[n % 4] : role === 'mid' ? (n < 4 ? DIAG[n] : SIDES[(n + 1) % 4].map((x) => Math.round(x * 0.75)) as [number, number]) : INNER[n % INNER.length];
    const at = nearest({ u: KING_AT.u + du, v: KING_AT.v + dv });
    if (at) used.push(at);
    return at as At;
  });
}
