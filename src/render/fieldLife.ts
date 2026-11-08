// The hold's small life (phase 2 polish, `docs/notes/assault-2.md`): embers rising off the fires and rings spreading on the river, at Near only.
// The motion is the shared ambient module's (`ambient.ts`): each ember and each ring is a pure function of the clock and its index, so a
// fixed pool of sprites is set in place each frame, the same at any moment and steady across a pause. How much moves is `motionPlan`'s:
// none for those who ask for less motion (read live), half for the battery saver.
//
// Looks only: it reads where the fires and the deep water are, and never the battle.

import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { VFX } from './vfxArt';
import { rawAt } from './iso';
import { emberAt, hash01, motionPlan } from './ambient';
import { settings } from '../settings';
import type { WorldRect } from './fieldCull';

/** Embers a fire sends at once, and at most in all; an ember's life (s), how far it rises and spreads (world pixels). */
const PER_FIRE = 4;
const EMBERS = 60;
const EMBER = { life: 1.4, rise: 44, spread: 7, drift: 6 };
/** The rings: slots over the whole river (those in view drawn), each ring's life (s). */
const RINGS = 32;
const RING_LIFE = 1.1;

const reducedQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;

export class FieldLife {
  readonly layer = new Container();
  private embers: Sprite[] = [];
  private rings: Sprite[] = [];
  private ember: Texture;

  /** `water`: the deep tiles (u, v, h) the rings may spread on. */
  constructor(renderer: Renderer | { generateTexture: (g: Graphics) => Texture }, private water: readonly [number, number, number][]) {
    const g = new Graphics().rect(0, 0, 3, 3).fill(0xffb050);
    this.ember = (renderer as { generateTexture: (g: Graphics) => Texture }).generateTexture(g);
    g.destroy();
    this.layer.zIndex = 1e6 - 2;
  }

  /** One frame: `fires` are the flames in view (world x, y), `t` the battle's milliseconds; `near` false hides it all. */
  update(t: number, view: WorldRect, fires: readonly [number, number][], near: boolean): void {
    const plan = motionPlan({ reduced: !!reducedQuery?.matches, saver: !!settings().saver, hidden: false });
    const on = near && plan.run && plan.particles > 0;
    this.layer.visible = on;
    if (!on) return;
    const s = t / 1000;
    // (the embers: a few off each fire, each lifting, swaying and fading on its own clock; the fire's place is its seed, so they hold)
    const per = Math.max(1, Math.round(PER_FIRE * plan.particles));
    const most = Math.round(EMBERS * plan.particles);
    let n = 0;
    for (const [x, y] of fires) {
      const seed = Math.round(x) * 7 + Math.round(y) * 13;
      for (let i = 0; i < per && n < most; i++, n++) {
        const e = emberAt(i, s, [x, y], { ...EMBER, seed });
        const sp = (this.embers[n] ??= this.mote());
        sp.visible = true;
        sp.position.set(e.x, e.y);
        sp.alpha = e.a * 0.9;
        sp.scale.set(e.size * 1.5);
      }
    }
    for (let i = n; i < this.embers.length; i++) this.embers[i].visible = false;
    // (the rings: each slot a ring on one deep tile for its life, then on another; only those in view drawn)
    const frames = VFX.rippleWater;
    const slots = frames?.length && this.water.length ? Math.round(RINGS * plan.particles) : 0;
    let r = 0;
    for (let i = 0; i < slots; i++) {
      const off = hash01(i, 1) * RING_LIFE;
      const cycle = Math.floor((s + off) / RING_LIFE);
      const k = ((s + off) % RING_LIFE) / RING_LIFE;
      const [u, v, h] = this.water[Math.floor(hash01(i, cycle, 2) * this.water.length)];
      const [x, y] = rawAt(u + (hash01(i, cycle, 3) - 0.5) * 0.6, v + (hash01(i, cycle, 4) - 0.5) * 0.6, h);
      if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
      const sp = (this.rings[r] ??= this.ring(frames[0]));
      sp.visible = true;
      sp.texture = frames[Math.min(frames.length - 1, Math.floor(k * frames.length))];
      sp.position.set(x, y);
      sp.alpha = 0.5 * (1 - k);
      r++;
    }
    for (let i = r; i < this.rings.length; i++) this.rings[i].visible = false;
  }

  private mote(): Sprite {
    const sp = new Sprite(this.ember);
    sp.anchor.set(0.5);
    sp.blendMode = 'add';
    this.layer.addChild(sp);
    return sp;
  }

  private ring(tex: Texture): Sprite {
    const sp = new Sprite(tex);
    sp.anchor.set(0.5);
    sp.scale.set(1.2, 0.6);
    this.layer.addChild(sp);
    return sp;
  }

  destroy(): void {
    this.layer.destroy({ children: true });
  }
}
