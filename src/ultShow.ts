// The ultimate's showcase on the page (ULT-SHOW, docs/notes/ult-showcase-design.md; the plan and its timings are `ultShowRules.ts`). While the
// fight is held, it stages the real sprites over what the sim says (the caster at each hop, the foes standing until they are cut, the beasts
// running in) and plays each beat's effects and sounds on the moment's layer. When it ends the stages are dropped and every sprite is drawn
// as the sim says again: the caster stands where the cast left it, so nothing jumps.
//
// It never changes the battle: it only reads the plan and sets `UnitSprite.stage`.

import type { UnitSprite } from './render/unitView';
import type { Fx } from './render/fx';
import { depth } from './render/iso';
import { play, type Sfx } from './render/sound';
import { posesAt, type At, type Beat, type ShowPlan } from './ultShowRules';

export interface UltShowOpts {
  /** A fighter's sprite. */
  sprite: (id: number) => UnitSprite | undefined;
  /** A tile's ground in the world (px); null when it cannot be told. */
  world: (u: number, v: number) => [number, number] | null;
  fx?: Fx;
}

/** The sounds of the beats. */
const SOUND: Partial<Record<Beat['kind'], Sfx[]>> = {
  vanish: ['blink'],
  cut: ['swingSword', 'hitSword'],
  gather: ['fireWhoosh'],
  mark: ['earthRumble'],
  sky: ['meteorFall'],
  call: ['horn'],
  land: ['dash'],
  dash: ['dash'],
  crash: ['earthRumble', 'hitHeavy'],
  blow: ['hitFist'],
  hook: ['throwBone'],
  cloud: ['thunder'],
  snare: ['rustle'],
  stone: ['frostCrack'],
  smite: ['hitHeavy'],
  taunt: ['block'],
  rise: ['earthRumble'],
  tunnel: ['earthRumble'],
  appear: [],
  finish: [],
};

/** How a hero's shots are drawn: a bolt from the sky, a stream of flame, or a bullet (the rest). */
const HOW: Record<string, 'bolt' | 'flame' | 'bullet'> = { lightningMage: 'bolt', dragoon: 'flame' };

export class UltShow {
  plan: ShowPlan | null = null;
  private fired = 0;
  private beats: Beat[] = [];
  private staged = new Set<number>();

  constructor(private opts: UltShowOpts) {}

  begin(plan: ShowPlan): void {
    this.end();
    this.plan = plan;
    this.beats = [...plan.beats].sort((a, b) => a.at - b.at);
    this.fired = 0;
  }

  /** Draw the showcase `t` ms in: the beats come due, and the staged fighters are posed. */
  frame(t: number, beats = true): void {
    const plan = this.plan;
    if (!plan) return;
    while (beats && this.fired < this.beats.length && this.beats[this.fired].at <= t) this.beat(plan, this.beats[this.fired++]);
    const poses = posesAt(plan, t);
    for (const id of this.staged)
      if (!poses.has(id)) {
        const s = this.opts.sprite(id);
        if (s) s.stage = null;
        this.staged.delete(id);
      }
    for (const [id, pose] of poses) {
      const s = this.opts.sprite(id);
      const p = this.spot(pose.at, pose.off);
      if (!s || !p) continue;
      let [x, y] = p;
      if (pose.to) {
        const q = this.spot(pose.to.at, pose.to.off);
        const k = pose.k ?? 1;
        if (q) [x, y] = [x + (q[0] - x) * k, y + (q[1] - y) * k];
      }
      const lift = pose.lift ?? 0;
      const look = pose.look && this.opts.world(pose.look.u, pose.look.v);
      const moving = pose.to && this.spot(pose.to.at, pose.to.off);
      const face: 1 | -1 = look && Math.abs(look[0] - x) > 1 ? (look[0] > x ? 1 : -1) : moving && Math.abs(moving[0] - x) > 1 ? (moving[0] > x ? 1 : -1) : (s.stage?.face ?? 1);
      // (a fighter in the air is drawn over what it flies across)
      const tile = pose.to && (pose.k ?? 0) > 0.5 ? pose.to.at : pose.at;
      s.stage = { x, y: y - lift, z: depth(tile.u, tile.v) + 5 + (lift > 4 ? 40 : 0), alpha: pose.alpha, row: pose.row, p: pose.p, face };
      this.staged.add(id);
    }
  }

  private spot(at: At, off?: { dx: number; dy: number }): [number, number] | null {
    const w = this.opts.world(at.u, at.v);
    return w ? [w[0] + (off?.dx ?? 0), w[1] + (off?.dy ?? 0)] : null;
  }

  private beat(plan: ShowPlan, b: Beat): void {
    for (const [i, name] of (SOUND[b.kind] ?? []).entries()) {
      if (i === 0) play(name);
      else setTimeout(() => play(name), 70 * i);
    }
    const fx = this.opts.fx;
    if (!fx) return;
    const caster = this.opts.sprite(plan.cast.caster);
    const el = plan.el;
    const tall = caster?.tall ?? 40;
    const on = (a: At) => this.opts.world(a.u, a.v);
    const foeAt = (id: number) => {
      const s = this.opts.sprite(id);
      return s ? { x: s.x, y: s.y, tall: s.tall } : null;
    };
    const p = on(b.where);
    if (!p) return;
    switch (b.kind) {
      case 'sky':
        for (const a of b.all ?? [b.where]) {
          const q = on(a);
          if (q) fx.showBeat('sky', q[0], q[1], { el });
        }
        return;
      case 'cut':
      case 'blow':
      case 'shot':
      case 'snare':
      case 'stone':
      case 'smite':
      case 'taunt': {
        const to = b.foe !== undefined ? foeAt(b.foe) : null;
        if (to) fx.showBeat(b.kind, p[0], p[1], { tall, to, el, how: HOW[plan.kind] });
        if (b.kind === 'shot') play(HOW[plan.kind] === 'flame' ? 'fireWhoosh' : HOW[plan.kind] === 'bolt' ? 'thunder' : 'gun');
        return;
      }
      case 'dash':
      case 'hook': {
        const q = b.to && on(b.to);
        if (q) fx.showBeat(b.kind, p[0], p[1], { tall, to: { x: q[0], y: q[1], tall }, el });
        return;
      }
      case 'land':
        fx.showBeat('land', p[0], p[1], { tall: b.foe !== undefined ? this.opts.sprite(b.foe)?.tall : tall, el });
        return;
      default:
        fx.showBeat(b.kind, p[0], p[1], { tall, el });
    }
  }

  /** The showcase is over (or skipped, or the fight left): every fighter drawn as the sim says again. */
  end(): void {
    for (const id of this.staged) {
      const s = this.opts.sprite(id);
      if (s) s.stage = null;
    }
    this.staged.clear();
    this.plan = null;
  }
}
