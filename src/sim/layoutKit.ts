// The tools the layout templates share (`layouts.ts`, and the Calamity's zones in `calZones.ts`): a plan of the tiles a template
// shapes, setting a tile, easing the loose land round the pinned tiles, and the check that a laid board is fit. Pure rules.

import { boardOk, DEPLOY_ROWS, RAMP, solid, standable, tileAt, TOP, type Area, type Board, type Ground, type Prop, type PropKind, type Tile } from './board';
import type { Rng } from './rng';

/** What a layout is made of, as the template builds it. */
export interface Plan {
  b: Board;
  rng: Rng;
  area: Area;
  /** The tiles whose heights the template fixed (the rest are eased round them). */
  pinned: Set<number>;
  /** The first and last rows of the middle ground. */
  m0: number;
  m1: number;
  /** The things the template stands on its tiles (a Calamity zone's; looks only). */
  props: Prop[];
}

/** Stand a thing on a tile of the plan (looks only). */
export function prop(p: Plan, u: number, v: number, kind: PropKind): void {
  if (tileAt(p.b, u, v)) p.props.push({ u, v, kind });
}

export const idx = (p: Plan, u: number, v: number): number => v * p.b.w + u;

/** Set a tile of the plan: its height and what lies on it. The tile is pinned. */
export function put(p: Plan, u: number, v: number, patch: Partial<Tile>): void {
  const t = tileAt(p.b, u, v);
  if (!t) return;
  delete t.ground;
  delete t.wall;
  delete t.bridge;
  delete t.chasm;
  delete t.rock;
  Object.assign(t, patch);
  p.pinned.add(idx(p, u, v));
}

export const clampH = (h: number): number => Math.max(0, Math.min(TOP, Math.round(h)));

/** What fills a river or a sea: deep water (the page draws it as a lake of lava on a volcano or at a forge; it is as impassable, and as safe to stand beside, as water). */
export const fluidOf = (_area: Area): Ground => 'deep';

/** Ease the board's heights to a ramp round the tiles a template pinned. A loose tile keeps its own (rolling) height as far as it can: no more than a ramp
 *  above the lowest the pinned tiles allow it (their height plus the walk to them) and no less than a ramp below the highest. Solid tiles and deep water do not count. */
export function easeAround(b: Board, pinned: ReadonlySet<number>): void {
  const n = b.w * b.d;
  const flat = (i: number) => !solid(b.tiles[i]) && b.tiles[i].ground !== 'deep';
  const hi = new Array<number>(n).fill(Infinity);
  const lo = new Array<number>(n).fill(-Infinity);
  for (const i of pinned) if (flat(i)) hi[i] = lo[i] = b.tiles[i].h;
  const near = (i: number): number[] => {
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    const out: number[] = [];
    if (u > 0) out.push(i - 1);
    if (u < b.w - 1) out.push(i + 1);
    if (v > 0) out.push(i - b.w);
    if (v < b.d - 1) out.push(i + b.w);
    return out.filter(flat);
  };
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      if (!flat(i) || pinned.has(i)) continue;
      for (const j of near(i)) {
        if (hi[j] + RAMP < hi[i]) (hi[i] = hi[j] + RAMP), (moved = true);
        if (lo[j] - RAMP > lo[i]) (lo[i] = lo[j] - RAMP), (moved = true);
      }
    }
    if (!moved) break;
  }
  for (let i = 0; i < n; i++) {
    if (!flat(i) || pinned.has(i)) continue;
    const t = b.tiles[i];
    const l = Math.max(0, lo[i]);
    const h = Math.min(TOP, hi[i]);
    t.h = l <= h ? Math.max(l, Math.min(h, t.h)) : Math.round((l + h) / 2);
  }
}

/** A mean of the heights of the tiles in a row of the land (to set a level for a bank). */
export const rowLevel = (b: Board, v: number): number => {
  let n = 0;
  let s = 0;
  for (let u = 0; u < b.w; u++) {
    const t = tileAt(b, u, v);
    if (t) (s += t.h), n++;
  }
  return n ? s / n : 0;
};

/** Pick `n` distinct columns at least `gap` apart in [lo, hi]. */
export function spread(rng: Rng, lo: number, hi: number, n: number, gap: number): number[] {
  const out: number[] = [];
  for (let tries = 0; tries < 40 && out.length < n; tries++) {
    const c = rng.int(lo, hi);
    if (out.every((x) => Math.abs(x - c) >= gap)) out.push(c);
  }
  return out;
}

/** Whether a board laid by a template is fit: walkable end to end, the deploy rows clear of obstacles and with room for a party. */
export function fit(b: Board): boolean {
  for (let v = 0; v < b.d; v++) {
    if (v >= DEPLOY_ROWS && v < b.d - DEPLOY_ROWS) continue;
    for (let u = 0; u < b.w; u++) if (!standable(tileAt(b, u, v))) return false;
  }
  return boardOk(b);
}

