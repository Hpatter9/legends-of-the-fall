// The Last Stand's field: a big square of land with the king's keep raised in the middle. `makeBoard` lays the land (hills,
// platforms, pits, boulders and the area's ground) from the seed; this file then clears a plaza round the middle and
// builds the keep on it: a three by three top and a ring of steps down on every side, so every side can be climbed. The
// foes come in from the four edges. Pure rules: no Pixi, no DOM, and the only randomness is `makeBoard`'s own (the seed).

import { boardOk, easeRelief, makeBoard, RAMP, standable, tileAt, AREAS, type Area, type At, type Board } from './board';
import { mixSeed, Rng } from './rng';

/** The field's side, in tiles (about 24 x 24: the owner's ask). */
export const FIELD = 24;
/** Where the king stands: the middle of the field. */
export const KING_AT: At = { u: FIELD / 2, v: FIELD / 2 };
/** The keep's top (a 3x3 round the king) and the heights of the steps down from it, ring by ring. */
export const KEEP_TOP = 4;
const STEPS = [KEEP_TOP, KEEP_TOP, KEEP_TOP - 1, KEEP_TOP - 2, KEEP_TOP - 3];
/** How far from the king (in tiles, either way) the plaza is cleared of boulders and bad ground and smoothed. */
const PLAZA = 8;
/** How far from the king a hero may be posted. */
export const POST_RANGE = 6;

/** The four edges, as the foes name them: where `u` or `v` is 0 or the last. */
export const EDGES = ['north', 'east', 'south', 'west'] as const;
export type Edge = (typeof EDGES)[number];

/** How far a tile is from the king, in tiles (the larger of the two ways). */
export const ringOf = (a: At): number => Math.max(Math.abs(a.u - KING_AT.u), Math.abs(a.v - KING_AT.v));

/** The land of a seed's field: any of the seventeen, drawn from a side stream. */
export const standArea = (seed: number): Area => AREAS[new Rng(mixSeed(seed, 0x57a9)).int(0, AREAS.length - 1)];

/** Lower the higher of any two neighbours inside the plaza that are more than `limit` apart, until none are. */
function easePlaza(b: Board, limit: number): void {
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        if (ringOf({ u, v }) > PLAZA) continue;
        const a = tileAt(b, u, v)!;
        for (const [du, dv] of [[1, 0], [0, 1]]) {
          const n = tileAt(b, u + du, v + dv);
          if (!n || ringOf({ u: u + du, v: v + dv }) > PLAZA) continue;
          // (the keep itself is never lowered: its steps are what the rest is eased to)
          const ra = ringOf({ u, v });
          const rn = ringOf({ u: u + du, v: v + dv });
          if (Math.abs(a.h - n.h) <= limit) continue;
          if (ra <= 3 && rn <= 3) continue;
          const lowerA = a.h > n.h ? ra > 3 : rn <= 3;
          if (lowerA) a.h = n.h + limit * (a.h > n.h ? 1 : -1);
          else n.h = a.h + limit * (n.h > a.h ? 1 : -1);
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/** The field for a seed on a land: the land of `makeBoard` at 24 x 24 with a plaza cleared and the keep built in the middle. */
export function standBoard(seed: number, area: Area = standArea(seed)): Board {
  const b = makeBoard(seed, area, FIELD, FIELD);
  const land = b.tiles.map((t) => t.h);
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < b.w; u++) {
      const t = tileAt(b, u, v)!;
      const r = ringOf({ u, v });
      if (r <= PLAZA) {
        // (no boulder, lava or tall growth where the heroes will stand; shallows and ice may stay out beyond the keep's own ring)
        delete t.rock;
        if (t.ground === 'lava' || t.ground === 'tall' || r <= 4) delete t.ground;
        if (r <= 4) delete t.bush;
      }
      if (r < STEPS.length) t.h = STEPS[r];
      else if (r <= PLAZA) {
        // (further out the land is its own, but never more than a step from the ring inside it)
        const inner: number[] = [];
        for (let dv = -1; dv <= 1; dv++)
          for (let du = -1; du <= 1; du++) {
            const n = tileAt(b, u + du, v + dv);
            if ((du || dv) && n && ringOf({ u: u + du, v: v + dv }) === r - 1) inner.push(n.h);
          }
        if (inner.length) t.h = Math.max(Math.max(...inner) - RAMP, Math.min(Math.min(...inner) + RAMP, t.h));
      }
    }
  easePlaza(b, RAMP);
  // (a seed whose field cannot be walked from one side to the other is left as plain land round the keep)
  if (!boardOk(b)) {
    b.tiles.forEach((t, i) => (t.h = land[i]));
    for (let r = 0; r < STEPS.length; r++)
      for (let v = KING_AT.v - r; v <= KING_AT.v + r; v++)
        for (let u = KING_AT.u - r; u <= KING_AT.u + r; u++) if (ringOf({ u, v }) === r) tileAt(b, u, v)!.h = STEPS[r];
    easeRelief(b, RAMP);
  }
  return b;
}

/** Whether a tile is a place a hero may be posted: standable, near the keep, and not the king's own. */
export function canPost(b: Board, u: number, v: number): boolean {
  if (u === KING_AT.u && v === KING_AT.v) return false;
  return standable(tileAt(b, u, v)) && ringOf({ u, v }) <= POST_RANGE;
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

/**
 * The tile a new hero goes to: free, near the keep and as far from the heroes already posted as it can be. A hero that shoots
 * likes the keep's own top (high ground, close to the king); a fighter likes the steps and the ground below them. `taken` are the tiles in use.
 */
export function guardSpot(b: Board, taken: readonly At[], shooter: boolean): At | null {
  const want = shooter ? [1, 2, 3, 4, 5, 6] : [3, 2, 4, 5, 1, 6];
  let fallback: At | null = null;
  for (const ring of want) {
    let best: At | null = null;
    let bestGap = -1;
    for (let v = KING_AT.v - ring; v <= KING_AT.v + ring; v++)
      for (let u = KING_AT.u - ring; u <= KING_AT.u + ring; u++) {
        if (ringOf({ u, v }) !== ring || !canPost(b, u, v) || taken.some((t) => t.u === u && t.v === v)) continue;
        // (the tile furthest from every post taken so far; a tie goes to the lower row then column, so it is the same every time)
        const gap = taken.length ? Math.min(...taken.map((t) => Math.abs(t.u - u) + Math.abs(t.v - v))) : 99;
        if (gap > bestGap) {
          bestGap = gap;
          best = { u, v };
        }
      }
    if (best && bestGap >= 2) return best;
    fallback ??= best;
  }
  return fallback;
}
