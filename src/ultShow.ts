// The ultimate's showcase on the page (ULT-SHOW, docs/notes/ult-showcase-design.md; the plan and its timings are `ultShowRules.ts`). While the
// fight is held, it stages the real sprites over what the sim says (the caster at each hop, the foes standing until they are cut, the beasts
// running in) and plays each beat's effects and sounds on the moment's layer. When it ends the stages are dropped and every sprite is drawn
// as the sim says again: the caster stands where the cast left it, so nothing jumps.
//
// It never changes the battle: it only reads the plan and sets `UnitSprite.stage`.

import type { UnitSprite } from './render/unitView';
import type { Fx } from './render/fx';
import { depth } from './render/iso';
import { poseArt, type ShowArt } from './render/showArt';
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
  bless: ['heal'],
  transform: ['fireBoom'],
  appear: [],
  finish: [],
};

type Pt = { x: number; y: number; tall: number };
/** A prop for a beat: where (the beat's spot `at`, the far end or foe `to`), and the showcase's plan (for the Buccaneer's rolls). */
type Prop = (fx: Pick<Fx, 'showProp'>, at: Pt, to: Pt | null, plan: ShowPlan, b: Beat) => void;
const dieFace = (plan: ShowPlan, id: number): ShowArt => {
  // (a high roll (4 to 6) where the sim's cut landed heavy, a low one (1 to 3) where not; which of the three by the foe)
  const n = (plan.cast.heavy.includes(id) ? 4 : 1) + (id % 3);
  return `buccaneer-die-face-${n}` as ShowArt;
};
const angle = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);
/** The painted props (`showArt.ts`) each hero's beats play, over the pack's effects. */
const PROPS: Record<string, Partial<Record<Beat['kind'], Prop>>> = {
  buccaneer: {
    hook: (fx, at, to) => {
      if (!to) return;
      // (the grappling hook flies out to the foe on its rope)
      fx.showProp('buccaneer-grappling-hook', at.x, at.y - at.tall * 0.5, { h: 26, life: 280, vx: (to.x - at.x) / 280, vy: (to.y - at.y) / 280, rotation: angle(at, to) });
    },
    cut: (fx, _at, to, plan, b) => {
      if (!to || b.foe === undefined) return;
      // (the die rolls over the cut and lands on its face)
      fx.showProp('buccaneer-die-rolling', to.x, to.y - to.tall - 18, { h: 30, life: 360, spin: 0.03 });
      fx.showProp(dieFace(plan, b.foe), to.x, to.y - to.tall - 18, { h: 26, life: 800, delay: 360 });
    },
  },
  demonSwordsman: {
    hook: (fx, at, to) => {
      if (!to) return;
      fx.showProp('demon-swordsman-hellfire-chains', (at.x + to.x) / 2, (at.y + to.y) / 2 - at.tall * 0.4, { h: 30, life: 620, rotation: angle(at, to), add: true });
    },
  },
  dreadPirate: {
    gather: (fx, at) => {
      // (the ghost ship sails across the sky over the field)
      fx.showProp('dread-pirate-ghost-ship', at.x - 130, at.y - 150, { h: 80, life: 2700, vx: 0.1, alpha: 0.85 });
    },
  },
  siegeBot: {
    mark: (fx, at) => {
      fx.showProp('siege-bot-targeting-reticle', at.x, at.y - 6, { h: 44, life: 2400, spin: 0.004, add: true });
    },
  },
  wizard: {
    sky: (fx, at) => {
      fx.showProp('wizard-meteor', at.x + 70, at.y - 180, { h: 46, life: 900, vx: -0.05, vy: 0.12, add: true });
    },
  },
  gunslinger: {
    gather: (fx, at) => {
      // (the clock strikes noon over her as she waits to draw)
      fx.showProp('gunslinger-clock-noon', at.x, at.y - at.tall - 40, { h: 52, life: 1700 });
    },
  },
  timeWitch: {
    gather: (fx, at) => {
      fx.showProp('time-witch-ground-clock', at.x, at.y, { h: 46, life: 2700, spin: 0.0006, alpha: 0.9, add: true });
    },
  },
  werewolf: {
    gather: (fx, at) => {
      // (the full moon rises behind him as the change takes him)
      fx.showProp('werewolf-rising-moon', at.x, at.y - at.tall - 50, { h: 76, life: 1900, vy: -0.02, alpha: 0.9 });
    },
  },
  kitsune: {
    smite: (fx, _at, to) => {
      if (to) fx.showProp('kitsune-small-fox', to.x, to.y - 12, { h: 24, life: 1300, delay: 160 });
    },
  },
  priestess: {
    bless: (fx, _at, to) => {
      if (to) fx.showProp('priestess-holy-light', to.x, to.y - 34, { h: 72, life: 900, alpha: 0.9, add: true });
    },
  },
  satyr: {
    gather: (fx, at) => void fx.showProp('satyr-music-notes', at.x, at.y - at.tall - 10, { h: 40, life: 1200, vy: -0.03 }),
    bless: (fx, _at, to) => void (to && fx.showProp('satyr-music-notes', to.x, to.y - to.tall - 6, { h: 30, life: 900, vy: -0.04 })),
  },
  wolfBard: {
    gather: (fx, at) => void fx.showProp('satyr-music-notes', at.x, at.y - at.tall - 10, { h: 40, life: 1200, vy: -0.03 }),
    bless: (fx, _at, to) => void (to && fx.showProp('satyr-music-notes', to.x, to.y - to.tall - 6, { h: 30, life: 900, vy: -0.04 })),
  },
};

/** How a hero's shots are drawn: a bolt from the sky, a stream of flame, or a bullet (the rest). */
const HOW: Record<string, 'bolt' | 'flame' | 'bullet'> = { lightningMage: 'bolt', dragoon: 'flame' };

/** A prop's light: the dim lifts round it while it is up (world px, and the showcase's ms). */
interface Light {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  from: number;
  to: number;
}

export class UltShow {
  plan: ShowPlan | null = null;
  private lit: Light[] = [];
  private now = 0;
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
    this.now = t;
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
      const art = pose.pose ? poseArt(pose.pose, pose.p) : null;
      s.stage = { x, y: y - lift, z: depth(tile.u, tile.v) + 5 + (lift > 4 ? 40 : 0), alpha: pose.alpha, row: pose.row, p: pose.p, face, ...(art ? { art } : {}) };
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
    const prop = PROPS[plan.kind]?.[b.kind];
    if (prop) {
      // (each prop lifts the dim round itself while it is up)
      const lighter: Pick<Fx, 'showProp'> = {
        showProp: (art, x, y, o) => {
          const from = this.now + (o.delay ?? 0);
          this.lit.push({ x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, r: o.h * 0.9, from, to: from + o.life });
          return fx.showProp(art, x, y, o);
        },
      };
      const far = b.foe !== undefined ? foeAt(b.foe) : b.to ? on(b.to) : null;
      const to = far && !Array.isArray(far) ? far : far ? { x: far[0], y: far[1], tall } : null;
      for (const a of b.kind === 'sky' ? b.all ?? [b.where] : [b.where]) {
        const q = on(a);
        if (q) prop(lighter, { x: q[0], y: q[1], tall }, to, plan, b);
      }
    }
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
      case 'taunt':
      case 'bless': {
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

  /** The props' lights now: where each is (world px) and how far round it the dim lifts. */
  lights(): { x: number; y: number; r: number }[] {
    const t = this.now;
    return this.lit.filter((l) => t >= l.from && t <= l.to).map((l) => ({ x: l.x + l.vx * (t - l.from), y: l.y + l.vy * (t - l.from), r: l.r }));
  }

  /** The showcase is over (or skipped, or the fight left): every fighter drawn as the sim says again. */
  end(): void {
    this.lit = [];
    for (const id of this.staged) {
      const s = this.opts.sprite(id);
      if (s) s.stage = null;
    }
    this.staged.clear();
    this.plan = null;
  }
}
