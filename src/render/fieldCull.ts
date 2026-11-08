// Which of the Assault field's chunks are in view (`fieldView.ts`), and where the camera's focus sits on the screen. No Pixi here, so
// the tests can check it: every chunk any of whose tiles can show inside the screen must be drawn, at Near and at Mid.
//
// The screen is measured in CSS pixels (Pixi's `app.screen`), never the canvas's device pixels: the world is scaled by the zoom alone,
// and the device pixel ratio is the renderer's own business. (Phase 0's bench divided CSS pixels by the ratio again, so on a phone at
// 2.6 the view was a rectangle a 2.6th of the screen in its top-left corner: the chunks to its right and below were never drawn, and
// the camera's focus sat up under the readout.)

import { FOOT, HH, rawAt, TW } from './iso';

/** A chunk's side, in tiles. */
export const CHUNK = 10;

/** A rectangle of world pixels. */
export interface WorldRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The camera: the world point it looks at, and its zoom (screen pixels to a world pixel). */
export interface FieldCam {
  x: number;
  y: number;
  zoom: number;
}

/** The play area: the part of the screen between the readout (or info panel) at the top and the buttons at the bottom, in CSS pixels.
 *  The camera's focus is drawn at its middle. */
export interface PlayArea {
  top: number;
  bottom: number;
}

/** Where on the screen the camera's focus is drawn: across the middle, and halfway down the play area (the whole screen without one). */
export function focusOnScreen(vw: number, vh: number, play?: PlayArea): [number, number] {
  const top = Math.max(0, Math.min(vh, play?.top ?? 0));
  const bottom = Math.max(top, Math.min(vh, play?.bottom ?? vh));
  return [vw / 2, (top + bottom) / 2];
}

/** The world rectangle the whole screen (`vw` x `vh` CSS pixels) shows, for a camera whose focus is drawn at `focus`. */
export function screenRect(cam: FieldCam, vw: number, vh: number, focus: [number, number]): WorldRect {
  return { x0: cam.x - focus[0] / cam.zoom, x1: cam.x + (vw - focus[0]) / cam.zoom, y0: cam.y - focus[1] / cam.zoom, y1: cam.y + (vh - focus[1]) / cam.zoom };
}

/** The screen's rectangle with room round it: a tile's width either side, room above for the tall things (walls and fighters standing
 *  over their tile) and below for the columns' sides. Fighters and effects are culled by it too. */
export function viewRect(cam: FieldCam, vw: number, vh: number, focus: [number, number]): WorldRect {
  const r = screenRect(cam, vw, vh, focus);
  return { x0: r.x0 - TW, x1: r.x1 + TW, y0: r.y0 - 120, y1: r.y1 + 160 };
}

/** Each chunk's highest ground, and the lowest any side face reaches (the board's lowest ground, or a column's foot at the edge). */
export function chunkHeights(w: number, d: number, hOf: (u: number, v: number) => number): { n: number; hi: Float32Array; low: number } {
  const n = Math.ceil(Math.max(w, d) / CHUNK);
  const hi = new Float32Array(n * n).fill(-Infinity);
  let low = -FOOT / HH;
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const k = Math.floor(v / CHUNK) * n + Math.floor(u / CHUNK);
      const h = hOf(u, v);
      if (h > hi[k]) hi[k] = h;
      if (h < low) low = h;
    }
  return { n, hi, low };
}

/** Whether chunk (cx, cy) can show inside `view`. A chunk's ground is its diamond of tiles, lifted by its highest ground at most and
 *  hanging down to `low` at most (its side faces), so it lies inside that diamond swept up and down. A rectangle meets a swept diamond
 *  when the rectangle, stretched by the sweep, meets the diamond itself; for a square chunk that is a weighted distance from its middle
 *  (the diamond is a ball of the |x|/half-width + |y|/half-height norm). A chunk cut short at the board's edge is not square, so it is
 *  checked by its bounding box instead. */
export function chunkMeets(view: WorldRect, cx: number, cy: number, w: number, d: number, hi: number, low: number): boolean {
  const u0 = cx * CHUNK - 0.5;
  const v0 = cy * CHUNK - 0.5;
  const u1 = Math.min(w, (cx + 1) * CHUNK) - 0.5;
  const v1 = Math.min(d, (cy + 1) * CHUNK) - 0.5;
  // (the sweep: lifted by up to hi steps, hanging down to low)
  const y0 = view.y0 + low * HH;
  const y1 = view.y1 + hi * HH;
  const left = rawAt(u0, v1, 0)[0];
  const right = rawAt(u1, v0, 0)[0];
  const top = rawAt(u0, v0, 0)[1];
  const bottom = rawAt(u1, v1, 0)[1];
  if (view.x1 < left || view.x0 > right || y1 < top || y0 > bottom) return false;
  if (u1 - u0 !== v1 - v0) return true;
  const mx = (left + right) / 2;
  const my = (top + bottom) / 2;
  const dx = Math.max(0, view.x0 - mx, mx - view.x1);
  const dy = Math.max(0, y0 - my, my - y1);
  return dx / ((right - left) / 2) + dy / ((bottom - top) / 2) <= 1;
}

/** Every chunk (key cy * 100 + cx) that can show inside `view`. */
export function chunksInView(view: WorldRect, w: number, d: number, heights: { n: number; hi: Float32Array; low: number }): number[] {
  const out: number[] = [];
  const { n, hi, low } = heights;
  for (let cy = 0; cy * CHUNK < d; cy++)
    for (let cx = 0; cx * CHUNK < w; cx++) if (chunkMeets(view, cx, cy, w, d, hi[cy * n + cx], low)) out.push(cy * 100 + cx);
  return out;
}
