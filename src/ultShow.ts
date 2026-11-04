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
};

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
      const w = this.opts.world(pose.at.u, pose.at.v);
      if (!s || !w) continue;
      let [x, y] = w;
      if (pose.from) {
        const k = pose.k ?? 1;
        x += pose.from.dx * (1 - k);
        y += pose.from.dy * (1 - k);
      }
      const look = pose.look && this.opts.world(pose.look.u, pose.look.v);
      const face: 1 | -1 = look && Math.abs(look[0] - x) > 1 ? (look[0] > x ? 1 : -1) : pose.from ? (pose.from.dx > 0 ? -1 : 1) : (s.stage?.face ?? 1);
      s.stage = { x, y, z: depth(pose.at.u, pose.at.v) + 5, alpha: pose.alpha, row: pose.row, p: pose.p, face };
      this.staged.add(id);
    }
  }

  private beat(plan: ShowPlan, b: Beat): void {
    for (const [i, name] of (SOUND[b.kind] ?? []).entries()) {
      if (i === 0) play(name);
      else setTimeout(() => play(name), 70 * i);
    }
    const fx = this.opts.fx;
    if (!fx) return;
    const caster = this.opts.sprite(plan.cast.caster);
    const tall = caster?.tall ?? 40;
    const on = (a: At) => this.opts.world(a.u, a.v);
    switch (b.kind) {
      case 'cut': {
        const from = on(b.from);
        const foe = this.opts.sprite(b.foe);
        const at = plan.cast.tiles.get(b.foe);
        const to = at && on(at);
        if (from && to) fx.showBeat('cut', from[0], from[1], { tall, to: { x: to[0], y: to[1], tall: foe?.tall ?? 40 } });
        return;
      }
      case 'sky':
        for (const a of b.where) {
          const p = on(a);
          if (p) fx.showBeat('sky', p[0], p[1]);
        }
        return;
      case 'land': {
        const p = on(b.where);
        if (p) fx.showBeat('land', p[0], p[1], { tall: this.opts.sprite(b.id)?.tall });
        return;
      }
      default: {
        const p = on(b.where);
        if (p) fx.showBeat(b.kind, p[0], p[1], { tall, el: plan.style === 'blinks' ? 'dark' : plan.style === 'sky' ? 'fire' : 'forest' });
      }
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
