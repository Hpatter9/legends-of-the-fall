// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Battle, type BattleEvent, type Unit } from '../sim/battle';
import { isBoss } from '../sim/foes';
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
import { loadPackArt, PACK } from './fxSheets';
import { bossEntrance, deathBurst, impactBurst, play, setBoneArt, windUp } from './combatFx';
import { arcStyle, bits, deathKind, hitStopMs, impactElement, missileOf, nudgeOf, packKey, skillElement, SPELL_CAST, SPELL_TOUCH, type Missile } from './fxRules';
import { particleBudget, slashOf } from './vfxRules';
import impactUrl from '../art/fx/impact.png';
import fireUrl from '../art/fx/hit_fire.png';
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
let arrow: Texture;
let bone: Texture;
let magic: Record<MagicKey, Strip>;

async function strip(url: string, size: number): Promise<Strip> {
  const base = Texture.from(await loadImage(url));
  const n = Math.floor(base.width / size);
  return { frames: Array.from({ length: n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * size, 0, size, size) })) };
}

export async function loadFx(): Promise<void> {
  [impact, fire] = await Promise.all([strip(impactUrl, 48), strip(fireUrl, 32)]);
  arrow = Texture.from(await loadImage(arrowUrl));
  bone = Texture.from(await loadImage(boneUrl));
  setBoneArt(bone);
  const keys = Object.keys(MAGIC) as MagicKey[];
  const strips = await Promise.all(keys.map((k) => strip(MAGIC[k], 32)));
  magic = Object.fromEntries(keys.map((k, i) => [k, strips[i]])) as Record<MagicKey, Strip>;
  await loadVfxArt();
  await loadPackArt();
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
  /** The world dimmed behind the effects for an ultimate (a layer under `root`, sized by `dim`'s peak and time). */
  readonly dimLayer = new Graphics();
  private dimLeft = 0;
  private dimMs = 1;
  private dimPeak = 0;
  /** Ms of a slow-motion beat left (a boss falls); `timeScale` slows the fight while it lasts. */
  private slowLeft = 0;
  /** Ms of hit-stop left (a crit or a killing blow freezes the fight for a moment). */
  private stopLeft = 0;
  /** Reduced motion asked for by the device: no shake, flash, dim or hit-stop. */
  private reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Battles whose bosses have made their entrance. */
  private entered = new WeakSet<Battle>();
  /** The steps already shown (each step is a new object), when each flyer last gusted, and the board's lava and water. */
  private seenSteps = new WeakSet<object>();
  private gusts = new Map<number, number>();
  private lastBoard: Board | null = null;
  private lava: [number, number][] = [];
  private water: [number, number][] = [];

  constructor(private sprites: Map<number, UnitSprite>) {
    this.root.zIndex = 1e7;
    this.flashLayer.visible = false;
    this.dimLayer.rect(-3000, -3000, 6000, 6000).fill(0x07040f);
    this.dimLayer.zIndex = 1e7 - 1;
    this.dimLayer.visible = false;
    this.root.addChild(this.particles.root);
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  clear(): void {
    for (const it of this.items) it.view.destroy({ children: true });
    this.items = [];
    this.trauma = 0;
    this.flashLeft = 0;
    this.slowLeft = 0;
    this.stopLeft = 0;
    this.dimLeft = 0;
    this.dimLayer.visible = false;
    this.gusts.clear();
    this.particles.clear();
  }

  /** How fast the fight runs right now: 1, or a slow-motion beat's share of it. */
  timeScale(): number {
    return this.stopLeft > 0 ? 0.02 : this.slowLeft > 0 ? 0.35 : 1;
  }

  /** Whether the screen is to stay still: shake off in the settings, or reduced motion on the device. */
  private calm(): boolean {
    return this.reduced || !settings().shake;
  }

  /** The world dims for `ms` behind the effects (an ultimate's cast), unless the screen is to stay still. */
  private dim(peak: number, ms: number): void {
    if (this.calm()) return;
    this.dimPeak = peak;
    this.dimMs = ms;
    this.dimLeft = ms;
  }

  /** Run `fn` after `ms` of the fight's own time. */
  private later(ms: number, fn: () => void): void {
    const view = new Container();
    this.root.addChild(view);
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        if (t < ms) return true;
        fn();
        return false;
      },
    });
  }

  /** The flash covers a screen of this size (set when the page lays out). */
  fitScreen(w: number, h: number): void {
    this.flashLayer.clear().rect(0, 0, w, h).fill(0xffffff);
  }

  /** A white flash that fades over `ms` (not when screen shake is off in the settings). */
  private flash(peak: number, ms: number): void {
    if (this.calm()) return;
    this.flashPeak = Math.max(peak, this.flashLeft > 0 ? this.flashPeak : 0);
    this.flashMs = ms;
    this.flashLeft = ms;
  }

  /** Show what a tick of the fight did. */
  show(b: Battle, events: BattleEvent[]): void {
    const budget = particleBudget(settings().saver);
    this.particles.density = budget.density;
    this.particles.cap = budget.cap;
    this.enter(b);
    for (const e of events) {
      if (e.kind === 'shot') this.shot(e.by, e.to, e.shot, e.ms);
      else if (e.kind === 'skill') this.skillName(e.by, e.name, e.ms);
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
          // (a green ring rises round the healed, and a thread of light runs to it from the healer)
          play(this.particles, 'forest-aura', to.x, to.y - 4, { scale: to.tall / 26, frameMs: 80 });
          const healer = e.by !== undefined && e.by !== e.to ? this.sprites.get(e.by) : undefined;
          if (healer) this.thread(healer.x, healer.y - healer.tall * 0.5, to.x, to.y - to.tall * 0.5, 'light-sparkle');
        }
      } else if (e.kind === 'arc') this.arc(e.from, e.to);
      else if (e.kind === 'frenzy') {
        const by = this.sprites.get(e.by);
        if (by) this.label(`Frenzy x${e.n}`, by.x, by.y - by.tall - 20, 0xff6b4a, 12, 700);
      } else if (e.kind === 'gaze') {
        const to = this.sprites.get(e.to);
        if (to) {
          // (a stare: a dark ring on the foe, and the word as it stiffens)
          this.anim(magic.darkCircle, to.x, to.y - to.tall * 0.45, 1.2, 60);
          this.label('Petrified', to.x, to.y - to.tall - 10, 0xc8f0a0, 12, 1000);
        }
      } else if (e.kind === 'song') {
        const by = this.sprites.get(e.by);
        if (by) {
          this.label('Song', by.x, by.y - by.tall - 20, 0xffd27a, 13, 1000);
          this.sparkles(by.x, by.y - by.tall * 0.4, 0xffd27a);
        }
      } else if (e.kind === 'banner') {
        const by = this.sprites.get(e.by);
        if (by) {
          this.label('War Banner', by.x, by.y - by.tall - 20, 0xffe27a, 13, 1200);
          this.anim(magic.goldBurst, by.x, by.y - by.tall * 0.45, 1.2, 60);
        }
      } else if (e.kind === 'zone') this.zone(b, e.u, e.v, e.ms);
      else if (e.kind === 'trap') this.trap(b, e.u, e.v, e.ms);
      else if (e.kind === 'hit') {
        const to = this.sprites.get(e.to);
        const by = b.units.find((x) => x.id === e.by);
        const target = b.units.find((x) => x.id === e.to);
        if (!to || !target) continue;
        // (no `by` is the king's meteor)
        if (!by) {
          this.anim(magic.fireExplosion, to.x, to.y - to.tall * 0.45, 1.6, 70);
          this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, false);
          if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
          continue;
        }
        if (e.src === 'dot') {
          const burn = target.dot?.kind === 'burn' || target.dot === undefined;
          if (target.dot?.kind === 'curse') this.particles.spawn({ frames: VFX.puffFire, x: to.x, y: to.y - to.tall * 0.45, scale: 0.8, life: 260, alpha: 0.8, add: true, tint: 0xb06aff });
          else this.anim(burn ? fire : impact, to.x, to.y - to.tall * 0.45, burn ? 0.7 : 0.6, 60);
          this.number(e.dmg, to.x, to.y - to.tall - 10, false, target.side === 'hero');
          if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
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
        const hx = to.x;
        const hy = to.y - to.tall * 0.45;
        if (skillFx) {
          this.effect(skillFx, hx, hy);
          // (and a burst of the skill's own element on top)
          impactBurst(this.particles, skillElement(kitOf(by)?.skill.name ?? ''), hx, hy, 0.8, e.splash);
        } else if (defOf(by).shot) {
          // (a shot lands in its own element: fire bursts, frost shatters, lightning cracks, poison lingers, an arrow bites)
          const m = missileOf(defOf(by).shot!, defOf(by).name);
          impactBurst(this.particles, impactElement(m), hx, hy, Math.min(1.8, 0.7 + spark * 0.5), e.splash);
          if (m.look !== 'orb') this.anim(impact, hx, hy, 0.9 * spark, 45);
        } else this.anim(impact, hx, hy, 0.9 * spark, 45);
        if (this.particles.rate(0.7)) this.puffAt(to.x, to.y - to.tall * 0.3, target.side === 'hero' ? 'white' : 'blood', 0.8 + spark * 0.2);
        this.flesh(target, hx, hy, e.dmg / target.maxHp);
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero');
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
        // (the struck is knocked a little away along the blow, and a crit or a killing blow stops the fight for a moment)
        const share = e.dmg / target.maxHp;
        const byS = this.sprites.get(e.by);
        if (byS && !e.splash) {
          const way = Math.atan2(to.y - byS.y, to.x - byS.x);
          const n = nudgeOf(share);
          to.nudge(Math.cos(way) * n, Math.sin(way) * n * 0.5);
        }
        this.stopLeft = Math.max(this.stopLeft, hitStopMs(e.heavy, share, e.killed, this.calm()));
        if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
        if (e.heavy && e.src === 'blow') {
          // (a crit, or a blow from height: a gold burst and a flash)
          this.anim(magic.goldBurst, to.x, to.y - to.tall * 0.45, 1.3, 60);
          play(this.particles, 'light-cross', to.x, to.y - to.tall * 0.45, { scale: 1.6, frameMs: 50 });
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
    // (a long weapon thrusts out at the foe)
    if (defOf(attacker).range === 2 && !defOf(attacker).shot) this.thrust(by, to);
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

  /** A fighter falls, by its kind (`deathKind`): bones, a burning away, a thud of dust, stone chips, blood or motes of light. */
  private death(target: Unit, x: number, y: number): void {
    const kind = deathKind(defOf(target).name, target.side);
    deathBurst(this.particles, kind, x, y, target.size ?? 1);
    if (kind === 'thud') this.trauma = Math.min(1, this.trauma + 0.2);
  }

  /** What a blow knocks off the struck: bone chips off a skeleton, drops of blood off flesh. */
  private flesh(target: Unit, x: number, y: number, share: number): void {
    if (share < 0.05 || !this.particles.rate(0.8)) return;
    const bony = /skeleton/i.test(defOf(target).name);
    for (let i = 0; i < bits(bony ? 2 : 3, this.particles.density); i++)
      this.particles.spawn({
        frames: bony ? [bone] : VFX.puffBlood,
        x: x + jitter(5),
        y: y + jitter(4),
        scale: bony ? 0.35 : 0.25,
        life: 500,
        vx: jitter(0.07),
        vy: -0.08 - Math.random() * 0.06,
        gravity: 0.0005,
        spin: bony ? jitter(0.015) : 0,
        tint: bony ? 0xf4ecd8 : undefined,
      });
  }

  /** The bosses step onto the board on the fight's first tick: a dark rune, a shock ring, a pillar, smoke and a rumble. */
  private enter(b: Battle): void {
    if (b.t > 300 || this.entered.has(b)) return;
    this.entered.add(b);
    for (const u of b.units) {
      const s = this.sprites.get(u.id);
      if (!s || u.side !== 'foe' || !isBoss(u.def)) continue;
      bossEntrance(this.particles, s.x, s.y, s.tall);
      this.trauma = Math.max(this.trauma, 0.6);
    }
  }

  /** Motes of light running along a line from one point to another (a healer's thread of light). */
  private thread(x0: number, y0: number, x1: number, y1: number, key: 'light-sparkle' | 'dark-puff' | 'forest-sparkle'): void {
    const life = 420;
    for (let i = 0; i < bits(5, this.particles.density); i++)
      this.particles.spawn({ frames: PACK[key], x: x0 + jitter(4), y: y0 + jitter(4), scale: 0.6, life, delay: i * 50, vx: (x1 - x0) / life, vy: (y1 - y0) / life, add: true });
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
      // a slowed fighter gives off ice crystals while it lasts
      if (u.slowUntil !== undefined && u.slowUntil > b.t && this.particles.rate(0.3))
        this.particles.spawn({ frames: VFX.puffIce, x: s.x + jitter(12), y: s.y - s.tall * 0.5, scale: 0.5, life: 520, vy: -0.015, alpha: 0.9 });
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
    const s = this.calm() ? 0 : shakeOf(this.trauma);
    this.shakeX = s ? (Math.random() * 2 - 1) * s : 0;
    this.shakeY = s ? (Math.random() * 2 - 1) * s : 0;
    this.particles.step(dt);
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    this.stopLeft = Math.max(0, this.stopLeft - dt);
    this.dimLeft = Math.max(0, this.dimLeft - dt);
    this.dimLayer.visible = this.dimLeft > 0;
    if (this.dimLeft > 0) {
      // (in over a moment, held, out over the last 400 ms)
      const el = this.dimMs - this.dimLeft;
      this.dimLayer.alpha = this.dimPeak * Math.min(1, el / 200, this.dimLeft / 400);
    }
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
    const txt = new Text({ text, style: { fontFamily: "'Alegreya Sans', 'Trebuchet MS', sans-serif", fontWeight: 'bold', fontSize: size + 2, fill, stroke: { color: 0x1a1008, width: 3 } }, resolution: 3 });
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

  /** A skill goes off: its name over the caster, a wind-up circle and motes for the length of the cast, and its own effect at
   *  the caster's feet. A Mythic's ultimate dims the world, flashes and ends in a nova; a boss's skill rumbles. */
  private skillName(byId: number, name: string, ms: number): void {
    const by = this.sprites.get(byId);
    if (!by) return;
    const ultimate = kitOf(by.unit)?.ultimate?.name === name;
    const boss = by.unit.side === 'foe' && isBoss(by.unit.def);
    const el = skillElement(name);
    this.label(name, by.x, by.y - by.tall - 20, ultimate ? 0xfff2a0 : boss ? 0xff9a8a : 0xffe27a, ultimate || boss ? 15 : 13, 1200);
    windUp(this.particles, el, by.x, by.y, ms, by.tall, ultimate || boss);
    const cast = SKILL_FX[name]?.cast;
    if (ultimate) {
      this.trauma = Math.max(this.trauma, 0.5);
      this.flash(0.35, 380);
      this.dim(0.45, ms + 900);
      // (the wind-up ends in a nova and a ring of the element, with a second flash and a hard shake)
      const [x, y] = [by.x, by.y];
      this.later(ms, () => {
        play(this.particles, packKey(el, 'nova'), x, y - by.tall * 0.4, { scale: 3.5, frameMs: 80 });
        play(this.particles, packKey(el, 'wave'), x, y, { scale: 4.5, frameMs: 90 });
        this.flash(0.5, 300);
        this.trauma = Math.min(1, this.trauma + 0.45);
      });
    } else if (boss) {
      this.trauma = Math.max(this.trauma, 0.4);
      this.later(ms, () => play(this.particles, packKey(el, 'wave'), by.x, by.y, { scale: 3, frameMs: 90 }));
    }
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
    // (dust kicked up along the run, and a wind slash at its end)
    for (let i = 0; i <= 5; i++)
      this.particles.spawn({ frames: VFX.dustWhite, x: x0 + ((x1 - x0) * i) / 5, y: y0 + ((y1 - y0) * i) / 5, scale: 0.7, life: 420, delay: i * 25, vy: -0.02, grow: 0.0008, alpha: 0.8 });
    play(this.particles, 'wind-slash', x1, y1 - lift, { scale: 1.6, frameMs: 45, rotation: Math.atan2(y1 - y0, x1 - x0) });
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
          return { sp, x: tx + (Math.random() * 30 - 15), y: ty + (Math.random() * 12 - 6), at: Math.random() * Math.max(1, e.ms - 260), landed: false };
        });
    const orbFrames = PACK['fire-orb'];
    const ball = new Sprite(orbFrames[0]);
    ball.anchor.set(0.5);
    ball.scale.set(3);
    ball.blendMode = 'add';
    let landed = false;
    let trailAt = 0;
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
          // (each arrow lands in a little burst of dust and a spark)
          if (f >= 1 && !a.landed) {
            a.landed = true;
            play(this.particles, 'wind-hit', a.x, a.y - 4, { scale: 0.9, frameMs: 45 });
            this.puffAt(a.x, a.y, 'white', 0.5);
          }
        }
        if (meteor) {
          const f = Math.min(1, t / e.ms);
          ball.visible = f < 1;
          ball.position.set(cx + 150 * (1 - f), cy - 360 * (1 - f));
          ball.texture = orbFrames[Math.floor(t / 60) % orbFrames.length];
          // (its shadow on the ground swells as it comes, and a tail of flame and smoke streams behind it)
          g.ellipse(cx, cy, 10 + 34 * f, 5 + 17 * f).fill({ color: 0x000000, alpha: 0.35 * f });
          if (f < 1 && t - trailAt >= 35) {
            trailAt = t;
            this.particles.spawn({ frames: PACK['fire-puff'], x: ball.x + jitter(5), y: ball.y + jitter(5), scale: 1.1, life: 380, vy: -0.01, alpha: 0.9, add: true });
            this.particles.spawn({ frames: PACK['fire-smoke'], x: ball.x + 8 + jitter(4), y: ball.y - 6, scale: 0.9, life: 500, vx: 0.02, vy: -0.01, grow: 0.0008, alpha: 0.5 });
          }
          if (f >= 1 && !landed) {
            landed = true;
            this.meteorLanding(cx, cy);
          }
        }
        return t < e.ms;
      },
    });
  }

  /** The meteor lands: a big explosion with a flash, a ring of fire, rubble and smoke, a crater that stays and cools, and a hard shake. */
  private meteorLanding(cx: number, cy: number): void {
    const p = this.particles;
    this.anim(magic.fireExplosion, cx, cy - 12, 4.5, 70);
    play(p, 'fire-nova', cx, cy - 14, { scale: 4.5, frameMs: 70 });
    play(p, 'fire-wave', cx, cy, { scale: 5, frameMs: 80 });
    for (let i = 0; i < bits(8, p.density); i++)
      p.spawn({ frames: PACK['earth-puff'], x: cx + jitter(14), y: cy - 6, scale: 0.6, life: 800, vx: jitter(0.12), vy: -0.16 - Math.random() * 0.1, gravity: 0.0006, spin: jitter(0.014), prio: true });
    for (let i = 0; i < bits(4, p.density); i++)
      p.spawn({ frames: PACK['fire-smoke'], x: cx + jitter(22), y: cy - 10 + jitter(8), scale: 1.6, life: 1200, delay: i * 80, vy: -0.03, grow: 0.0006, alpha: 0.7 });
    // (the crater: a scorched ellipse that glows, then cools and fades)
    const crater = new Graphics();
    crater.ellipse(cx, cy, 36, 18).fill({ color: 0x1a0c06, alpha: 0.7 });
    crater.ellipse(cx, cy, 24, 12).fill({ color: 0xff7a2a, alpha: 0.6 });
    this.root.addChildAt(crater, 0);
    let t = 0;
    this.items.push({
      view: crater,
      step: (dt) => {
        t += dt;
        crater.alpha = Math.min(1, (2200 - t) / 1200);
        return t < 2200;
      },
    });
    this.flash(0.45, 260);
    this.trauma = Math.min(1, this.trauma + 0.6);
  }

  /** A spell goes off: the 3x3 lit for a moment (a poison cloud's for as long as it lingers), and, for the ones that go everywhere, nothing here (the `spellfx` events light each fighter). */
  private spell(b: Battle, e: Extract<BattleEvent, { kind: 'spell' }>): void {
    if (e.id === 'meteor') return;
    // (the spell's own circle, nova or pillar at the tapped tile; an everywhere spell has none, only the shake of a quake)
    if (e.id === 'quake') this.trauma = Math.max(this.trauma, 0.7);
    if (SPELLS[e.id].target === 'all') return;
    const [cx, cy] = this.tilePos(b, e.u, e.v);
    for (const c of SPELL_CAST[e.id]) play(this.particles, c.key, cx, cy - 2, { scale: c.scale, frameMs: 70 });
    // (frost ices the ground: spikes of ice rise on each tile of the 3x3)
    if (e.id === 'frost')
      for (let du = -1; du <= 1; du++)
        for (let dv = -1; dv <= 1; dv++)
          if (tileAt(b.board, e.u + du, e.v + dv)) {
            const [tx, ty] = this.tilePos(b, e.u + du, e.v + dv);
            play(this.particles, 'ice-spikes', tx, ty, { scale: 1.2, frameMs: 80, add: false, delay: (Math.abs(du) + Math.abs(dv)) * 60 });
          }
    if (e.id === 'smite' || e.id === 'chain') {
      this.flash(0.3, 200);
      this.trauma = Math.max(this.trauma, 0.45);
    }
    const { color, ms } = SPELL_GLOW[e.id];
    const g = new Graphics();
    this.root.addChild(g);
    let t = 0;
    let puffedAt = 0;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        g.clear();
        // (a poison cloud keeps boiling: a puff of green rises from a tile of it now and then, with bubbles over it)
        if (e.id === 'poison' && t - puffedAt >= 160 && this.particles.rate(1)) {
          puffedAt = t;
          const [px, py] = this.tilePos(b, e.u + Math.round(jitter(1)), e.v + Math.round(jitter(1)));
          this.particles.spawn({ frames: PACK['poison-smoke'], x: px + jitter(12), y: py - 4, scale: 1.1, life: 900, vy: -0.02, grow: 0.0005, alpha: 0.6, add: true });
          if (this.particles.rate(0.5)) this.particles.spawn({ frames: PACK['poison-status'], x: px + jitter(12), y: py - 10, scale: 1, life: 700, vy: -0.03, add: true });
        }
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
    const touch = SPELL_TOUCH[e.id];
    if (touch) play(this.particles, touch.key, s.x, s.y - s.tall * touch.at - 2, { scale: Math.max(0.8, (s.tall * touch.size) / 32), frameMs: 70 });
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

  /** A snare on a tile: a dark ring that waits there (and goes out when it is sprung or runs down). */
  private trap(b: Battle, u: number, v: number, ms: number): void {
    const view = new Graphics();
    const [x, y] = this.tilePos(b, u, v);
    view.ellipse(0, 0, TW * 0.22, TH * 0.22).stroke({ width: 2, color: 0xe8c860 });
    view.ellipse(0, 0, TW * 0.12, TH * 0.12).fill({ color: 0x3a2a14, alpha: 0.8 });
    view.position.set(x, y);
    this.root.addChild(view);
    this.anim(magic.earthBurst, x, y - 6, 0.9, 60);
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        const live = b.traps?.some((tr) => tr.u === u && tr.v === v);
        view.alpha = 0.6 + 0.3 * Math.sin(t / 250);
        if (!live && t > 200) this.anim(magic.earthBurst, x, y - 6, 1.3, 50);
        return live === true || t <= 200 ? t < ms : false;
      },
    });
  }

  private number(n: number, x: number, y: number, heavy: boolean, onHero: boolean): void {
    if (!settings().numbers) return;
    const txt = new Text({
      text: String(n),
      style: { fontFamily: "'Press Start 2P', monospace", fontWeight: 'normal', fontSize: heavy ? 12 : 9, fill: onHero ? 0xff7a6a : heavy ? 0xffd34a : 0xffffff, stroke: { color: 0x1a1008, width: 3 } },
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

  /** A line between two fighters: lightning jumping (jagged, a white core in a blue glow, a crack at each end), the Kitsune's
   *  charm (a wavy pink thread with hearts) or the Warlock's hex (a wavy violet thread with smoke). */
  private arc(fromId: number, toId: number): void {
    const a = this.sprites.get(fromId);
    const c = this.sprites.get(toId);
    if (!a || !c) return;
    const style = arcStyle(a.unit.def);
    const [x0, y0, x1, y1] = [a.x, a.y - a.tall * 0.5, c.x, c.y - c.tall * 0.5];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    const g = new Graphics();
    g.blendMode = 'add';
    this.root.addChild(g);
    const colour = style === 'lightning' ? [0x6aa8ff, 0xffffff] : style === 'charm' ? [0xff6aa8, 0xffd0e8] : [0x8a4aff, 0xe0c0ff];
    const life = style === 'lightning' ? 340 : 520;
    let t = 0;
    let drawn = -1;
    if (style === 'lightning') {
      play(this.particles, 'lightning-hit', x0, y0, { scale: 1.1, frameMs: 45 });
      play(this.particles, 'lightning-hit', x1, y1, { scale: 1.3, frameMs: 45 });
    } else this.thread(x0, y0, x1, y1, style === 'charm' ? 'light-sparkle' : 'dark-puff');
    if (style === 'charm') for (let i = 0; i < 3; i++) this.particles.spawn({ frames: VFX.pinkHeart, x: x0, y: y0, scale: 0.6, life: 480, delay: i * 90, vx: (x1 - x0) / 480, vy: (y1 - y0) / 480 - 0.02, add: true });
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        const frame = Math.floor(t / 70);
        // (a lightning bolt flickers into a new path every 70 ms; a thread sways)
        if (frame !== drawn) {
          drawn = frame;
          g.clear();
          const pts: [number, number][] = [[x0, y0]];
          const n = 8;
          for (let i = 1; i < n; i++) {
            const k = i / n;
            const off = style === 'lightning' ? jitter(9) : Math.sin(k * Math.PI * 2 + t / 120) * 7;
            pts.push([x0 + (x1 - x0) * k + nx * off, y0 + (y1 - y0) * k + ny * off]);
          }
          pts.push([x1, y1]);
          for (const [w, col, al] of [[6, colour[0], 0.5], [2.5, colour[1], 1]] as const) {
            g.moveTo(pts[0][0], pts[0][1]);
            for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
            g.stroke({ color: col, width: w, alpha: al, cap: 'round', join: 'round' });
          }
          // (a short fork off the middle of a bolt)
          if (style === 'lightning') {
            const [mx, my] = pts[4];
            g.moveTo(mx, my).lineTo(mx + nx * 14 + jitter(4), my + ny * 14 + jitter(4)).stroke({ color: colour[0], width: 2, alpha: 0.8 });
          }
        }
        g.alpha = Math.min(1, (1 - t / life) * 1.6);
        return t < life;
      },
    });
  }

  /** A shot leaves its shooter and flies to the target along its arc, turned to its heading: an arrow or a bone, a glowing
   *  orb of the shooter's element (with a trail of its own), or a bullet's tracer. It leaves in a muzzle flash, and the
   *  shooter kicks back a little. Where it lands is the `hit` event's: the element's burst. */
  private shot(byId: number, toId: number, kind: Shot, ms: number): void {
    const by = this.sprites.get(byId);
    const to = this.sprites.get(toId);
    if (!by || !to) return;
    const m: Missile = missileOf(kind, defOf(by.unit).name);
    const x0 = by.x;
    const y0 = by.y - by.tall * 0.55;
    const aim = Math.atan2(to.y - by.y, to.x - by.x);
    if (m.muzzle) {
      play(this.particles, packKey(m.el, 'hit'), x0 + Math.cos(aim) * 8, y0 + Math.sin(aim) * 4, { scale: m.look === 'tracer' ? 1.3 : 0.9, frameMs: 40 });
      if (m.look === 'tracer')
        for (let i = 0; i < bits(3, this.particles.density); i++) this.particles.spawn({ frames: VFX.puffWhite, x: x0 + Math.cos(aim) * 10, y: y0 + Math.sin(aim) * 5, scale: 0.4, life: 420, vx: Math.cos(aim) * 0.03 + jitter(0.01), vy: -0.02, grow: 0.0008, alpha: 0.8 });
    }
    by.nudge(-Math.cos(aim) * 2, -Math.sin(aim));
    const orb = m.look === 'orb' ? PACK[packKey(m.el, 'orb')] : undefined;
    const sp = new Sprite(m.look === 'arrow' ? arrow : m.look === 'bone' ? bone : orb?.[0]);
    sp.anchor.set(0.5);
    sp.scale.set(m.scale);
    if (orb) sp.blendMode = 'add';
    const g = m.look === 'tracer' ? new Graphics() : undefined;
    if (g) g.blendMode = 'add';
    const view: Container = g ?? sp;
    this.root.addChild(view);
    const place = (f: number) => {
      const x1 = to.x;
      const y1 = to.y - to.tall * 0.45;
      const arc = m.arc.min + Math.hypot(x1 - x0, y1 - y0) * m.arc.share;
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - Math.sin(Math.PI * f) * arc] as const;
    };
    const trail = m.look === 'arrow' ? VFX.sparkleWhite : PACK[packKey(m.el, m.el === 'fire' || m.el === 'ice' || m.el === 'poison' ? 'puff' : m.el === 'dark' ? 'smoke' : 'sparkle')];
    let t = 0;
    let trailAt = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        const f = Math.min(1, t / ms);
        const [x, y] = place(f);
        const [nx, ny] = place(Math.min(1, f + 0.05));
        const heading = Math.atan2(ny - y, nx - x);
        if (g) {
          // a bullet: a bright streak behind a white head
          g.clear();
          g.moveTo(x - Math.cos(heading) * 16, y - Math.sin(heading) * 16).lineTo(x, y).stroke({ color: 0xffd27a, width: 2, alpha: 0.9, cap: 'round' });
          g.circle(x, y, 1.6).fill(0xffffff);
        } else {
          sp.position.set(x, y);
          if (orb) {
            sp.texture = orb[Math.floor(t / 70) % orb.length];
            if (m.spin) sp.rotation += dt * 0.012;
          } else sp.rotation = m.spin ? t * 0.02 : heading;
        }
        // a trail behind it: puffs of its element, a faint glint behind an arrow
        if (t - trailAt >= m.trailMs && trail?.length && this.particles.rate(1)) {
          trailAt = t;
          this.particles.spawn({ frames: trail, x: x + jitter(3), y: y + jitter(3), scale: orb ? 0.5 : 0.3, life: orb ? 320 : 220, vy: -0.015, alpha: orb ? 0.85 : 0.6, add: true });
        }
        return f < 1;
      },
    });
  }

  /** A spear's thrust: the shaft runs out two thirds of the way to the foe and snaps back. */
  private thrust(by: UnitSprite, to: UnitSprite): void {
    const sp = new Sprite(arrow);
    sp.anchor.set(0.5);
    sp.scale.set(1.1);
    sp.tint = 0xe8d8b8;
    sp.rotation = Math.atan2(to.y - by.y, to.x - by.x);
    this.root.addChild(sp);
    const [x0, y0, x1, y1] = [by.x, by.y - by.tall * 0.5, to.x, to.y - to.tall * 0.5];
    let t = 0;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const f = t < 110 ? t / 110 : 1 - (t - 110) / 110;
        const k = 0.2 + 0.65 * Math.max(0, f);
        sp.position.set(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
        return t < 220;
      },
    });
  }
}
