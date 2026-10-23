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
export const dropRank = (u: number, v: number): number => D - 1 - v + Math.abs(u - (W - 1) / 2) * 0.35;

/** When (ms after the start) a tile begins to fall. */
export const dropDelay = (u: number, v: number): number => dropRank(u, v) * ROW_MS + jitter(u, v) * JITTER_MS;

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
export function dropEnd(): number {
  let end = 0;
  for (let v = 0; v < D; v++) for (let u = 0; u < W; u++) end = Math.max(end, dropDelay(u, v) + FALL_MS + SETTLE_MS);
  return end;
}

/** The ms a walker spends on one step: a hero's own pace, quickened for a walk between waves, within bounds. */
export const stepMs = (moveMs: number): number => Math.max(230, Math.min(420, moveMs * 0.55));
