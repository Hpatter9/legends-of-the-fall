// The fight camera's pure rules (no Pixi, no DOM, so the tests can run them): the box round the living fighters, the zoom
// that fits it in the room, a dead zone so small moves do not drift the camera, and the easing step.

/** A fighter as the camera sees it: where its feet are in the world, and how tall it is drawn. */
export interface Spot {
  x: number;
  y: number;
  tall: number;
}
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
/** Where the camera looks (a world point) and how far it is zoomed in, as a multiple of the layout's own scale. */
export interface View {
  cx: number;
  cy: number;
  zoom: number;
}

/** Room round the fighters: sideways for their width, above for the health bar, names and effects, below for their feet. */
export const PAD = { side: 34, top: 30, bottom: 14 };
/** The camera holds still until the box's centre moves this far (world px) or the zoom changes by this share. */
export const DEAD_MOVE = 26;
export const DEAD_ZOOM = 0.07;
/** How long (ms) the camera takes to cover most of a move, and the zoom a bit slower. */
export const EASE_MOVE_MS = 420;
export const EASE_ZOOM_MS = 650;
/** A manual pan or pinch pauses the follow this long (ms). */
export const PAUSE_MS = 4000;

/** The box round the fighters with their padding (null for none). */
export function framing(spots: readonly Spot[]): Box | null {
  if (!spots.length) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const s of spots) {
    x0 = Math.min(x0, s.x);
    x1 = Math.max(x1, s.x);
    y0 = Math.min(y0, s.y - s.tall);
    y1 = Math.max(y1, s.y);
  }
  return { x0: x0 - PAD.side, x1: x1 + PAD.side, y0: y0 - PAD.top, y1: y1 + PAD.bottom };
}

/** The view that puts `box` in a room of `w` x `h` px: zoomed in as far as it fits, between `lo` and `hi` (multiples of `base`). */
export function viewFor(box: Box, w: number, h: number, base: number, lo: number, hi: number): View {
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const fit = Math.min(w / bw, h / bh) / base;
  return { cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, zoom: Math.min(hi, Math.max(lo, fit)) };
}

/** The dead zone: `want` replaces `held` only when it has moved or zoomed enough to matter (so the camera does not drift). */
export function settle(held: View, want: View): View {
  const moved = Math.hypot(want.cx - held.cx, want.cy - held.cy) > DEAD_MOVE;
  const zoomed = Math.abs(want.zoom / held.zoom - 1) > DEAD_ZOOM;
  return moved || zoomed ? want : held;
}

/** One easing step of `dt` ms from `cur` towards `to`: exponential, so it never overshoots and never jumps. */
export const easeTo = (cur: number, to: number, dt: number, ms: number): number => cur + (to - cur) * (1 - Math.exp(-dt / (ms / 3)));
