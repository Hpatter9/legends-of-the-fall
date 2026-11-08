// ALIVE: a painting's life drawn on a 2D canvas, from its data (`ambientScenes.ts`) and the shared motion (`ambient.ts`). Each
// moving region is cut out of the painting once, along its polygon with a feathered edge, and redrawn each frame as strips pushed
// by the motion (water ripples, trees and cloth sway, a flame licks, clouds slide) or with streaks running down it (a waterfall).
// Over that: the lights breathe and gutter (an additive glow over each painted flame or lamp), embers and smoke rise, glints dance
// on the water, motes, fireflies and birds cross the air. Nothing is made in a frame: the cuts, the glows and the streaks are made
// when the painting is laid out; a frame only draws them.
//
// Used by the camp's own canvas (`camp.ts`) and by the overlay that brings a painted page to life (`ambientLayer.ts`).

import { birdAt, emberAt, flashAt, flameRise, fallRun, flicker, floatLift, glintAt, hotSpots, inPoly, moteAt, polyBox, puffAt, rowShift, type MotionPlan, type Pt } from './ambient';
import type { FindLights, Light, Region, SceneLife, Spout } from './ambientScenes';

const canvasOf = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const rgb = (n: number): string => `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;

/** A soft round glow, white at its heart, cached by colour (drawn additively, so its colour is the light's). */
const glows = new Map<number, HTMLCanvasElement>();
function glowOf(colour: number): HTMLCanvasElement {
  let c = glows.get(colour);
  if (c) return c;
  c = canvasOf(64, 64);
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, `rgba(${rgb(colour)}, 1)`);
  rg.addColorStop(0.25, `rgba(${rgb(colour)}, 0.55)`);
  rg.addColorStop(0.6, `rgba(${rgb(colour)}, 0.16)`);
  rg.addColorStop(1, `rgba(${rgb(colour)}, 0)`);
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  glows.set(colour, c);
  return c;
}

/** Where the painting lies on the canvas (canvas px). */
export interface Place {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Cut {
  r: Region;
  seed: number;
  /** The cut's box on the canvas, and its picture (the painting there, masked to the polygon). */
  x: number;
  y: number;
  c: HTMLCanvasElement;
  /** A waterfall's streaks (twice the cut's height, to run down it), and the mask they are clipped to. */
  streaks?: HTMLCanvasElement;
  mask?: HTMLCanvasElement;
  work?: HTMLCanvasElement;
}

/** A polygon on a canvas, filled; its edge feathered by `soft` px (strokes cut away from the edge in steps). */
function maskOf(w: number, h: number, poly: readonly Pt[], at: (p: Pt) => [number, number], soft: number): HTMLCanvasElement {
  const c = canvasOf(w, h);
  const g = c.getContext('2d')!;
  const path = new Path2D();
  poly.forEach((p, i) => {
    const [x, y] = at(p);
    if (i) path.lineTo(x, y);
    else path.moveTo(x, y);
  });
  path.closePath();
  g.fillStyle = '#fff';
  g.fill(path);
  if (soft > 0.5) {
    // (each step takes a little more off the edge: a soft fall-off without a blur filter, which not every phone's canvas has)
    g.globalCompositeOperation = 'destination-out';
    g.strokeStyle = '#fff';
    const steps = Math.min(6, Math.ceil(soft));
    for (let s = steps; s >= 1; s--) {
      g.globalAlpha = 0.28;
      g.lineWidth = (soft * 2 * s) / steps;
      g.stroke(path);
    }
  }
  return c;
}

/** The streaks of falling water: pale dashes, two loops tall, so they can run down without a seam. */
function streaksOf(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = canvasOf(w, h * 2);
  const g = c.getContext('2d')!;
  let s = seed;
  const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  const n = Math.max(4, Math.round(w * 0.9));
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * w);
    const y = rnd() * h;
    const len = 3 + rnd() * h * 0.45;
    g.fillStyle = `rgba(235, 248, 255, ${0.35 + rnd() * 0.5})`;
    g.fillRect(x, y, 1, len);
    g.fillRect(x, y + h, 1, len);
    if (y + len > h) g.fillRect(x, y - h, 1, len);
  }
  return c;
}

/** The flames of a painting too full of them to place by hand: its bright spots, looked for once in a small copy of it. */
function findLights(src: CanvasImageSource, sw: number, sh: number, f: FindLights): Light[] {
  const w = 256;
  const h = Math.max(1, Math.round((sh / sw) * w));
  const c = canvasOf(w, h);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = g.getImageData(0, 0, w, h).data;
  } catch {
    return [];
  }
  const hot =
    f.hot === 'bright'
      ? (r: number, gg: number, b: number, a: number) => a > 128 && r > 235 && gg > 195 && b < 190 && r - b > 70
      : (r: number, gg: number, b: number, a: number) => a > 128 && r > 210 && gg > 110 && r - b > 110;
  const [l, t, r, b] = f.box;
  return hotSpots(data, w, h, { cell: 4, least: 2, most: f.most * 3, hot })
    .filter((s) => s.at[0] >= l && s.at[0] <= r && s.at[1] >= t && s.at[1] <= b)
    .slice(0, f.most)
    .map((s) => ({ at: s.at, r: f.r, kind: f.kind, colour: f.colour, power: f.power }));
}

export class LifePainter {
  private cuts: Cut[] = [];
  private place: Place = { x: 0, y: 0, w: 1, h: 1 };
  /** Fires found in the picture itself (the enemy's camps): each glows and sends up a little smoke. */
  private found: { at: Pt; n: number }[] = [];
  /** Lights the scene asks to be found in its painting (`SceneLife.find`), found once per picture. */
  private spots: Light[] = [];
  private spotsOf: CanvasImageSource | null = null;

  constructor(
    readonly life: SceneLife,
    /** The canvas's pixels are whole art pixels (the camp): the strips move a whole pixel at a time, and nothing is smoothed. */
    private crisp = false,
    /** Only the lights and the life in the air are drawn by this painter (no regions are cut). */
    private lightsOnly = false,
  ) {}

  /** Where a point of the painting falls on the canvas. */
  at = (p: Pt): [number, number] => [this.place.x + p[0] * this.place.w, this.place.y + p[1] * this.place.h];

  /** Lay the painting out: `src` is what the canvas shows under the life, drawn at `place` (its own size `sw` x `sh`). The moving
   *  regions are cut from it now. Call again when the canvas or the picture changes. */
  layout(src: CanvasImageSource, sw: number, sh: number, place: Place, found: { at: Pt; n: number }[] = []): void {
    this.place = place;
    this.found = found;
    if (this.life.find && this.spotsOf !== src) {
      this.spotsOf = src;
      this.spots = findLights(src, sw, sh, this.life.find);
    }
    const kx = sw / place.w;
    const ky = sh / place.h;
    this.cuts = (this.lightsOnly ? [] : this.life.regions).map((r, i) => {
      const [l, t, rr, b] = polyBox(r.poly);
      const ampPx = Math.abs(r.amp) * place.w;
      const pad = Math.ceil(ampPx * 1.5 + 2);
      const x = Math.floor(place.x + l * place.w - pad);
      const y = Math.floor(place.y + t * place.h - pad);
      const w = Math.ceil((rr - l) * place.w + pad * 2);
      const h = Math.ceil((b - t) * place.h + pad * 2);
      const toCut = (p: Pt): [number, number] => [place.x + p[0] * place.w - x, place.y + p[1] * place.h - y];
      const soft = Math.max(1.5, Math.min(6, Math.min(w, h) * 0.12));
      const mask = maskOf(w, h, r.poly, toCut, soft);
      const c = canvasOf(w, h);
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = !this.crisp;
      g.drawImage(src, (x - place.x) * kx, (y - place.y) * ky, w * kx, h * ky, 0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, 0, 0);
      const cut: Cut = { r, seed: i * 7 + 3, x, y, c };
      if (r.kind === 'fall') {
        cut.streaks = streaksOf(w, h, 1234 + i * 977);
        cut.mask = mask;
        cut.work = canvasOf(w, h);
      }
      return cut;
    });
  }

  /** The moving regions (drawn over the painting, under whoever stands in the scene). `t` is the clock in seconds. */
  regions(g: CanvasRenderingContext2D, t: number, plan: MotionPlan): void {
    if (!plan.warp) return;
    const pw = this.place.w;
    const strip = this.crisp ? 1 : 2;
    for (const cut of this.cuts) {
      const { r, c, x, y, seed } = cut;
      if (r.kind === 'fall') {
        this.fall(g, cut, t);
        continue;
      }
      if (r.kind === 'float') {
        const dy = floatLift(t, seed, r.amp * pw);
        g.drawImage(c, x, this.crisp ? Math.round(y - dy) : y - dy);
        continue;
      }
      const amp = r.amp * pw;
      const anchor = r.anchor ?? 'none';
      const rise = r.kind === 'flame' ? flameRise(t, seed) : 1;
      // (rows pushed the same way are drawn as one strip: the push is kept to whole pixels on a crisp canvas, half pixels otherwise,
      //  so a gently bending banner is a handful of draws rather than one a row)
      const q = this.crisp ? 1 : 2;
      let from = 0;
      let was = NaN;
      const flush = (to: number) => {
        if (to <= from) return;
        const h = to - from;
        if (rise !== 1) {
          // (a flame stands taller and shorter about its foot)
          const foot = c.height;
          const top = foot - (foot - from) * rise;
          g.drawImage(c, 0, from, c.width, h, x + was, y + top, c.width, h * rise + 0.5);
        } else g.drawImage(c, 0, from, c.width, h, x + was, y + from, c.width, h);
      };
      for (let row = 0; row < c.height; row += strip) {
        const dx = Math.round(rowShift(r.kind, row / c.height, t, seed, amp, anchor, r.pace ?? 1) * q) / q;
        if (dx === was) continue;
        flush(row);
        from = row;
        was = dx;
      }
      flush(c.height);
    }
  }

  /** A waterfall: pale streaks running down it, clipped to its shape, laid on lightly. */
  private fall(g: CanvasRenderingContext2D, cut: Cut, t: number): void {
    const { streaks, mask, work, c } = cut;
    if (!streaks || !mask || !work) return;
    const w = work.getContext('2d')!;
    w.globalCompositeOperation = 'copy';
    const run = fallRun(t, c.height * 1.6, c.height);
    w.drawImage(streaks, 0, run - c.height);
    w.globalCompositeOperation = 'destination-in';
    w.drawImage(mask, 0, 0);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.45;
    g.drawImage(work, cut.x, cut.y);
    g.restore();
  }

  /** Smoke and steam (drawn over the painting, before the lights). */
  smoke(g: CanvasRenderingContext2D, t: number, plan: MotionPlan): void {
    if (!plan.particles) return;
    const spouts: Spout[] = [...this.life.spouts.filter((s) => s.kind !== 'embers')];
    // (the strongest fires found in the picture send up a thread of smoke)
    for (const f of this.found.slice(0, 3)) spouts.push({ kind: 'smoke', at: f.at, count: 4, spread: 0.02, rise: 0.05, life: 5, colour: 0x6a6070, drift: 0.015 });
    for (const [si, s] of spouts.entries()) {
      const n = Math.ceil(s.count * plan.particles);
      const puff = glowOf(s.colour);
      for (let i = 0; i < n; i++) {
        const p = puffAt(i, t, s.at, { rise: s.rise, life: s.life, spread: s.spread, drift: s.drift, seed: si * 97 });
        if (p.a <= 0.01) continue;
        const [x, y] = this.at([p.x, p.y]);
        const r = p.size * this.place.w;
        g.globalAlpha = p.a * (s.kind === 'steam' ? 0.35 : 0.28);
        g.drawImage(puff, x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 1;
  }

  /** The lights, the embers, the glints and the life in the air (drawn over everything else in the scene). */
  lights(g: CanvasRenderingContext2D, t: number, plan: MotionPlan): void {
    const still = !plan.run;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const pw = this.place.w;
    const all: Light[] = [...this.life.lights, ...this.spots];
    for (const [i, f] of this.found.entries()) all.push({ at: f.at, r: Math.min(0.05, 0.018 + f.n * 0.0006), kind: i % 2 ? 'torch' : 'fire', colour: 0xff8a30, power: 0.5 });
    for (const [i, l] of all.entries()) {
      let k = still ? 1 : flicker(t, i * 13 + 5, l.kind);
      if (l.flash && !still) k += flashAt(t, i * 29 + 11, l.flash) * 1.6;
      const [x, y] = this.at(l.at);
      const r = l.r * pw * (still ? 1 : 0.94 + 0.06 * k);
      const sq = l.squash ?? 1;
      g.globalAlpha = Math.max(0, Math.min(1, (l.power ?? 0.5) * k));
      g.drawImage(glowOf(l.colour), x - r, y - r * sq, r * 2, r * 2 * sq);
    }
    if (!still && plan.particles) {
      this.embers(g, t, plan.particles);
      this.glints(g, t, plan.particles);
      this.air(g, t, plan.particles);
    }
    g.restore();
  }

  private embers(g: CanvasRenderingContext2D, t: number, share: number): void {
    const px = this.crisp ? 1 : Math.max(1, this.place.w / 400);
    for (const [si, s] of this.life.spouts.entries()) {
      if (s.kind !== 'embers') continue;
      const n = Math.ceil(s.count * share);
      for (let i = 0; i < n; i++) {
        const e = emberAt(i, t, s.at, { spread: s.spread, rise: s.rise, life: s.life, drift: s.drift, seed: si * 61 });
        if (e.a <= 0.02) continue;
        const [x, y] = this.at([e.x, e.y]);
        g.globalAlpha = e.a;
        g.fillStyle = e.a > 0.6 ? '#fff0b0' : `rgb(${rgb(s.colour)})`;
        const sz = Math.max(1, Math.round(px * e.size * 1.4));
        g.fillRect(this.crisp ? Math.round(x) : x, this.crisp ? Math.round(y) : y, sz, sz);
      }
    }
  }

  private glints(g: CanvasRenderingContext2D, t: number, share: number): void {
    const pw = this.place.w;
    for (const [ci, r] of this.life.regions.entries()) {
      if (r.kind !== 'water' || !r.glints) continue;
      const box = polyBox(r.poly);
      const n = Math.ceil(r.glints * share);
      for (let i = 0; i < n * 2; i++) {
        const s = glintAt(i, t, box, 1.2, ci * 71);
        if (s.a < 0.05 || !inPoly([s.x, s.y], r.poly)) continue;
        const [x, y] = this.at([s.x, s.y]);
        // (a point of light; at its brightest a small cross, a pixel each way on a crisp canvas)
        const px = this.crisp ? 1 : Math.max(1, Math.round(pw / 400));
        const arm = s.a > 0.7 ? px : 0;
        const X = Math.round(x);
        const Y = Math.round(y);
        g.globalAlpha = s.a * 0.75;
        g.fillStyle = '#ffe9b8';
        g.fillRect(X - arm, Y, arm * 2 + px, px);
        if (arm) g.fillRect(X, Y - arm, px, arm * 2 + px);
      }
    }
  }

  private air(g: CanvasRenderingContext2D, t: number, share: number): void {
    const pw = this.place.w;
    const px = this.crisp ? 1 : Math.max(1, pw / 400);
    for (const [di, d] of this.life.drifts.entries()) {
      const n = Math.ceil(d.count * share);
      if (d.kind === 'birds' || d.kind === 'bats') {
        for (let i = 0; i < n; i++) {
          const b = birdAt(i, t, d.box, { cross: d.kind === 'bats' ? 9 : 26, rest: d.kind === 'bats' ? 6 : 14, seed: di * 37, bob: 0.008 });
          if (!b.a) continue;
          const [x, y] = this.at([b.x, b.y]);
          // (a far bird is a pixel V: its wings up, then level)
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 0.85;
          g.fillStyle = `rgb(${rgb(d.colour)})`;
          const s = Math.max(1, Math.round(px * b.size));
          const X = Math.round(x);
          const Y = Math.round(y);
          g.fillRect(X, Y, s, s);
          const up = b.flap > 0.5 ? -s : 0;
          g.fillRect(X - s * 2, Y + up, s * 2, s);
          g.fillRect(X + s, Y + up, s * 2, s);
          g.globalCompositeOperation = 'lighter';
        }
        continue;
      }
      const glow = glowOf(d.colour);
      for (let i = 0; i < n; i++) {
        const m = moteAt(i, t, d.box, { seed: di * 43, pace: d.kind === 'fireflies' ? 0.09 : d.kind === 'wisps' ? 0.07 : 0.03, blink: d.kind === 'fireflies' ? 0.6 : 0.3 });
        if (m.a < 0.03) continue;
        const [x, y] = this.at([m.x, m.y]);
        if (d.kind === 'motes') {
          g.globalAlpha = m.a * 0.55;
          g.fillStyle = `rgb(${rgb(d.colour)})`;
          g.fillRect(x, y, px * m.size, px * m.size);
        } else {
          const r = px * (d.kind === 'wisps' ? 7 : 4) * m.size;
          g.globalAlpha = m.a * 0.8;
          g.drawImage(glow, x - r, y - r, r * 2, r * 2);
          g.fillStyle = '#fffbe0';
          g.fillRect(this.crisp ? Math.round(x) : x, this.crisp ? Math.round(y) : y, px, px);
        }
      }
    }
  }
}
