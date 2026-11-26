// EIDOLON-SMOOTH 2 (docs/notes/eidolon-smooth.md): the rules of the pieces of an Eidolon's call that are drawn on its canvases. Before,
// each strip was a page element stepped by a CSS animation (some 250 at the most), and the page worked out every one's style on every
// frame. Here is what those animations said, as plain sums of a time: which frame of its sheet a strip shows, how solid it is, and where
// its mover has carried it. The numbers and curves are the stylesheet's own (`eidolons.css` as it stood), so the look is the same. Pure:
// the tests read it; `callCanvas.ts` draws with it.

/** A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of the share of the time gone (0 to 1). */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // (the curve's own parameter for this share of the time: halved in on, since x(t) only ever rises)
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      const v = fx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

export type Ease = (x: number) => number;
export const LINEAR: Ease = (x) => Math.max(0, Math.min(1, x));
export const EASE = bezier(0.25, 0.1, 0.25, 1);
export const EASE_IN = bezier(0.42, 0, 1, 1);
export const EASE_OUT = bezier(0, 0, 0.58, 1);
/** The curves the stylesheet gave its movers by name. */
export const CHIP_EASE = bezier(0.2, 0.7, 0.5, 1);
export const BOULDER_EASE = bezier(0.5, 0, 0.9, 0.4);

/** A keyframed value at share `p` (0 to 1) of its animation: `stops` are [share, value] in order; as CSS does, the easing is applied
 *  anew between each two stops. */
export function track(stops: readonly (readonly [number, number])[], p: number, ease: Ease): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [b, vb] = stops[i];
    if (p <= b) {
      const [a, va] = stops[i - 1];
      return va + (vb - va) * ease((p - a) / (b - a));
    }
  }
  return stops[stops.length - 1][1];
}

/* ------------------------------------------------------------------ which frame */

/** A pack strip (six frames of 32 px, `steps(5)`): looping, it turns through its first five frames; played once, it ends on its sixth.
 *  `tau` is the time since it began (ms). */
export function packFrame(tau: number, ms: number, loop: boolean): number {
  if (tau <= 0 || ms <= 0) return 0;
  if (loop) return Math.min(4, Math.floor(((tau % ms) / ms) * 5));
  return tau >= ms ? 5 : Math.floor((tau / ms) * 5);
}

/** A painted strip of `n` frames in a row (`steps(n, jump-none)`): each frame an equal share of `ms`, the last held once played. */
export function fxFrame(tau: number, ms: number, n: number, loop: boolean): number {
  if (tau <= 0 || ms <= 0 || n <= 1) return 0;
  const p = loop ? (tau % ms) / ms : tau / ms;
  return p >= 1 ? n - 1 : Math.min(n - 1, Math.floor(p * n));
}

/** A staged sheet of `cols` by `rows` frames played once over `ms`: along each row in turn; the column and the row at `tau`. A looping
 *  one (a single row) turns along it for good. */
export function stageCell(tau: number, ms: number, cols: number, rows: number, loop = false): { col: number; row: number } {
  if (tau <= 0 || ms <= 0) return { col: 0, row: 0 };
  if (loop) return { col: fxFrame(tau, ms, cols, true), row: 0 };
  if (tau >= ms) return { col: cols - 1, row: rows - 1 };
  const rowMs = ms / rows;
  return { col: Math.min(cols - 1, Math.floor(((tau % rowMs) / rowMs) * cols)), row: Math.min(rows - 1, Math.floor((tau / ms) * rows)) };
}

/* ------------------------------------------------------------------ how solid */

/** `ecFxStill`: with reduced motion a strip holds one frame and only fades in and out over its life. */
const STILL = [[0, 0], [0.2, 0.9], [0.7, 0.8], [1, 0]] as const;
export const stillAlpha = (tau: number, life: number): number => (tau < 0 || tau >= life ? 0 : track(STILL, tau / life, EASE_OUT));

/** A painted strip played once: unseen through a wait, then whole, fading over 240 ms from 120 ms before its last frame. `null`: over.
 *  (A strip that waited comes on fully solid whatever its own opacity: the stylesheet's wait ended on 1.) */
export function fxAlpha(tau: number, ms: number, delay: number, base = 1): number | null {
  if (tau < 0) return delay > 0 ? 0 : base;
  const q = (tau - (ms - 120)) / 240;
  if (q >= 1) return null;
  const a = delay > 0 ? 1 : base;
  return q <= 0 ? a : a * (1 - EASE_IN(q));
}

/** A staged strip played once: as a painted one, but its end is a quick 80 ms. */
export function stageAlpha(tau: number, ms: number, delay: number, base = 1): number | null {
  if (tau < 0) return delay > 0 ? 0 : base;
  if (tau >= ms) return null;
  const a = delay > 0 ? 1 : base;
  const q = (tau - (ms - 80)) / 80;
  return q <= 0 ? a : a * (1 - q);
}

/** A staged strip that loops (the embers): it comes in over half a second. */
export const loopAlpha = (tau: number): number => (tau <= 0 ? 0 : EASE_OUT(Math.min(1, tau / 500)));

/* ------------------------------------------------------------------ the movers (a strip carried and faded) */

export interface Carried {
  dx: number;
  dy: number;
  alpha: number;
}

/** A mote drifting up off the aftermath (`ecDrift`, ease-out, forwards): unseen until its delay, in by 15%, up 60 px and out. */
export function driftAt(tau: number, ms: number, dx: number): Carried | null {
  if (tau < 0) return { dx: 0, dy: 0, alpha: 0 };
  if (tau >= ms) return null;
  const p = tau / ms;
  const e = EASE_OUT(p);
  return { dx: dx * e, dy: -60 * e, alpha: track([[0, 0], [0.15, 1], [1, 0]], p, EASE_OUT) };
}

/** Debris flung out of a blow (`ecChip`, both): it waits whole where it starts, arcs up to 45%, then falls and fades. */
export function chipAt(tau: number, ms: number, dx: number, up: number, dn: number): Carried | null {
  if (tau >= ms) return null;
  const p = Math.max(0, tau / ms);
  return { dx: track([[0, 0], [0.45, dx * 0.6], [1, dx]], p, CHIP_EASE), dy: track([[0, 0], [0.45, up], [1, dn]], p, CHIP_EASE), alpha: track([[0, 1], [0.45, 1], [1, 0]], p, CHIP_EASE) };
}

/** A boulder falling (`ecBoulder`, both): from `fall` px up, down by 80%, then a little into the ground and gone. */
export function boulderAt(tau: number, ms: number, fall: number): Carried | null {
  if (tau >= ms) return null;
  const p = Math.max(0, tau / ms);
  return { dx: 0, dy: track([[0, -fall], [0.8, 0], [1, 6]], p, BOULDER_EASE), alpha: track([[0, 1], [0.8, 1], [1, 0]], p, BOULDER_EASE) };
}

/** An ember rising (`ecEmber`, ease-out, both): in by 20%, up by `rise` (negative: upward) and out. */
export function emberAt(tau: number, ms: number, rise: number): Carried | null {
  if (tau >= ms) return null;
  const p = Math.max(0, tau / ms);
  return { dx: 0, dy: rise * EASE_OUT(p), alpha: track([[0, 0], [0.2, 1], [1, 0]], p, EASE_OUT) };
}

/** A wake falling behind the pass (`ecWake`, 0.9 s ease-out): carried by (dx, dy) as it fades. */
export function wakeAt(tau: number, dx: number, dy: number): Carried | null {
  if (tau >= 900) return null;
  const e = EASE_OUT(Math.max(0, tau) / 900);
  return { dx: dx * e, dy: dy * e, alpha: 1 - e };
}

/** What lingers on the ground (`ecLinger`, 2.4 s ease-out, both): only its solidity. */
export const lingerAlpha = (tau: number, ms = 2400): number | null => (tau >= ms ? null : track([[0, 0], [0.12, 0.95], [0.6, 0.85], [1, 0]], Math.max(0, tau / ms), EASE_OUT));

/** Nivra's frost held on the ground (`ecHoldFade`, ease-out, both). */
export const holdAlpha = (tau: number, ms: number): number | null => (tau >= ms ? null : track([[0, 0], [0.08, 0.95], [0.82, 0.95], [1, 0]], Math.max(0, tau / ms), EASE_OUT));

/** A flare (`ecFlare`): its strip plays once over `ms`, and 150 ms after that it goes over 350 ms. */
export function flareAlpha(tau: number, ms: number): number | null {
  const q = (tau - ms - 150) / 350;
  return q >= 1 ? null : q <= 0 ? 1 : 1 - EASE_IN(q);
}

/** A value eased towards a target over `ms` (a CSS transition, `ease`): where it is `since` ms after it was sent from `from`. */
export const eased = (from: number, to: number, since: number, ms: number): number => (since >= ms ? to : from + (to - from) * EASE(Math.max(0, since) / ms));

/* ------------------------------------------------------------------ tints (the CSS filters on the small pack strips, worked out once) */

type Matrix = readonly number[];
const mul = (a: Matrix, b: Matrix): number[] => {
  // (4 x 5 colour matrices, rows r g b a, the last column added: `a` applied after `b`)
  const out = new Array<number>(20).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) out[r * 5 + c] += a[r * 5 + k] * b[k * 5 + c];
    out[r * 5 + 4] = a[r * 5 + 4];
    for (let k = 0; k < 4; k++) out[r * 5 + 4] += a[r * 5 + k] * b[k * 5 + 4];
  }
  return out;
};
const colour = (m: readonly number[], add = 0): number[] => [m[0], m[1], m[2], 0, add, m[3], m[4], m[5], 0, add, m[6], m[7], m[8], 0, add, 0, 0, 0, 1, 0];

/** One CSS filter function as a colour matrix (the Filter Effects specification's own numbers; the added column in shares of 1). */
export function filterMatrix(name: string, v: number): number[] {
  switch (name) {
    case 'hue-rotate': {
      const c = Math.cos((v * Math.PI) / 180), s = Math.sin((v * Math.PI) / 180);
      return colour([0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]);
    }
    case 'saturate':
      return colour([0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v]);
    case 'grayscale': {
      const k = 1 - Math.min(1, v);
      return colour([0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k]);
    }
    case 'sepia': {
      const k = 1 - Math.min(1, v);
      return colour([0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k]);
    }
    case 'brightness':
      return colour([v, 0, 0, 0, v, 0, 0, 0, v]);
    case 'contrast':
      return colour([v, 0, 0, 0, v, 0, 0, 0, v], 0.5 - 0.5 * v);
    default:
      return colour([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }
}

/** A CSS `filter` of colour functions ("hue-rotate(235deg) saturate(1.4)") as one matrix, the functions applied left to right. */
export function tintMatrix(filter: string): number[] {
  let m = filterMatrix('', 0);
  for (const [, name, arg] of filter.matchAll(/([a-z-]+)\(([-0-9.]+)[a-z%]*\)/g)) m = mul(filterMatrix(name, Number(arg)), m);
  return m;
}

/** Apply a colour matrix to straight (not premultiplied) RGBA bytes, in place. */
export function tintPixels(px: Uint8ClampedArray | number[], m: Matrix): void {
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    px[i] = Math.round(255 * Math.max(0, Math.min(1, m[0] * r + m[1] * g + m[2] * b + m[4])));
    px[i + 1] = Math.round(255 * Math.max(0, Math.min(1, m[5] * r + m[6] * g + m[7] * b + m[9])));
    px[i + 2] = Math.round(255 * Math.max(0, Math.min(1, m[10] * r + m[11] * g + m[12] * b + m[14])));
  }
}

/* ------------------------------------------------------------------ the canvases */

/** How many of the screen's own pixels a call's canvas has to a page pixel: the screen's, but no more than 2 (1.5 on battery saver): the
 *  pieces are fire, smoke and light, and a canvas the size of a 3x screen is nine times a page's pixels to fill on every frame. */
export const canvasScale = (dpr: number, saver: boolean): number => Math.max(1, Math.min(dpr || 1, saver ? 1.5 : 2));

/** Whether a new piece may go on the last canvas in a host, given what the page put after that canvas: yes when nothing did, or only
 *  lights did (the screen-blended glows and soft clouds, which stay over the strips); a piece that must be covered (`breaker`: the
 *  great burst) ends the canvas, and the next piece takes a new one over it. */
export const sameCanvas = (after: readonly { light: boolean }[]): boolean => after.every((x) => x.light);
