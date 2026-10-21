// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Battle, type BattleEvent, type Unit } from '../sim/battle';
import { kitOf } from '../sim/abilities';
import { SPELLS } from '../sim/spells';
import type { Shot } from '../sim/units';
import { settings } from '../settings';
import { loadImage } from './loadImage';
import { at, TH, TW } from './iso';
import { fadeTrauma, popScale, shakeOf, traumaFor } from './juiceRules';
import { BIG_FOE_HP, SKILL_FX, SPELL_FX, SPELL_GLOW, type Effect, type MagicKey } from './skillFx';
import type { UnitSprite } from './unitView';
import { Particles } from './particles';
import { loadVfxArt, VFX } from './vfxArt';
import { particleBudget, slashOf } from './vfxRules';
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
  await loadVfxArt();
}

/** A small random offset (the renderer's own, not the sim's). */
const jitter = (n: number) => (Math.random() * 2 - 1) * n;

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
  /** The small puffs, sparks and trails (pooled, capped). */
  readonly particles = new Particles();
  /** Ms of a slow-motion beat left (a boss falls); `timeScale` slows the fight while it lasts. */
  private slowLeft = 0;
  /** The steps already shown (each step is a new object), when each flyer last gusted, and the board's lava and water. */
  private seenSteps = new WeakSet<object>();
  private gusts = new Map<number, number>();
  private lastBoard: Board | null = null;
  private lava: [number, number][] = [];
  private water: [number, number][] = [];

  constructor(private sprites: Map<number, UnitSprite>) {
    this.root.zIndex = 1e7;
    this.flashLayer.visible = false;
    this.root.addChild(this.particles.root);
  }

  clear(): void {
    for (const it of this.items) it.view.destroy({ children: true });
    this.items = [];
    this.trauma = 0;
    this.flashLeft = 0;
    this.slowLeft = 0;
    this.gusts.clear();
    this.particles.clear();
  }

  /** How fast the fight runs right now: 1, or a slow-motion beat's share of it. */
  timeScale(): number {
    return this.slowLeft > 0 ? 0.35 : 1;
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
    const budget = particleBudget(settings().saver);
    this.particles.density = budget.density;
    this.particles.cap = budget.cap;
    for (const e of events) {
      if (e.kind === 'shot') this.shot(e.by, e.to, e.shot, e.ms);
      else if (e.kind === 'skill') this.skillName(e.by, e.name);
      else if (e.kind === 'swing') this.slash(b, e.by, e.to);
      else if (e.kind === 'dodge') {
        const to = this.sprites.get(e.to);
        if (to) {
          this.label('Miss', to.x, to.y - to.tall - 10, 0xcfe8ff, 12);
          // (a whoosh of wind across the one that dodged)
          this.particles.spawn({ frames: VFX.dashWhite, x: to.x, y: to.y - to.tall * 0.5, scale: 1.1, frameMs: 40, alpha: 0.8, add: true });
        }
      } else if (e.kind === 'dash' || e.kind === 'blink') this.streak(b, e);
      else if (e.kind === 'area') this.area(b, e);
      else if (e.kind === 'spell') this.spell(b, e);
      else if (e.kind === 'spellfx') this.spellFx(e);
      else if (e.kind === 'heal') {
        const to = this.sprites.get(e.to);
        if (to && e.amount > 0) {
          this.label(`+${e.amount}`, to.x, to.y - to.tall - 10, 0x7dff8a, 13);
          this.sparkles(to.x, to.y - to.tall * 0.4, 0x7dff8a);
        }
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
        // (the spark grows with the blow: a scratch is small, a half-health blow fills the struck)
        const spark = Math.min(2, 0.6 + (e.dmg / target.maxHp) * 3);
        // (a raised guard turns the blow aside: a bright block, and the word)
        if (e.src === 'blow' && target.guardUntil !== undefined && target.guardUntil > b.t) {
          this.label('Block', to.x, to.y - to.tall - 10, 0xbfe3ff, 12);
          this.anim({ frames: VFX.hitLight }, to.x, to.y - to.tall * 0.5, 1.2, 50);
        }
        if (skillFx) this.effect(skillFx, to.x, to.y - to.tall * 0.45);
        else {
          const fiery = defOf(by).shot === 'fire' || defOf(by).shot === 'bolt';
          this.anim(fiery ? (e.splash ? fire : blast) : impact, to.x, to.y - to.tall * 0.45, (fiery && !e.splash ? 0.8 : 0.9) * spark, 45);
        }
        if (this.particles.rate(0.7)) this.puffAt(to.x, to.y - to.tall * 0.3, target.side === 'hero' ? 'white' : 'blood', 0.8 + spark * 0.2);
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero');
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
        if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
        if (e.heavy && e.src === 'blow') {
          // (a crit, or a blow from height: a gold burst and a flash)
          this.anim(magic.goldBurst, to.x, to.y - to.tall * 0.45, 1.3, 60);
          this.flash(0.35, 180);
          this.trauma = Math.min(1, this.trauma + 0.25);
        }
        if (e.killed && target.side === 'foe' && target.maxHp >= BIG_FOE_HP) {
          this.anim(magic.bloodExplosion, to.x, to.y - to.tall * 0.45, 2.2, 60);
          // (the boss's own beat: a fire burst on it, smoke, and a slow moment for the fall)
          this.anim(magic.fireExplosion, to.x, to.y - to.tall * 0.45, 3.2, 70);
          for (let i = 0; i < 3; i++) this.particles.spawn({ frames: VFX.smokeDark, x: to.x + jitter(18), y: to.y - to.tall * 0.4 + jitter(10), scale: 1.6, life: 900, vy: -0.03, grow: 0.0006, alpha: 0.8 });
          this.slowLeft = 700;
          this.flash(0.5, 260);
          this.trauma = Math.min(1, this.trauma + 0.4);
        }
      }
    }
    this.scan(b);
  }

  /** A blow is swung: a slash of the attacker's weapon across the one it aims at. */
  private slash(b: Battle, byId: number, toId: number): void {
    const by = this.sprites.get(byId);
    const to = this.sprites.get(toId);
    const attacker = b.units.find((x) => x.id === byId);
    if (!by || !to || !attacker) return;
    this.particles.spawn({
      frames: VFX[slashOf(defOf(attacker).name)],
      x: to.x,
      y: to.y - to.tall * 0.5,
      scale: 1.3,
      frameMs: 45,
      rotation: Math.atan2(to.y - by.y, to.x - by.x),
      add: true,
    });
  }

  /** Green sparkles rising off a healed fighter (a few, a moment apart). */
  private sparkles(x: number, y: number, tint: number): void {
    for (let i = 0; i < 4; i++)
      this.particles.spawn({ frames: VFX.sparkleLight, x: x + jitter(12), y: y + jitter(6), scale: 0.7, delay: i * 90, life: 650, vy: -0.05, tint, add: true });
  }

  /** A puff of dust, blood, fire, sand or ice at a point (a hit's, a landing's, a shot's). */
  puffAt(x: number, y: number, kind: 'white' | 'blood' | 'fire' | 'sand' | 'ice', scale = 1): void {
    const frames = { white: VFX.puffWhite, blood: VFX.puffBlood, fire: VFX.puffFire, sand: VFX.puffSand, ice: VFX.puffIce }[kind];
    this.particles.spawn({ frames, x, y, scale, life: 380, vy: -0.02, grow: 0.0008, alpha: 0.9 });
  }

  /** A hero is set down on a tile: its puff of dust. */
  landing(b: Battle, u: number, v: number): void {
    const [x, y] = this.tilePos(b, u, v);
    this.puffAt(x, y, 'white', 1.1);
  }

  /** A fighter falls: skeletons scatter bones, demons puff out smoke, the rest bleed a puff (the fallen then fade). */
  private death(target: Unit, x: number, y: number): void {
    const name = defOf(target).name;
    if (/skeleton/i.test(name)) {
      for (let i = 0; i < 5; i++)
        this.particles.spawn({ frames: [bone], x: x + jitter(10), y: y + jitter(4), scale: 0.5, life: 900, vx: jitter(0.05), vy: -0.12, gravity: 0.0005, spin: jitter(0.012), tint: 0xf4ecd8 });
      this.puffAt(x, y, 'white', 1);
    } else if (/^(imp|demon)/i.test(name)) {
      for (let i = 0; i < 3; i++) this.particles.spawn({ frames: VFX.smokeDark, x: x + jitter(12), y: y + jitter(8), scale: 1.2, life: 800, vy: -0.035, grow: 0.0006, alpha: 0.85 });
    } else {
      this.puffAt(x, y, 'blood', 1.2);
    }
  }

  /** Walks, flyers' gusts, hasted fighters' trail and the terrain's bits; looked at once per tick. */
  private scan(b: Battle): void {
    if (b.board !== this.lastBoard) {
      this.lastBoard = b.board;
      this.lava = [];
      this.water = [];
      for (let u = 0; u < b.board.w; u++)
        for (let v = 0; v < b.board.d; v++) {
          const g = tileAt(b.board, u, v)?.ground;
          if (g === 'lava') this.lava.push([u, v]);
          else if (g === 'water') this.water.push([u, v]);
        }
    }
    for (const u of b.units) {
      const s = this.sprites.get(u.id);
      if (!s || !u.alive) continue;
      if (u.step && !this.seenSteps.has(u.step)) {
        this.seenSteps.add(u.step);
        this.walk(b, u, u.step);
      }
      if (u.hasteUntil !== undefined && u.hasteUntil > b.t && this.particles.rate(0.5))
        this.particles.spawn({ frames: VFX.dustGold, x: s.x + jitter(8), y: s.y - 2, scale: 0.6, life: 380, vy: -0.02, alpha: 0.8 });
      if (defOf(u).flies && b.t - (this.gusts.get(u.id) ?? -1e9) > 900) {
        this.gusts.set(u.id, b.t);
        this.gust(s);
      }
    }
    this.terrain(b);
  }

  /** A step begins: dust at the foot, the ground it lands on has its own bit, and a drop of two steps lands with a puff. */
  private walk(b: Battle, u: Unit, st: NonNullable<Unit['step']>): void {
    const [x, y] = this.tilePos(b, u.u, u.v);
    const tile = tileAt(b.board, u.u, u.v);
    if (!tile) return;
    if (!defOf(u).flies) {
      if (this.particles.rate(0.8)) this.particles.spawn({ frames: VFX.dustWhite, x, y, scale: 0.55, life: 420, vy: -0.02, grow: 0.0008, alpha: 0.7 });
      const ground = tile.ground;
      if (ground === 'water') {
        this.particles.spawn({ frames: VFX.rippleWater, x, y, scale: 0.9, life: 600, grow: 0.0006, alpha: 0.9 });
        this.particles.spawn({ frames: VFX.splashWater, x, y, scale: 0.8, life: 400, vy: -0.03 });
      } else if (ground === 'lava') {
        this.puffAt(x, y, 'fire', 0.9);
      } else if (ground === 'ice') {
        this.puffAt(x, y, 'ice', 0.7);
      } else if (b.board.area === 'snow' && this.particles.rate(0.5)) {
        this.puffAt(x, y, 'ice', 0.6);
      } else if (b.board.area === 'desert' && this.particles.rate(0.5)) {
        this.puffAt(x, y, 'sand', 0.6);
      }
    }
    if (st.h - tile.h >= 2) this.particles.spawn({ frames: VFX.puffWhite, x, y, scale: 1.1, delay: st.ms, life: 380, vy: -0.02, alpha: 0.9 });
  }

  /** A flyer's wings beat: a gust off each side of its body. */
  private gust(s: UnitSprite): void {
    for (const dx of [-9, 9])
      this.particles.spawn({ frames: VFX.puffWind, x: s.x + dx, y: s.y - s.tall * 0.5, scale: 0.8, life: 420, vx: dx * 0.01, alpha: 0.7 });
  }

  /** The terrain's own bits, a few at a time: ripples on the shallows, embers and glow over the lava, dust drifting on the snow and sand. */
  private terrain(b: Battle): void {
    const p = this.particles;
    const pick = (list: [number, number][]) => list[Math.floor(Math.random() * list.length)];
    if (this.water.length && p.rate(0.2)) {
      const [u, v] = pick(this.water);
      const [x, y] = this.tilePos(b, u, v);
      p.spawn({ frames: VFX.rippleWater, x, y, scale: 0.8, life: 650, grow: 0.0005, alpha: 0.7 });
    }
    if (this.lava.length && p.rate(0.5)) {
      const [u, v] = pick(this.lava);
      const [x, y] = this.tilePos(b, u, v);
      p.spawn({ frames: VFX.sparkleFire, x: x + jitter(10), y: y + jitter(4), scale: 0.6, life: 700, vy: -0.035, add: true });
    }
    if (this.lava.length && p.rate(0.15)) {
      const [u, v] = pick(this.lava);
      const [x, y] = this.tilePos(b, u, v);
      p.spawn({ frames: VFX.puffFire, x, y, scale: 1.1, life: 500, alpha: 0.4, add: true });
    }
    if ((b.board.area === 'snow' || b.board.area === 'desert') && p.rate(0.12)) {
      const u = Math.floor(Math.random() * b.board.w);
      const v = Math.floor(Math.random() * b.board.d);
      if (!tileAt(b.board, u, v)) return;
      const [x, y] = this.tilePos(b, u, v);
      if (b.board.area === 'snow') p.spawn({ frames: VFX.dustWhite, x, y: y - 30, scale: 0.6, life: 1200, vx: 0.01, vy: 0.02, alpha: 0.7 });
      else p.spawn({ frames: VFX.dustGold, x, y: y - 14, scale: 0.7, life: 900, vx: 0.025, alpha: 0.5 });
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
    this.particles.step(dt);
    this.slowLeft = Math.max(0, this.slowLeft - dt);
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

  /** A spell goes off: the 3x3 lit for a moment (a poison cloud's for as long as it lingers), and, for the ones that go everywhere, nothing here (the `spellfx` events light each fighter). */
  private spell(b: Battle, e: Extract<BattleEvent, { kind: 'spell' }>): void {
    if (e.id === 'meteor' || SPELLS[e.id].target === 'all') return;
    const { color, ms } = SPELL_GLOW[e.id];
    const g = new Graphics();
    this.root.addChild(g);
    let t = 0;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        g.clear();
        const alpha = e.id === 'poison' ? 0.22 + 0.1 * Math.sin(t / 250) : 0.35 * (1 - t / ms);
        for (let du = -1; du <= 1; du++)
          for (let dv = -1; dv <= 1; dv++) {
            if (!tileAt(b.board, e.u + du, e.v + dv)) continue;
            const [x, y] = this.tilePos(b, e.u + du, e.v + dv);
            g.poly([x, y - TH / 2, x + TW / 2, y, x, y + TH / 2, x - TW / 2, y]).fill({ color, alpha });
          }
        return t < ms;
      },
    });
    if (e.id === 'poison') {
      const [x, y] = this.tilePos(b, e.u, e.v);
      this.effect(SPELL_FX.poison, x, y - 10);
    }
  }

  /** A spell touches a fighter: its sheet plays on them (and Haste says so). */
  private spellFx(e: Extract<BattleEvent, { kind: 'spellfx' }>): void {
    const s = this.sprites.get(e.to);
    if (!s || e.id === 'meteor') return;
    this.effect(SPELL_FX[e.id], s.x, s.y - s.tall * 0.45);
    if (e.id === 'haste') this.label('Haste', s.x, s.y - s.tall - 20, SPELL_GLOW.haste.color, 12, 900);
    if (e.id === 'rally') this.label('Rally', s.x, s.y - s.tall - 20, SPELL_GLOW.rally.color, 12, 900);
    if (e.id === 'shield') this.label('Shield', s.x, s.y - s.tall - 20, SPELL_GLOW.shield.color, 12, 900);
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
    const fiery = kind === 'fire' || kind === 'bolt';
    let trailAt = 0;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const f = Math.min(1, t / ms);
        const [x, y] = place(f);
        const [nx, ny] = place(Math.min(1, f + 0.05));
        sp.position.set(x, y);
        if (fiery) sp.texture = fire.frames[Math.floor(t / 60) % fire.frames.length];
        else sp.rotation = Math.atan2(ny - y, nx - x);
        // a trail: flame puffs behind fire and bolts, a faint glint behind an arrow
        if (t - trailAt >= 45 && this.particles.rate(1)) {
          trailAt = t;
          this.particles.spawn(
            fiery
              ? { frames: VFX.puffFire, x: x + jitter(3), y: y + jitter(3), scale: 0.45, life: 260, vy: -0.02, alpha: 0.8, add: true, tint: kind === 'bolt' ? 0x66ccff : undefined }
              : { frames: VFX.sparkleWhite, x, y, scale: 0.3, life: 200, alpha: 0.6, add: true },
          );
        }
        if (f >= 1) {
          this.puffAt(to.x, to.y - to.tall * 0.45, fiery ? 'fire' : 'white', fiery ? 0.9 : 0.6);
          return false;
        }
        return true;
      },
    });
  }
}
