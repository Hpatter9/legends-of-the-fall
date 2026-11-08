// ALIVE: the shared motion of every painted scene, as plain numbers (no page, no Pixi, no canvas). The camp, the tavern, the rooms
// of the keep, the hero sheets and the fight's board all take their flicker, sway, ripple and drifting life from here, so a torch
// gutters the same way on every screen. `ambientPaint.ts` draws it on a canvas; `boardView.ts` moves Pixi sprites by it;
// `ambientScenes.ts` says where each painting's fires, water and trees are. Checked by `test/ambient.test.ts`.
//
// Everything is a pure function of the clock (seconds) and a seed: no state to step, so a scene can be drawn at any moment, a
// paused one picks up where it was, and two screens never drift apart. Nothing here is random: the "noise" is a hash of the seed.

/** A point on a painting, as shares of its width and height (0 to 1). */
export type Pt = readonly [number, number];
/** A box on a painting: left, top, right, bottom (shares). */
export type Box = readonly [number, number, number, number];

/** A whole-number hash of a few numbers, spread over 0 to 1. */
export function hash01(a: number, b = 0, c = 0): number {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise along one line: 0 to 1, a new hill every unit, eased between. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash01(i, seed) * (1 - u) + hash01(i + 1, seed) * u;
}

/** The kinds of light: how fast and how deep each one gutters. */
export type LightKind = 'fire' | 'torch' | 'candle' | 'lantern' | 'magic' | 'window' | 'lava';
interface Gutter {
  /** How deep the slow breath and the quick flicker go (shares of the light). */
  slow: number;
  quick: number;
  /** Their pace (cycles a second, near enough). */
  slowHz: number;
  quickHz: number;
}
export const GUTTER: Record<LightKind, Gutter> = {
  fire: { slow: 0.12, quick: 0.1, slowHz: 0.9, quickHz: 7 },
  torch: { slow: 0.1, quick: 0.12, slowHz: 1.1, quickHz: 9 },
  candle: { slow: 0.06, quick: 0.08, slowHz: 0.7, quickHz: 6 },
  lantern: { slow: 0.05, quick: 0.04, slowHz: 0.6, quickHz: 5 },
  magic: { slow: 0.16, quick: 0.03, slowHz: 0.35, quickHz: 2.5 },
  window: { slow: 0.04, quick: 0.01, slowHz: 0.15, quickHz: 1 },
  lava: { slow: 0.14, quick: 0.03, slowHz: 0.3, quickHz: 1.6 },
};

/** How bright a light is at `t` seconds, around 1: a slow breath under a quick gutter, never out. Within `1 ± (slow + quick)`. */
export function flicker(t: number, seed: number, kind: LightKind = 'fire'): number {
  const g = GUTTER[kind];
  const slow = noise1(t * g.slowHz, seed) * 2 - 1;
  const quick = noise1(t * g.quickHz, seed + 101) * 2 - 1;
  return 1 + slow * g.slow + quick * g.quick;
}

/** A sway between -1 and 1: a slow lean that gusts now and then (two waves and a gusting swell). */
export function sway(t: number, seed: number, pace = 1): number {
  const ph = hash01(seed, 7) * Math.PI * 2;
  const gust = 0.55 + 0.45 * noise1(t * 0.13 * pace, seed + 31);
  const v = Math.sin(t * 1.1 * pace + ph) * 0.7 + Math.sin(t * 2.3 * pace + ph * 1.7) * 0.3;
  return Math.max(-1, Math.min(1, v * gust));
}

/** How a region of a painting moves. */
export type RegionKind = 'water' | 'fall' | 'foliage' | 'cloth' | 'flame' | 'cloud' | 'heat' | 'float';
/** Where a bending region is held still: trees at their foot, hanging herbs and banners at their top. */
export type Anchor = 'top' | 'bottom' | 'none';

/** How far one row of a region is pushed across at time `t` (in the same units as `amp`, the painter's pixels), for a row `f` of
 *  the way down it (0 the top, 1 the foot). The painter draws the region as strips pushed so. */
export function rowShift(kind: RegionKind, f: number, t: number, seed: number, amp: number, anchor: Anchor, pace = 1): number {
  // (how free the row is: nothing at the anchor, all of it at the far end, eased so a trunk bends rather than shears)
  const free = anchor === 'bottom' ? (1 - f) ** 1.6 : anchor === 'top' ? f ** 1.4 : 1;
  switch (kind) {
    case 'water':
      // (small ripples travelling down the water, two of them crossed, so the reflection shivers)
      return amp * (Math.sin(f * 38 + t * 2.6 * pace + seed) * 0.6 + Math.sin(f * 91 - t * 3.7 * pace + seed * 2) * 0.4);
    case 'heat':
      return amp * Math.sin(f * 24 - t * 5 * pace + seed);
    case 'foliage':
      return amp * free * (sway(t, seed, pace) + 0.25 * Math.sin(f * 7 + t * 3.1 * pace + seed));
    case 'cloth':
      // (a wave travelling down the cloth from where it hangs, the far end most)
      return amp * free * (Math.sin(t * 2.2 * pace - f * 5.5 + seed) * 0.75 + sway(t, seed, pace) * 0.25);
    case 'flame':
      // (a flame licks: quick waves rising up it, the tip most)
      return amp * free * (Math.sin(t * 7.5 * pace + f * 9 + seed) * 0.6 + (noise1(t * 4 * pace + f * 2, seed) * 2 - 1) * 0.4);
    case 'cloud':
      // (a whole bank of cloud slides, slowly, there and back)
      return amp * Math.sin(t * 0.05 * pace + seed) + amp * 0.2 * Math.sin(f * 4 + t * 0.11 * pace);
    case 'fall':
    case 'float':
      return 0;
  }
}

/** How far a floating thing (a castle in the sky, a hanging crystal) rises (+) or sinks, in the units of `amp`. */
export const floatLift = (t: number, seed: number, amp: number): number => amp * (Math.sin(t * 0.55 + seed) * 0.8 + Math.sin(t * 1.3 + seed * 2) * 0.2);

/** Whether a flash (a lightning stroke in a storm cloud, a surge of magic) is lit at `t`, and how brightly (0 to 1): one in about
 *  `every` seconds, each a quick double stroke a fifth of a second long. */
export function flashAt(t: number, seed: number, every: number): number {
  const slot = Math.floor(t / every);
  const at = hash01(seed, slot) * (every - 0.4);
  const k = t - slot * every - at;
  if (k < 0 || k > 0.32) return 0;
  return k < 0.06 ? 1 : k < 0.12 ? 0.25 : k < 0.18 ? 0.8 : (0.32 - k) / 0.14 * 0.4;
}

/** The bright spots of a picture (its fires, by default): the middles of the cells of `cell` px that hold at least `least` hot
 *  pixels, strongest first, at most `most`, none closer than two cells to a stronger one. `hot` says whether a pixel counts.
 *  Returned as shares of the picture, with each spot's strength (its hot pixels). */
export function hotSpots(
  rgba: ArrayLike<number>,
  w: number,
  h: number,
  o: { cell?: number; least?: number; most?: number; hot?: (r: number, g: number, b: number, a: number) => boolean } = {},
): { at: Pt; n: number }[] {
  const cell = o.cell ?? 8;
  const hot = o.hot ?? ((r, g, b, a) => a > 128 && r > 200 && g > 90 && r - b > 120);
  const cw = Math.ceil(w / cell);
  const ch = Math.ceil(h / cell);
  const n = new Array<number>(cw * ch).fill(0);
  const sx = new Array<number>(cw * ch).fill(0);
  const sy = new Array<number>(cw * ch).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (!hot(rgba[k], rgba[k + 1], rgba[k + 2], rgba[k + 3])) continue;
      const c = Math.floor(y / cell) * cw + Math.floor(x / cell);
      n[c]++;
      sx[c] += x;
      sy[c] += y;
    }
  const cells = n.map((v, i) => ({ i, v })).filter((c) => c.v >= (o.least ?? 3)).sort((a, b) => b.v - a.v || a.i - b.i);
  const out: { at: Pt; n: number; cx: number; cy: number }[] = [];
  for (const c of cells) {
    const cx = c.i % cw;
    const cy = Math.floor(c.i / cw);
    if (out.some((s) => Math.abs(s.cx - cx) <= 2 && Math.abs(s.cy - cy) <= 2)) continue;
    out.push({ at: [sx[c.i] / c.v / w, sy[c.i] / c.v / h], n: c.v, cx, cy });
    if (out.length >= (o.most ?? 12)) break;
  }
  return out.map(({ at, n }) => ({ at, n }));
}

/** How tall a flame stands at `t` (around 1, for a vertical stretch about its foot). */
export const flameRise = (t: number, seed: number): number => 1 + (noise1(t * 6, seed + 13) * 2 - 1) * 0.07 + Math.sin(t * 2.1 + seed) * 0.03;

/** How far a falling sheet of water has run (destination px), for its streaks: always forward, looping every `loop` px. */
export const fallRun = (t: number, speed: number, loop: number): number => ((t * speed) % loop + loop) % loop;

// ---- the particles: each a pure function of its index and the clock ----

export interface Speck {
  /** Where it is (shares of the painting), how much of it shows (0 to 1), and how big it is (a share of the painting's width). */
  x: number;
  y: number;
  a: number;
  size: number;
}

/** A spark or ember off a fire at `at`: it lifts, sways and fades over its `life` (s), then starts again. `i` picks which. */
export function emberAt(i: number, t: number, at: Pt, o: { spread: number; rise: number; life: number; drift?: number; seed?: number }): Speck {
  const seed = (o.seed ?? 0) + i * 17;
  const life = o.life * (0.6 + 0.8 * hash01(seed, 1));
  const age = (t + hash01(seed, 2) * life * 7) % life;
  const k = age / life;
  const x0 = at[0] + (hash01(seed, 3) - 0.5) * o.spread;
  const sw = Math.sin(age * 2.4 + seed) * o.spread * 0.6 + (o.drift ?? 0) * k;
  const y = at[1] - o.rise * (k + 0.3 * k * k) * (0.6 + 0.6 * hash01(seed, 4));
  return { x: x0 + sw, y, a: k < 0.15 ? k / 0.15 : (1 - k) ** 1.4, size: 0.6 + hash01(seed, 5) * 0.8 };
}

/** A puff of smoke or steam from `at`: it rises and spreads and thins out. `size` grows with its age. */
export function puffAt(i: number, t: number, at: Pt, o: { rise: number; life: number; spread: number; drift?: number; seed?: number }): Speck {
  const seed = (o.seed ?? 0) + i * 23;
  const life = o.life * (0.8 + 0.4 * hash01(seed, 1));
  const age = (t + hash01(seed, 2) * life * 5) % life;
  const k = age / life;
  return {
    x: at[0] + (hash01(seed, 3) - 0.5) * o.spread * 0.3 + (o.drift ?? 0) * k + Math.sin(age * 0.9 + seed) * o.spread * 0.25,
    y: at[1] - o.rise * k,
    a: Math.min(1, k * 5) * (1 - k) ** 1.2,
    size: o.spread * (0.35 + k * 1.1),
  };
}

/** A mote of dust (or a firefly, or a wisp) wandering inside `box`: a slow drift on two noises, glinting in and out. */
export function moteAt(i: number, t: number, box: Box, o: { pace?: number; seed?: number; blink?: number } = {}): Speck {
  const seed = (o.seed ?? 0) + i * 31;
  const pace = o.pace ?? 0.05;
  const x = box[0] + (box[2] - box[0]) * noise1(t * pace + hash01(seed, 1) * 50, seed);
  const y = box[1] + (box[3] - box[1]) * noise1(t * pace * 0.8 + hash01(seed, 2) * 50, seed + 1);
  const blink = o.blink ?? 0.4;
  const a = Math.max(0, Math.min(1, (noise1(t * blink + hash01(seed, 3) * 9, seed + 2) - 0.25) * 1.8));
  return { x, y, a, size: 0.6 + hash01(seed, 4) * 0.8 };
}

/** A bird (or a bat) crossing the sky in `box`: it flies across in `cross` seconds, rising and falling, then waits off-picture
 *  for `rest` seconds before the next pass. `flap` is its wings (0 up, 1 down). `a` is 0 while it is away. */
export function birdAt(i: number, t: number, box: Box, o: { cross: number; rest: number; seed?: number; bob?: number }): Speck & { flap: number; dir: 1 | -1 } {
  const seed = (o.seed ?? 0) + i * 41;
  const cycle = o.cross + o.rest;
  const ph = (t + hash01(seed, 1) * cycle) % cycle;
  const dir: 1 | -1 = hash01(seed, 2) < 0.5 ? 1 : -1;
  const k = ph / o.cross;
  const lane = box[1] + (box[3] - box[1]) * hash01(seed, Math.floor((t + hash01(seed, 1) * cycle) / cycle));
  const fx = dir === 1 ? k : 1 - k;
  const x = box[0] - 0.05 + (box[2] - box[0] + 0.1) * fx;
  const y = lane + Math.sin(ph * 1.3 + seed) * (o.bob ?? 0.01);
  const flap = (Math.sin(ph * 11 + seed) + 1) / 2;
  return { x, y, a: k <= 1 ? 1 : 0, size: 0.7 + hash01(seed, 3) * 0.6, flap, dir };
}

/** A glint on water: where in `box` a sparkle shows at `t`, and how bright (each lives about `life` s, then moves). */
export function glintAt(i: number, t: number, box: Box, life = 1.1, seed = 0): Speck {
  const s = seed + i * 53;
  const off = hash01(s, 1) * life;
  const n = Math.floor((t + off) / life);
  const k = ((t + off) % life) / life;
  return {
    x: box[0] + (box[2] - box[0]) * hash01(s, n, 2),
    y: box[1] + (box[3] - box[1]) * hash01(s, n, 3),
    a: Math.sin(k * Math.PI) ** 3,
    size: 0.6 + hash01(s, n, 4) * 0.8,
  };
}

// ---- shapes ----

/** Whether a point lies inside a polygon (even-odd). */
export function inPoly(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The box round a polygon. */
export function polyBox(poly: readonly Pt[]): Box {
  let [l, t, r, b] = [1, 1, 0, 0];
  for (const [x, y] of poly) {
    l = Math.min(l, x);
    t = Math.min(t, y);
    r = Math.max(r, x);
    b = Math.max(b, y);
  }
  return [l, t, r, b];
}

/** A polygon's area (shares squared; always positive). */
export function polyArea(poly: readonly Pt[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return Math.abs(s) / 2;
}

// ---- how much to move ----

export interface MotionAsk {
  /** The device asks for reduced motion. */
  reduced: boolean;
  /** The battery saver is on. */
  saver: boolean;
  /** The page (or the screen) is out of sight. */
  hidden: boolean;
}
export interface MotionPlan {
  /** Whether to run a loop at all (false: one still frame, then nothing). */
  run: boolean;
  /** The fewest milliseconds between two drawn frames. */
  gap: number;
  /** How many of the particles to draw (a share). */
  particles: number;
  /** Whether to draw the bending regions (water, trees, cloth, flames). */
  warp: boolean;
}

/** How a scene's life plays, from what the device asks. Hidden: nothing runs. Reduced motion: held still (the lights lit at rest,
 *  no particles, nothing bends). A battery saver: half the frames, half the particles. */
export function motionPlan(ask: MotionAsk): MotionPlan {
  if (ask.hidden) return { run: false, gap: Infinity, particles: 0, warp: false };
  if (ask.reduced) return { run: false, gap: Infinity, particles: 0, warp: false };
  if (ask.saver) return { run: true, gap: 33, particles: 0.5, warp: true };
  return { run: true, gap: 0, particles: 1, warp: true };
}

// ---- where a painting lies ----

/** How a painting fills its box: stretched to it, or covering (or inside) it, at `pos` of its overflow, like `object-position`. */
export interface Fit {
  fit: 'fill' | 'cover' | 'contain';
  pos?: readonly [number, number];
}

/** Where a painting `iw` x `ih` lies in a box `w` x `h` (its left, top, width and height in the box's pixels). */
export function placeIn(w: number, h: number, iw: number, ih: number, f: Fit): { x: number; y: number; w: number; h: number } {
  if (f.fit === 'fill') return { x: 0, y: 0, w, h };
  const k = f.fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const [ox, oy] = f.pos ?? [0.5, 0.5];
  return { x: (w - iw * k) * ox, y: (h - ih * k) * oy, w: iw * k, h: ih * k };
}
