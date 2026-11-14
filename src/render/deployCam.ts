// The deploy camera's pure rules (DEPLOY-ZOOM; no Pixi, no DOM, so the tests can run them). The owner: "At the beginning of every wave, zoom
// in on the hero placement box for easy placement." When a wave's deploy begins the camera eases in to frame the tiles a hero may be placed
// on (the near rows, `isDeployTile`), so they are big and easy to tap and drag onto. The camera stays free: a pan or a pinch makes it the
// player's until the next wave, as in a fight (`fightCam.ts`). Fight! hands back to the fight's own framing (`cameraRules.ts`).

import { viewFor, type Box, type View } from './cameraRules';
import { TH, TW } from './iso';

/** A placement tile's top as the camera sees it: its centre in world px (its height already lifts it). */
export interface Top {
  x: number;
  y: number;
}

/** Room round the placement tiles: a little to the sides, above for the heroes standing on the far row (their heads and health bars), and
 *  below for the columns' sides. */
export const DEPLOY_PAD = { side: 10, top: 58, bottom: 14 };
/** The closest the deploy camera comes, in screen px to a world px: tiles stay crisp and a hero's neighbours stay in view. */
export const DEPLOY_MAX_K = 2.2;

/** The box round the placement tiles with their padding (null for none). */
export function deployBox(tops: readonly Top[]): Box | null {
  if (!tops.length) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const t of tops) {
    x0 = Math.min(x0, t.x - TW / 2);
    x1 = Math.max(x1, t.x + TW / 2);
    y0 = Math.min(y0, t.y - TH / 2);
    y1 = Math.max(y1, t.y + TH / 2);
  }
  return { x0: x0 - DEPLOY_PAD.side, x1: x1 + DEPLOY_PAD.side, y0: y0 - DEPLOY_PAD.top, y1: y1 + DEPLOY_PAD.bottom };
}

/**
 * The view that frames the placement box in a room of `w` x `h` px, as a zoom over the layout's scale `base`: as close as fits, up to
 * `DEPLOY_MAX_K` screen px a world px (and the free camera's most, `hi`; never capped below the usual deploy view, zoom 1). A box too big
 * for the room is framed whole, out as far as `lo`, the free camera's least.
 */
export function deployView(box: Box, w: number, h: number, base: number, lo: number, hi: number): View {
  return viewFor(box, w, h, base, lo, Math.max(lo, 1, Math.min(hi, DEPLOY_MAX_K / base)));
}

/** FIRST-FIVE: how much room the placement rows keep inside the frame: the deploy view stands this much further back than an exact fit. */
export const DEPLOY_COMFORT = 0.92;

/**
 * FIRST-FIVE (the release audit's first deploy): the deploy view set down on the board. The placement rows of an upright board run along
 * its near edge, so a frame centred on them showed as much empty sky and water beyond that edge as board, and ran the board off the far
 * side. The view stands back a little (`DEPLOY_COMFORT`, never past `lo`, nor out of the close view when it was close), then slides
 * towards the middle of the `board` as far as it can with the placement `box` still wholly inside the `w` x `h` room: the rows stay big,
 * comfortably inside, and the rest of the screen is the board.
 */
export function deployFit(view: View, box: Box, board: Box, w: number, h: number, base: number, lo: number): View {
  const zoom = Math.max(lo, Math.min(view.zoom, Math.max(view.zoom * DEPLOY_COMFORT, Math.min(1, view.zoom))));
  const k = base * zoom;
  const hw = w / 2 / k;
  const hh = h / 2 / k;
  // (the centre may move anywhere that keeps the box inside; a box wider than the room stays centred on it)
  const slide = (lo0: number, hi0: number, half: number, want: number, mid: number): number => {
    const a = hi0 - half;
    const b = lo0 + half;
    return a > b ? mid : Math.min(b, Math.max(a, want));
  };
  return {
    cx: slide(box.x0, box.x1, hw, (board.x0 + board.x1) / 2, view.cx),
    cy: slide(box.y0, box.y1, hh, (board.y0 + board.y1) / 2, view.cy),
    zoom,
  };
}
