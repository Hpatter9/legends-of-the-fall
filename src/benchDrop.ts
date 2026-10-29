// Sending a placed hero back to the bench by dragging (docs/notes/bench-titles.md). Pure rules over screen points, so the tests
// can hold them: the drop area is the whole bottom panel (the bench strip, the hero bar and the buttons) and a little of the board
// above it, and a quick flick downwards that would carry the hero into it counts as a drop there. The page (`main.ts`) lights the
// bench while a placed hero is over the area, and `unplace` (the sim's own) does the rest.

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A point of a drag, with the time it was seen (ms). */
export interface DragPoint {
  x: number;
  y: number;
  t: number;
}

/** How far above the panel's top edge (CSS px) still counts as over the bench: a finger that has nearly reached it. */
export const RETURN_REACH = 22;
/** The flick: the last stretch of the drag looked at (ms), the speed downwards it needs (px a ms), the way it must have come
 *  down (px), and how far ahead it is carried (ms) to see whether it would reach the bench. */
export const FLICK_WINDOW_MS = 140;
export const FLICK_SPEED = 0.7;
export const FLICK_DROP = 36;
export const FLICK_CARRY_MS = 220;

/** Whether (x, y) is in the bench's drop area: across the panel's whole width, from a little above its top to the screen's
 *  bottom (a finger past the panel's bottom edge, over the phone's gesture bar, still counts). */
export function inReturnZone(x: number, y: number, panel: Box, reach = RETURN_REACH): boolean {
  return x >= panel.left - reach && x <= panel.right + reach && y >= panel.top - reach;
}

/** Whether a drag that ends with `trail` (oldest first, the last point where the finger left) was a quick flick downwards that
 *  would carry the hero into the bench's area: fast and straight enough down over its last moments. */
export function flickToBench(trail: readonly DragPoint[], panel: Box): boolean {
  if (trail.length < 2) return false;
  const end = trail[trail.length - 1];
  const from = trail.find((p) => end.t - p.t <= FLICK_WINDOW_MS) ?? trail[0];
  const dt = end.t - from.t;
  if (dt <= 0) return false;
  const dy = end.y - from.y;
  const dx = end.x - from.x;
  const vy = dy / dt;
  // (down, fast, more down than sideways, and on its way into the panel)
  if (dy < FLICK_DROP || vy < FLICK_SPEED || Math.abs(dx) > dy) return false;
  return inReturnZone(end.x + (dx / dt) * FLICK_CARRY_MS, end.y + vy * FLICK_CARRY_MS, panel, 0);
}

/** Keep a drag's trail short: the newest points within a little over the flick's window. */
export function pushTrail(trail: DragPoint[], p: DragPoint): void {
  trail.push(p);
  while (trail.length > 2 && p.t - trail[0].t > FLICK_WINDOW_MS * 2) trail.shift();
}
