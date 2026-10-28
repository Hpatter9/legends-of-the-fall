// Plays a skill's signature (`signatures.ts`): each step is drawn in its shape through the pooled `Particles` (so it is capped,
// thinned by the battery saver, and costs no allocation beyond the pool). Nothing here reads or changes the battle: `fx.ts` hands
// over where the caster, the foes and the allies are drawn, and the steps fall where those are.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import propsUrl from '../art/fx/props.png';
import type { Burst, Particles } from './particles';
import { abilityFrames } from './abilityArt';
import { abilityHeading, shapeFamily } from './abilityLooks';
import { PACK } from './fxSheets';
import { VFX, type VfxKey } from './vfxArt';
import { bits } from './fxRules';
import { PROPS, type On, type Step } from './signatures';

/** A fighter's place on the screen (world pixels, the feet; `tall` is how tall it is drawn). */
export interface Pt {
  x: number;
  y: number;
  tall: number;
}

/** What a signature is played against. */
export interface Scene {
  p: Particles;
  /** The caster (or, for a hit, the struck). */
  self: Pt;
  /** Foes nearest first, and allies nearest first (a few of each). */
  foes: readonly Pt[];
  allies: readonly Pt[];
  /** A unit vector toward the nearest foe (or the way the caster faces when there is none). */
  dir: { x: number; y: number };
  /** The length of the cast in ms (what a `loop` or a dome lasts). */
  ms: number;
  /** How much bigger than the steps say to draw everything: an ultimate is the biggest. */
  size: number;
}

/** The two single sprites a step can name (given by `fx.ts` once loaded). */
const SPRITES: Record<string, Texture[]> = {};
export const setSignatureSprite = (name: string, t: Texture) => void (SPRITES[name] = [t]);

/** The prop sprites (a feather, a coin, a note...: `src/art/fx/props.png`, one 32 px frame each, made with PixelLab), cut once. */
export async function loadProps(): Promise<void> {
  const base = Texture.from(await loadImage(propsUrl));
  PROPS.forEach((name, i) => (SPRITES[name] = [new Texture({ source: base.source, frame: new Rectangle(i * 32, 0, 32, 32) })]));
}

/** The frames a step names: an atlas strip, a Vfx strip or a sprite (nothing when not loaded). */
export function framesOf(k: string): Texture[] | undefined {
  return (PACK as Record<string, Texture[] | undefined>)[k] ?? (VFX as Record<string, Texture[] | undefined>)[k as VfxKey] ?? SPRITES[k];
}

const jit = (n: number) => (Math.random() * 2 - 1) * n;

/** Whom a step is drawn on. */
function targets(st: Step, sc: Scene): readonly Pt[] {
  const on: On = st.on ?? 'self';
  return on === 'target' ? [sc.foes[0] ?? front(sc, 90)] : on === 'foes' ? (sc.foes.length ? sc.foes : [front(sc, 90)]) : on === 'allies' ? (sc.allies.length ? sc.allies : [sc.self]) : [sc.self];
}

/** A point `d` px along the line to the nearest foe. */
const front = (sc: Scene, d: number): Pt => ({ x: sc.self.x + sc.dir.x * d, y: sc.self.y + sc.dir.y * d, tall: sc.self.tall });

const body = (t: Pt) => t.y - t.tall * 0.5;

/** One run of a strip, with the step's size, tint, opacity and speed. */
function put(sc: Scene, st: Step, frames: Texture[], x: number, y: number, o: Partial<Burst> = {}): void {
  // (a prop is a solid sprite, drawn plainly and tumbling; the strips glow)
  const prop = !st.art && PROPS.includes(st.k);
  sc.p.spawn({ frames, art: st.art, x, y, scale: (st.z ?? 1) * sc.size, frameMs: st.f ?? 70, alpha: st.a ?? (prop ? 1 : 0.9), tint: st.t, add: !prop, prio: true, delay: st.d, ...(prop && !o.rotation ? { spin: jit(0.012) } : {}), ...o,
    ...(st.art && (st.s === 'cleave' || st.s === 'fan') ? { rotation: 0 } : {}),
  });
}

/** A delay for the `i`th of a run (the step's own wait added). */
const after = (st: Step, ms: number) => (st.d ?? 0) + ms;

/** How many to make: the step's count scaled by the density, at least one. */
const count = (st: Step, fallback: number, sc: Scene) => bits(st.n ?? fallback, sc.p.density);

type Draw = (st: Step, f: Texture[], sc: Scene) => void;

const SHAPES: Record<Step['s'], Draw> = {
  ring(st, f, sc) {
    for (const t of targets(st, sc)) put(sc, st, f, t.x, t.y - 2, st.loop ? { loop: true, life: sc.ms + 250, frameMs: st.f ?? 90 } : {});
  },
  ripple(st, f, sc) {
    const n = count(st, 3, sc);
    for (const t of targets(st, sc)) for (let i = 0; i < n; i++) put(sc, { ...st, z: (st.z ?? 2) * (0.55 + (0.45 * i) / Math.max(1, n - 1)), a: (st.a ?? 0.8) * (1 - i * 0.12) }, f, t.x, t.y - 2, { delay: after(st, i * 110) });
  },
  pillar(st, f, sc) {
    for (const t of targets(st, sc)) put(sc, st, f, t.x, t.y - t.tall * 0.55);
  },
  pillars(st, f, sc) {
    const n = count(st, 6, sc);
    const r = st.r ?? 60;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      put(sc, st, f, sc.self.x + Math.cos(a) * r, sc.self.y + Math.sin(a) * r * 0.5 - 14, { delay: after(st, i * 55) });
    }
  },
  drop(st, f, sc) {
    const land = st.l ? (st.art ? abilityFrames(st.art, 'hit') : framesOf(st.l)) : undefined;
    for (const [i, t] of targets(st, sc).slice(0, 6).entries()) {
      const delay = after(st, i * 70);
      put(sc, st, f, t.x, t.y - t.tall * 0.5 - 90, { loop: true, life: 240, vy: 0.375, delay });
      if (land) put(sc, { ...st, z: (st.z ?? 1) * 0.8 }, land, t.x, t.y - t.tall * 0.4, { delay: delay + 240, frameMs: 55 });
    }
  },
  rain(st, f, sc) {
    const land = st.l ? (st.art ? abilityFrames(st.art, 'hit') : framesOf(st.l)) : undefined;
    const n = count(st, 8, sc);
    const spots = st.on === 'allies' ? sc.allies : sc.foes;
    for (let i = 0; i < n; i++) {
      const c = spots.length ? spots[i % spots.length] : front(sc, 90);
      const x = c.x + jit(26);
      const y = c.y - c.tall * 0.3 + jit(10);
      const delay = after(st, i * 55);
      put(sc, st, f, x, y - 100, { loop: true, life: 260, vy: 0.38, delay });
      if (land) put(sc, { ...st, z: (st.z ?? 1) * 0.7 }, land, x, y, { delay: delay + 260, frameMs: 55 });
    }
  },
  meteor(st, f, sc) {
    const land = st.l ? (st.art ? abilityFrames(st.art, 'hit') : framesOf(st.l)) : undefined;
    const c = sc.foes[0] ?? front(sc, 90);
    const [dx, dy] = [90, -150];
    put(sc, st, f, c.x + dx, c.y + dy, { loop: true, life: 340, vx: -dx / 340, vy: -dy / 340, spin: st.art ? 0 : 0.01, rotation: st.art ? Math.atan2(-dy, -dx) - abilityHeading(st.art) : 0, delay: after(st, 0) });
    if (land) put(sc, { ...st, z: (st.z ?? 1) * 0.8 }, land, c.x, c.y - c.tall * 0.3, { delay: after(st, 340), frameMs: 60 });
  },
  beam(st, f, sc) {
    const n = count(st, 5, sc);
    const r = st.r ?? 140;
    const rot = Math.atan2(sc.dir.y, sc.dir.x);
    for (let i = 0; i < n; i++) {
      const d = ((i + 1) / n) * r;
      put(sc, st, f, sc.self.x + sc.dir.x * d, body(sc.self) + sc.dir.y * d, { rotation: rot, delay: after(st, i * 38) });
    }
  },
  orbit(st, f, sc) {
    const n = count(st, 8, sc);
    const r = st.r ?? 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      put(sc, st, f, sc.self.x + Math.cos(a) * r, body(sc.self) + Math.sin(a) * r * 0.45, { delay: after(st, i * 55), life: 460 });
    }
  },
  spiral(st, f, sc) {
    const n = count(st, 10, sc);
    const r = st.r ?? 22;
    for (const t of targets(st, sc).slice(0, 5)) {
      for (let i = 0; i < n; i++) {
        const a = i * 0.85;
        put(sc, st, f, t.x + Math.cos(a) * r, t.y - 2 - (i / n) * t.tall * 1.2 + Math.sin(a) * r * 0.35, { delay: after(st, i * 32), life: 520, vy: -0.02 });
      }
    }
  },
  spray(st, f, sc) {
    const n = count(st, 10, sc);
    const sp = (st.r ?? 80) / 600;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + jit(0.3);
      put(sc, st, f, sc.self.x, body(sc.self), { vx: Math.cos(a) * sp * (0.6 + Math.random() * 0.6), vy: Math.sin(a) * sp * 0.6 - 0.03, life: 620, delay: after(st, 0), spin: jit(0.01) });
    }
  },
  slashX(st, f, sc) {
    const c = sc.foes[0] ?? front(sc, 80);
    put(sc, st, f, c.x, body(c), { rotation: -0.7, delay: after(st, 0) });
    put(sc, st, f, c.x, body(c), { rotation: 0.7 + Math.PI, delay: after(st, 110) });
  },
  sweep(st, f, sc) {
    const n = count(st, 6, sc);
    const r = st.r ?? 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      put(sc, st, f, sc.self.x + Math.cos(a) * r, body(sc.self) + Math.sin(a) * r * 0.5, { rotation: a + Math.PI / 2, delay: after(st, i * 50) });
    }
  },
  cleave(st, f, sc) {
    const spots = st.on === 'target' ? [sc.foes[0] ?? front(sc, 90)] : sc.foes.length ? sc.foes : [front(sc, 90)];
    for (const [i, c] of spots.slice(0, 4).entries()) put(sc, st, f, c.x, c.y - c.tall * 0.6, { rotation: -Math.PI / 2 + 0.25, delay: after(st, i * 90), frameMs: 55 });
  },
  spikes(st, f, sc) {
    const n = count(st, 4, sc);
    const r = st.r ?? 100;
    for (let i = 0; i < n; i++) {
      const d = ((i + 1) / n) * r;
      put(sc, st, f, sc.self.x + sc.dir.x * d, sc.self.y + sc.dir.y * d - 14 * (st.z ?? 1), { delay: after(st, i * 70) });
    }
  },
  fan(st, f, sc) {
    const n = count(st, 5, sc);
    const arc = st.r ?? 2;
    const base = Math.atan2(sc.dir.y, sc.dir.x);
    // (a fan aimed at a foe is narrower than a full ring of rays)
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? base : base - arc / 2 + (arc * i) / (n - 1);
      const d = 22 + (st.z ?? 1) * 8;
      put(sc, st, f, sc.self.x + Math.cos(a) * d, body(sc.self) + Math.sin(a) * d * 0.6 - 4, { rotation: a + Math.PI / 2, delay: after(st, i * 40) });
    }
  },
  cone(st, f, sc) {
    const n = count(st, 6, sc);
    const r = st.r ?? 160;
    for (let i = 0; i < n; i++) {
      const g = (i + 1) / n;
      put(sc, { ...st, z: (st.z ?? 1) * (0.5 + g * 0.8) }, f, sc.self.x + sc.dir.x * r * g, body(sc.self) + sc.dir.y * r * g + jit(6), { delay: after(st, i * 55) });
    }
  },
  dome(st, f, sc) {
    for (const t of targets(st, sc).slice(0, 6)) put(sc, st, f, t.x, t.y - 2, { loop: true, life: Math.min(1400, sc.ms + 500), frameMs: st.f ?? 100 });
  },
  inward(st, f, sc) {
    const n = count(st, 8, sc);
    const r = st.r ?? 40;
    const life = 520;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      put(sc, st, f, sc.self.x + Math.cos(a) * r, body(sc.self) + Math.sin(a) * r * 0.5, { vx: (-Math.cos(a) * r) / life, vy: (-Math.sin(a) * r * 0.5) / life, life, delay: after(st, i * 40) });
    }
  },
  draw(st, f, sc) {
    const life = 560;
    const spots = sc.foes.slice(0, 6);
    const per = Math.max(1, Math.ceil(count(st, 5, sc) / Math.max(1, spots.length)));
    for (const c of spots) {
      for (let i = 0; i < per; i++) {
        const sx = c.x + jit(8);
        const sy = body(c) + jit(6);
        put(sc, st, f, sx, sy, { vx: (sc.self.x - sx) / life, vy: (body(sc.self) - sy) / life, life, delay: after(st, i * 80) });
      }
    }
  },
  chain(st, f, sc) {
    let [px, py] = [sc.self.x, body(sc.self)];
    for (const [i, c] of sc.foes.slice(0, 5).entries()) {
      const [qx, qy] = [c.x, body(c)];
      const len = Math.hypot(qx - px, qy - py);
      put(sc, { ...st, z: st.art ? st.z : Math.max(0.6, len / 26) * (st.z ?? 1) }, f, (px + qx) / 2, (py + qy) / 2, { rotation: Math.atan2(qy - py, qx - px) - Math.PI / 2, delay: after(st, i * 90), frameMs: 45,
        ...(st.art ? { stretchY: len / (32 * (st.z ?? 1) * sc.size) } : {}),
      });
      [px, py] = [qx, qy];
    }
  },
  dash(st, f, sc) {
    const n = count(st, 7, sc);
    const r = st.r ?? 110;
    for (let i = 0; i < n; i++) {
      const d = ((i + 1) / n) * r;
      put(sc, st, f, sc.self.x + sc.dir.x * d, sc.self.y + sc.dir.y * d - 8, { delay: after(st, i * 32), life: 420, vy: -0.015 });
    }
  },
  barrier(st, f, sc) {
    const n = count(st, 4, sc);
    const r = st.r ?? 30;
    for (const t of targets(st, sc).slice(0, 4)) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        put(sc, st, f, t.x + Math.cos(a) * r, body(t) + Math.sin(a) * r * 0.5, { loop: true, life: 900, delay: after(st, i * 40), frameMs: st.f ?? 100 });
      }
    }
  },
  flare(st, f, sc) {
    for (const t of targets(st, sc)) put(sc, st, f, t.x, body(t));
  },
  barrage(st, f, sc) {
    const n = count(st, 10, sc);
    const c = sc.foes[0] ?? front(sc, 80);
    const r = st.r ?? 20;
    for (let i = 0; i < n; i++) put(sc, st, f, c.x + jit(r), body(c) + jit(r * 0.8), { delay: after(st, i * 45) });
  },
  pop(st, f, sc) {
    for (const t of targets(st, sc)) put(sc, st, f, t.x, body(t));
  },
};

/** Play steps against a scene. A step whose strip is not loaded is skipped. */
export function playSteps(steps: readonly Step[], sc: Scene): void {
  for (const st of steps) {
    const f = st.art ? abilityFrames(st.art, shapeFamily(st.s)) : framesOf(st.k);
    if (f?.length) SHAPES[st.s](st, f, sc);
  }
}
