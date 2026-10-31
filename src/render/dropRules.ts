// How a new section of the long map comes in (pure: no Pixi, no DOM, so the tests can run it): its columns fall from the
// sky one row after another, starting at the edge that meets the old section, and each settles with one small bounce.
// Nothing flashes: a column fades in over the first fifth of its fall and stays.

import { D, W } from '../sim/board';

/** How far above its place a column starts (px). */
export const FALL_PX = 360;
/** How long a column falls (ms), and how long it takes to settle after. */
export const FALL_MS = 420;
export const SETTLE_MS = 160;
/** The gap between one row landing and the next (ms), and the most a column's own jitter adds. */
export const ROW_MS = 70;
export const JITTER_MS = 50;
/** How high the settling bounce lifts a column (px). */
export const BOUNCE_PX = 3;

/** A small steady number in [0, 1) for a tile (the same every time). */
const jitter = (u: number, v: number) => (((u * 73856093) ^ (v * 19349663)) >>> 0) % 1000 / 1000;

/** How far a tile is from the edge that meets the old section (the new board's heroes' edge, whichever way it lies), in rows (the middle of the edge first, so the fall ripples outwards). */
export const dropRank = (u: number, v: number, w = W, d = D): number => d - 1 - v + Math.abs(u - (w - 1) / 2) * 0.35;

/** When (ms after the start) a tile begins to fall. */
export const dropDelay = (u: number, v: number, w = W, d = D): number => dropRank(u, v, w, d) * ROW_MS + jitter(u, v) * JITTER_MS;

export interface DropPose {
  /** How far above its place (px, up is negative). */
  dy: number;
  alpha: number;
  /** Whether it has touched down. */
  landed: boolean;
}

/** Where a column is `elapsed` ms after the start, if it falls at `delay`. */
export function dropPose(elapsed: number, delay: number): DropPose {
  const f = (elapsed - delay) / FALL_MS;
  if (f <= 0) return { dy: -FALL_PX, alpha: 0, landed: false };
  if (f < 1) return { dy: -FALL_PX * (1 - f * f), alpha: Math.min(1, f * 5), landed: false };
  const g = (elapsed - delay - FALL_MS) / SETTLE_MS;
  return { dy: g < 1 ? -BOUNCE_PX * Math.sin(Math.PI * g) : 0, alpha: 1, landed: true };
}

/** When (ms) the last column of the section has settled. */
export function dropEnd(w = W, d = D): number {
  let end = 0;
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) end = Math.max(end, dropDelay(u, v, w, d) + FALL_MS + SETTLE_MS);
  return end;
}

/** The ms a walker spends on one step between waves: the same brisk pace for every hero, whatever their own pace in a fight
 *  (the owner's ask: a slow hero, or one going uphill, made the walk to the next section drag). Not a fight, so no hero is slower. */
export const WALK_STEP_MS = 230;
