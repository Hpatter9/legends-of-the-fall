// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { tileAt } from '../sim/board';
import { defOf, type Battle, type BattleEvent } from '../sim/battle';
import { kitOf } from '../sim/abilities';
import type { Shot } from '../sim/units';
import { settings } from '../settings';
import { loadImage } from './loadImage';
import { at, TH, TW } from './iso';
import { fadeTrauma, popScale, shakeOf, traumaFor } from './juiceRules';
import { BIG_FOE_HP, SKILL_FX, SPELL_FX, type Effect, type MagicKey } from './skillFx';
import type { UnitSprite } from './unitView';
import impactUrl from '../art/fx/impact.png';
import fireUrl from '../art/fx/hit_fire.png';
import blastUrl from '../art/fx/blast.png';
import arrowUrl from '../art/fx/arrow.png';
import boneUrl from '../art/fx/bone_arrow.png';
import bloodExplosionUrl from '../art/fx/magic/blood_explosion.png';
import darkCircleUrl from '../art/fx/magic/dark_circle.png';
import darkSlashUrl from '../art/fx/magic/dark_slash.png';
import earthBurstUrl from '../art/fx/magic/earth_burst.png';
import earthExplosionUrl from '../art/fx/magic/earth_explosion.png';
import earthShieldUrl from '../art/fx/magic/earth_shield.png';
import earthWaveUrl from '../art/fx/magic/earth_wave.png';
import fireCircleUrl from '../art/fx/magic/fire_circle.png';
import fireExplosionUrl from '../art/fx/magic/fire_explosion.png';
import goldBurstUrl from '../art/fx/magic/gold_burst.png';
import iceShieldUrl from '../art/fx/magic/ice_shield.png';
import lightCircleUrl from '../art/fx/magic/light_circle.png';
import lightGatherUrl from '../art/fx/magic/light_gather.png';
import lightNovaUrl from '../art/fx/magic/light_nova.png';
import lightningBurstUrl from '../art/fx/magic/lightning_burst.png';
import lightningStrikeUrl from '../art/fx/magic/lightning_strike.png';
import moonSlashUrl from '../art/fx/magic/moon_slash.png';
import pinkHeartUrl from '../art/fx/magic/pink_heart.png';
import whiteBurstUrl from '../art/fx/magic/white_burst.png';
import windBurstUrl from '../art/fx/magic/wind_burst.png';
import windVortexUrl from '../art/fx/magic/wind_vortex.png';
import windWaveUrl from '../art/fx/magic/wind_wave.png';

/** The Pixel Effects sheets (32px frames), by the keys `skillFx.ts` uses. */
const MAGIC: Record<MagicKey, string> = {
  bloodExplosion: bloodExplosionUrl,
  darkCircle: darkCircleUrl,
  darkSlash: darkSlashUrl,
  earthBurst: earthBurstUrl,
  earthExplosion: earthExplosionUrl,
  earthShield: earthShieldUrl,
  earthWave: earthWaveUrl,
  fireCircle: fireCircleUrl,
  fireExplosion: fireExplosionUrl,
  goldBurst: goldBurstUrl,
  iceShield: iceShieldUrl,
  lightCircle: lightCircleUrl,
  lightGather: lightGatherUrl,
  lightNova: lightNovaUrl,
  lightningBurst: lightningBurstUrl,
  lightningStrike: lightningStrikeUrl,
  moonSlash: moonSlashUrl,
  pinkHeart: pinkHeartUrl,
  whiteBurst: whiteBurstUrl,
  windBurst: windBurstUrl,
  windVortex: windVortexUrl,
  windWave: windWaveUrl,
};

interface Strip {
  frames: Texture[];
}

let impact: Strip;
let fire: Strip;
let blast: Strip;
let arrow: Texture;
let bone: Texture;
let magic: Record<MagicKey, Strip>;

async function strip(url: string, size: number): Promise<Strip> {
  const base = Texture.from(await loadImage(url));
  const n = Math.floor(base.width / size);
  return { frames: Array.from({ length: n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * size, 0, size, size) })) };
}

export async function loadFx(): Promise<void> {
  [impact, fire, blast] = await Promise.all([strip(impactUrl, 48), strip(fireUrl, 32), strip(blastUrl, 64)]);
  arrow = Texture.from(await loadImage(arrowUrl));
  bone = Texture.from(await loadImage(boneUrl));
  const keys = Object.keys(MAGIC) as MagicKey[];
  const strips = await Promise.all(keys.map((k) => strip(MAGIC[k], 32)));
  magic = Object.fromEntries(keys.map((k, i) => [k, strips[i]])) as Record<MagicKey, Strip>;
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
  /** A white flash over the whole screen (on the stage, above the board), for a crit or a big kill. */
  readonly flashLayer = new Graphics();
  private flashLeft = 0;
  private flashMs = 1;
  private flashPeak = 0;

  constructor(private sprites: Map<number, UnitSprite>) {
    this.root.zIndex = 1e7;
    this.flashLayer.visible = false;
  }

  clear(): void {
    for (const it of this.items) it.view.destroy({ children: true });
    this.items = [];
    this.trauma = 0;
    this.flashLeft = 0;
  }

  /** The flash covers a screen of this size (set when the page lays out). */
  fitScreen(w: number, h: number): void {
    this.flashLayer.clear().rect(0, 0, w, h).fill(0xffffff);
  }

  /** A white flash that fades over `ms` (not when screen shake is off in the settings). */
  private flash(peak: number, ms: number): void {
    if (!settings().shake) return;
    this.flashPeak = Math.max(peak, this.flashLeft > 0 ? this.flashPeak : 0);
    this.flashMs = ms;
    this.flashLeft = ms;
  }

  /** Show what a tick of the fight did. */
  show(b: Battle, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.kind === 'shot') this.shot(e.by, e.to, e.shot, e.ms);
      else if (e.kind === 'skill') this.skillName(e.by, e.name);
      else if (e.kind === 'dodge') {
        const to = this.sprites.get(e.to);
        if (to) this.label('Miss', to.x, to.y - to.tall - 10, 0xcfe8ff, 12);
      } else if (e.kind === 'dash' || e.kind === 'blink') this.streak(b, e);
      else if (e.kind === 'area') this.area(b, e);
      else if (e.kind === 'spell') this.spell(b, e);
      else if (e.kind === 'heal') {
        const to = this.sprites.get(e.to);
        if (to && e.amount > 0) this.label(`+${e.amount}`, to.x, to.y - to.tall - 10, 0x7dff8a, 13);
      } else if (e.kind === 'arc') this.arc(e.from, e.to);
      else if (e.kind === 'zone') this.zone(b, e.u, e.v, e.ms);
      else if (e.kind === 'hit') {
        const to = this.sprites.get(e.to);
        const by = b.units.find((x) => x.id === e.by);
        const target = b.units.find((x) => x.id === e.to);
        if (!to || !target) continue;
        // (no `by` is the king's meteor)
        if (!by) {
          this.anim(magic.fireExplosion, to.x, to.y - to.tall * 0.45, 1.6, 70);
          this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, false);
          continue;
        }
        if (e.src === 'dot') {
          const burn = target.dot?.kind !== 'bleed';
          this.anim(burn ? fire : impact, to.x, to.y - to.tall * 0.45, burn ? 0.7 : 0.6, 60);
          this.number(e.dmg, to.x, to.y - to.tall - 10, false, target.side === 'hero');
          continue;
        }
        // (a skill's blow has its own sheet; a crit or a big kill adds a burst, a white flash and a harder shake)
        const skillFx = e.src === 'skill' ? SKILL_FX[kitOf(by)?.skill.name ?? '']?.hit : undefined;
        if (skillFx) this.effect(skillFx, to.x, to.y - to.tall * 0.45);
        else {
          const fiery = defOf(by).shot === 'fire' || defOf(by).shot === 'bolt';
          this.anim(fiery ? (e.splash ? fire : blast) : impact, to.x, to.y - to.tall * 0.45, fiery && !e.splash ? 0.8 : 0.9, 45);
        }
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero');
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
        if (e.heavy && e.src === 'blow') {
          // (a crit, or a blow from height: a gold burst and a flash)
          this.anim(magic.goldBurst, to.x, to.y - to.tall * 0.45, 1.3, 60);
          this.flash(0.35, 180);
          this.trauma = Math.min(1, this.trauma + 0.25);
        }
        if (e.killed && target.side === 'foe' && target.maxHp >= BIG_FOE_HP) {
          this.anim(magic.bloodExplosion, to.x, to.y - to.tall * 0.45, 2.2, 60);
          this.flash(0.5, 260);
          this.trauma = Math.min(1, this.trauma + 0.4);
        }
      }
    }
  }

  /** Shake at least this hard for now (a boss walking in); it fades as usual once the rumble stops. */
  rumble(level: number): void {
    this.trauma = Math.max(this.trauma, level);
  }

  /** Advance the effects by `dt` ms of the fight. */
  step(dt: number): void {
    // (an item may add more while it steps, so they go to a fresh list)
    const was = this.items;
    this.items = [];
    for (const it of was) {
      if (it.step(dt)) this.items.push(it);
      else it.view.destroy({ children: true });
    }
    this.trauma = fadeTrauma(this.trauma, dt / 1000);
    const s = settings().shake ? shakeOf(this.trauma) : 0;
    this.shakeX = s ? (Math.random() * 2 - 1) * s : 0;
    this.shakeY = s ? (Math.random() * 2 - 1) * s : 0;
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.flashLayer.visible = this.flashLeft > 0;
    this.flashLayer.alpha = (this.flashPeak * this.flashLeft) / this.flashMs;
  }

  private anim(s: Strip, x: number, y: number, scale: number, frameMs: number): Sprite {
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
    return sp;
  }

  /** One of the Pixel Effects sheets, played on a point (its own scale, speed and tint). */
  private effect(e: Effect, x: number, y: number): Sprite {
    const sp = this.anim(magic[e.sheet], x, y, e.scale, e.frameMs ?? 70);
    if (e.tint !== undefined) sp.tint = e.tint;
    return sp;
  }

  /** A line of text that rises and fades. */
  private label(text: string, x: number, y: number, fill: number, size: number, life = 900): void {
    const txt = new Text({ text, style: { fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontWeight: 'bold', fontSize: size, fill, stroke: { color: 0x1a1008, width: 3 } }, resolution: 3 });
    txt.anchor.set(0.5, 1);
    txt.position.set(x, y);
    this.root.addChild(txt);
    let t = 0;
    this.items.push({
      view: txt,
      step: (dt) => {
        t += dt;
        txt.y -= dt * 0.02;
        txt.alpha = t > life * 0.6 ? 1 - (t - life * 0.6) / (life * 0.4) : 1;
        return t < life;
      },
    });
  }

  /** A skill goes off: its name over the caster, and its own effect at the caster's feet (sparks if it has none). */
  private skillName(byId: number, name: string): void {
    const by = this.sprites.get(byId);
    if (!by) return;
    this.label(name, by.x, by.y - by.tall - 20, 0xffe27a, 13, 1200);
    const cast = SKILL_FX[name]?.cast;
    if (cast) this.effect(cast, by.x, by.y - 4);
    else this.anim(impact, by.x, by.y - 4, 1.6, 40);
  }

  /** The world position of a tile's top. */
  private tilePos(b: Battle, u: number, v: number): [number, number] {
    return at(u, v, tileAt(b.board, u, v)?.h ?? 0);
  }

  /** A dash leaves a streak between the tiles; a blink a puff of smoke at each end. */
  private streak(b: Battle, e: Extract<BattleEvent, { kind: 'dash' | 'blink' }>): void {
    const by = this.sprites.get(e.by);
    const lift = (by?.tall ?? 40) * 0.45;
    const [x0, y0] = this.tilePos(b, e.from.u, e.from.v);
    const [x1, y1] = this.tilePos(b, e.to.u, e.to.v);
    if (e.kind === 'blink') {
      for (const [x, y] of [[x0, y0], [x1, y1]]) {
        const sp = new Sprite(impact.frames[0]);
        sp.anchor.set(0.5);
        sp.scale.set(1.4);
        sp.tint = 0x6a4a8a;
        sp.position.set(x, y - lift);
        this.root.addChild(sp);
        let t = 0;
        this.items.push({
          view: sp,
          step: (dt) => {
            t += dt;
            const f = Math.floor(t / 45);
            if (f >= impact.frames.length) return false;
            sp.texture = impact.frames[f];
            return true;
          },
        });
      }
      return;
    }
    const g = new Graphics();
    g.moveTo(x0, y0 - lift).lineTo(x1, y1 - lift).stroke({ color: 0xffffff, width: 5, alpha: 0.9, cap: 'round' });
    g.blendMode = 'add';
    this.root.addChild(g);
    let t = 0;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        g.alpha = 1 - t / 350;
        return t < 350;
      },
    });
  }

  /** A 3x3 of tiles marked as a volley or meteor comes down on it after `ms`. */
  private area(b: Battle, e: Extract<BattleEvent, { kind: 'area' }>): void {
    const meteor = e.id === 'meteor';
    const color = meteor ? 0xff5a2a : 0xffe27a;
    const view = new Container();
    const g = new Graphics();
    view.addChild(g);
    this.root.addChild(view);
    const tiles: [number, number][] = [];
    for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) if (tileAt(b.board, e.u + du, e.v + dv)) tiles.push(this.tilePos(b, e.u + du, e.v + dv));
    const [cx, cy] = this.tilePos(b, e.u, e.v);
    // volley: a dozen arrows, each falling in its own moment; meteor: one fireball from the sky
    const arrows = meteor
      ? []
      : Array.from({ length: 12 }, (_, i) => {
          const [tx, ty] = tiles[i % tiles.length];
          const sp = new Sprite(arrow);
          sp.anchor.set(0.5);
          sp.scale.set(0.55);
          sp.rotation = Math.PI / 2;
          sp.visible = false;
          view.addChild(sp);
          return { sp, x: tx + (Math.random() * 30 - 15), y: ty + (Math.random() * 12 - 6), at: Math.random() * Math.max(1, e.ms - 260) };
        });
    const ball = new Sprite(fire.frames[0]);
    ball.anchor.set(0.5);
    ball.scale.set(2.4);
    ball.blendMode = 'add';
    ball.visible = false;
    view.addChild(ball);
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        g.clear();
        const pulse = 0.16 + 0.1 * Math.sin(t / 90);
        for (const [x, y] of tiles) g.poly([x, y - TH / 2, x + TW / 2, y, x, y + TH / 2, x - TW / 2, y]).fill({ color, alpha: pulse }).stroke({ color, width: 1.5, alpha: 0.7 });
        for (const a of arrows) {
          const f = (t - a.at) / 260;
          a.sp.visible = f >= 0 && f < 1;
          if (a.sp.visible) a.sp.position.set(a.x, a.y - 170 * (1 - f));
        }
        if (meteor) {
          const f = Math.min(1, t / e.ms);
          ball.visible = f < 1;
          ball.position.set(cx + 150 * (1 - f), cy - 360 * (1 - f));
          ball.texture = fire.frames[Math.floor(t / 60) % fire.frames.length];
          if (f >= 1) {
            this.anim(magic.fireExplosion, cx, cy - 12, 4.5, 70);
            this.trauma = Math.min(1, this.trauma + 0.5);
          }
        }
        return t < e.ms;
      },
    });
  }

  /** A heal or haste goes off: the 3x3 lit for a moment and a burst of light on each hero in it. */
  private spell(b: Battle, e: Extract<BattleEvent, { kind: 'spell' }>): void {
    if (e.id === 'meteor') return;
    const color = e.id === 'heal' ? 0x7dff8a : 0xffe27a;
    const g = new Graphics();
    this.root.addChild(g);
    let t = 0;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        g.clear();
        for (let du = -1; du <= 1; du++)
          for (let dv = -1; dv <= 1; dv++) {
            if (!tileAt(b.board, e.u + du, e.v + dv)) continue;
            const [x, y] = this.tilePos(b, e.u + du, e.v + dv);
            g.poly([x, y - TH / 2, x + TW / 2, y, x, y + TH / 2, x - TW / 2, y]).fill({ color, alpha: 0.35 * (1 - t / 600) });
          }
        return t < 600;
      },
    });
    for (const x of b.units) {
      const s = this.sprites.get(x.id);
      if (x.alive && x.side === 'hero' && Math.abs(x.u - e.u) <= 1 && Math.abs(x.v - e.v) <= 1 && s) {
        this.effect(SPELL_FX[e.id], s.x, s.y - s.tall * 0.45);
        if (e.id === 'haste') this.label('Haste', s.x, s.y - s.tall - 20, color, 12, 900);
      }
    }
  }

  /** Burning ground: flames over a 3x3 of tiles for `ms`. */
  private zone(b: Battle, u: number, v: number, ms: number): void {
    const view = new Container();
    this.root.addChild(view);
    const flames: Sprite[] = [];
    for (let du = -1; du <= 1; du++)
      for (let dv = -1; dv <= 1; dv++) {
        if (!tileAt(b.board, u + du, v + dv)) continue;
        const [x, y] = this.tilePos(b, u + du, v + dv);
        const sp = new Sprite(fire.frames[0]);
        sp.anchor.set(0.5, 0.8);
        sp.scale.set(1.1);
        sp.blendMode = 'add';
        sp.position.set(x, y);
        view.addChild(sp);
        flames.push(sp);
      }
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        flames.forEach((sp, i) => (sp.texture = fire.frames[(Math.floor(t / 90) + i) % fire.frames.length]));
        view.alpha = t > ms - 600 ? Math.max(0, (ms - t) / 600) : 1;
        return t < ms;
      },
    });
  }

  private number(n: number, x: number, y: number, heavy: boolean, onHero: boolean): void {
    if (!settings().numbers) return;
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

  /** Chain lightning: a jagged line between two fighters that fades. */
  private arc(fromId: number, toId: number): void {
    const a = this.sprites.get(fromId);
    const c = this.sprites.get(toId);
    if (!a || !c) return;
    const [x0, y0, x1, y1] = [a.x, a.y - a.tall * 0.5, c.x, c.y - c.tall * 0.5];
    const g = new Graphics();
    g.moveTo(x0, y0);
    for (let i = 1; i < 5; i++) g.lineTo(x0 + ((x1 - x0) * i) / 5 + (i % 2 ? 7 : -7), y0 + ((y1 - y0) * i) / 5 + (i % 2 ? -4 : 4));
    g.lineTo(x1, y1).stroke({ color: 0x9fe0ff, width: 3, alpha: 0.95, cap: 'round' });
    g.blendMode = 'add';
    this.root.addChild(g);
    let t = 0;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        g.alpha = 1 - t / 300;
        return t < 300;
      },
    });
  }

  private shot(byId: number, toId: number, kind: Shot, ms: number): void {
    const by = this.sprites.get(byId);
    const to = this.sprites.get(toId);
    if (!by || !to) return;
    const sp = new Sprite(kind === 'arrow' ? arrow : kind === 'bone' ? bone : fire.frames[0]);
    sp.anchor.set(0.5);
    sp.scale.set(kind === 'fire' || kind === 'bolt' ? 0.9 : 0.55);
    if (kind === 'fire' || kind === 'bolt') sp.blendMode = 'add';
    if (kind === 'bolt') sp.tint = 0x66ccff;
    this.root.addChild(sp);
    const x0 = by.x;
    const y0 = by.y - by.tall * 0.55;
    let t = 0;
    const place = (f: number) => {
      const x1 = to.x;
      const y1 = to.y - to.tall * 0.45;
      const arc = kind === 'fire' || kind === 'bolt' ? 8 : 18 + Math.hypot(x1 - x0, y1 - y0) * 0.15;
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
        if (kind === 'fire' || kind === 'bolt') sp.texture = fire.frames[Math.floor(t / 60) % fire.frames.length];
        else sp.rotation = Math.atan2(ny - y, nx - x);
        return f < 1;
      },
    });
  }
}
