// The Calamity's battle zones brought to life (looks only; `sim/calZones.ts` lays the zones and stands their things on the tiles). Two
// parts: the things on the tiles (`zoneProps`: pillars, statues, braziers, coffins, crystals, chains, banners, bones, candles, runes and
// skull totems, each drawn inside its own tile's container so it sorts by depth with the land and the fighters), and the air over and
// under the field (`ZoneAir`: drifting fog, embers or dust by world, light shafts, dripping water, the glow and the passing shadow far
// down in a chasm, bats crossing now and then). Everything is made once when the board is built and only moved, re-framed or re-tinted
// each frame; the board view holds it still when the device asks for reduced motion and moves it at half rate on a battery saver, and a
// tall thing a fighter stands behind fades so the fighter is never hidden.
//
// The art is from the packs (credited in CREDITS.md): the gothic pilaster of the Last Stand's hall, the army road's braziers, statues,
// bones and rubble, the Undead Tileset's skull totem and crystal shards, the Cave Objects' crystal, gargoyle and summoning circle,
// DawnLike's coffins, candles and bats, the Underwater Objects' chain, the Medieval Field Work banner and the Pixel Effects' runes.

import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Board, Prop } from '../sim/board';
import type { RiftWorld } from '../sim/sanctuary';
import { project, type Frame } from './iso';
import { glow, piece } from './roadArt';
import { loadImage } from './loadImage';
import pilasterUrl from '../art/stand/pilaster.png';
import totemUrl from '../art/calzones/totem.png';
import decorUrl from '../art/calzones/decor.png';
import chainUrl from '../art/calzones/chain.png';
import bannerUrl from '../art/calzones/banner.png';
import batsUrl from '../art/calzones/bats.png';
import shardsUrl from '../art/calzones/shards.png';
import crystalUrl from '../art/calzones/crystal.png';
import gargoyleUrl from '../art/calzones/gargoyle.png';
import circleUrl from '../art/calzones/circle.png';
import runeCrystalUrl from '../art/calzones/rune-crystal.png';
import runeBloodUrl from '../art/calzones/rune-blood.png';
import runePoisonUrl from '../art/calzones/rune-poison.png';
import runeMoonUrl from '../art/calzones/rune-moon.png';

/** Each world's colours: its stone's tint, the light of its fires, its runes, its fog, its motes (and whether they rise as embers), its void. */
interface Look {
  stone: number;
  flame: number;
  rune: 'crystal' | 'blood' | 'poison' | 'moon';
  crystal: number;
  fog: number;
  mote: number[];
  embers: boolean;
  void: number;
  shaft: number;
}
const LOOKS: Record<RiftWorld, Look> = {
  ashen: { stone: 0xd8b8a8, flame: 0xff7a30, rune: 'blood', crystal: 0xff8a50, fog: 0x5a2a1a, mote: [0xff9a40, 0xffc060, 0xff6a20], embers: true, void: 0xff5a20, shaft: 0xffb070 },
  rootbound: { stone: 0xc8d8b8, flame: 0xffc070, rune: 'poison', crystal: 0x9affb0, fog: 0x6a8a6a, mote: [0xd8ff9a, 0xfff0a0], embers: false, void: 0x6aff9a, shaft: 0xfff0b0 },
  caravan: { stone: 0xf0d8b0, flame: 0xffb050, rune: 'crystal', crystal: 0xffd27a, fog: 0xa08a68, mote: [0xffe0a0, 0xe8c890], embers: false, void: 0xffb050, shaft: 0xffe0a0 },
  prism: { stone: 0xc8c0f0, flame: 0xc58aff, rune: 'crystal', crystal: 0xc58aff, fog: 0x5a4a8a, mote: [0xd8b0ff, 0x9ad8ff, 0xffffff], embers: false, void: 0xa060ff, shaft: 0xd8c0ff },
  hollow: { stone: 0xb8c8c8, flame: 0x8affc0, rune: 'poison', crystal: 0x8affc0, fog: 0x56666e, mote: [0xa0ffd0, 0xd0e8e0], embers: false, void: 0x50ffa0, shaft: 0xc8fff0 },
  frost: { stone: 0xd0e0ff, flame: 0x9ad8ff, rune: 'moon', crystal: 0xbfe8ff, fog: 0x9ab8d8, mote: [0xffffff, 0xd8f0ff], embers: false, void: 0x70c8ff, shaft: 0xe0f4ff },
};
export const lookOf = (b: Board): Look => LOOKS[b.riftWorld ?? 'prism'];

interface Art {
  pilaster: Texture;
  totem: Texture[];
  candles: Texture[][];
  coffin: Texture[];
  chain: Texture;
  banner: Texture;
  bats: Texture[];
  shards: Texture[];
  crystal: Texture;
  gargoyle: Texture;
  circle: Texture;
  runes: Record<Look['rune'], Texture[]>;
  soft: Texture;
  shaft: Texture;
  ring: Texture;
}
let art: Art | null = null;

const strip = (t: Texture, w: number, h: number, n: number, y = 0): Texture[] => Array.from({ length: n }, (_, k) => new Texture({ source: t.source, frame: new Rectangle(k * w, y, w, h) }));
const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): Texture => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!);
  return Texture.from(c);
};

export async function loadZoneArt(): Promise<void> {
  if (art) return;
  const urls = [pilasterUrl, totemUrl, decorUrl, chainUrl, bannerUrl, batsUrl, shardsUrl, crystalUrl, gargoyleUrl, circleUrl, runeCrystalUrl, runeBloodUrl, runePoisonUrl, runeMoonUrl];
  const [pilaster, totem, decor, chain, banner, bats, shards, crystal, gargoyle, circle, rc, rb, rp, rm] = (await Promise.all(urls.map(loadImage))).map((i) => Texture.from(i));
  // (the decor strip: two frames down, four cells across: a candelabra, a pair of candles, a coffin lying, a coffin standing)
  const cell = (k: number, f: number) => new Texture({ source: decor.source, frame: new Rectangle(k * 16, f * 16, 16, 16) });
  art = {
    pilaster,
    totem: strip(totem, 80, 112, 6),
    candles: [[cell(0, 0), cell(0, 1)], [cell(1, 0), cell(1, 1)]],
    coffin: [cell(2, 0), cell(3, 0)],
    chain,
    banner,
    bats: [new Texture({ source: bats.source, frame: new Rectangle(0, 0, 16, 16) }), new Texture({ source: bats.source, frame: new Rectangle(0, 16, 16, 16) })],
    shards: strip(shards, 32, 32, 2),
    crystal,
    gargoyle,
    circle,
    runes: { crystal: strip(rc, 32, 32, 8), blood: strip(rb, 32, 32, 8), poison: strip(rp, 32, 32, 8), moon: strip(rm, 32, 32, 8) },
    soft: canvasTex(128, 64, (g) => {
      const grad = g.createRadialGradient(64, 32, 0, 64, 32, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.setTransform(1, 0, 0, 0.5, 0, 16);
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }),
    shaft: canvasTex(32, 256, (g) => {
      const v = g.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0, 'rgba(255,255,255,0.9)');
      v.addColorStop(0.7, 'rgba(255,255,255,0.35)');
      v.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = v;
      g.fillRect(0, 0, 32, 256);
      // (soft at the sides)
      g.globalCompositeOperation = 'destination-in';
      const h = g.createLinearGradient(0, 0, 32, 0);
      h.addColorStop(0, 'rgba(0,0,0,0)');
      h.addColorStop(0.5, 'rgba(0,0,0,1)');
      h.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = h;
      g.fillRect(0, 0, 32, 256);
    }),
    ring: canvasTex(32, 16, (g) => {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(16, 8, 14, 6, 0, 0, Math.PI * 2);
      g.stroke();
    }),
  };
}
export const zoneArtReady = (): boolean => !!art;

/** What moves among a zone's things: frames that loop, glows that breathe, things that swing from their tops, and the tall things
 *  that fade when a fighter stands behind them. */
export interface ZoneMotion {
  loops: { sp: Sprite; frames: Texture[]; ph: number; ms: number }[];
  pulses: { sp: Sprite; ph: number; base: number; amp: number; rate: number }[];
  swings: { sp: Sprite; ph: number; amp: number }[];
  tall: { sps: Sprite[]; x: number; foot: number; top: number; half: number; a: number }[];
  /** Where the fires burn (embers rise from them), and where water drips (world px). */
  fires: [number, number][];
  drips: [number, number][];
}
export const noMotion = (): ZoneMotion => ({ loops: [], pulses: [], swings: [], tall: [], fires: [], drips: [] });

/** Stand a zone's things on their tiles. `tiles` are the board's tile containers in row order; `f` the frame it is laid in. */
export function zoneProps(b: Board, f: Frame, tiles: Container[], m: ZoneMotion): void {
  if (!art || !b.props?.length) return;
  const look = lookOf(b);
  const A = art;
  for (const p of b.props) {
    const tile = tiles[p.v * b.w + p.u];
    const t = b.tiles[p.v * b.w + p.u];
    if (!tile || !t) continue;
    const [x, y] = project(f, p.u, p.v, t.h);
    const ph = (p.u * 1.7 + p.v * 2.3) % (Math.PI * 2);
    const add = (tex: Texture, ax: number, ay: number, sx: number, sy = sx, dx = 0, dy = 0): Sprite => {
      const sp = new Sprite(tex);
      sp.anchor.set(ax, ay);
      sp.scale.set(sx, sy);
      sp.position.set(Math.round(x + dx), Math.round(y + dy));
      tile.addChild(sp);
      return sp;
    };
    const light = (dy: number, colour: number, scale = 1, base = 0.5) => {
      const g = add(glow(), 0.5, 0.5, scale, scale, 0, dy);
      g.tint = colour;
      g.blendMode = 'add';
      g.alpha = base;
      m.pulses.push({ sp: g, ph, base, amp: 0.12, rate: 7 });
      return g;
    };
    const tall = (sps: Sprite[], h: number, half: number) => m.tall.push({ sps, x, foot: y + 4, top: y - h, half, a: 1 });
    switch (p.kind as Prop['kind']) {
      case 'pillar': {
        const sp = add(A.pilaster, 0.5, 0.97, 0.92, 0.92, 0, 6);
        sp.tint = look.stone;
        tall([sp], 98, 16);
        break;
      }
      case 'brokenPillar': {
        const name = (t.deco % 2 ? 'ruin1' : 'pillar1');
        const tex = piece(name);
        if (tex) add(tex, 0.5, 0.86, name === 'ruin1' ? 1 : 0.9, undefined, 0, 4).tint = look.stone;
        break;
      }
      case 'statue': {
        const sp = t.deco % 2 ? add(A.gargoyle, 0.5, 0.9, 0.95, 0.95, 0, 4) : add(piece('statue') ?? A.gargoyle, 0.5, 0.88, 1.35, 1.35, 0, 4);
        sp.tint = look.stone;
        tall([sp], 60, 20);
        break;
      }
      case 'brazier': {
        const name = b.riftWorld === 'ashen' ? 'brazierRed' : b.riftWorld === 'hollow' ? 'skullTorch' : 'brazier';
        const tex = piece(name);
        if (!tex) break;
        const s = name === 'brazierRed' ? 0.55 : name === 'skullTorch' ? 0.5 : 0.72;
        const sp = add(tex, 0.5, 0.9, s, s, 0, 4);
        const flame = -tex.height * s * 0.78;
        light(flame + 4, look.flame, 1.6, 0.6);
        m.fires.push([x, y + flame + 4]);
        tall([sp], tex.height * s, 16);
        break;
      }
      case 'coffin':
        add(A.coffin[t.deco % 3 === 0 ? 1 : 0], 0.5, 0.9, 2.3, 2.3, 0, 6).tint = look.stone;
        break;
      case 'crystal': {
        const sp = add(A.crystal, 0.5, 0.86, 1.05, 1.05, 0, 4);
        sp.tint = look.crystal;
        const g = light(-22, look.crystal, 1.4, 0.35);
        m.pulses[m.pulses.length - 1] = { sp: g, ph, base: 0.32, amp: 0.18, rate: 1.6 };
        // (a shimmer: the cluster itself brightens and dims a little)
        m.pulses.push({ sp, ph: ph + 1, base: 0.92, amp: 0.08, rate: 2.3 });
        tall([sp], 46, 22);
        break;
      }
      case 'shards': {
        const sp = add(A.shards[t.deco % 2], 0.5, 0.8, 0.75, 0.75, (t.deco >> 3) % 2 ? 12 : -12, 2);
        sp.tint = look.crystal;
        m.pulses.push({ sp, ph, base: 0.85, amp: 0.15, rate: 2.9 });
        break;
      }
      case 'chain': {
        // (hanging from the top of the pillar on the same tile, swinging a little)
        const sp = add(A.chain, 0.5, 0, 0.2, 0.2, 9, -96);
        sp.tint = 0xb0a8a0;
        m.swings.push({ sp, ph, amp: 0.05 });
        const pillar = m.tall.find((q) => q.x === x && q.foot === y + 4);
        pillar?.sps.push(sp);
        break;
      }
      case 'banner': {
        const sp = add(A.banner, 0.5, 0, 0.26, 0.3, -9, -84);
        sp.tint = b.riftWorld === 'frost' ? 0xa8c8ff : b.riftWorld === 'hollow' ? 0x9ab8a8 : b.riftWorld === 'rootbound' ? 0xc8e090 : 0xffffff;
        m.swings.push({ sp, ph: ph + 2, amp: 0.035 });
        const pillar = m.tall.find((q) => q.x === x && q.foot === y + 4);
        pillar?.sps.push(sp);
        break;
      }
      case 'rubble': {
        const name = t.deco % 2 ? 'rubble' : 'darkRocks';
        const tex = piece(name);
        if (tex) add(tex, 0.5, 0.8, name === 'rubble' ? 0.5 : 0.42, undefined, (t.deco >> 2) % 2 ? 10 : -10, 2).tint = look.stone;
        break;
      }
      case 'bones': {
        const name = ['bones2', 'bones1', 'bones3'][t.deco % 3];
        const tex = piece(name);
        if (tex) add(tex, 0.5, 0.8, name === 'bones1' ? 1 : 0.5, undefined, (t.deco >> 2) % 2 ? 12 : -12, 3);
        break;
      }
      case 'skeleton': {
        const tex = piece('skeleton');
        if (tex) add(tex, 0.5, 0.75, 0.4, 0.4, 0, 3);
        break;
      }
      case 'candles': {
        const frames = A.candles[t.deco % 2];
        const sp = add(frames[0], 0.5, 0.9, 1.6, 1.6, (t.deco >> 2) % 2 ? 14 : -14, 2);
        m.loops.push({ sp, frames, ph: t.deco % 2, ms: 240 + (t.deco % 4) * 40 });
        const g = add(glow(), 0.5, 0.5, 0.8, 0.8, sp.x - x, -22);
        g.tint = 0xffc070;
        g.blendMode = 'add';
        g.alpha = 0.45;
        m.pulses.push({ sp: g, ph, base: 0.45, amp: 0.12, rate: 9 });
        break;
      }
      case 'rune': {
        const frames = A.runes[look.rune];
        const sp = add(frames[0], 0.5, 0.5, 1.5, 0.75, 0, 0);
        sp.blendMode = 'add';
        m.loops.push({ sp, frames, ph: (p.u + p.v) % frames.length, ms: 150 });
        m.pulses.push({ sp, ph, base: 0.7, amp: 0.3, rate: 1.4 });
        // (the middle of a ring of runes: the summoning circle laid on the floor)
        if (b.props.filter((q) => q.kind === 'rune' && Math.abs(q.u - p.u) <= 1 && Math.abs(q.v - p.v) <= 1).length >= 9) {
          const c = add(A.circle, 0.5, 0.5, 0.62, 0.31, 0, -1);
          c.alpha = 0.9;
          m.pulses.push({ sp: c, ph, base: 0.85, amp: 0.15, rate: 1.1 });
        }
        break;
      }
      case 'totem': {
        const sp = add(A.totem[0], 0.5, 0.94, 0.62, 0.62, 0, 4);
        m.loops.push({ sp, frames: A.totem, ph: t.deco % 6, ms: 150 });
        light(-58, 0x6affa0, 1.4, 0.5);
        tall([sp], 68, 22);
        break;
      }
      case 'drip':
        m.drips.push([x, y]);
        break;
    }
  }
}

/** A tall thing fades (to `FADED`) while a fighter stands behind it, and comes back when it has gone. */
const FADED = 0.38;
export function fadeTall(m: ZoneMotion, who: readonly { x: number; y: number; tall: number }[], dt: number): void {
  const k = Math.min(1, dt / 120);
  for (const q of m.tall) {
    const hid = who.some((s) => s.y < q.foot && s.y > q.top + 6 && Math.abs(s.x - q.x) < q.half + 12);
    q.a += ((hid ? FADED : 1) - q.a) * k;
    for (const sp of q.sps) sp.alpha = q.a;
  }
}

interface Mote {
  sp: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

/** The air of a zone: fog, motes, light shafts, drips, the glow and shadow down in its chasms, bats. In world px; `over` goes above the
 *  fighters (under the effects), `under` beneath the board's tiles. */
export class ZoneAir {
  readonly over = new Container();
  readonly under = new Container();
  private look: Look;
  private box: { x0: number; x1: number; y0: number; y1: number };
  private fog: { sp: Sprite; vx: number }[] = [];
  private shafts: { sp: Sprite; ph: number; base: number }[] = [];
  private motes: Mote[] = [];
  private embers: Mote[] = [];
  private glows: { sp: Sprite; ph: number }[] = [];
  private drips: { x: number; y: number; drop: Sprite; ring: Sprite; t: number; wait: number }[] = [];
  private bats: { sp: Sprite; x: number; y: number; vx: number; ph: number }[] = [];
  private shadow: { sp: Sprite; x: number; vx: number } | null = null;
  private batWait = 6000;
  private shadowWait = 4000;
  private fires: [number, number][];
  private emberWait = 0;
  private seed: number;
  private t = 0;

  constructor(b: Board, f: Frame, m: ZoneMotion, saver: boolean) {
    this.over.eventMode = this.under.eventMode = 'none';
    this.over.zIndex = 8e6;
    this.under.zIndex = -50;
    this.look = lookOf(b);
    this.seed = (b.seed >>> 0) || 1;
    this.fires = m.fires;
    const A = art!;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const u of [0, b.w - 1]) for (const v of [0, b.d - 1]) {
      const [x, y] = project(f, u, v, 0);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    this.box = { x0, x1, y0: y0 - 60, y1 };
    const W = x1 - x0;
    // the light shafts: slanting down from above, breathing slowly
    for (let i = 0; i < (saver ? 1 : 2); i++) {
      const sp = new Sprite(A.shaft);
      sp.anchor.set(0.5, 0);
      sp.blendMode = 'add';
      sp.tint = this.look.shaft;
      sp.rotation = -0.42;
      sp.scale.set(2.2 + this.rand() * 1.2, 2.4);
      sp.position.set(x0 + W * (0.3 + i * 0.35 + this.rand() * 0.1), this.box.y0 - 90);
      this.over.addChild(sp);
      this.shafts.push({ sp, ph: this.rand() * 6, base: 0.12 + this.rand() * 0.04 });
    }
    // the fog: a few soft banks drifting across, low over the floor
    for (let i = 0; i < (saver ? 2 : 3); i++) {
      const sp = new Sprite(A.soft);
      sp.anchor.set(0.5);
      sp.tint = this.look.fog;
      sp.alpha = 0.2;
      sp.width = W * (0.5 + this.rand() * 0.3);
      sp.height = sp.width * 0.3;
      sp.position.set(x0 + this.rand() * W, this.box.y0 + 80 + (i + this.rand() * 0.5) * ((y1 - y0) / 3));
      this.over.addChild(sp);
      this.fog.push({ sp, vx: (i % 2 ? -1 : 1) * (6 + this.rand() * 6) });
    }
    // the motes: embers rising in the Ashen Keep, dust or spores drifting elsewhere
    for (let i = 0; i < (saver ? 12 : 26); i++) this.motes.push(this.mote(true));
    for (let i = 0; i < (saver ? 6 : 14); i++) {
      const e = this.mote(false);
      e.life = 0;
      this.embers.push(e);
    }
    // the chasms: a glow far down, and (now and then) something passing under the board
    const chasms = b.tiles.map((t, i) => (t.chasm ? i : -1)).filter((i) => i >= 0);
    chasms.forEach((i, n) => {
      if (n % 2) return;
      const [x, y] = project(f, i % b.w, Math.floor(i / b.w), 0);
      const sp = new Sprite(glow());
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.tint = this.look.void;
      sp.scale.set(2.6, 1.6);
      sp.alpha = 0.35;
      sp.position.set(x, y + 34);
      this.under.addChild(sp);
      this.glows.push({ sp, ph: n * 0.7 });
    });
    if (chasms.length && !saver) {
      const sp = new Sprite(A.soft);
      sp.anchor.set(0.5);
      sp.tint = 0x000000;
      sp.alpha = 0;
      sp.width = W * 0.5;
      sp.height = W * 0.14;
      this.under.addChild(sp);
      this.shadow = { sp, x: x0 - W, vx: 0 };
    }
    // the drips: a drop falls from the dark above, and a ring spreads where it lands
    for (const [x, y] of m.drips) {
      const drop = new Sprite(Texture.WHITE);
      drop.tint = 0xcfe8ff;
      drop.width = 2;
      drop.height = 5;
      drop.alpha = 0;
      const ring = new Sprite(A.ring);
      ring.anchor.set(0.5);
      ring.tint = 0xcfe8ff;
      ring.alpha = 0;
      ring.position.set(x, y);
      this.over.addChild(drop, ring);
      this.drips.push({ x, y, drop, ring, t: -1, wait: 400 + this.rand() * 2400 });
    }
    if (!saver) this.batWait = 3000 + this.rand() * 5000;
    else this.batWait = Infinity;
    // (everything in its first place, so a still page, reduced motion, shows the air as it stands)
    this.step(0);
  }

  private rand(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private mote(spread: boolean): Mote {
    const sp = new Sprite(Texture.WHITE);
    sp.anchor.set(0.5);
    const size = 1 + Math.floor(this.rand() * 2);
    sp.width = sp.height = size;
    sp.tint = this.look.mote[Math.floor(this.rand() * this.look.mote.length)];
    sp.blendMode = 'add';
    this.over.addChild(sp);
    const m: Mote = { sp, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1 };
    this.respawn(m, spread);
    return m;
  }

  private respawn(m: Mote, spread: boolean): void {
    const { x0, x1, y0, y1 } = this.box;
    m.x = x0 + this.rand() * (x1 - x0);
    m.y = y0 + 40 + this.rand() * (y1 - y0);
    m.vx = (this.rand() - 0.5) * 8;
    m.vy = this.look.embers ? -(10 + this.rand() * 14) : -(1 + this.rand() * 4);
    m.life = 3000 + this.rand() * 4000;
    m.age = spread ? this.rand() * m.life : 0;
  }

  step(dt: number): void {
    this.t += dt;
    const s = dt / 1000;
    const t = this.t / 1000;
    for (const q of this.shafts) q.sp.alpha = q.base + Math.sin(t * 0.5 + q.ph) * 0.045;
    const { x0, x1 } = this.box;
    for (const q of this.fog) {
      q.sp.x += q.vx * s;
      const half = q.sp.width / 2;
      if (q.sp.x > x1 + half) q.sp.x = x0 - half;
      else if (q.sp.x < x0 - half) q.sp.x = x1 + half;
    }
    for (const m of this.motes) {
      m.age += dt;
      if (m.age > m.life) this.respawn(m, false);
      m.x += (m.vx + Math.sin(t * 1.3 + m.life) * 4) * s;
      m.y += m.vy * s;
      const k = m.age / m.life;
      m.sp.alpha = Math.min(1, Math.min(k, 1 - k) * 5) * 0.85;
      m.sp.position.set(Math.round(m.x), Math.round(m.y));
    }
    // (embers from the braziers' flames, a few a second)
    this.emberWait -= dt;
    if (this.fires.length && this.emberWait <= 0) {
      this.emberWait = 260 + this.rand() * 260;
      const e = this.embers.find((x) => x.age >= x.life);
      if (e) {
        const [fx, fy] = this.fires[Math.floor(this.rand() * this.fires.length)];
        e.x = fx + (this.rand() - 0.5) * 8;
        e.y = fy;
        e.vx = (this.rand() - 0.5) * 10;
        e.vy = -(18 + this.rand() * 16);
        e.age = 0;
        e.life = 900 + this.rand() * 700;
        e.sp.tint = this.look.flame;
      }
    }
    for (const e of this.embers) {
      if (e.age >= e.life) {
        e.sp.alpha = 0;
        continue;
      }
      e.age += dt;
      e.x += (e.vx + Math.sin(t * 5 + e.life) * 6) * s;
      e.y += e.vy * s;
      e.sp.alpha = Math.max(0, 1 - e.age / e.life);
      e.sp.position.set(Math.round(e.x), Math.round(e.y));
    }
    for (const g of this.glows) g.sp.alpha = 0.3 + Math.sin(t * 0.9 + g.ph) * 0.1;
    // something vast passes far down in the void, now and then
    if (this.shadow) {
      const sh = this.shadow;
      if (sh.vx === 0) {
        this.shadowWait -= dt;
        if (this.shadowWait <= 0) {
          const dir = this.rand() < 0.5 ? 1 : -1;
          sh.vx = dir * (30 + this.rand() * 20);
          sh.x = dir > 0 ? x0 - sh.sp.width : x1 + sh.sp.width;
          sh.sp.y = this.box.y0 + 80 + this.rand() * (this.box.y1 - this.box.y0 - 60);
        }
      } else {
        sh.x += sh.vx * s;
        sh.sp.x = sh.x;
        sh.sp.alpha = 0.55;
        if ((sh.vx > 0 && sh.x > x1 + sh.sp.width) || (sh.vx < 0 && sh.x < x0 - sh.sp.width)) {
          sh.vx = 0;
          sh.sp.alpha = 0;
          this.shadowWait = 12000 + this.rand() * 10000;
        }
      }
    }
    for (const d of this.drips) {
      if (d.t < 0) {
        d.wait -= dt;
        if (d.wait <= 0) d.t = 0;
        continue;
      }
      d.t += dt;
      const fall = 420;
      if (d.t < fall) {
        const k = d.t / fall;
        d.drop.alpha = 0.85;
        d.drop.position.set(d.x - 1, d.y - 120 * (1 - k * k) - 5);
      } else {
        d.drop.alpha = 0;
        const k = (d.t - fall) / 500;
        d.ring.alpha = Math.max(0, 0.8 * (1 - k));
        d.ring.scale.set(0.4 + k * 0.9);
        if (k >= 1) {
          d.t = -1;
          d.ring.alpha = 0;
          d.wait = 1200 + this.rand() * 2600;
        }
      }
    }
    // bats crossing over the field now and then, flapping
    this.batWait -= dt;
    if (this.batWait <= 0 && art) {
      this.batWait = 9000 + this.rand() * 9000;
      const dir = this.rand() < 0.5 ? 1 : -1;
      const y = this.box.y0 - 20 + this.rand() * 120;
      for (let i = 0, n = 2 + Math.floor(this.rand() * 3); i < n; i++) {
        const sp = new Sprite(art.bats[0]);
        sp.anchor.set(0.5);
        sp.scale.set(dir * 1.4, 1.4);
        this.over.addChild(sp);
        this.bats.push({ sp, x: (dir > 0 ? x0 - 40 : x1 + 40) - dir * i * (22 + this.rand() * 20), y: y + (this.rand() - 0.5) * 40, vx: dir * (90 + this.rand() * 30), ph: this.rand() * 6 });
      }
    }
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      b.x += b.vx * s;
      b.sp.position.set(Math.round(b.x), Math.round(b.y + Math.sin(t * 6 + b.ph) * 5));
      b.sp.texture = art!.bats[Math.floor(t * 8 + b.ph) % 2];
      if ((b.vx > 0 && b.x > x1 + 80) || (b.vx < 0 && b.x < x0 - 80)) {
        b.sp.destroy();
        this.bats.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.over.destroy({ children: true });
    this.under.destroy({ children: true });
  }
}
