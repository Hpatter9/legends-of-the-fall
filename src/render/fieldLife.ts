// The hold's small life (phase 2 polish, `docs/notes/assault-2.md`): embers rising off the fires and rings spreading on the river, at Near only,
// pooled, and none at all for those who ask for less motion. A light local stand-in for the shared ambient module another builder is making
// (`claude/alive`): the field's view calls only `update`, so it can be swapped for that module's emitters when it lands on main.
//
// Looks only: it reads where the fires and the deep water are, and never the battle. It draws with `Math.random`, which the renderer may.

import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { VFX } from './vfxArt';
import { rawAt } from './iso';
import type { WorldRect } from './fieldCull';

/** At most this many embers and ripples at once; an ember lives this long; a fire sends one about this often. */
const EMBERS = 60;
const RIPPLES = 8;
const EMBER_MS = 1400;
const EMBER_EVERY = 520;
const RIPPLE_MS = 1100;
const RIPPLE_EVERY = 260;

interface Mote {
  sp: Sprite;
  born: number;
  ms: number;
  x: number;
  y: number;
  drift: number;
}

export class FieldLife {
  readonly layer = new Container();
  private embers: Mote[] = [];
  private ripples: Mote[] = [];
  private ember: Texture;
  private lastRipple = 0;
  private reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /** `water`: the deep tiles (u, v, h) the rings may spread on. */
  constructor(renderer: Renderer | { generateTexture: (g: Graphics) => Texture }, private water: readonly [number, number, number][]) {
    const g = new Graphics().rect(0, 0, 3, 3).fill(0xffb050);
    this.ember = (renderer as { generateTexture: (g: Graphics) => Texture }).generateTexture(g);
    g.destroy();
    this.layer.zIndex = 1e6 - 2;
  }

  /** One frame: `fires` are the flames in view (world x, y), `t` the page's milliseconds; `near` false hides it all. */
  update(t: number, view: WorldRect, fires: readonly [number, number][], near: boolean): void {
    const on = near && !this.reduced;
    this.layer.visible = on;
    if (!on) return;
    // (an ember now and then off each fire, rising and drifting, fading)
    for (const [x, y] of fires) {
      if (Math.random() > 16 / EMBER_EVERY || this.embers.length >= EMBERS) continue;
      const sp = new Sprite(this.ember);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      this.layer.addChild(sp);
      this.embers.push({ sp, born: t, ms: EMBER_MS * (0.7 + Math.random() * 0.6), x: x + (Math.random() - 0.5) * 14, y, drift: (Math.random() - 0.5) * 18 });
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      const p = (t - e.born) / e.ms;
      if (p >= 1) {
        e.sp.destroy();
        this.embers.splice(i, 1);
        continue;
      }
      e.sp.position.set(e.x + e.drift * p + Math.sin(p * 9 + e.drift) * 2, e.y - 44 * p);
      e.sp.alpha = (1 - p) * 0.9;
      e.sp.scale.set(1 - p * 0.5);
    }
    // (a ring spreading on the deep water in view, now and then)
    const frames = VFX.rippleWater;
    if (frames?.length && this.water.length && t - this.lastRipple > RIPPLE_EVERY && this.ripples.length < RIPPLES) {
      this.lastRipple = t;
      for (let k = 0; k < 6; k++) {
        const [u, v, h] = this.water[Math.floor(Math.random() * this.water.length)];
        const [x, y] = rawAt(u + (Math.random() - 0.5) * 0.6, v + (Math.random() - 0.5) * 0.6, h);
        if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
        const sp = new Sprite(frames[0]);
        sp.anchor.set(0.5);
        sp.scale.set(1.2, 0.6);
        sp.alpha = 0.5;
        this.layer.addChild(sp);
        this.ripples.push({ sp, born: t, ms: RIPPLE_MS, x, y, drift: 0 });
        break;
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const p = (t - r.born) / r.ms;
      if (p >= 1 || !frames?.length) {
        r.sp.destroy();
        this.ripples.splice(i, 1);
        continue;
      }
      r.sp.texture = frames[Math.min(frames.length - 1, Math.floor(p * frames.length))];
      r.sp.position.set(r.x, r.y);
      r.sp.alpha = 0.5 * (1 - p);
    }
  }

  destroy(): void {
    this.layer.destroy({ children: true });
  }
}
