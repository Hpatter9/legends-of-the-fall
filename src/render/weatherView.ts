// The weather drawn: one light particle layer and a steady tint laid over the screen (`root`, in screen px), and night's glows
// at the lit props (`lights`, in the world). Looks only: nothing in the fight reads any of it. Cheap on a phone: the particles
// are plain rectangles of one white texture (one batch), capped (`weatherRules.ts`), halved on a battery saver, and not shown
// at all when the device asks for reduced motion (the tint and the fog banks stay, still).

import { Container, Sprite, Texture } from 'pixi.js';
import type { Area } from '../sim/board';
import type { Weather } from '../sim/weather';
import { settings } from '../settings';
import { ambientOf, countFor, fogFor, lookOf, tintAt, vignetteAt, type WeatherLook } from './weatherRules';

interface Mote {
  sp: Sprite;
  x: number;
  y: number;
  vy: number;
  ph: number;
  spin: number;
}
interface Bank {
  sp: Sprite;
  x: number;
  vx: number;
}

/** A soft disc or bank of fog, drawn once: white in the middle, clear at the edge. */
function soft(w: number, h: number): Texture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.translate(w / 2, h / 2);
  g.scale(1, h / w);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(-w / 2, -w / 2, w, w);
  return Texture.from(c);
}

/** DARK-WAVE: the darkened edges, drawn once: clear over the board (centred a little above the screen's middle, where the
 *  board sits above the bench) and white, to be tinted, towards the corners. Stretched over the whole screen. */
function edges(): Texture {
  const [w, h] = [96, 192];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const [cx, cy] = [w / 2, h * 0.4];
  const far = Math.hypot(w / 2, h * 0.6);
  // (drawn round, then squashed to the screen's shape when stretched: an oval clear over the board)
  g.translate(cx, cy);
  g.scale(1, h / w);
  const r = far * (w / h);
  const grad = g.createRadialGradient(0, 0, r * 0.38, 0, 0, Math.max(r, w * 0.62));
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.fillRect(-w, -h, w * 2, h * 2);
  return Texture.from(c);
}

export class WeatherView {
  /** In screen px: the tint, the fog banks and the particles (above the world, under the flash). */
  readonly root = new Container();
  /** In the world: night's glows (a layer of the board's `keep`, so a rebuilt board does not destroy it). */
  readonly lights = new Container();
  private tint = new Sprite(Texture.WHITE);
  /** The darkened edges of a dark weather (night, rain, ash), made when first wanted. */
  private edges: Sprite | null = null;
  private motes: Mote[] = [];
  private banks: Bank[] = [];
  private look: WeatherLook = lookOf('clear', 'highlands');
  private w = 1;
  private h = 1;
  private age = 0;
  private fogTex: Texture | null = null;
  private glowTex: Texture | null = null;
  private calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private seed = 1;

  constructor() {
    this.root.eventMode = 'none';
    this.lights.eventMode = 'none';
    this.lights.zIndex = 9e6;
    this.tint.alpha = 0;
    this.root.addChild(this.tint);
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.calm = e.matches));
  }

  /** A small steady stream of numbers for placing particles (the weather is looks only; it keeps to its own stream, not the fight's). */
  private rand(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.tint.width = this.w;
    this.tint.height = this.h;
    if (this.edges) {
      this.edges.width = this.w;
      this.edges.height = this.h;
    }
  }

  /** A new fight: show this weather. `spots` are the lit props' places in the world (night's glows go there). */
  set(weather: Weather, area: Area, spots: [number, number][], living = false): void {
    // (an army's road on a clear day: the land's own motes, `ambientOf`)
    this.look = living && weather === 'clear' ? ambientOf(area) : lookOf(weather, area);
    this.age = 0;
    this.seed = (Math.imul(spots.length + 7, 2654435761) ^ (area.length * 977) ^ weather.length) >>> 0 || 1;
    const look = this.look;
    for (const m of this.motes) m.sp.destroy();
    for (const b of this.banks) b.sp.destroy();
    this.motes = [];
    this.banks = [];
    for (const c of this.lights.removeChildren()) c.destroy();
    this.tint.tint = look.tint;
    this.tint.alpha = 0;
    if (look.vignette > 0 && !this.edges) {
      this.edges = new Sprite(edges());
      this.root.addChildAt(this.edges, 1);
      this.resize(this.w, this.h);
    }
    if (this.edges) {
      this.edges.tint = look.tint;
      this.edges.alpha = 0;
    }
    const saver = settings().saver;
    // (the particles: plain rectangles of one white texture)
    const n = countFor(look, saver, this.calm);
    for (let i = 0; i < n; i++) {
      const sp = new Sprite(Texture.WHITE);
      sp.anchor.set(0.5);
      const size = look.size[0] + Math.floor(this.rand() * (look.size[1] - look.size[0] + 1));
      sp.width = size;
      sp.height = look.streak || size;
      sp.tint = look.colours[i % look.colours.length];
      sp.alpha = look.flow === 'drift' ? 0.85 : look.streak ? 0.7 : 0.8;
      if (look.streak) sp.rotation = Math.atan2(-look.wind, 700);
      this.root.addChild(sp);
      const dir = look.flow === 'rise' ? -1 : 1;
      this.motes.push({ sp, x: this.rand() * this.w, y: this.rand() * this.h, vy: dir * (look.speed[0] + this.rand() * (look.speed[1] - look.speed[0])), ph: this.rand() * Math.PI * 2, spin: (this.rand() - 0.5) * 2 });
    }
    // (fog: a few soft banks, drifting slowly across, or still when motion is to stay down)
    const banks = fogFor(look, saver);
    if (banks) {
      this.fogTex ??= soft(128, 64);
      for (let i = 0; i < banks; i++) {
        const sp = new Sprite(this.fogTex);
        sp.anchor.set(0.5);
        sp.tint = look.fogColour;
        sp.alpha = look.fogAlpha;
        sp.width = Math.round(this.w * (1.1 + this.rand() * 0.5));
        sp.height = Math.round(sp.width * 0.42);
        const x = ((i + this.rand() * 0.6) / banks) * this.w;
        sp.position.set(x, Math.round(this.h * (0.3 + (i / Math.max(1, banks - 1)) * 0.55)));
        this.root.addChild(sp);
        this.banks.push({ sp, x, vx: this.calm ? 0 : (i % 2 ? -1 : 1) * (5 + this.rand() * 8) });
      }
    }
    // (night: a steady warm glow at each lit prop)
    if (look.glow) {
      this.glowTex ??= soft(64, 64);
      for (const [x, y] of spots) {
        const g = new Sprite(this.glowTex);
        g.anchor.set(0.5);
        g.tint = look.glow;
        g.blendMode = 'add';
        g.alpha = 0.6;
        g.scale.set(2);
        g.position.set(Math.round(x), Math.round(y - 20));
        this.lights.addChild(g);
      }
    }
    this.step(0);
  }

  /** Move the weather on by `dt` ms. */
  step(dt: number): void {
    this.age += dt;
    this.tint.alpha = tintAt(this.look, this.age);
    if (this.edges) this.edges.alpha = vignetteAt(this.look, this.age);
    const s = dt / 1000;
    const look = this.look;
    for (const m of this.motes) {
      m.ph += s * (look.flow === 'drift' ? 0.6 : 1.6);
      m.y += m.vy * s;
      let x = m.x + (look.wind + Math.sin(m.ph) * look.sway) * s;
      if (look.flow === 'drift') {
        // (fireflies wander about where they are: no direction, no blink)
        m.y += Math.cos(m.ph * 0.7 + m.spin) * look.sway * s;
        x = m.x + Math.sin(m.ph + m.spin) * look.sway * s;
      }
      m.x = x;
      if (m.y > this.h + 12) m.y = -12;
      else if (m.y < -12) m.y = this.h + 12;
      if (m.x > this.w + 12) m.x = -12;
      else if (m.x < -12) m.x = this.w + 12;
      m.sp.position.set(Math.round(m.x), Math.round(m.y));
      if (look.flow === 'fall' && !look.streak && look.size[0] >= 3) m.sp.rotation += m.spin * s;
    }
    for (const b of this.banks) {
      b.x += b.vx * s;
      const half = b.sp.width / 2;
      if (b.x > this.w + half) b.x = -half;
      else if (b.x < -half) b.x = this.w + half;
      b.sp.x = Math.round(b.x);
    }
  }
}
