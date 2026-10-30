// A pool of little sheet sprites (puffs, sparks, trails, smoke) that fly, spin and fade on the fight's clock. Sprites are
// reused, not made fresh, and the count is capped, so a big fight stays cheap on a phone. Battery saver halves how many
// the effects ask for (`rate`), and the cap is lower too.

import { Container, Sprite, type Texture } from 'pixi.js';
import { paintSprite } from './cinematicArt';
import { boostedScale } from '../ultEpicRules';

export interface Burst {
  frames: Texture[];
  /** The individual ability source, retained for material audits and comparison galleries. */
  art?: string;
  x: number;
  y: number;
  /** Size on screen (the sheet's frames are 32px). */
  scale?: number;
  /** Ms a frame stays up (default 70). */
  frameMs?: number;
  /** Ms to wait before it shows. */
  delay?: number;
  /** How long it lives (ms); default is one run through the frames. */
  life?: number;
  /** Repeat the frames for its whole life, instead of holding the last one. */
  loop?: boolean;
  /** Drift, in px per ms. */
  vx?: number;
  vy?: number;
  /** Pull down, in px per ms squared. */
  gravity?: number;
  /** Growth, in scale per ms. */
  grow?: number;
  /** Spin, in radians per ms. */
  spin?: number;
  rotation?: number;
  stretchX?: number;
  stretchY?: number;
  tint?: number;
  alpha?: number;
  add?: boolean;
  /** A big moment (a burst, a death): lets through a fuller cap than the small bits do. */
  prio?: boolean;
  /** Its half-size on screen, for the FX-CLEAR cover (default: a 32px frame's at its scale; a painted 96px cell gives its own). */
  half?: number;
}

interface Live {
  sp: Sprite;
  b: Burst;
  scale: number;
  t: number;
  vy: number;
  frames: number;
  span: number;
  /** The `cover` multiplier, fixed when it starts. */
  k: number;
}

export class Particles {
  readonly root = new Container();
  private live: Live[] = [];
  private pool: Sprite[] = [];
  /** How many a call should make (1, or half on battery saver). */
  density = 1;
  /** Most that can be on screen at once. */
  cap = 200;
  /** Reduced motion keeps painted shapes steady while retaining the cast and impact cues. */
  calm = false;
  /** FX-CLEAR: what a bit's alpha is multiplied by, from where it starts and its half-size (`Fx` thins those over a fighter,
   *  `overFighter.ts`); none: 1. */
  cover?: (x: number, y: number, half: number) => number;
  /** ULT-EPIC: what the bits made now are scaled by (an ultimate's moment draws its effects about twice the size: `Fx.setEpic`); their
   *  drift and growth with them, so a burst spreads as far as it is big; capped, `boostedScale`). 1 the rest of the time. */
  boost = 1;

  /** Whether to make one of a thing that happens with chance `p` (this also scales it by the density). */
  rate(p: number): boolean {
    return Math.random() < p * this.density;
  }

  /** Make one, unless the cap is full (then nothing: a crowded moment just shows fewer). */
  spawn(b: Burst): void {
    if (!b.frames.length) return;
    if (this.boost !== 1) {
      const scale = boostedScale(b.scale ?? 1, this.boost, b.frames[0].frame.width);
      const k = scale / (b.scale ?? 1);
      b = { ...b, scale, ...(b.vx ? { vx: b.vx * k } : {}), ...(b.vy ? { vy: b.vy * k } : {}), ...(b.grow ? { grow: b.grow * k } : {}), ...(b.gravity ? { gravity: b.gravity * k } : {}), ...(b.half ? { half: b.half * k } : {}) };
    }
    if (this.live.length >= (b.prio ? this.cap * 1.3 : this.cap)) return;
    const sp = this.pool.pop() ?? new Sprite();
    sp.anchor.set(0.5);
    sp.position.set(b.x, b.y);
    sp.rotation = b.rotation ?? 0;
    sp.tint = b.tint ?? 0xffffff;
    sp.blendMode = b.add ? 'add' : 'normal';
    sp.visible = b.delay ? false : true;
    const k = this.cover ? this.cover(b.x, b.y, b.half ?? 16 * (b.scale ?? 1) * Math.max(b.stretchX ?? 1, b.stretchY ?? 1, 1)) : 1;
    sp.alpha = (b.alpha ?? 1) * k;
    sp.texture = b.frames[0];
    sp.scale.set(b.scale ?? 1);
    paintSprite(sp, 0, b.life ?? b.frames.length * (b.frameMs ?? 70), b.scale ?? 1, b.rotation ?? 0, (b.alpha ?? 1) * k, b.loop ?? false, this.calm);
    sp.scale.x *= b.stretchX ?? 1;
    sp.scale.y *= b.stretchY ?? 1;
    this.root.addChild(sp);
    const frameMs = b.frameMs ?? 70;
    this.live.push({ sp, b, scale: b.scale ?? 1, t: -(b.delay ?? 0), vy: b.vy ?? 0, frames: b.frames.length, span: b.life ?? b.frames.length * frameMs, k });
  }

  /** Step every live one by `dt` ms; the ones that are done go back in the pool. */
  step(dt: number): void {
    const keep: Live[] = [];
    for (const p of this.live) {
      p.t += dt;
      if (p.t >= p.span) {
        this.retire(p.sp);
        continue;
      }
      keep.push(p);
      if (p.t < 0) continue;
      const { b, sp } = p;
      sp.visible = true;
      p.vy += (b.gravity ?? 0) * dt;
      sp.x += (b.vx ?? 0) * dt;
      sp.y += p.vy * dt;
      if (b.spin) sp.rotation += b.spin * dt;
      p.scale = Math.max(0.05, p.scale + (b.grow ?? 0) * dt);
      sp.scale.set(p.scale);
      const frameMs = b.frameMs ?? 70;
      const f = b.loop ? Math.floor(p.t / frameMs) % p.frames : Math.min(p.frames - 1, Math.floor(p.t / frameMs));
      sp.texture = b.frames[f];
      // (a fade over the last third, so a puff thins out instead of popping)
      const left = 1 - p.t / p.span;
      sp.alpha = (b.alpha ?? 1) * p.k * Math.min(1, left * 3);
      paintSprite(sp, p.t, p.span, p.scale, (b.rotation ?? 0) + (this.calm ? 0 : (b.spin ?? 0) * p.t), (b.alpha ?? 1) * p.k, b.loop ?? false, this.calm);
      sp.scale.x *= b.stretchX ?? 1;
      sp.scale.y *= b.stretchY ?? 1;
    }
    this.live = keep;
  }

  clear(): void {
    for (const p of this.live) this.retire(p.sp);
    this.live = [];
  }

  private retire(sp: Sprite): void {
    sp.visible = false;
    sp.removeFromParent();
    this.pool.push(sp);
  }
}
