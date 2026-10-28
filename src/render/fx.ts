// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { TERRAIN_URLS } from './terrainArt';
import { loadImage } from './loadImage';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Battle, type BattleEvent, type Unit } from '../sim/battle';
import { isBoss } from '../sim/foes';
import { kitOf } from '../sim/abilities';
import { abilityHeading } from './abilityLooks';
import { abilityFrames, loadAbilityArt } from './abilityArt';
import { SPELL_SIGNATURES } from './spellSignatures';
import { SPELLS } from '../sim/spells';
import type { Shot } from '../sim/units';
import { settings } from '../settings';
import { at, facesRight, TH, TW } from './iso';
import { fadeTrauma, popScale, shakeOf, traumaFor } from './juiceRules';
import { BIG_FOE_HP, SKILL_FX, SPELL_GLOW, SPELL_WORD, type Effect, type MagicKey } from './skillFx';
import type { UnitSprite } from './unitView';
import { Particles } from './particles';
import { loadVfxArt, VFX } from './vfxArt';
import { loadPackArt, PACK } from './fxSheets';
import { bossEntrance, deathBurst, impactBurst, play, setBoneArt, windUp } from './combatFx';
import { comboGather, comboStrike, promoteBurst, ringOut, toneColour, type Spot } from './spectacle';
import { comboById, COMBO_NAME } from '../sim/combos';
import { tierRing } from './signatures';
import { kitSignature } from './kitLooks';
import { loadProps, playSteps, setSignatureSprite, type Pt, type Scene } from './signatureFx';
import { tierSkillOf } from '../sim/tierSkills';
import { arcStyle, bits, FLASH_MAX, FLASH_MS, ULT_TINT, deathKind, hitStopMs, impactElement, missileOf, nudgeOf, packKey, skillElement, SPELL_CAST, type Missile } from './fxRules';
import { particleBudget, slashOf } from './vfxRules';
import { placeLabel } from './labelRules';
import { HAZARD_LOOKS } from './hazardLooks';
import { loadPaintedArt, paintedStrip, paintSprite } from './cinematicArt';
import type { Element, Family } from './fxRules';

/** Shapes for the legacy named skill cues; their scale and release timing remain the skill's own. */
const MAGIC: Record<MagicKey, readonly [Element, Family]> = {
  bloodExplosion: ['blood', 'explosion'], darkCircle: ['dark', 'circle'], darkSlash: ['dark', 'slash'],
  earthBurst: ['earth', 'hit'], earthExplosion: ['earth', 'explosion'], earthShield: ['light', 'shield'], earthWave: ['earth', 'wave'],
  fireCircle: ['fire', 'circle'], fireExplosion: ['fire', 'explosion'], goldBurst: ['light', 'nova'],
  iceShield: ['ice', 'shield'], lightCircle: ['light', 'circle'], lightGather: ['forest', 'gather'],
  lightNova: ['light', 'nova'], lightningBurst: ['lightning', 'hit'], lightningStrike: ['lightning', 'strike'],
  moonSlash: ['wind', 'slash'], pinkHeart: ['light', 'gather'], whiteBurst: ['wind', 'hit'],
  windBurst: ['wind', 'hit'], windVortex: ['wind', 'vortex'], windWave: ['wind', 'wave'],
};

interface Strip {
  frames: Texture[];
}

let impact: Strip;
let fire: Strip;
let arrow: Texture;
let bone: Texture;
let magic: Record<MagicKey, Strip>;

export async function loadFx(): Promise<void> {
  await loadPaintedArt();
  impact = { frames: paintedStrip('light', 'hit') };
  fire = { frames: paintedStrip('fire', 'flame') };
  arrow = paintedStrip('wind', 'orb', 'arrow')[0];
  bone = paintedStrip('earth', 'orb', 'bone')[0];
  setBoneArt(bone);
  setSignatureSprite('arrow', arrow);
  const keys = Object.keys(MAGIC) as MagicKey[];
  const strips = keys.map(k => ({ frames: paintedStrip(...MAGIC[k]) }));
  magic = Object.fromEntries(keys.map((k, i) => [k, strips[i]])) as Record<MagicKey, Strip>;
  await loadVfxArt();
  await loadPackArt();
  magic.pinkHeart = { frames: VFX.pinkHeart };
  await Promise.all([loadProps(), loadAbilityArt()]);
  // (the hero kits' terrain: a rampart's ruined walls, a statue's stone, a keg's barrel; the pack's own props, as the board draws them)
  const tex = async (url: string) => Texture.from(await loadImage(url));
  kitArt = { walls: await Promise.all(TERRAIN_URLS.walls.map(tex)), barrel: await tex(TERRAIN_URLS.barrel) };
}

/** The props the hero kits' terrain is drawn with (`loadFx`). */
let kitArt: { walls: Texture[]; barrel: Texture } | null = null;
/** The words a kit's mark shows over the fighter it is on. */
const MARK_WORDS: Record<string, string> = {
  parry: 'Parry', smoke: 'Smoke', pinned: 'Pinned', charged: 'Charged', vow: "Martyr's Vow", hunter: 'Hunter', brute: 'Brute', dance: 'Dancing',
  stone: 'Stone', puppet: 'Puppet', siege: 'Anchored', angel: 'Watched', rewind: 'Rewound', prey: 'Prey', suppressed: 'Pinned down',
  dirge: 'Dirge', anthem: 'Anthem', bounty: 'Bounty', condemned: 'Condemned',
};

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
  /** The fight's own clock in ms, and the text labels still on the screen (fading ones too), so a new one never lands on them. */
  private clock = 0;
  private shownLabels: Text[] = [];
  /** The room (in world px) the labels may use: the board's area on the screen, set by the page each frame. */
  view = { x0: -1e6, x1: 1e6, y0: -1e6, y1: 1e6 };
  /** The skill names showing, oldest first, each with a way to fade it out early (at most three at a time). */
  private skillStack: { txt: Text; cut: () => void }[] = [];
  /** The skill each caster last cast (its blows' hits read it: a skill or its ultimate). */
  private casting = new Map<number, string>();
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
  /** A camera push the page is asked to make (an ultimate, a combo, a tier 3 promotion): where, how much closer, and for how long; `takePush` hands it over once. */
  private pushReq: { x: number; y: number; zoom: number; ms: number } | null = null;
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
    this.shownLabels = [];
    this.skillStack = [];
    this.trauma = 0;
    this.flashLeft = 0;
    this.slowLeft = 0;
    this.stopLeft = 0;
    this.pushReq = null;
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

  /** The page's next camera push, if one was asked for (and it takes it: the request is made once). */
  takePush(): { x: number; y: number; zoom: number; ms: number } | null {
    const p = this.pushReq;
    this.pushReq = null;
    return p;
  }

  /** Ask for a short camera push on a point (a share closer for `ms`), unless the screen is to stay still. */
  private push(x: number, y: number, zoom: number, ms: number): void {
    if (!this.calm()) this.pushReq = { x, y, zoom, ms };
  }

  /** A brief slow-motion beat, unless the screen is to stay still. */
  private slowMo(ms: number): void {
    if (!this.calm()) this.slowLeft = Math.max(this.slowLeft, ms);
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
    // (a flash is a blink: never more than a third of the screen's brightness, never longer than a tenth of a second)
    peak = Math.min(FLASH_MAX, peak);
    ms = Math.min(FLASH_MS, ms);
    this.flashPeak = Math.max(peak, this.flashLeft > 0 ? this.flashPeak : 0);
    this.flashMs = ms;
    this.flashLeft = ms;
  }

  /** Show what a tick of the fight did. */
  show(b: Battle, events: BattleEvent[]): void {
    const budget = particleBudget(settings().saver);
    this.particles.density = budget.density;
    this.particles.cap = budget.cap;
    this.particles.calm = this.calm();
    this.enter(b);
    let royalSky: 'meteor' | 'starfall' | undefined;
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
      } else if (e.kind === 'boom') this.boom(b, e.u, e.v);
      else if (e.kind === 'hazard') this.hazard(b, e);
      else if (e.kind === 'dash' || e.kind === 'blink') this.streak(b, e);
      else if (e.kind === 'phase') this.phaseShock(e.by);
      else if (e.kind === 'comboCast') this.comboCast(e);
      else if (e.kind === 'comboLand') this.comboLand(b, e);
      else if (e.kind === 'burst') this.burst(e);
      else if (e.kind === 'area') this.area(b, e, royalSky);
      else if (e.kind === 'spell') {
        if (e.id === 'meteor' || e.id === 'starfall') royalSky = e.id;
        const recipients = new Set(events.filter((touch): touch is Extract<BattleEvent, { kind: 'spellfx' }> => touch.kind === 'spellfx' && touch.id === e.id).map(touch => touch.to));
        this.spell(b, e, recipients);
      }
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
      } else if (e.kind === 'zone') {
        if (e.what === 'spikes') this.spikes(b, e.u, e.v, e.ms);
        else this.zone(b, e.u, e.v, e.ms);
      }
      else if (e.kind === 'trap') this.trap(b, e.u, e.v, e.ms);
      else if (e.kind === 'terrain') this.kitTerrain(b, e);
      else if (e.kind === 'mark') this.kitMark(e);
      else if (e.kind === 'hit') {
        const to = this.sprites.get(e.to);
        const by = b.units.find((x) => x.id === e.by);
        const target = b.units.find((x) => x.id === e.to);
        if (!to || !target) continue;
        // Royal hits already have an individual spellfx or meteor landing. Poison ticks keep their own toxic motif.
        if (!by) {
          if (e.src === 'dot') {
            const frames = abilityFrames('spell:poison', 'puff');
            if (frames) this.particles.spawn({ frames, art: 'spell:poison', x: to.x, y: to.y - to.tall * 0.45, scale: 0.9, life: 300, alpha: 0.65 });
          }
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
        const castName = e.src === 'skill' ? this.casting.get(e.by) ?? kitOf(by)?.skill.name ?? '' : '';
        const signature = kitSignature(castName)?.hit;
        const skillFx = e.src === 'skill' && !signature ? SKILL_FX[castName]?.hit : undefined;
        // (the spark grows with the blow: a scratch is small, a half-health blow fills the struck)
        const spark = Math.min(2, 0.6 + (e.dmg / target.maxHp) * 3);
        // (a raised guard turns the blow aside: a bright block, and the word)
        if (e.src === 'blow' && target.guardUntil !== undefined && target.guardUntil > b.t) {
          this.label('Block', to.x, to.y - to.tall - 10, 0xbfe3ff, 12);
          this.anim({ frames: VFX.hitLight }, to.x, to.y - to.tall * 0.5, 1.2, 50);
        }
        const hx = to.x;
        const hy = to.y - to.tall * 0.45;
        if (signature) {
          // (a hero's skill has a look of its own: no shared burst on top)
          const spot = { x: hx, y: to.y, tall: to.tall };
          playSteps(signature, { p: this.particles, self: spot, foes: [spot], allies: [spot], dir: { x: 0, y: 1 }, ms: 0, size: kitOf(by)?.ultimate?.name === castName ? 1.25 : 1 });
        } else if (skillFx) {
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
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero', e.high);
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
        // (the struck is knocked a little away along the blow, and a crit or a killing blow stops the fight for a moment)
        const share = e.dmg / target.maxHp;
        const byS = this.sprites.get(e.by);
        if (byS && !e.splash) {
          const way = Math.atan2(to.y - byS.y, to.x - byS.x);
          // A brief fan carries the blow's direction without covering the target.
          if (e.src === 'blow' && !defOf(by).shot) {
            const count = bits(e.heavy ? 7 : 3, this.particles.density);
            for (let i = 0; i < count; i++) {
              const a = way + (i / Math.max(1, count - 1) - 0.5) * 1.7;
              this.particles.spawn({ frames: PACK['light-sparkle'], x: hx, y: hy, scale: e.heavy ? 0.5 : 0.3, life: 200 + i * 20, vx: Math.cos(a) * 0.13, vy: Math.sin(a) * 0.09 - 0.025, gravity: 0.00025, grow: -0.0006, tint: e.heavy ? 0xffd474 : 0xbce8f1, alpha: 0.75, add: true });
            }
          }
          const n = nudgeOf(share);
          to.nudge(Math.cos(way) * n, Math.sin(way) * n * 0.5);
        }
        this.stopLeft = Math.max(this.stopLeft, hitStopMs(e.heavy, share, e.killed, this.calm()));
        if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
        if (e.heavy && e.src === 'blow') {
          // (a crit, or a blow from height: a gold burst; a big one, a third of the target's health or more, also blinks the screen)
          this.anim(magic.goldBurst, to.x, to.y - to.tall * 0.45, 1.3, 60);
          play(this.particles, 'light-cross', to.x, to.y - to.tall * 0.45, { scale: 1.6, frameMs: 50 });
          if (share >= 0.3) this.flash(0.3, 100);
          this.trauma = Math.min(1, this.trauma + 0.25);
        }
        if (e.killed && target.side === 'foe' && target.maxHp >= BIG_FOE_HP) {
          this.anim(magic.bloodExplosion, to.x, to.y - to.tall * 0.45, 2.2, 60);
          // (the boss's own beat: a fire burst on it, smoke, and a slow moment for the fall)
          this.anim(magic.fireExplosion, to.x, to.y - to.tall * 0.45, 3.2, 70);
          for (let i = 0; i < 3; i++) this.particles.spawn({ frames: VFX.smokeDark, x: to.x + jitter(18), y: to.y - to.tall * 0.4 + jitter(10), scale: 1.6, life: 900, vy: -0.03, grow: 0.0006, alpha: 0.8 });
          this.slowLeft = 700;
          this.flash(0.35, 120);
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
      scale: 2,
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

  /** A fighter is called up mid-fight (a treant, imps, a decoy): a circle and a pillar of its element under it, a nova and motes. */
  summoned(b: Battle, u: Unit): void {
    const [x, y] = this.tilePos(b, u.u, u.v);
    const el = u.def === 'treant' ? 'forest' : u.def === 'decoy' ? 'dark' : 'fire';
    play(this.particles, packKey(el, 'circle'), x, y - 2, { scale: 1.8, frameMs: 70 });
    play(this.particles, packKey(el, 'pillar'), x, y - 14, { scale: 1.5, frameMs: 70 });
    play(this.particles, packKey(el, 'nova'), x, y - 12, { scale: 1.6, frameMs: 60 });
    this.puffAt(x, y, 'white', 1.1);
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

  /** A boss changes form: one shockwave rolls out of it (once, no loops), the screen shakes and blinks white (a short, soft flash). */
  private phaseShock(id: number): void {
    const s = this.sprites.get(id);
    if (!s) return;
    play(this.particles, 'dark-wave', s.x, s.y + 2, { scale: 5, frameMs: 90 });
    play(this.particles, 'blood-circle', s.x, s.y - 2, { scale: 4, life: 700, frameMs: 90, alpha: 0.8 });
    this.trauma = Math.max(this.trauma, 0.8);
    this.flash(0.35, 110);
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
    this.clock += dt;
    this.trauma = fadeTrauma(this.trauma, dt / 1000);
    const s = this.calm() ? 0 : shakeOf(this.trauma);
    this.shakeX = s ? (Math.random() * 2 - 1) * s : 0;
    this.shakeY = s ? (Math.random() * 2 - 1) * s : 0;
    this.particles.calm = this.calm();
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
    let peak: number | undefined;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        peak ??= sp.alpha * 0.9;
        const f = Math.floor(t / frameMs);
        if (f >= s.frames.length) return false;
        sp.texture = s.frames[f];
        paintSprite(sp, t, s.frames.length * frameMs, scale, 0, peak, false, this.calm());
        return true;
      },
    });
    return sp;
  }

  /** A painted skill cue, played on a point with its own size, timing and tint. */
  private effect(e: Effect, x: number, y: number): Sprite {
    const sp = this.anim(magic[e.sheet], x, y, e.scale, e.frameMs ?? 70);
    if (e.tint !== undefined) sp.tint = e.tint;
    return sp;
  }

  /** A line of text that rises and fades. */
  private label(text: string, x: number, y: number, fill: number, size: number, life = 900, plain = false): { txt: Text; cut: () => void } {
    // (a `plain` label is the new banners': the exact size given, a multiple of 12, in the regular weight)
    const txt = new Text({ text, style: { fontFamily: "'Alegreya Sans', 'Trebuchet MS', sans-serif", fontWeight: plain ? 'normal' : 'bold', fontSize: plain ? size : size + 2, fill, stroke: { color: 0x1a1008, width: 3 } }, resolution: 3 });
    txt.anchor.set(0.5, 1);
    // (lifted above every label still showing, the fading ones too, so two never overprint)
    this.shownLabels = this.shownLabels.filter((o) => !o.destroyed);
    // (the same word over the same fighter while the last is still up, a run of blocks say, shows once rather than as a tower)
    const twin = this.shownLabels.find((o) => o.text === text && o.alpha > 0.5 && Math.abs(o.x - x) < 40);
    if (twin) {
      txt.destroy();
      return { txt: twin, cut: () => {} };
    }
    const spot = placeLabel(this.shownLabels.map((o) => ({ x: o.x, y: o.y, w: o.width, h: o.height })), { x, y, w: txt.width, h: txt.height }, this.view);
    // (a banner is wide: it stays inside the room the board has on the screen)
    if (plain) spot.x = Math.max(this.view.x0 + txt.width / 2 + 4, Math.min(this.view.x1 - txt.width / 2 - 4, spot.x));
    txt.position.set(spot.x, spot.y);
    this.root.addChild(txt);
    this.shownLabels.push(txt);
    let t = 0;
    let cutFor = -1;
    this.items.push({
      view: txt,
      step: (dt) => {
        t += dt;
        txt.y -= dt * 0.02;
        txt.alpha = t > life * 0.6 ? 1 - (t - life * 0.6) / (life * 0.4) : 1;
        if (cutFor >= 0) {
          cutFor += dt;
          txt.alpha = Math.min(txt.alpha, 1 - cutFor / 200);
          return cutFor < 200 && t < life;
        }
        return t < life;
      },
    });
    // (a way to fade it out early: its fade starts now and takes 200 ms)
    return { txt, cut: () => void (cutFor = Math.max(cutFor, 0)) };
  }

  /** A skill goes off: its name over the caster, a wind-up circle and motes for the length of the cast, and its own effect at
   *  the caster's feet. An ultimate dims the world, flashes and ends in a nova; a boss's skill rumbles. */
  private skillName(byId: number, name: string, ms: number): void {
    const by = this.sprites.get(byId);
    if (!by) return;
    const ultimate = kitOf(by.unit)?.ultimate?.name === name;
    const boss = by.unit.side === 'foe' && isBoss(by.unit.def);
    const el = skillElement(name);
    // (three skill names at most: the oldest fades out early when a fourth comes)
    this.skillStack = this.skillStack.filter((l) => !l.txt.destroyed);
    while (this.skillStack.length >= 3) this.skillStack.shift()!.cut();
    this.skillStack.push(this.label(name, by.x, by.y - by.tall - 20, ultimate ? 0xfff2a0 : boss ? 0xff9a8a : 0xffe27a, ultimate || boss ? 15 : 13, 1200));
    this.casting.set(byId, name);
    const signature = kitSignature(name);
    if (signature) playSteps(signature.wind, this.sceneOf(by, ms, ultimate ? 1.45 : 1.15));
    else windUp(this.particles, el, by.x, by.y, ms, by.tall, ultimate || boss);
    const cast = signature ? undefined : SKILL_FX[name]?.cast;
    if (signature) this.later(ms, () => playSteps(signature.cast, this.sceneOf(this.sprites.get(byId) ?? by, ms, ultimate ? 1.45 : 1.15)));
    if (ultimate) {
      this.trauma = Math.max(this.trauma, 0.5);
      this.flash(0.3, 100);
      this.dim(0.45, ms + 900);
      // (the camera leans in on the caster for the cast, and the moment of the nova lands in a beat of slow motion and a freeze frame)
      this.push(by.x, by.y - by.tall * 0.5, 1.2, ms + 600);
      // (the wind-up ends in a nova and a ring of the element, with a second flash and a hard shake)
      const [x, y] = [by.x, by.y];
      this.later(ms, () => {
        // (thin layers in the element's colour, so the nova reads as a nova and does not saturate; a hero with a look of its own plays that instead)
        const tint = ULT_TINT[el];
        if (!signature) {
          play(this.particles, packKey(el, 'nova'), x, y - by.tall * 0.4, { scale: 3, frameMs: 80, alpha: 0.6, tint });
          play(this.particles, packKey(el, 'wave'), x, y, { scale: 4, frameMs: 90, add: false, alpha: 0.7, tint });
          // (a storm of wind has lightning in it: bolts crack down round the caster)
          if (el === 'wind')
            for (let i = 0; i < bits(5, this.particles.density); i++)
              play(this.particles, 'lightning-strike', x + jitter(46), y - 4 + jitter(16), { scale: 1.6, frameMs: 55, delay: i * 90, tint: 0xa8e4ff, alpha: 0.85 });
        }
        this.flash(0.35, 110);
        this.trauma = Math.min(1, this.trauma + 0.45);
        if (!signature) play(this.particles, packKey(el, 'pillar'), x, y - by.tall * 0.6, { scale: 3.2, frameMs: 80, alpha: 0.7, tint });
        this.slowMo(450);
        if (!this.calm()) this.stopLeft = Math.max(this.stopLeft, 70);
      });
    } else if (by.unit.side === 'hero' && !signature) {
      // (an ordinary hero skill ends in a ring of its element, a little bigger than the cast's circle)
      this.later(ms, () => play(this.particles, packKey(el, 'wave'), by.x, by.y, { scale: 2.4, frameMs: 70, alpha: 0.55 }));
    } else if (boss) {
      this.trauma = Math.max(this.trauma, 0.4);
      if (!signature) this.later(ms, () => play(this.particles, packKey(el, 'wave'), by.x, by.y, { scale: 3, frameMs: 90 }));
    }
    if (cast) {
      const sp = this.effect(cast, by.x, by.y - 4);
      // (an ultimate's cast sheet is drawn big: kept in its element's colour and thinned)
      if (ultimate) {
        sp.alpha = 0.6;
        if (ULT_TINT[el] !== undefined) sp.tint = ULT_TINT[el]!;
      }
    } else if (!signature) this.anim(impact, by.x, by.y - 4, 1.6, 40);
  }

  /** Where the caster, the foes nearest it and its friends are drawn, for a signature to be played against. */
  private sceneOf(by: UnitSprite, ms: number, size = 1.15): Scene {
    const near: Pt[] = [];
    const friends: Pt[] = [];
    for (const s of this.sprites.values()) {
      if (s === by || !s.unit.alive) continue;
      (s.unit.side === by.unit.side ? friends : near).push({ x: s.x, y: s.y, tall: s.tall });
    }
    const dist = (a: Pt) => (a.x - by.x) ** 2 + (a.y - by.y) ** 2;
    near.sort((a, b) => dist(a) - dist(b));
    friends.sort((a, b) => dist(a) - dist(b));
    near.length = Math.min(near.length, 6);
    friends.length = Math.min(friends.length, 6);
    let dx = facesRight(by.unit.facing) ? 1 : -1;
    let dy = 0.25;
    if (near.length) {
      const [vx, vy] = [near[0].x - by.x, near[0].y - by.y];
      const len = Math.hypot(vx, vy) || 1;
      [dx, dy] = [vx / len, vy / len];
    }
    return { p: this.particles, self: { x: by.x, y: by.y, tall: by.tall }, foes: near, allies: friends, dir: { x: dx, y: dy }, ms, size };
  }

  /** A tier skill's ring goes out from its caster, in the element of its skill. */
  private burst(e: Extract<BattleEvent, { kind: 'burst' }>): void {
    if (e.tone !== 'tier') return;
    const by = this.sprites.get(e.by);
    if (!by) return;
    const skillName = kitOf(by.unit)?.skill.name ?? '';
    // (a hero's tier ring is its skill's own look again; a foe's is the element's wave)
    if (kitSignature(skillName)) playSteps(tierRing(skillName, e.reach * 64, (by.unit.grade ?? 1) > 2), this.sceneOf(by, 600, 1));
    else ringOut(this.particles, skillElement(skillName), by.x, by.y, e.reach);
    this.trauma = Math.max(this.trauma, 0.15);
  }

  /** Where the fighters of these ids are drawn (those with a sprite). */
  private spotsOf(ids: readonly number[]): Spot[] {
    return ids.flatMap((id) => this.sprites.get(id) ?? []).map((s) => ({ x: s.x, y: s.y, tall: s.tall }));
  }

  /** A combo's five begin their move: the world dims, the camera leans in on the five, they gather in a ring of runes and motes, and the move's name is written over them. */
  private comboCast(e: Extract<BattleEvent, { kind: 'comboCast' }>): void {
    const combo = comboById(e.id);
    const spots = this.spotsOf(e.by);
    if (!combo || !spots.length) return;
    const cx = spots.reduce((n, s) => n + s.x, 0) / spots.length;
    const cy = spots.reduce((n, s) => n + s.y, 0) / spots.length;
    comboGather(this.particles, combo.tone, spots, e.ms);
    this.dim(0.55, e.ms + 700);
    this.push(cx, cy - 20, 1.25, e.ms + 500);
    this.trauma = Math.max(this.trauma, 0.3);
    const colour = toneColour(combo.tone);
    this.label(COMBO_NAME, cx, cy - 96, colour, 12, e.landMs + 100, true);
    this.label(combo.move, cx, cy - 72, 0xfff2a0, 24, e.landMs + 200, true);
  }

  /** The move lands: a nova and rings from the middle of the five, a strike on every foe, a white blink, a hard shake, a beat of slow motion and a freeze frame. */
  private comboLand(b: Battle, e: Extract<BattleEvent, { kind: 'comboLand' }>): void {
    const combo = comboById(e.id);
    const s = b.combo;
    if (!combo || !s) return;
    const five = this.spotsOf(s.ids);
    const foes = this.spotsOf(b.units.filter((u) => u.side === 'foe' && u.alive).map((u) => u.id));
    if (!five.length) return;
    const centre = { x: five.reduce((n, p) => n + p.x, 0) / five.length, y: five.reduce((n, p) => n + p.y, 0) / five.length };
    comboStrike(this.particles, combo.tone, centre, foes);
    this.flash(0.35, 110);
    this.trauma = Math.min(1, this.trauma + 0.6);
    this.slowMo(550);
    if (!this.calm()) this.stopLeft = Math.max(this.stopLeft, 90);
  }

  /** A hero is promoted to `grade` (2 or 3): the one call both ways in take, the page's merge after a hire and a sim `promote` event (the Calamity's tier by level). The hero rises in light and scales up a beat; tier 3 adds a pillar of light, a nova, a flash, a short slow-motion, a camera push and a banner with its name and its new skill's. */
  promote(unitId: number, grade: number, quiet = false): void {
    const sp = this.sprites.get(unitId);
    if (!sp || grade < 2) return;
    sp.promote(grade);
    promoteBurst(this.particles, grade, sp.x, sp.y, sp.tall);
    const def = defOf(sp.unit);
    const skill = tierSkillOf(sp.unit.def, grade);
    // (the banner: the name and the tier's skill small, the tier big over them)
    const life = grade > 2 ? 2200 : 1500;
    this.label(skill ? `${def.name} · ${skill.name}` : def.name, sp.x, sp.y - sp.tall - 8, 0xfff2a0, 12, life, true);
    this.label(`Tier ${grade}`, sp.x, sp.y - sp.tall - 22, grade > 2 ? 0xffe27a : 0xdce8ff, grade > 2 ? 24 : 12, life, true);
    this.trauma = Math.max(this.trauma, grade > 2 ? 0.35 : 0.12);
    if (grade < 3) return;
    this.flash(0.35, 110);
    this.dim(0.35, 1000);
    // (between fights the clock and the camera are not the fight's: a quiet promotion leaves them be)
    if (quiet) return;
    this.slowMo(500);
    this.push(sp.x, sp.y - sp.tall * 0.5, 1.3, 1100);
  }

  /** A hero gains a level in the middle of a fight (the Last Stand): a one-shot burst of light round it, a small pop, and "Lv N" over its head. */
  levelUp(unitId: number, level: number): void {
    const sp = this.sprites.get(unitId);
    if (!sp) return;
    sp.promote(2);
    promoteBurst(this.particles, 2, sp.x, sp.y, sp.tall);
    play(this.particles, 'light-pillar', sp.x, sp.y - sp.tall * 0.6, { scale: sp.tall / 24, frameMs: 65, alpha: 0.4, add: false, tint: 0xffdc88 });
    play(this.particles, 'light-wave', sp.x, sp.y, { scale: 2.2, frameMs: 55, alpha: 0.65, tint: 0xffdc88, delay: 100 });
    this.label(`Lv ${level}`, sp.x, sp.y - sp.tall - 14, 0xfff2a0, 12, 1300, true);
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
    if (by && !this.reduced) {
      const count = settings().saver ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const f = (i + 1) / (count + 1);
        const ghost = by.afterimage();
        ghost.position.set(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        ghost.alpha = 0;
        this.root.addChild(ghost);
        let age = -i * 30;
        this.items.push({ view: ghost, step: (dt) => {
          age += dt;
          ghost.alpha = age < 0 ? 0 : 0.32 * Math.max(0, 1 - age / 240);
          return age < 240;
        } });
      }
    }
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
  private area(b: Battle, e: Extract<BattleEvent, { kind: 'area' }>, royalSky?: 'meteor' | 'starfall'): void {
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
    const skyArt = e.by === 0 ? `spell:${royalSky ?? 'meteor'}` : `skill:${this.casting.get(e.by) ?? 'Meteor'}`;
    const orbFrames = abilityFrames(skyArt, 'orb') ?? PACK['fire-orb'];
    const ball = new Sprite(orbFrames[0]);
    ball.anchor.set(0.5);
    ball.scale.set(3);
    ball.blendMode = 'normal';
    ball.rotation = Math.atan2(360, -150) - abilityHeading(skyArt);
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
        const pulse = 0.2;
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
            this.meteorLanding(cx, cy, skyArt);
          }
        }
        return t < e.ms;
      },
    });
  }

  /** The land acts (`sim/hazards.ts`). Told: its tiles are marked in its colour, the mark swelling as it comes (steady with reduced motion), and
   *  its word shown once over them; it goes off: its strips play on each tile. */
  private hazard(b: Battle, e: Extract<BattleEvent, { kind: 'hazard' }>): void {
    const look = HAZARD_LOOKS[e.what];
    const w = b.board.w;
    const spots = e.tiles.map((i) => this.tilePos(b, i % w, Math.floor(i / w)));
    if (!spots.length) return;
    if (e.phase === 'tell') {
      const view = new Container();
      this.root.addChildAt(view, 0);
      for (const [x, y] of spots) {
        const g = new Graphics();
        g.poly([0, -TH / 2 + 3, TW / 2 - 5, 0, 0, TH / 2 - 3, -TW / 2 + 5, 0])
          .fill({ color: look.colour, alpha: 0.45 })
          .stroke({ color: look.colour, alpha: 1, width: 2.5 });
        g.position.set(x, y);
        view.addChild(g);
      }
      if (look.word) {
        const mx = spots.reduce((a, s) => a + s[0], 0) / spots.length;
        const my = Math.min(...spots.map((s) => s[1]));
        // (the word in its colour lifted halfway to white, so it reads over dark ground too)
        const c = look.colour;
        const pale = (((((c >> 16) & 255) + 255) >> 1) << 16) | (((((c >> 8) & 255) + 255) >> 1) << 8) | (((c & 255) + 255) >> 1);
        this.label(look.word, mx, my - 26, pale, 14, Math.min(1600, e.ms + 300));
      }
      const calm = this.calm();
      let t = 0;
      this.items.push({
        view,
        step: (dt) => {
          t += dt;
          // (it grows surer as it comes: the mark breathes faster and brighter, and never blinks out)
          const k = Math.min(1, t / e.ms);
          view.alpha = calm ? 0.9 : 0.65 + 0.25 * k + 0.1 * Math.sin((t / (260 - 160 * k)) * Math.PI);
          return t < e.ms;
        },
      });
      return;
    }
    for (const [x, y] of spots) for (const fx of look.go) play(this.particles, fx.key, x, y - 6, { scale: fx.scale, frameMs: 70, add: e.what !== 'rockfall' && e.what !== 'stampede' });
    if (e.what === 'rockfall' || e.what === 'stampede') this.trauma = Math.min(1, this.trauma + 0.2);
  }

  /** A powder barrel goes off: a burst of fire and a ring of smoke on its tile, a shake (once, no loop). */
  private boom(b: Battle, u: number, v: number): void {
    const p = this.particles;
    const [cx, cy] = this.tilePos(b, u, v);
    this.anim(magic.fireExplosion, cx, cy - 10, 2, 60).alpha = 0.85;
    play(p, 'fire-wave', cx, cy, { scale: 2.6, frameMs: 70, add: false, alpha: 0.6 });
    for (let i = 0; i < bits(3, p.density); i++) p.spawn({ frames: PACK['fire-smoke'], x: cx + jitter(14), y: cy - 8 + jitter(6), scale: 1.2, life: 900, delay: i * 60, vy: -0.03, grow: 0.0006, alpha: 0.6 });
    this.trauma = Math.min(1, this.trauma + 0.35);
  }

  /** The meteor lands: a big explosion with a flash, a ring of fire, rubble and smoke, a crater that stays and cools, and a hard shake. */
  private meteorLanding(cx: number, cy: number, art: string): void {
    const p = this.particles;
    // (layers kept apart and thinned so the blast stays orange instead of clipping to white)
    const frames = abilityFrames(art, 'explosion');
    if (frames) this.particles.spawn({ frames, art, x: cx, y: cy - 12, scale: 3.5, frameMs: 70, alpha: 0.9, prio: true });
    play(p, 'fire-wave', cx, cy, { scale: 4.5, frameMs: 80, add: false, alpha: 0.7 });
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
    this.trauma = Math.min(1, this.trauma + 0.6);
  }

  /** A spell goes off: the 3x3 lit for a moment (a poison cloud's for as long as it lingers), and, for the ones that go everywhere, nothing here (the `spellfx` events light each fighter). */
  private spell(b: Battle, e: Extract<BattleEvent, { kind: 'spell' }>, recipients?: ReadonlySet<number>): void {
    // (a meteor, and the shower of them, are drawn by their own `area` events)
    if (e.id === 'meteor' || e.id === 'starfall') return;
    // The individual release leads the spell. The tactical tile fill and small elemental supports stay underneath.
    const [px, py] = this.tilePos(b, e.u, e.v);
    const near = [...this.sprites.values()].filter(s => recipients?.size ? recipients.has(s.unit.id) : s.unit.alive && (SPELLS[e.id].target === 'all' || (Math.abs(s.unit.u - e.u) <= 1 && Math.abs(s.unit.v - e.v) <= 1)));
    const points = (side: 'hero' | 'foe') => near.filter(s => s.unit.side === side).slice(0, 6).map(s => ({ x: s.x, y: s.y, tall: s.tall }));
    const allies = points('hero'), foes = points('foe');
    const centre = SPELLS[e.id].target === 'all' && near.length
      ? { x: near.reduce((n, s) => n + s.x, 0) / near.length, y: near.reduce((n, s) => n + s.y, 0) / near.length }
      : { x: px, y: py };
    playSteps(SPELL_SIGNATURES[e.id].cast, { p: this.particles, self: { ...centre, tall: 40 }, foes, allies, dir: { x: 0, y: -1 }, ms: 700, size: 1 });
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
    // (a lance runs the whole column: a pillar of light on every other tile of it, from the far end in)
    if (e.id === 'lance')
      for (let dv = 0, row = 0; dv < b.board.d; dv++)
        if (tileAt(b.board, e.u, dv)) {
          const [tx, ty] = this.tilePos(b, e.u, dv);
          play(this.particles, 'light-pillar', tx, ty, { scale: 2, frameMs: 70, delay: row++ * 40 });
        }
    if (e.id === 'smite' || e.id === 'chain' || e.id === 'lance') this.trauma = Math.max(this.trauma, 0.45);
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
        const alpha = e.id === 'poison' ? 0.27 : 0.35 * (1 - t / ms);
        for (let du = -1; du <= 1; du++)
          for (let dv = -1; dv <= 1; dv++) {
            if (!tileAt(b.board, e.u + du, e.v + dv)) continue;
            const [x, y] = this.tilePos(b, e.u + du, e.v + dv);
            g.poly([x, y - TH / 2, x + TW / 2, y, x, y + TH / 2, x - TW / 2, y]).fill({ color, alpha });
          }
        return t < ms;
      },
    });
  }

  /** A spell touches a fighter: its sheet plays on them (and Haste says so). */
  private spellFx(e: Extract<BattleEvent, { kind: 'spellfx' }>): void {
    const s = this.sprites.get(e.to);
    if (!s || e.id === 'meteor') return;
    const spot = { x: s.x, y: s.y, tall: s.tall };
    playSteps(SPELL_SIGNATURES[e.id].hit, { p: this.particles, self: spot, foes: [spot], allies: [spot], dir: { x: 0, y: -1 }, ms: 500, size: 1 });
    if (e.id === 'haste') this.label('Haste', s.x, s.y - s.tall - 20, SPELL_GLOW.haste.color, 12, 900);
    if (e.id === 'rally') this.label('Rally', s.x, s.y - s.tall - 20, SPELL_GLOW.rally.color, 12, 900);
    if (e.id === 'shield') this.label('Shield', s.x, s.y - s.tall - 20, SPELL_GLOW.shield.color, 12, 900);
    const word = SPELL_WORD[e.id];
    if (word) this.label(word, s.x, s.y - s.tall - 20, SPELL_GLOW[e.id].color, 12, 900);
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

  /** Caltrops on a 3x3 (the Ranger's Spike Field): the snare's rune, small, on each tile, for `ms`. */
  private spikes(b: Battle, u: number, v: number, ms: number): void {
    const view = new Container();
    this.root.addChild(view);
    const rune = paintedStrip('earth', 'rune', 'snare')[0];
    for (let du = -1; du <= 1; du++)
      for (let dv = -1; dv <= 1; dv++) {
        if (!tileAt(b.board, u + du, v + dv)) continue;
        const [x, y] = this.tilePos(b, u + du, v + dv);
        const sp = new Sprite(rune);
        sp.anchor.set(0.5);
        sp.scale.set((TW * 0.36) / 32);
        sp.tint = 0xd0b890;
        sp.alpha = 0.7;
        sp.position.set(x, y);
        view.addChild(sp);
      }
    let t = 0;
    this.items.push({ view, step: (dt) => ((t += dt), (view.alpha = t > ms - 500 ? Math.max(0, (ms - t) / 500) : 1), t < ms) });
  }

  /** Timed terrain from a kit: a rampart's wall, a statue, a flood's water on a tile, until it goes back (a terrain event of 0 ms, or the battle no longer has it). */
  private kitTerrain(b: Battle, e: Extract<BattleEvent, { kind: 'terrain' }>): void {
    if (!e.ms) return;
    const [x, y] = this.tilePos(b, e.u, e.v);
    const i = e.v * b.board.w + e.u;
    let view: Container;
    if (e.what === 'flood') {
      // (shallow water: a pale blue sheet on the tile's top, gently breathing; no pack has a loose water tile, so it is drawn)
      const g = new Graphics();
      g.poly([0, -TH / 2, TW / 2, 0, 0, TH / 2, -TW / 2, 0]).fill({ color: 0x4aa8e8, alpha: 0.45 }).stroke({ color: 0xbfe8ff, width: 1, alpha: 0.6 });
      g.position.set(x, y);
      view = g;
      this.anim(magic.windWave, x, y - 4, 0.8, 70).tint = 0x80c8ff;
    } else {
      const tex = kitArt ? (e.what === 'statue' ? kitArt.walls[2] : kitArt.walls[(e.u + e.v) % 2]) : undefined;
      const sp = new Sprite(tex ?? Texture.WHITE);
      sp.anchor.set(0.5, 0.85);
      sp.scale.set(tex ? TW / Math.max(1, tex.width) : 1);
      if (e.what === 'statue') sp.tint = 0xb8b8b0;
      sp.position.set(x, y);
      view = sp;
      this.anim(magic.earthBurst, x, y - 6, 1.1, 60);
    }
    // (the walls and statues stand among the fighters: sorted by depth with them)
    view.zIndex = 0;
    this.root.addChild(view);
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        const live = !!b.terrain?.some((tf) => tf.i === i && tf.kind === e.what);
        if (e.what === 'flood' && !this.reduced) view.alpha = 0.85 + 0.15 * Math.sin(t / 400);
        if (!live && t > 200) {
          view.alpha = Math.max(0, view.alpha - dt / 300);
          return view.alpha > 0;
        }
        return true;
      },
    });
  }

  /** A kit's mark on a fighter: its word over it, and a small cue on it. */
  private kitMark(e: Extract<BattleEvent, { kind: 'mark' }>): void {
    const to = this.sprites.get(e.to);
    if (!to) return;
    const dice = e.what.startsWith('dice ') ? e.what.slice(5).split(' ').map(Number) : null;
    const word = dice ? `Dice ${dice[0]} + ${dice[1]}` : MARK_WORDS[e.what] ?? e.what;
    const foe = to.unit.side === 'foe';
    this.label(word, to.x, to.y - to.tall - 8, foe ? 0xffb070 : 0xa8e0ff, 12, 1000, true);
    const sheet: MagicKey = foe ? 'darkCircle' : e.what === 'angel' || e.what === 'vow' ? 'lightCircle' : 'whiteBurst';
    this.anim(magic[sheet], to.x, to.y - to.tall * 0.4, 0.8, 70);
  }

  /** A snare on a tile: a dark ring that waits there (and goes out when it is sprung or runs down). */
  private trap(b: Battle, u: number, v: number, ms: number): void {
    const view = new Sprite(paintedStrip('earth', 'rune', 'snare')[0]);
    view.anchor.set(0.5);
    view.scale.set(TW * 0.6 / 32);
    const [x, y] = this.tilePos(b, u, v);
    view.position.set(x, y);
    this.root.addChild(view);
    this.anim(magic.earthBurst, x, y - 6, 0.9, 60);
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        const live = b.traps?.some((tr) => tr.u === u && tr.v === v);
        view.alpha = 0.75;
        if (!live && t > 200) this.anim(magic.earthBurst, x, y - 6, 1.3, 50);
        return live === true || t <= 200 ? t < ms : false;
      },
    });
  }

  /** The damage numbers still rising over each spot, so a new one over the same fighter starts above the last, not on it. */
  private stacks = new Map<string, { at: number; n: number }>();

  private number(n: number, x: number, y: number, heavy: boolean, onHero: boolean, high = false): void {
    if (!settings().numbers) return;
    // (numbers over the same fighter within half a second step up a row each, and to alternate sides, so they never sit on each other)
    const key = `${Math.round(x / 16)},${Math.round(y / 16)}`;
    const now = performance.now();
    const prev = this.stacks.get(key);
    const k = prev && now - prev.at < 500 ? (prev.n + 1) % 4 : 0;
    this.stacks.set(key, { at: now, n: k });
    if (this.stacks.size > 64) for (const [s, v] of this.stacks) if (now - v.at > 1000) this.stacks.delete(s);
    const txt = new Text({
      text: String(n),
      style: { fontFamily: "'Press Start 2P', monospace", fontWeight: 'normal', fontSize: heavy ? 12 : 9, fill: onHero ? 0xff7a6a : heavy ? 0xffd34a : 0xffffff, stroke: { color: 0x1a1008, width: 3 } },
      resolution: 3,
    });
    txt.anchor.set(0.5, 1);
    // (a blow from higher ground carries a small green arrow up beside its number)
    if (high) {
      const sz = heavy ? 5 : 4;
      const arrow = new Graphics();
      arrow.poly([0, -sz * 2, sz, 0, -sz, 0]).fill(0x9be37a).stroke({ color: 0x1a1008, width: 1 });
      arrow.position.set(txt.width / 2 + sz + 2, -txt.height / 2 + sz);
      txt.addChild(arrow);
    }
    txt.position.set(Math.round(x + (k % 2 ? 9 : -9) * Math.sign(k)), Math.round(y - k * 13));
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
    if (orb) sp.blendMode = 'normal';
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
            paintSprite(sp, ms * 0.4, ms, m.scale, heading, 1, true, this.calm());
            if (m.spin && !this.calm()) sp.rotation += t * 0.004;
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
