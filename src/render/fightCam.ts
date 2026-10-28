// The fight camera's free look (FIGHT-FIXES; no Pixi, no DOM, so the tests can run them). The owner: "Don't lock camera in each wave. Allow free
// movement and zooming during the wave." A finger drags the board, two pinch it and a mouse wheel turns the zoom, at any time in a fight; once
// the player has moved or zoomed it, the camera is theirs (the follow and the effects' pushes leave it alone) until the next wave's deploy,
// which frames the board afresh. The Last Stand's own camera (`standCam.ts`) works the same way.

/** How far the player may zoom, in multiples of the layout's scale: out to a little past the whole board's width (`fit`), in to about four
 *  screen px to an art px (`scale` is the layout's own). */
export function zoomLimits(fit: number, scale: number): { lo: number; hi: number } {
  const lo = Math.max(0.3, fit * 0.8);
  return { lo, hi: Math.max(lo, 4 / scale, 1.5) };
}

/** A pinch's zoom: as many times the zoom it started at as the fingers have spread, kept in the limits. */
export function pinchZoom(z0: number, d0: number, d: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, z0 * (d / Math.max(1, d0))));
}

/** A mouse wheel's zoom: a tenth or so a notch (a trackpad's small turns, a little), kept in the limits. */
export function wheelZoom(z: number, dy: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, z * Math.exp(-Math.max(-120, Math.min(120, dy)) * 0.0012)));
}

/** Where the camera's centre goes so the world point under `(sx, sy)` (screen px from the room's middle) at world scale `k0` stays under
 *  `(tx, ty)` at world scale `k1`: a zoom about the fingers, which also pans the board as they move. */
export function zoomAbout(cx: number, cy: number, k0: number, k1: number, sx: number, sy: number, tx = sx, ty = sy): { cx: number; cy: number } {
  const px = cx + sx / k0;
  const py = cy + sy / k0;
  return { cx: px - tx / k1, cy: py - ty / k1 };
}
