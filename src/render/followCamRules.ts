// BATTLE-POLISH (docs/notes/battle-polish.md): where the fight camera looks, and how long it leaves a camera the player moved. Pure: no
// Pixi, no DOM, so the tests run it; `main.ts` feeds it the fighters and the clock.
//
// The owner's ask: "the camera follows the action better". Before, the follow framed every living fighter alike, so a wave whose foes had
// not reached the line yet, or a fighter wandered off to a corner, pulled the view from the fight. Now each fighter has a heat: a little for
// being alive, more for being in a fight (a foe within `ENGAGED_TILES`), more for having struck or been struck a moment ago, and most for
// an ultimate just cast. The camera looks at the heat-weighted middle of the fighters in combat, and zooms out enough to keep all of them
// in view (the box round them is made even about that middle, so none is cut off by the lean). With nobody in a fight yet, it frames
// everyone, as before.
//
// A pan or a pinch: the camera stays where the player put it for `HOLD_MS` after their last touch (a finger still on the board keeps it
// theirs), then the follow takes it back, easing more slowly than usual for `RETURN_MS` so it glides home rather than snapping.

import { framing, PAD, type Box, type Spot, type View } from './cameraRules';

export const FOLLOW = {
  /** A fighter with a foe this many tiles away or nearer (either way, diagonals counting one) is in a fight. */
  ENGAGED_TILES: 2,
  /** The heat of a fighter alive but out of the fight, in it, just in a blow (struck or striking), and just casting an ultimate. */
  IDLE: 0.35,
  ENGAGED: 3,
  BLOW: 2,
  ULT: 6,
  /** How long (battle ms) a blow and an ultimate keep their heat, fading straight down to none. */
  BLOW_MS: 1200,
  ULT_MS: 2500,
};

/** The camera a pan or a pinch took: left alone this long (real ms) after the last touch, then eased back over `RETURN_MS`, more slowly. */
export const HOLD_MS = 4000;
export const RETURN_MS = 1600;
/** The ease's lengths (ms) while it glides back (the usual are `EASE_MOVE_MS` and `EASE_ZOOM_MS`). */
export const RETURN_MOVE_MS = 1100;
export const RETURN_ZOOM_MS = 1300;

/** How long ago (battle ms) a fighter was last in a blow and last cast an ultimate (undefined: not this fight). */
export interface HeatIn {
  engaged: boolean;
  sinceBlow?: number;
  sinceUlt?: number;
}

/** A fighter's heat: how much the camera wants it in the middle of the picture. */
export function heatOf(h: HeatIn): number {
  const fade = (since: number | undefined, ms: number) => (since === undefined || since < 0 || since >= ms ? 0 : 1 - since / ms);
  return (h.engaged ? FOLLOW.ENGAGED : FOLLOW.IDLE) + FOLLOW.BLOW * fade(h.sinceBlow, FOLLOW.BLOW_MS) + FOLLOW.ULT * fade(h.sinceUlt, FOLLOW.ULT_MS);
}

/** Whether a fighter at tile (u, v) has one of `foes` within `ENGAGED_TILES`. `foes` are bucketed by tile (`tileKey`), so a crowded field
 *  costs only the few tiles round each fighter. */
export const tileKey = (u: number, v: number): number => u * 4096 + v;
export function engagedAt(u: number, v: number, foes: ReadonlySet<number>): boolean {
  const r = FOLLOW.ENGAGED_TILES;
  for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) if (foes.has(tileKey(Math.round(u) + du, Math.round(v) + dv))) return true;
  return false;
}

/** A fighter as the follow sees it: where it is drawn, whether it is in a fight, and its heat. */
export interface HotSpot extends Spot {
  engaged: boolean;
  heat: number;
}

/** What the follow frames: the fighters in combat (or everyone, with none), their heat-weighted middle, and the box round them made even
 *  about that middle (null: nobody to frame). */
export function followFrame(spots: readonly HotSpot[]): { box: Box; cx: number; cy: number } | null {
  if (!spots.length) return null;
  // (the fighters in combat, and any whose heat a blow or an ultimate has raised to a fight's; else everyone)
  const hot = spots.filter((s) => s.engaged || s.heat >= FOLLOW.ENGAGED);
  const active = hot.length ? hot : spots;
  const box = framing(active)!;
  let w = 0;
  let x = 0;
  let y = 0;
  for (const s of active) {
    const k = Math.max(0.01, s.heat);
    w += k;
    x += k * s.x;
    // (the middle of the figure, not its feet)
    y += k * (s.y - s.tall / 2);
  }
  // (the middle, kept inside the box less its padding so it is always over a fighter's ground)
  const cx = Math.min(box.x1 - PAD.side, Math.max(box.x0 + PAD.side, x / w));
  const cy = Math.min(box.y1 - PAD.bottom, Math.max(box.y0 + PAD.top, y / w));
  const hx = Math.max(cx - box.x0, box.x1 - cx);
  const hy = Math.max(cy - box.y0, box.y1 - cy);
  return { box: { x0: cx - hx, x1: cx + hx, y0: cy - hy, y1: cy + hy }, cx, cy };
}

/** The view for `followFrame`'s box in a room `w` x `h`, between the zooms `lo` and `hi` (multiples of `base`): it looks at the weighted
 *  middle and zooms out as far as the box needs. */
export function followView(spots: readonly HotSpot[], w: number, h: number, base: number, lo: number, hi: number): View | null {
  const f = followFrame(spots);
  if (!f) return null;
  const fit = Math.min(w / Math.max(1, f.box.x1 - f.box.x0), h / Math.max(1, f.box.y1 - f.box.y0)) / base;
  return { cx: f.cx, cy: f.cy, zoom: Math.min(hi, Math.max(lo, fit)) };
}

/** Whether a camera the player moved is still theirs: a finger on the board, or less than `HOLD_MS` since the last touch. */
export function manualHeld(lastTouch: number | null, now: number, touching: boolean): boolean {
  if (touching) return true;
  return lastTouch !== null && now - lastTouch < HOLD_MS;
}

/** The ease's lengths (ms) for the move and the zoom: slower for `RETURN_MS` after a held camera is let go, else the usual ones. */
export function returnEase(releasedAt: number | null, now: number, usual: { move: number; zoom: number }): { move: number; zoom: number } {
  if (releasedAt === null || now - releasedAt >= RETURN_MS || now < releasedAt) return usual;
  return { move: Math.max(usual.move, RETURN_MOVE_MS), zoom: Math.max(usual.zoom, RETURN_ZOOM_MS) };
}
