// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { defOf, type Battle, type BattleEvent } from '../sim/battle';
import type { Shot } from '../sim/units';
import { loadImage } from './loadImage';
import { fadeTrauma, popScale, shakeOf, traumaFor } from './juiceRules';
import type { UnitSprite } from './unitView';
import impactUrl from '../art/fx/impact.png';
import fireUrl from '../art/fx/hit_fire.png';
import blastUrl from '../art/fx/blast.png';
import arrowUrl from '../art/fx/arrow.png';
import boneUrl from '../art/fx/bone_arrow.png';

interface Strip {
  frames: Texture[];
}

let impact: Strip;
let fire: Strip;
let blast: Strip;
let arrow: Texture;
let bone: Texture;

async function strip(url: string, size: number): Promise<Strip> {
  const base = Texture.from(await loadImage(url));
  const n = Math.floor(base.width / size);
  return { frames: Array.from({ length: n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * size, 0, size, size) })) };
}

export async function loadFx(): Promise<void> {
  [impact, fire, blast] = await Promise.all([strip(impactUrl, 48), strip(fireUrl, 32), strip(blastUrl, 64)]);
  arrow = Texture.from(await loadImage(arrowUrl));
  bone = Texture.from(await loadImage(boneUrl));
}

interface Item {
  /** Advance by `dt` ms; false when done. */
  step(dt: number): boolean;
  view: Container;
}

export class Fx {
  readonly root = new Container();
  private items: Item[] = [];
  private trauma = 0;
  shakeX = 0;
  shakeY = 0;

  constructor(private sprites: Map<number, UnitSprite>) {
    this.root.zIndex = 1e7;
  }

  clear(): void {
    for (const it of this.items) it.view.destroy();
    this.items = [];
    this.trauma = 0;
  }

  /** Show what a tick of the fight did. */
  show(b: Battle, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.kind === 'shot') this.shot(e.by, e.to, e.shot, e.ms);
      else if (e.kind === 'hit') {
        const to = this.sprites.get(e.to);
        const by = b.units.find((x) => x.id === e.by);
        const target = b.units.find((x) => x.id === e.to);
        if (!to || !by || !target) continue;
        const fiery = defOf(by).shot === 'fire';
        this.anim(fiery ? (e.splash ? fire : blast) : impact, to.x, to.y - to.tall * 0.45, fiery && !e.splash ? 0.8 : 0.9, 45);
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero');
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
      }
    }
  }

  /** Advance the effects by `dt` ms of the fight. */
  step(dt: number): void {
    this.items = this.items.filter((it) => {
      if (it.step(dt)) return true;
      it.view.destroy();
      return false;
    });
    this.trauma = fadeTrauma(this.trauma, dt / 1000);
    const s = shakeOf(this.trauma);
    this.shakeX = s ? (Math.random() * 2 - 1) * s : 0;
    this.shakeY = s ? (Math.random() * 2 - 1) * s : 0;
  }

  private anim(s: Strip, x: number, y: number, scale: number, frameMs: number): void {
    const sp = new Sprite(s.frames[0]);
    sp.anchor.set(0.5);
    sp.scale.set(scale);
    sp.position.set(x, y);
    sp.blendMode = 'add';
    this.root.addChild(sp);
    let t = 0;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const f = Math.floor(t / frameMs);
        if (f >= s.frames.length) return false;
        sp.texture = s.frames[f];
        return true;
      },
    });
  }

  private number(n: number, x: number, y: number, heavy: boolean, onHero: boolean): void {
    const txt = new Text({
      text: String(n),
      style: { fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontWeight: 'bold', fontSize: heavy ? 17 : 13, fill: onHero ? 0xff7a6a : heavy ? 0xffd34a : 0xffffff, stroke: { color: 0x1a1008, width: 3 } },
      resolution: 3,
    });
    txt.anchor.set(0.5, 1);
    txt.position.set(x + (Math.random() * 10 - 5), y);
    this.root.addChild(txt);
    let t = 0;
    const life = 800;
    this.items.push({
      view: txt,
      step: (dt) => {
        t += dt;
        txt.y -= dt * 0.03;
        txt.scale.set(popScale(t / 1000));
        txt.alpha = t > life * 0.6 ? 1 - (t - life * 0.6) / (life * 0.4) : 1;
        return t < life;
      },
    });
  }

  private shot(byId: number, toId: number, kind: Shot, ms: number): void {
    const by = this.sprites.get(byId);
    const to = this.sprites.get(toId);
    if (!by || !to) return;
    const sp = new Sprite(kind === 'arrow' ? arrow : kind === 'bone' ? bone : fire.frames[0]);
    sp.anchor.set(0.5);
    sp.scale.set(kind === 'fire' ? 0.9 : 0.55);
    if (kind === 'fire') sp.blendMode = 'add';
    this.root.addChild(sp);
    const x0 = by.x;
    const y0 = by.y - by.tall * 0.55;
    let t = 0;
    const place = (f: number) => {
      const x1 = to.x;
      const y1 = to.y - to.tall * 0.45;
      const arc = kind === 'fire' ? 8 : 18 + Math.hypot(x1 - x0, y1 - y0) * 0.15;
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - Math.sin(Math.PI * f) * arc] as const;
    };
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const f = Math.min(1, t / ms);
        const [x, y] = place(f);
        const [nx, ny] = place(Math.min(1, f + 0.05));
        sp.position.set(x, y);
        if (kind === 'fire') sp.texture = fire.frames[Math.floor(t / 60) % fire.frames.length];
        else sp.rotation = Math.atan2(ny - y, nx - x);
        return f < 1;
      },
    });
  }
}
