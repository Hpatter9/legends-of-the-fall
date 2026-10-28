// The awakened aura on a 2D canvas, for every place that draws heroes without Pixi: the canvas scenes (the camp, the
// tavern, the summoning hall, the Calamity map, the party tableau) call `drawAura` behind and in front of the hero they
// paint, and the menus' pictures (the roster cards, the dossier, the Rank up card, the awakening panel) `wearAura`: two
// canvases laid behind and over the picture, drawn by one shared animation loop. Same parts, same placing
// (`auraPlace.ts`) and same atlas (`auraArt.ts`) as the fight's aura.
//
// Nothing is made per frame: one pose is reused, the glow is drawn once per colour and kept. Reduced motion draws each
// picture's aura once, still; battery saver leaves out the extra parts (the caller's `auraParts(..., saver)`) and the menus'
// loop runs at 30 a second.

import { AURA_CELL, AURA_PIXEL, auraImage, auraStrip, loadAuraImage } from './auraArt';
import { newPose, poseAura } from './auraPlace';
import { auraOf, auraParts, type AuraPart } from './auraStyles';
import { settings } from '../settings';

const pose = newPose();

/** Draw the parts of one layer (`back`: behind the hero; `front`: over it) of an aura on a canvas, the hero's feet at
 *  (x, feet), `tall` px high, facing `dir`, at time `t` (ms). Draws nothing until the atlas has loaded. */
export function drawAura(g: CanvasRenderingContext2D, parts: readonly AuraPart[], x: number, feet: number, tall: number, t: number, layer: 'back' | 'front', dir: number, calm: boolean): void {
  const img = auraImage();
  if (!img || !parts.length) return;
  const cell = AURA_CELL;
  const smooth = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = !AURA_PIXEL;
  for (const part of parts) {
    if (!!part.front !== (layer === 'front')) continue;
    const strip = auraStrip(part.key);
    if (!strip) continue;
    const n = part.count ?? 1;
    for (let i = 0; i < n; i++) {
      poseAura(part, i, strip[1], t, tall, dir, calm, cell, pose);
      g.save();
      g.translate(x + pose.x, feet + pose.y);
      if (pose.rot) g.rotate(pose.rot);
      g.scale(pose.sx, pose.sy);
      g.globalAlpha *= pose.alpha;
      if (part.add) g.globalCompositeOperation = 'lighter';
      g.drawImage(img, pose.frame * cell, strip[0] * cell, cell, cell, -cell / 2, -cell * pose.ay, cell, cell);
      g.restore();
    }
  }
  g.imageSmoothingEnabled = smooth;
}

/** The soft glow behind an awakened hero, in its class's colour, drawn once per colour and kept. */
const glows = new Map<number, HTMLCanvasElement>();
function glowOf(colour: number): HTMLCanvasElement {
  let c = glows.get(colour);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = (colour >> 16) & 255;
    const gr = (colour >> 8) & 255;
    const b = colour & 255;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${gr},${b},0.55)`);
    grad.addColorStop(0.55, `rgba(${r},${gr},${b},0.22)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glows.set(colour, c);
  }
  return c;
}

/** The glow behind an awakened hero (stronger at the second step), as the fight draws it. */
export function drawAuraGlow(g: CanvasRenderingContext2D, kind: string, step: number, x: number, feet: number, tall: number): void {
  if (step <= 0) return;
  const w = tall * 1.1;
  const h = tall * 1.25;
  const a = g.globalAlpha;
  g.globalAlpha = a * (step > 1 ? 0.95 : 0.7);
  g.drawImage(glowOf(auraOf(kind).colour), x - w / 2, feet - tall * 0.45 - h / 2, w, h);
  g.globalAlpha = a;
}

// --- The menus' pictures ---

interface Worn {
  host: HTMLElement;
  figure: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  kind: string;
  step: number;
  parts: readonly AuraPart[];
  /** The figure's height as a share of its picture's (the rest is the cell's margin over the head). */
  tallShare: number;
  /** Where the feet are and how tall the hero is, in the host's CSS px (measured when the host's size changes). */
  fx: number;
  fy: number;
  tall: number;
  dir: number;
  scale: number;
  dirty: boolean;
  /** Drawn once, still (reduced motion). */
  still: boolean;
  /** The host has been on the page (so leaving it later means it is gone). */
  shown: boolean;
  born: number;
}

const worn: Worn[] = [];
let raf = 0;
let last = 0;
const reducedQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => worn.forEach((w) => (w.dirty = true))) : null;

function measure(w: Worn): void {
  const hr = w.host.getBoundingClientRect();
  const fr = w.figure.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(1, Math.round(hr.width * dpr));
  const ch = Math.max(1, Math.round(hr.height * dpr));
  for (const c of [w.back, w.front])
    if (c.width !== cw || c.height !== ch) {
      c.width = cw;
      c.height = ch;
    }
  w.scale = dpr;
  w.fx = fr.left + fr.width / 2 - hr.left;
  w.fy = fr.bottom - hr.top;
  w.tall = fr.height * w.tallShare;
  w.dirty = false;
}

function paintLayer(w: Worn, c: HTMLCanvasElement, layer: 'back' | 'front', t: number): void {
  const g = c.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(w.scale, 0, 0, w.scale, 0, 0);
  if (layer === 'back') drawAuraGlow(g, w.kind, w.step, w.fx, w.fy, w.tall);
  drawAura(g, w.parts, w.fx, w.fy, w.tall, t, layer, w.dir, w.still);
}

function paint(w: Worn, t: number): void {
  paintLayer(w, w.back, 'back', t);
  paintLayer(w, w.front, 'front', t);
}

function loop(now: number): void {
  raf = 0;
  const saver = settings().saver;
  // (battery saver: 30 a second)
  const due = !saver || now - last >= 32;
  if (due) last = now;
  const calm = !!reducedQuery?.matches;
  let live = false;
  for (let i = worn.length - 1; i >= 0; i--) {
    const w = worn[i];
    if (!w.host.isConnected) {
      // (a picture that has left the page is let go; one not yet put on the page is waited for a while)
      if (w.shown || now - w.born > 10000) {
        observer?.unobserve(w.host);
        worn.splice(i, 1);
      } else live = true;
      continue;
    }
    w.shown = true;
    live = true;
    if (!due && !w.dirty) continue;
    if (w.dirty) {
      measure(w);
      w.still = false;
    }
    if (calm) {
      if (w.still) continue;
      w.still = true;
    }
    paint(w, now);
  }
  if (live) raf = requestAnimationFrame(loop);
}

function wake(): void {
  if (!raf) raf = requestAnimationFrame(loop);
}

/** Lay an awakened hero's aura round its picture in a menu: a canvas behind the picture and one over it, filling
 *  `host` (which must be positioned). `figure` is the hero's picture element (its feet at its bottom edge, centred), and
 *  `tallShare` the figure's height as a share of the picture's. Nothing is drawn below the first step. */
export function wearAura(host: HTMLElement, figure: HTMLElement, kind: string, step: number, tallShare = 0.9, dir = 1): void {
  if (step <= 0) return;
  const layer = (z: string, cls: string) => {
    const c = document.createElement('canvas');
    c.className = `auraLayer ${cls}`;
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;
    return c;
  };
  const back = layer('0', 'auraBack');
  const front = layer('3', 'auraFront');
  host.insertBefore(back, figure);
  figure.after(front);
  const w: Worn = { host, figure, back, front, kind, step, parts: auraParts(kind, step, settings().saver), tallShare, fx: 0, fy: 0, tall: 0, dir, scale: 1, dirty: true, still: false, shown: false, born: performance.now() };
  worn.push(w);
  observer?.observe(host);
  void loadAuraImage().then(() => {
    w.dirty = true;
    wake();
  });
  wake();
}
