// The fight's effects: arrows and fire flying, sparks where a blow lands, numbers popping off the struck, and the
// screen's shake (the rules for these are Chronos's battle/juiceRules.ts). Everything runs on the fight's own clock,
// so a faster fight is faster here too.

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { TERRAIN_URLS } from './terrainArt';
import { loadImage } from './loadImage';
import { tileAt, type Board } from '../sim/board';
import { defOf, wayTo, type Battle, type BattleEvent, type Unit } from '../sim/battle';
import { isBoss } from '../sim/foes';
import { keyOfKit, ultKeyOf } from '../sim/abilities';
import { skillShown } from '../sim/heroKits';
import { abilityHeading } from './abilityLooks';
import { abilityFrames, loadAbilityArt } from './abilityArt';
import { SPELL_SIGNATURES } from './spellSignatures';
import { SPELLS } from '../sim/spells';
import type { Shot } from '../sim/units';
import { settings } from '../settings';
import { at, depth, facesRight, TH, TW } from './iso';
import { fadeTrauma, popScale, shakeOf, traumaFor } from './juiceRules';
import { BIG_FOE_HP, SKILL_FX, SPELL_GLOW, SPELL_WORD, type Effect, type MagicKey } from './skillFx';
import type { UnitSprite } from './unitView';
import { Particles } from './particles';
import { loadVfxArt, VFX } from './vfxArt';
import { loadAuraArt } from './awakenAura';
import { loadStatusArt, statusFrames, STATUS_CELL } from './statusArt';
import { IMMUNE_COLOUR, SHATTER_COLOUR, STATUS_STYLES, statusKey, type AilmentKey } from './statusStyles';
import { ailmentChip } from './ailmentLayer';

/** An ailment's damage colour (none for a plain blow: it keeps the usual white, gold or red). */
const numberColour = (ail?: AilmentKey | 'shatter'): number | undefined => (ail === 'shatter' ? SHATTER_COLOUR : ail ? STATUS_STYLES[ail].number : undefined);
import { loadPackArt, PACK } from './fxSheets';
import { bossEntrance, deathBurst, impactBurst, play, setBoneArt, windUp } from './combatFx';
import { showDuoToast } from '../duoToast';
import { comboGather, comboStrike, promoteBurst, ringOut, toneColour, type Spot } from './spectacle';
import { comboById, COMBO_NAME } from '../sim/combos';
import { tierRing } from './signatures';
import { kitSignature } from './kitLooks';
import { loadProps, playSteps, setSignatureSprite, type Pt, type Scene } from './signatureFx';
import { tierSkillOf } from '../sim/tierSkills';
import { arcStyle, bits, FLASH_MAX, FLASH_MS, ULT_TINT, deathKind, hitStopMs, impactElement, isBackstab, missileOf, nudgeOf, packKey, skillElement, SPELL_CAST, type Missile } from './fxRules';
import { particleBudget, slashOf } from './vfxRules';
import { placeLabel } from './labelRules';
import { HAZARD_LOOKS } from './hazardLooks';
import { MOVE_LOOKS, PAINT, WALL_LOOKS, auraLook, type Look } from './toolkitLooks';
import { AREA_PAINT, SNARE, type AreaPaint, AURA_ALPHA, AURA_ALPHA_OF, DIRGE_TINT, HANG_MULT, MOVE_PAINT, RIPOSTE, SONG_REACH, SONG_SHEET, SPIKES_SHEET, TRAVEL_MS, type StandState } from './movePaints';
import { SLASH_HOP_MS, type WallKind } from '../sim/toolkit';
import { loadSpellArt, spellFrames } from './spellArt';
import { boostedScale, burstPart, epicEvent, KIT, ultScale, ULT_EPIC } from '../ultEpicRules';
import { spellAnchorY, spellPart, spellScale } from './spellLooks';
import { loadPaintedArt, paintedStrip, paintSprite } from './cinematicArt';
import { coverAlpha, overFighter } from './overFighter';
import { BossFx } from './bossFx';
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
  await Promise.all([loadProps(), loadAbilityArt(), loadAuraArt(), loadStatusArt()]);
  // (RPG-SPELLS: the painted spell effects load by URL behind the game; until they have, the placeholders show)
  void loadSpellArt();
  // (the hero kits' terrain: a rampart's ruined walls, a statue's stone, a keg's barrel; the pack's own props, as the board draws them)
  const tex = async (url: string) => Texture.from(await loadImage(url));
  kitArt = { walls: await Promise.all(TERRAIN_URLS.walls.map(tex)), barrel: await tex(TERRAIN_URLS.barrel) };
}

/** The healers' painted spells by skill key (`healerPaint`): where each plays and its part. */
const HEALER_PAINT: Record<string, { on: 'caster' | 'targets'; part: string }> = {
  Smite: { on: 'targets', part: 'guiding-bolt.impact' },
  Benediction: { on: 'caster', part: 'prayer.ground' },
  'Holy Light': { on: 'targets', part: 'cure-wounds.impact' },
  'Guardian Angel': { on: 'targets', part: 'death-ward.impact' },
  'Flask Toss': { on: 'targets', part: 'healing-draught.impact' },
  Resurrection: { on: 'caster', part: 'mass-resurrection.ground' },
};
/** Each healer's painted revive (the brief's session C sheets), by the healer's kind; the High Priestess's for anyone else. */
const REVIVE_SHEET: Record<string, string> = { cleric: 'revivify', priestess: 'resurrection', wanderer: 'elixir', druid: 'reincarnate' };

/** The props the hero kits' terrain is drawn with (`loadFx`). */
let kitArt: { walls: Texture[]; barrel: Texture } | null = null;
/** The words a kit's mark shows over the fighter it is on. */
const MARK_WORDS: Record<string, string> = {
  parry: 'Parry', smoke: 'Smoke', pinned: 'Pinned', charged: 'Charged', vow: "Martyr's Vow", hunter: 'Hunter', brute: 'Brute', dance: 'Dancing',
  stone: 'Stone', puppet: 'Puppet', siege: 'Anchored', angel: 'Warded', rewind: 'Rewound', prey: 'Prey', suppressed: 'Pinned down',
  dirge: 'Dirge', anthem: 'Anthem', bounty: 'Bounty', condemned: 'Bane',
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
  /** The auras drawn now (by caster and name), so a refreshed aura is not drawn twice (RPG-SPELLS). */
  private auraShown = new Set<string>();
  private trauma = 0;
  shakeX = 0;
  shakeY = 0;
  thudX = 0;
  thudY = 0;
  private thudLeft = 0;
  private thudDuration = 0;
  private thudPeakX = 0;
  private thudPeakY = 0;
  /** No screen shake at all from this Fx (the Last Stand: the page makes its own tiny nudge, `standCam.ts`). */
  still = false;
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
  /** The skills cast this tick, by caster (`show`). */
  private tickCasts = new Map<number, string>();
  /** The painted loops held over fighters (`movePaint`'s stands), so a state shown once is not shown twice. */
  private standShown = new Set<string>();
  /** The small puffs, sparks and trails (pooled, capped). */
  readonly particles = new Particles();
  /** The world dimmed behind the effects for an ultimate (a layer under `root`, sized by `dim`'s peak and time). */
  readonly dimLayer = new Graphics();
  private dimLeft = 0;
  private dimMs = 1;
  private dimPeak = 0;
  /** ULT-EPIC: the casters whose ultimates are playing their full moment now (the page sets it each tick, `ultMoment.ts`): their events'
   *  effects are drawn at the ultimate's scale (`boost`, `ultScale`). And the moment's own layer (the gathering on the hero, the huge
   *  bursts), stepped by the moment itself so it runs while the fight's effects are held, and freezes on the blow. */
  epic: ReadonlySet<number> = new Set();
  private boost = 1;
  readonly moment = new Particles();
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

  /** BOSS-BIG: a boss's signature attack's marks and blow (`bossFx.ts`). */
  private bossFx: BossFx;

  constructor(private sprites: Map<number, UnitSprite>) {
    this.bossFx = new BossFx({
      root: this.root,
      particles: this.particles,
      calm: () => this.calm(),
      label: (text, x, y, fill, size, life) => void this.label(text, x, y, fill, size, life),
      impact: (b, el, spots) => this.ultImpact(b, el, spots),
      stop: (ms) => (this.stopLeft = Math.max(this.stopLeft, ms)),
      shake: (level) => (this.trauma = Math.max(this.trauma, level)),
    });
    this.root.zIndex = 1e7;
    this.flashLayer.visible = false;
    this.dimLayer.rect(-3000, -3000, 6000, 6000).fill(0x07040f);
    this.dimLayer.zIndex = 1e7 - 1;
    this.dimLayer.visible = false;
    this.root.addChild(this.particles.root, this.moment.root);
    // (FX-CLEAR: the puffs, rings and signature steps laid over a fighter are thinned too)
    this.particles.cover = (x, y, half) => coverAlpha(1, this.overBody(x, y, half));
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
    this.moment.clear();
    this.bossFx.clear();
    this.epic = new Set();
    this.setEpic(false);
  }

  /** How fast the fight runs right now: 1, or a slow-motion beat's share of it. */
  timeScale(): number {
    return this.stopLeft > 0 ? 0.02 : this.slowLeft > 0 ? 0.35 : 1;
  }

  /** Whether the screen is to stay still: shake off in the settings, or reduced motion on the device. */
  calm(): boolean {
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

  /** DARK-WAVE: lift any dim at once (a wave starting again after a heart burns: the fight's clock, which fades a dim out, is
   *  held through the burn, so an ultimate's dim from the fall would otherwise stay on over it). */
  undim(): void {
    this.dimLeft = 0;
    this.dimLayer.visible = false;
  }

  /** Run `fn` after `ms` of the fight's own time. */
  private later(ms: number, fn: () => void): void {
    const view = new Container();
    this.root.addChild(view);
    let t = 0;
    // (an ultimate's effect played later keeps the ultimate's scale, ULT-EPIC)
    const epic = this.boost !== 1;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        if (t < ms) return true;
        const was = this.boost !== 1;
        this.setEpic(epic);
        fn();
        this.setEpic(was);
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
    const slashes = slashesOf(events);
    this.healerPaint(events);
    // (the tick's casts, by caster: a cast's own events come before its `skill` event, so a ball it throws looks its caster's skill up here)
    this.tickCasts.clear();
    for (const e of events) if (e.kind === 'skill') this.tickCasts.set(e.by, e.name);
    this.movePaint(b, events);
    for (const e of events) {
      this.setEpic(epicEvent(e, this.epic));
      if (e.kind === 'shot') this.shot(e.by, e.to, e.shot, e.ms);
      else if (e.kind === 'skill') this.skillName(e.by, e.name, e.ms);
      else if (e.kind === 'swing') this.slash(b, e.by, e.to);
      else if (e.kind === 'dodge') {
        const to = this.sprites.get(e.to);
        if (to) {
          this.label('Miss', to.x, to.y - to.tall - 10, 0xcfe8ff, 12);
          // (a whoosh of wind across the one that dodged)
          this.particles.spawn({ frames: VFX.dashWhite, x: to.x, y: to.y - to.tall * 0.5, scale: 1.1, frameMs: 40, alpha: 0.8, add: true, stretchX: facesRight(to.unit.facing) ? 1 : -1 });
        }
      } else if (e.kind === 'boom') this.boom(b, e.u, e.v);
      else if (e.kind === 'hazard') this.hazard(b, e);
      else if (e.kind === 'bossSig') this.bossFx.show(b, e);
      else if (e.kind === 'dash' || e.kind === 'blink') this.streak(b, e, slashes.get(e));
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
      } else if (e.kind === 'arc') this.arc(e.from, e.to, e.ail === 'shock');
      // (STATUS-FX: an ailment shrugged off, and a frozen fighter's ice shattering)
      else if (e.kind === 'immune') this.immune(e.to, e.what);
      else if (e.kind === 'shatter') this.shatter(e.to);
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
      else if (e.kind === 'duoCombo') this.duoCombo(e);
      else if (e.kind === 'decoyLog') {
        const by = this.sprites.get(e.by);
        if (by) this.label('Substitution Log!', by.x, by.y - by.tall - 20, 0x85e3a8, 13, 1400, true);
      }
      else if (e.kind === 'wisp') {
        this.trap(b, e.u, e.v, e.ms);
        const [wx, wy] = this.tilePos(b, e.u, e.v);
        this.label('Spirit Wisp', wx, wy - 12, 0x9be5ff, 11, 1200);
        this.sparkles(wx, wy, 0x9be5ff);
      }
      else if (e.kind === 'terrain') this.kitTerrain(b, e);
      // (the movement toolkit, RPG-SPELLS batch 1: placeholder looks from the pack until the painted effects arrive)
      else if (e.kind === 'revive') this.revive(e);
      else if (e.kind === 'shove' || e.kind === 'launch' || e.kind === 'slam' || e.kind === 'fall' || e.kind === 'burrow' || e.kind === 'swap' || e.kind === 'aura' || e.kind === 'wallBreak') this.toolkit(b, e);
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
          this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, false, false, e.ail);
          if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
          continue;
        }
        if (e.src === 'dot') {
          // (the tick of an ailment: its own puff, and its number in its colour; an untagged tick is burning ground)
          const burn = e.ail === 'burn' || e.ail === undefined;
          if (e.ail === 'curse') this.particles.spawn({ frames: VFX.puffFire, x: to.x, y: to.y - to.tall * 0.45, scale: 0.8, life: 260, alpha: 0.8, add: true, tint: 0xb06aff });
          else if (e.ail === 'poison') this.particles.spawn({ frames: PACK['poison-puff'], x: to.x, y: to.y - to.tall * 0.45, scale: 0.7, life: 300, alpha: 0.8 });
          else if (e.ail !== 'shock') this.anim(burn ? fire : impact, to.x, to.y - to.tall * 0.45, burn ? 0.7 : 0.6, 60);
          this.number(e.dmg, to.x, to.y - to.tall - 10, false, target.side === 'hero', false, e.ail);
          if (e.killed) this.death(target, to.x, to.y - to.tall * 0.3);
          continue;
        }
        // (a skill's blow has its own sheet; a crit or a big kill adds a burst, a white flash and a harder shake)
        const castName = e.src === 'skill' ? this.casting.get(e.by) ?? keyOfKit(by) : '';
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
          playSteps(signature, { p: this.particles, self: spot, foes: [spot], allies: [spot], dir: { x: 0, y: 1 }, ms: 0, size: ultKeyOf(by) === castName ? 1.25 : 1 });
        } else if (skillFx) {
          this.effect(skillFx, hx, hy);
          // (and a burst of the skill's own element on top)
          impactBurst(this.particles, skillElement(keyOfKit(by)), hx, hy, 0.8, e.splash);
        } else if (defOf(by).shot) {
          // (a shot lands in its own element: fire bursts, frost shatters, lightning cracks, poison lingers, an arrow bites)
          const m = missileOf(defOf(by).shot!, defOf(by).name);
          impactBurst(this.particles, impactElement(m), hx, hy, Math.min(1.8, 0.7 + spark * 0.5), e.splash);
          if (m.look !== 'orb') this.anim(impact, hx, hy, 0.9 * spark, 45);
        } else this.anim(impact, hx, hy, 0.9 * spark, 45);
        if (this.particles.rate(0.7)) this.puffAt(to.x, to.y - to.tall * 0.3, target.side === 'hero' ? 'white' : 'blood', 0.8 + spark * 0.2);
        this.flesh(target, hx, hy, e.dmg / target.maxHp);
        this.number(e.dmg, to.x, to.y - to.tall - 10, e.heavy, target.side === 'hero', e.high, e.ail);
        this.trauma = Math.min(1, this.trauma + traumaFor(e.dmg / target.maxHp, e.killed) * 0.5);
        // (the struck is knocked a little away along the blow, and a crit or a killing blow stops the fight for a moment)
        const share = e.dmg / target.maxHp;
        const byS = this.sprites.get(e.by);
        let wayAngle = 0;
        if (byS && !e.splash) {
          const way = Math.atan2((to.y - to.tall * 0.45) - (byS.y - byS.tall * 0.45), to.x - byS.x);
          wayAngle = way;
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
        const backstab = by && target ? isBackstab(by.facing, target.facing, byS ? wayTo(by, target) : undefined) : false;
        const lethalBackstab = backstab && e.killed;
        const isCrit = e.heavy && e.src === 'blow';
        this.stopLeft = Math.max(this.stopLeft, hitStopMs(e.heavy, share, e.killed, this.calm(), backstab, isCrit));
        if (lethalBackstab) {
          this.microThud(to.x, to.y, 1.25, Math.cos(wayAngle), Math.sin(wayAngle) * 0.6);
          play(this.particles, 'dark-strike', to.x, to.y - to.tall * 0.45, { scale: 1.5, frameMs: 40 });
        } else if (isCrit) {
          this.microThud(to.x, to.y, 1.0, Math.cos(wayAngle), Math.sin(wayAngle) * 0.6);
        }
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
    this.setEpic(false);
    this.scan(b);
  }

  /** ULT-EPIC: the effects made from now on are an ultimate's (drawn at its scale) or not. */
  private setEpic(on: boolean): void {
    this.boost = ultScale('once', on);
    this.particles.boost = this.boost;
  }

  /** ULT-EPIC: move the moment's own layer on (the moment calls it each frame it runs; it stands still through the freeze on the blow). */
  stepMoment(dt: number): void {
    this.moment.calm = this.calm();
    this.moment.step(dt);
  }

  /** A painted part on the moment's layer, `tiles` across, its foot (`foot`) or its middle at (x, y). False when no atlas has it. */
  private paintMoment(key: string, x: number, y: number, tiles: number, o: { frameMs?: number; foot?: boolean; alpha?: number } = {}): boolean {
    const frames = spellFrames(key);
    const p = spellPart(key);
    if (!frames.length || !p) return false;
    const scale = spellScale(key, tiles / p.size);
    const drawn = p.cell * scale;
    this.moment.spawn({ frames, x, y: o.foot ? y + (0.5 - p.foot) * drawn : y, scale, frameMs: o.frameMs ?? 70, prio: true, alpha: o.alpha ?? 1, half: drawn * 0.42 });
    return true;
  }

  /** The opening of an ultimate's moment (ULT-EPIC): power gathers on the hero while the slash and the name are up (the painted kit's
   *  gathering when it is there, else the element's wind-up from the pack), so the board under the band is alive. */
  ultGather(unit: number, el: Element, ms: number): void {
    const by = this.sprites.get(unit);
    if (!by) return;
    const budget = particleBudget(settings().saver);
    this.moment.density = budget.density;
    this.moment.cap = budget.cap;
    this.paintMoment(KIT.gather, by.x, by.y, 2.5, { frameMs: ms / 8, foot: true, alpha: 0.9 });
    windUp(this.moment, el, by.x, by.y, ms, by.tall, true);
  }

  /** The blow lands (ULT-EPIC): a huge burst of the element on each spot (the kit's painted burst when there, else the strongest painted
   *  burst of the element the game has, or the pack's, drawn big), a shock ring along the ground, and a hard shake once the freeze lets go
   *  (none with the screen kept still). Spots are fighters (by id) or tiles. */
  ultImpact(b: Battle, el: Element, spots: readonly ({ unit: number } | { u: number; v: number })[]): void {
    const tint = ULT_TINT[el];
    const has = (key: string) => spellFrames(key).length > 0;
    const part = burstPart(el, has);
    for (const s of spots) {
      let x: number;
      let y: number;
      let lift: number;
      if ('unit' in s) {
        const sp = this.sprites.get(s.unit);
        if (!sp) continue;
        [x, y, lift] = [sp.x, sp.y, sp.tall * 0.45];
      } else {
        [x, y] = this.tilePos(b, s.u, s.v);
        lift = 18;
      }
      // (the painted burst, about four tiles across, standing on the ground when it is painted that way)
      if (part) this.paintMoment(part, x, part.startsWith('ult-burst') ? y - lift : y - (spellAnchorY(part) > 0.8 ? 0 : lift), part.startsWith('ult-burst') ? 4 : 3.2, { foot: spellAnchorY(part) > 0.8, frameMs: 65 });
      else impactBurst(this.moment, el, x, y - lift, 3.2, true);
      // (the pack's nova and its ring on the ground under it, in the element's colour)
      play(this.moment, packKey(el, 'nova'), x, y - lift, { scale: 3.4, frameMs: 70, alpha: 0.75, tint });
      play(this.moment, packKey(el, 'wave'), x, y, { scale: 5, frameMs: 80, add: false, alpha: 0.7, tint });
    }
    this.trauma = Math.max(this.trauma, ULT_EPIC.SHAKE);
  }

  /** A blow is swung: a slash of the attacker's weapon across the one it aims at. */
  private slash(b: Battle, byId: number, toId: number): void {
    const by = this.sprites.get(byId);
    const to = this.sprites.get(toId);
    const attacker = b.units.find((x) => x.id === byId);
    if (!by || !to || !attacker) return;
    // (a long weapon thrusts out at the foe)
    if (defOf(attacker).range === 2 && !defOf(attacker).shot) this.thrust(by, to);
    const dx = to.x - by.x;
    const dy = (to.y - to.tall * 0.5) - (by.y - by.tall * 0.5);
    const left = dx < 0;
    this.particles.spawn({
      frames: VFX[slashOf(defOf(attacker).name)],
      x: to.x,
      y: to.y - to.tall * 0.5,
      scale: 2,
      frameMs: 45,
      rotation: left ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx),
      ...(left ? { stretchX: -1 } : {}),
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

  /** A localized camera micro-thud on lethal backstabs, critical hits, and King's Meteor impact.
   *  Applies a snappy directional micro-offset that springs back over 2-3 frames (~50ms). */
  microThud(x: number, y: number, strength = 1.0, dirX = 0, dirY = 0): void {
    if (this.calm()) return;
    let dx = dirX;
    let dy = dirY;
    if (dx === 0 && dy === 0) {
      if (this.view) {
        const vcx = (this.view.x0 + this.view.x1) / 2;
        const vcy = (this.view.y0 + this.view.y1) / 2;
        const dist = Math.hypot(x - vcx, y - vcy);
        if (dist > 1) {
          dx = ((x - vcx) / dist) * 0.7;
          dy = ((y - vcy) / dist) * 0.7;
        }
      }
      if (dx === 0 && dy === 0) dy = 1;
    }
    const amp = 4.2 * strength;
    this.thudPeakX = dx * amp;
    this.thudPeakY = dy * amp;
    this.thudDuration = 55;
    this.thudLeft = this.thudDuration;
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
    this.bossFx.step(dt);
    this.trauma = fadeTrauma(this.trauma, dt / 1000);
    const s = this.calm() || this.still ? 0 : shakeOf(this.trauma);
    if (this.thudLeft > 0 && !this.still) {
      this.thudLeft = Math.max(0, this.thudLeft - dt);
      const p = this.thudLeft / this.thudDuration;
      const k = Math.sin(p * Math.PI);
      this.thudX = this.thudPeakX * k;
      this.thudY = this.thudPeakY * k;
    } else {
      this.thudX = 0;
      this.thudY = 0;
    }
    this.shakeX = (s ? (Math.random() * 2 - 1) * s : 0) + this.thudX;
    this.shakeY = (s ? (Math.random() * 2 - 1) * s : 0) + this.thudY;
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

  /** FX-CLEAR: whether an effect centred on (x, y), `half` px across from its centre, lies over a living fighter's body. */
  private overBody(x: number, y: number, half: number): boolean {
    for (const s of this.sprites.values()) if (s.unit.alive && overFighter(x, y, half, [s])) return true;
    return false;
  }

  private anim(s: Strip, x: number, y: number, scale: number, frameMs: number): Sprite {
    scale = boostedScale(scale, this.boost, s.frames[0].frame.width);
    const sp = new Sprite(s.frames[0]);
    sp.anchor.set(0.5);
    sp.scale.set(scale);
    sp.position.set(x, y);
    sp.blendMode = 'add';
    this.root.addChild(sp);
    let t = 0;
    let peak: number | undefined;
    let own: number | undefined;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        // (FX-CLEAR: an effect laid over a fighter's body is drawn see-through, `OVER_FIGHTER_ALPHA`; a strip that is not painted
        // keeps the alpha it was given, thinned the same way)
        own ??= coverAlpha(sp.alpha, this.overBody(x, y, 16 * scale));
        peak ??= own * 0.9;
        const f = Math.floor(t / frameMs);
        if (f >= s.frames.length) return false;
        sp.texture = s.frames[f];
        if (!paintSprite(sp, t, s.frames.length * frameMs, scale, 0, peak, false, this.calm())) sp.alpha = own;
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
    const ultimate = ultKeyOf(by.unit) === name;
    const boss = by.unit.side === 'foe' && isBoss(by.unit.def);
    const el = skillElement(name);
    // (three skill names at most: the oldest fades out early when a fourth comes). A hero's skill is named by the hero rows' banner at
    // the screen's edge instead, so only a foe's name rises over it (the owner: the names hid too much of the fight).
    if (by.unit.side !== 'hero') {
      this.skillStack = this.skillStack.filter((l) => !l.txt.destroyed);
      while (this.skillStack.length >= 3) this.skillStack.shift()!.cut();
      this.skillStack.push(this.label(skillShown(by.unit, name), by.x, by.y - by.tall - 20, ultimate ? 0xfff2a0 : boss ? 0xff9a8a : 0xffe27a, ultimate || boss ? 15 : 13, 1200));
    }
    this.casting.set(byId, name);
    const signature = kitSignature(name);
    if (signature) playSteps(signature.wind, this.sceneOf(by, ms, ultimate ? 1.45 : 1.15));
    else windUp(this.particles, el, by.x, by.y, ms, by.tall, ultimate || boss);
    const cast = signature ? undefined : SKILL_FX[name]?.cast;
    if (signature) this.later(ms, () => playSteps(signature.cast, this.sceneOf(this.sprites.get(byId) ?? by, ms, ultimate ? 1.45 : 1.15)));
    if (ultimate) {
      this.trauma = Math.max(this.trauma, 0.5);
      this.flash(0.3, 100);
      // (the full moment (ULT-EPIC) has its own dim, lifted over the whole effect, and its own camera: these are the short version's)
      const epic = this.boost !== 1;
      if (!epic) this.dim(0.45, ms + 900);
      // (the camera leans in on the caster for the cast, and the moment of the nova lands in a beat of slow motion and a freeze frame)
      if (!epic) this.push(by.x, by.y - by.tall * 0.5, 1.2, ms + 600);
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
      const [vx, vy] = [near[0].x - by.x, (near[0].y - near[0].tall * 0.5) - (by.y - by.tall * 0.5)];
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
    const skillName = keyOfKit(by.unit);
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

  /** A duo-combo triggers between complementary heroes: floating text, sparkles and battle toast. */
  private duoCombo(e: Extract<BattleEvent, { kind: 'duoCombo' }>): void {
    const sA = this.sprites.get(e.heroA);
    const sB = this.sprites.get(e.heroB);
    const col = e.harmonic ? 0xffd700 : 0xffe27a;
    if (sA && sB) {
      const cx = (sA.x + sB.x) / 2;
      const cy = (sA.y + sB.y) / 2;
      this.label(e.harmonic ? 'Harmonic Resonance!' : 'Duo-Combo!', cx, cy - 80, col, 14, 2000, true);
      this.label(e.title, cx, cy - 60, 0xfff2a0, 16, 2200, true);
      this.label(e.name, sA.x, sA.y - sA.tall - 20, col, 12, 1600, true);
      this.label(e.name, sB.x, sB.y - sB.tall - 20, col, 12, 1600, true);
      this.sparkles(sA.x, sA.y - sA.tall * 0.5, col);
      this.sparkles(sB.x, sB.y - sB.tall * 0.5, col);
    } else if (sA) {
      this.label(e.title, sA.x, sA.y - sA.tall - 25, col, 14, 1800, true);
      this.sparkles(sA.x, sA.y - sA.tall * 0.5, col);
    } else if (sB) {
      this.label(e.title, sB.x, sB.y - sB.tall - 25, col, 14, 1800, true);
      this.sparkles(sB.x, sB.y - sB.tall * 0.5, col);
    }
    showDuoToast(e.banner, e.harmonic);
  }

  /** A hero is promoted to `grade` (2 to 4; rank 4 is violet, MERGE-TWO): the one call both ways in take, the page's merge after a hire and a sim `promote` event (the Calamity's tier by level). The hero rises in light and scales up a beat; tier 3 adds a pillar of light, a nova, a flash, a short slow-motion, a camera push and a banner with its name and its new skill's. */
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
    this.label(`Tier ${grade}`, sp.x, sp.y - sp.tall - 22, grade > 3 ? 0xd49aff : grade > 2 ? 0xffe27a : 0xdce8ff, grade > 3 ? 28 : grade > 2 ? 24 : 12, life, true);
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

  // ---- the movement toolkit (RPG-SPELLS batch 1): placeholders from the pack (`toolkitLooks.ts`) until the painted effects arrive ----

  // RPG-SPELLS painted effects (docs/notes/spell-art.md): each helper draws a painted part when its atlas has loaded and says so;
  // false means none is painted, and the caller draws its placeholder. Normal blending (the brief's rule), and a painting laid over
  // a fighter's body is thinned (FX-CLEAR, `overFighter.ts`). Loops never fade to nothing until they end; reduced motion holds a
  // loop's first frame.

  /** A painted part played once at (x, y): its foot there when it stands on the ground, else its middle. */
  private paintOnce(key: string, x: number, y: number, o: { mult?: number; delay?: number; rotation?: number; stretchX?: number; stretchY?: number } = {}): boolean {
    const frames = spellFrames(key);
    const p = spellPart(key);
    if (!frames.length || !p) return false;
    const scale = spellScale(key, o.mult);
    const drawn = p.cell * scale;
    this.particles.spawn({
      frames,
      x,
      y: y + (0.5 - spellAnchorY(key)) * drawn,
      scale,
      frameMs: 70,
      prio: true,
      half: drawn * 0.42 * Math.max(1, Math.abs(o.stretchX ?? 1)),
      ...(o.delay ? { delay: o.delay } : {}),
      ...(o.rotation ? { rotation: o.rotation } : {}),
      ...(o.stretchX ? { stretchX: o.stretchX } : {}),
      ...(o.stretchY ? { stretchY: o.stretchY } : {}),
    });
    return true;
  }

  /** A painted streak (painted pointing right) laid along the line from (x0, y0) to (x1, y1), stretched to reach. */
  private paintAlong(key: string, x0: number, y0: number, x1: number, y1: number, o: { delay?: number } = {}): boolean {
    const p = spellPart(key);
    if (!p || !spellFrames(key).length) return false;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 4) return true;
    const drawn = p.cell * spellScale(key);
    return this.paintOnce(key, (x0 + x1) / 2, (y0 + y1) / 2, {
      ...o,
      rotation: Math.atan2(y1 - y0, x1 - x0),
      stretchX: Math.max(0.4, Math.min(2.5, len / (drawn * 0.84))),
      // (a streak going left is turned half round: flipped, so its painting stays the right way up)
      ...(x1 < x0 ? { stretchY: -1 } : {}),
    });
  }

  /** A painted loop following `where` while `live` holds, then fading out. */
  private paintLoop(key: string, where: () => [number, number], live: () => boolean, o: { mult?: number; depthOf?: () => number; alpha?: number; onGone?: () => void; tint?: number } = {}): boolean {
    const frames = spellFrames(key);
    if (!frames.length) return false;
    const sp = new Sprite(frames[0]);
    if (o.tint !== undefined) sp.tint = o.tint;
    sp.anchor.set(0.5, spellAnchorY(key));
    sp.scale.set(spellScale(key, o.mult));
    const full = o.alpha ?? 1;
    sp.alpha = 0;
    this.root.addChild(sp);
    let t = 0;
    let gone = false;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const [x, y] = where();
        sp.position.set(x, y);
        if (o.depthOf) sp.zIndex = o.depthOf();
        if (!this.reduced) sp.texture = frames[Math.floor(t / 90) % frames.length];
        if (!gone && !live()) gone = true;
        if (gone) {
          sp.alpha = Math.max(0, sp.alpha - dt / 300);
          if (sp.alpha <= 0) o.onGone?.();
          return sp.alpha > 0;
        }
        // (in over 150 ms, so it does not pop)
        sp.alpha = Math.min(full, sp.alpha + (full * dt) / 150);
        return true;
      },
    });
    return true;
  }

  /** A painted beam (seamless at its ends) tiled from `a` to `z` for `ms`: as many whole segments as reach, squeezed to fit. */
  private paintBeam(key: string, a: () => [number, number], z: () => [number, number], ms: number): boolean {
    const frames = spellFrames(key);
    const p = spellPart(key);
    if (!frames.length || !p) return false;
    const scale = spellScale(key) * ultScale('beam', this.boost !== 1);
    const seg = p.cell * spellScale(key);
    const view = new Container();
    this.root.addChild(view);
    const parts: Sprite[] = [];
    let t = 0;
    this.items.push({
      view,
      step: (dt) => {
        t += dt;
        if (t >= ms) return false;
        const [ax, ay] = a();
        const [zx, zy] = z();
        const len = Math.max(1, Math.hypot(zx - ax, zy - ay));
        const n = Math.max(1, Math.round(len / seg));
        while (parts.length < n) {
          const sp = new Sprite(frames[0]);
          sp.anchor.set(0, 0.5);
          view.addChild(sp);
          parts.push(sp);
        }
        const ang = Math.atan2(zy - ay, zx - ax);
        const piece = len / n;
        const tex = frames[this.reduced ? 0 : Math.floor(t / 90) % frames.length];
        const fade = Math.min(1, t / 120, (ms - t) / 200);
        parts.forEach((sp, i) => {
          sp.visible = i < n;
          if (i >= n) return;
          const mx = ax + Math.cos(ang) * piece * (i + 0.5);
          const my = ay + Math.sin(ang) * piece * (i + 0.5);
          sp.texture = tex;
          sp.position.set(ax + Math.cos(ang) * piece * i, ay + Math.sin(ang) * piece * i);
          sp.rotation = ang;
          sp.scale.set(piece / p.cell, scale);
          sp.alpha = coverAlpha(fade, this.overBody(mx, my, seg * 0.2));
        });
        return true;
      },
    });
    return true;
  }

  /** A painted wall tile at its foot (x, y): it rises, stands (a gentle loop) while `live` holds, then breaks down to nothing, all in
   *  the one sprite, so nothing blinks between the parts. A wall with no rise (the wind) comes in over 200 ms, and with no break
   *  fades out. */
  private paintWall(sheet: string, x: number, y: number, live: () => boolean): boolean {
    const stand = spellFrames(`${sheet}.stand`);
    if (!stand.length) return false;
    const rise = spellFrames(`${sheet}.rise`);
    const fall = spellFrames(`${sheet}.break`);
    const sp = new Sprite(rise[0] ?? stand[0]);
    sp.anchor.set(0.5, spellAnchorY(`${sheet}.stand`));
    sp.scale.set(spellScale(`${sheet}.stand`));
    sp.position.set(x, y);
    sp.zIndex = 0;
    sp.alpha = rise.length ? 1 : 0;
    this.root.addChild(sp);
    const riseMs = rise.length * 70;
    let t = 0;
    let end = -1;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        if (end < 0 && t >= Math.min(riseMs, 200) && !live()) end = t;
        if (end >= 0) {
          const f = Math.floor((t - end) / 70);
          if (!fall.length) {
            sp.alpha = Math.max(0, sp.alpha - dt / 300);
            return sp.alpha > 0;
          }
          if (f >= fall.length) return false;
          sp.texture = fall[f];
          // (the last frames thin out, so the rubble goes softly)
          sp.alpha = Math.min(1, (fall.length - (t - end) / 70) / 2);
          return true;
        }
        if (!rise.length) sp.alpha = Math.min(1, sp.alpha + dt / 200);
        if (t < riseMs) sp.texture = rise[Math.floor(t / 70)];
        else sp.texture = this.reduced ? stand[0] : stand[Math.floor((t - riseMs) / 110) % stand.length];
        return true;
      },
    });
    return true;
  }

  /** A painted shove (a burst of air and a skid along the ground) or pull (a tether from the one dragged to the puller's side, and a
   *  grip as it yanks). A launch's own event draws the throw. */
  private paintShove(b: Battle, e: Extract<BattleEvent, { kind: 'shove' }>): boolean {
    const to = this.sprites.get(e.to);
    const last = e.path[e.path.length - 1];
    if (!to || !last || e.how === 'launch') return false;
    const [lx, ly] = this.tilePos(b, last.u, last.v);
    if (e.how === 'drag') {
      if (!spellFrames(PAINT.tether).length) return false;
      // (the puller stands one tile on from where the drag stops, the way it came: the sprite is still where it was dragged from)
      const d = Math.max(1, Math.hypot(lx - to.x, ly - to.y));
      const step = Math.hypot(TW / 2, TH / 2);
      const [px, py] = [lx + ((lx - to.x) / d) * step, ly + ((ly - to.y) / d) * step];
      const lift = to.tall * 0.45;
      this.paintBeam(PAINT.tether, () => [to.x, to.y - lift], () => [px, py - lift], e.ms + 250);
      this.paintOnce(PAINT.grip, to.x, to.y - lift);
      return true;
    }
    if (!spellFrames(PAINT.shove).length) return false;
    const left = lx < to.x;
    this.paintOnce(PAINT.shove, to.x, to.y - to.tall * 0.45, left ? { stretchX: -1 } : {});
    if (!settings().saver || e.path.length > 2) this.paintAlong(PAINT.skid, to.x, to.y - 2, lx, ly - 2, { delay: 40 });
    return true;
  }

  /** A painted aura (session B): its ground loop, sized to the reach's diamond, and a few motes circling it; a sheet with a strike in
   *  place of motes (the storm cloud's bolt, the spikes' jab, the circle of death's flare) strikes a spot in its reach now and then.
   *  `hang`: the painting hangs over the centre at its own size (the storm cloud) and its bolts fall from it. `tint`: the Dirge's notes. */
  private paintAura(sheet: string, reach: number, centre: () => [number, number], live: () => boolean, onGone: () => void, o: { hang?: boolean; tint?: number } = {}): boolean {
    const ground = spellPart(`${sheet}.ground`);
    if (!ground || !spellFrames(`${sheet}.ground`).length) return false;
    const lift = o.hang ? TW * 1.6 : 0;
    const shown = this.paintLoop(`${sheet}.ground`, () => {
      const [x, y] = centre();
      return [x, y - lift];
    }, live, { mult: o.hang ? HANG_MULT : ((reach + 0.5) * 2) / ground.size, depthOf: () => (o.hang ? 9999 : -1), alpha: AURA_ALPHA_OF[sheet] ?? AURA_ALPHA, onGone, tint: o.tint });
    if (!shown) return false;
    if (spellFrames(`${sheet}.impact`).length && !this.reduced) {
      // (a strike in the reach every so often while it lasts: from the cloud's belly when it hangs, else on the ground)
      const every = settings().saver ? 1600 : 900;
      let next = 300;
      let t = 0;
      this.items.push({
        view: new Container(),
        step: (dt) => {
          t += dt;
          if (!live()) return false;
          if (t < next) return true;
          next = t + every;
          const [x, y] = centre();
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * reach * TW * 0.4;
          this.paintOnce(`${sheet}.impact`, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5 - (o.hang ? lift * 0.45 : 0));
          return true;
        },
      });
    }
    if (!spellFrames(`${sheet}.motes`).length) return true;
    const n = settings().saver ? 1 : 3;
    const r = (reach + 0.5) * TW * 0.35;
    const born = performance.now();
    for (let i = 0; i < n; i++)
      this.paintLoop(`${sheet}.motes`, () => {
        const [x, y] = centre();
        const a = (this.reduced ? 0 : (performance.now() - born) / 1400) + (i * Math.PI * 2) / n;
        return [x + Math.cos(a) * r, y - 14 + Math.sin(a) * r * 0.5];
      }, live, { tint: o.tint });
    return true;
  }

  /** A look's one-off strip at a point. */
  private lookOnce(l: Look, x: number, y: number, scale: number): void {
    if (l.paint && this.paintOnce(l.paint, x, y)) return;
    const frames = l.once ? PACK[l.once] : undefined;
    if (!frames?.length) return;
    this.particles.spawn({ frames, x, y, scale, frameMs: 60, add: true, prio: true, ...(l.tint ? { tint: l.tint } : {}), ...(l.alpha ? { alpha: l.alpha } : {}) });
  }

  /** A look's strip looped at a point while `live` holds (it may move, `where`); it fades out when `live` stops holding. Reduced motion
   *  holds its first frame. */
  private lookLoop(l: Look, where: () => [number, number], scale: number, live: () => boolean, depthOf?: () => number): void {
    if (l.paint && this.paintLoop(l.paint, where, live, { depthOf })) return;
    const frames = l.loop ? PACK[l.loop] : undefined;
    if (!frames?.length) return;
    const sp = new Sprite(frames[0]);
    sp.anchor.set(0.5, 0.6);
    sp.scale.set(scale);
    if (l.tint) sp.tint = l.tint;
    sp.alpha = l.alpha ?? 0.9;
    sp.blendMode = 'add';
    this.root.addChild(sp);
    let t = 0;
    let gone = false;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const [x, y] = where();
        sp.position.set(x, y);
        if (depthOf) sp.zIndex = depthOf();
        if (!this.reduced) sp.texture = frames[Math.floor(t / 90) % frames.length];
        if (!gone && !live()) gone = true;
        if (gone) {
          sp.alpha = Math.max(0, sp.alpha - dt / 300);
          return sp.alpha > 0;
        }
        return true;
      },
    });
  }

  /** A raised wall's tile: it rises (a burst), stands (the ruined-wall prop for a solid one, and its loop) and goes when the sim no longer has it. */
  private wallTile(b: Battle, u: number, v: number, kind: WallKind): void {
    const look = WALL_LOOKS[kind];
    const [x, y] = this.tilePos(b, u, v);
    const i = v * b.board.w + u;
    const live = () => !!b.walls?.some((w) => w.i === i && w.kind === kind && w.until > b.t);
    if (look.paint && this.paintWall(look.paint, x, y + 2, live)) return;
    this.lookOnce(look, x, y - 8, 1.6);
    if (look.prop && kitArt) {
      const sp = new Sprite(kitArt.walls[(u + v) % 2]);
      sp.anchor.set(0.5, 0.85);
      sp.scale.set(TW / Math.max(1, sp.texture.width));
      if (look.tint) sp.tint = look.tint;
      sp.position.set(x, y);
      sp.zIndex = 0;
      this.root.addChild(sp);
      let t = 0;
      this.items.push({ view: sp, step: (dt) => ((t += dt), live() || t < 200 ? true : ((sp.alpha = Math.max(0, sp.alpha - dt / 300)), sp.alpha > 0)) });
    }
    this.lookLoop(look, () => [x, y - 10], kind === 'wind' ? 1.4 : 1.2, live);
  }

  private toolkit(b: Battle, e: Extract<BattleEvent, { kind: 'shove' | 'launch' | 'slam' | 'fall' | 'burrow' | 'swap' | 'aura' | 'wallBreak' }>): void {
    const saver = settings().saver;
    if (e.kind === 'shove') {
      if (this.paintShove(b, e)) return;
      // (dust kicked up along the slide)
      for (const at2 of saver ? e.path.slice(-1) : e.path) {
        const [x, y] = this.tilePos(b, at2.u, at2.v);
        this.particles.spawn({ frames: VFX.dustWhite, x: x + jitter(4), y: y - 4, scale: 1.1, life: 420, alpha: 0.75 });
      }
    } else if (e.kind === 'launch') {
      const [x0, y0] = this.tilePos(b, e.from.u, e.from.v);
      const [x1, y1] = this.tilePos(b, e.land.u, e.land.v);
      this.lookOnce(MOVE_LOOKS.lift, x0, y0 - 6, 1.4);
      // (painted: a chunk of rock or two spinning along with the one thrown)
      const flier = this.sprites.get(e.to);
      const until = b.t + e.ms;
      if (flier)
        for (const [dx, dy] of saver ? [[-10, 0]] : [[-12, -2], [10, -14]])
          this.paintLoop(PAINT.flight, () => [flier.x + dx, flier.y - flier.tall * 0.4 + dy], () => b.t < until);
      this.later(e.ms, () => {
        this.lookOnce(MOVE_LOOKS.land, x1, y1 - 4, 1.5);
        this.trauma = Math.min(1, this.trauma + 0.15);
      });
    } else if (e.kind === 'slam') {
      const to = this.sprites.get(e.to);
      if (to) this.lookOnce(MOVE_LOOKS.slam, to.x, to.y - to.tall * 0.4, 1.3);
      this.trauma = Math.min(1, this.trauma + 0.2);
    } else if (e.kind === 'fall') {
      const to = this.sprites.get(e.to);
      if (to) this.label('Fall!', to.x, to.y - to.tall - 10, 0xffd0a0, 12, 900);
    } else if (e.kind === 'burrow') {
      const [x, y] = this.tilePos(b, e.u, e.v);
      if (e.phase === 'up') {
        this.lookOnce(MOVE_LOOKS.erupt, x, y - 8, 2.2);
        this.trauma = Math.min(1, this.trauma + 0.3);
        return;
      }
      this.lookOnce(MOVE_LOOKS.dig, x, y - 6, 1.6);
      // (the mound runs along the tunnel under the ground for as long as the burrower is under)
      const path = [{ u: e.u, v: e.v }, ...e.path];
      const start = b.t;
      let near = path[0];
      const where = (): [number, number] => {
        const f = Math.max(0, Math.min(1, (b.t - start) / Math.max(1, e.ms)));
        const k = f * (path.length - 1);
        near = path[Math.round(k)];
        const a = path[Math.floor(k)];
        const z = path[Math.min(path.length - 1, Math.floor(k) + 1)];
        const [ax, ay] = this.tilePos(b, a.u, a.v);
        const [zx, zy] = this.tilePos(b, z.u, z.v);
        const r = k - Math.floor(k);
        return [ax + (zx - ax) * r, ay + (zy - ay) * r - 2];
      };
      const me = b.units.find((x) => x.id === e.by);
      const under = () => !!me?.under && me.alive;
      if (spellFrames(MOVE_LOOKS.mound.paint).length) {
        this.lookLoop(MOVE_LOOKS.mound, where, 1.4, under, () => depth(near.u, near.v) + 5);
        return;
      }
      // (a heaped ridge of earth over the tunnel, with the dust strip churning on it: drawn where the painted burrow is not loaded)
      const g = new Graphics();
      g.ellipse(0, 0, 22, 9).fill({ color: 0x4a3426, alpha: 0.95 });
      g.ellipse(0, -4, 16, 7).fill({ color: 0x7a5a40, alpha: 0.95 });
      g.ellipse(-4, -7, 8, 3).fill({ color: 0xa88660, alpha: 0.9 });
      for (const [x, y] of [[-14, 1], [12, -1], [3, 4]]) g.circle(x, y, 2.2).fill({ color: 0x8a8070 });
      this.root.addChild(g);
      let t = 0;
      this.items.push({
        view: g,
        step: (dt) => {
          t += dt;
          const [x, y] = where();
          g.position.set(x, y + 2);
          g.zIndex = depth(near.u, near.v) + 4;
          if (!this.reduced) g.scale.set(1 + 0.08 * Math.sin(t / 90), 1);
          if (!under()) {
            g.alpha = Math.max(0, g.alpha - dt / 200);
            return g.alpha > 0;
          }
          return true;
        },
      });
      this.lookLoop(MOVE_LOOKS.mound, where, 1.4, under, () => depth(near.u, near.v) + 5);
    } else if (e.kind === 'swap') {
      for (const id of [e.a, e.b]) {
        const s = this.sprites.get(id);
        if (s) this.lookOnce(MOVE_LOOKS.swap, s.x, s.y - s.tall * 0.45, 1.4);
      }
      // (painted: a ribbon of light linking the two as they trade places)
      const sa = this.sprites.get(e.a);
      const sb = this.sprites.get(e.b);
      if (sa && sb) this.paintBeam(PAINT.swapLink, () => [sa.x, sa.y - sa.tall * 0.45], () => [sb.x, sb.y - sb.tall * 0.45], 500);
    } else if (e.kind === 'aura') {
      this.aura(b, e);
    } else {
      // (a painted ice wall plays its own break as the sim lets it go: `paintWall`)
      if (spellFrames('wall-ice.stand').length) return;
      const [x, y] = this.tilePos(b, e.u, e.v);
      this.lookOnce(MOVE_LOOKS.shatter, x, y - 10, 1.6);
    }
  }

  /** An aura: a ring over the ground of its reach (a diamond of tiles, as the grid counts reach), turning at its heart, round its caster
   *  or on its tile, for as long as the sim keeps it. */
  private aura(b: Battle, e: Extract<BattleEvent, { kind: 'aura' }>): void {
    const look = auraLook(e.what);
    const me = b.units.find((x) => x.id === e.by);
    const live = () => !!b.auras?.some((a) => a.by === e.by && a.what === e.what && a.until > b.t);
    if (b.auras?.some((a) => a.by === e.by && a.what === e.what) && this.auraShown.has(`${e.by}:${e.what}`)) return;
    this.auraShown.add(`${e.by}:${e.what}`);
    const centre = (): [number, number] => {
      const c = e.at ?? me ?? { u: 0, v: 0 };
      return this.tilePos(b, c.u, c.v);
    };
    if (look.paint && this.paintAura(look.paint, e.reach, centre, live, () => this.auraShown.delete(`${e.by}:${e.what}`), { hang: look.hang })) return;
    const g = new Graphics();
    const r = e.reach + 0.5;
    g.poly([0, (-TH / 2) * r * 2, (TW / 2) * r * 2, 0, 0, (TH / 2) * r * 2, (-TW / 2) * r * 2, 0]).fill({ color: look.ring, alpha: 0.1 }).stroke({ color: look.ring, width: 2, alpha: 0.7 });
    g.zIndex = -1;
    this.root.addChild(g);
    let t = 0;
    let gone = false;
    this.items.push({
      view: g,
      step: (dt) => {
        t += dt;
        const [x, y] = centre();
        g.position.set(x, y);
        if (!this.reduced) g.alpha = 0.8 + 0.2 * Math.sin(t / 350);
        if (!gone && !live()) gone = true;
        if (gone) {
          g.alpha = Math.max(0, g.alpha - dt / 300);
          if (g.alpha <= 0) this.auraShown.delete(`${e.by}:${e.what}`);
          return g.alpha > 0;
        }
        return true;
      },
    });
    this.lookLoop(look, () => {
      const [x, y] = centre();
      return [x, y - 4];
    }, 1.3, live);
  }

  /** The healers' painted spells (RPG-SPELLS batch 2, session C), over the looks their skills already play: by the skill's key, a part
   *  played at the caster, or at each fighter the cast healed, struck or marked in the same tick. */
  private healerPaint(events: BattleEvent[]): void {
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      this.setEpic(epicEvent(e, this.epic));
      const look = HEALER_PAINT[e.name];
      if (!look) continue;
      const by = this.sprites.get(e.by);
      if (!by) continue;
      if (look.on === 'caster') {
        this.paintOnce(look.part, by.x, by.y, { delay: e.ms * 0.6 });
        continue;
      }
      const to = new Set<number>();
      for (const x of events) {
        if ((x.kind === 'heal' && x.by === e.by && x.amount > 0) || (x.kind === 'hit' && x.by === e.by) || (x.kind === 'mark' && x.by === e.by)) to.add(x.to);
      }
      for (const id of to) {
        const s = this.sprites.get(id);
        if (s) this.paintOnce(look.part, s.x, s.y - (spellAnchorY(look.part) > 0.8 ? 0 : s.tall * 0.45), { delay: e.ms * 0.6 });
      }
    }
  }

  /** The hero moves' painted parts (RPG-SPELLS sessions D and E, and session B's slowing field; `movePaints.ts`), over the looks their
   *  skills already play: at the caster, flying or held from it to each fighter the cast struck in the same tick, on each of them, where
   *  it lands after a leap, and loops held over a fighter while the state they show lasts. Nothing here changes the fight. */
  private movePaint(b: Battle, events: BattleEvent[]): void {
    for (const e of events) {
      this.setEpic(epicEvent(e, this.epic));
      // (a blow the Samurai answers while his parry stance is up: the parry spark on the one he cuts)
      if (e.kind === 'hit' && e.src === 'blow') {
        const by = b.units.find((u) => u.id === e.by);
        const to = this.sprites.get(e.to);
        if (by && to && (by.kx?.parry ?? 0) > b.t) this.paintOnce(RIPOSTE, to.x, to.y - to.tall * 0.5);
        continue;
      }
      // (the Wolf Bard's standing song turned loud: the ring of staff lines round him and its notes, gold for the Anthem, violet for the Dirge)
      if (e.kind === 'mark' && e.to === e.by && (e.what === 'anthem' || e.what === 'dirge')) {
        const by = this.sprites.get(e.by);
        const until = b.t + e.ms;
        const key = `song:${e.by}`;
        if (by && !this.standShown.has(key)) {
          this.standShown.add(key);
          this.paintAura(SONG_SHEET, SONG_REACH, () => [by.x, by.y], () => b.t < until && by.unit.alive, () => this.standShown.delete(key), { tint: e.what === 'dirge' ? DIRGE_TINT : undefined });
        }
        continue;
      }
      if (e.kind !== 'skill') continue;
      const m = MOVE_PAINT[e.name];
      const by = this.sprites.get(e.by);
      if (!m || !by) continue;
      const delay = e.ms * 0.6;
      const struck: number[] = [];
      for (const x of events) {
        const id = (x.kind === 'hit' && x.by === e.by && x.src === 'skill') || (x.kind === 'mark' && x.by === e.by) || (x.kind === 'heal' && x.by === e.by && x.amount > 0) ? x.to : x.kind === 'arc' && x.from === e.by ? x.to : undefined;
        if (id !== undefined && id !== e.by && !struck.includes(id)) struck.push(id);
      }
      const body = (key: string, s: UnitSprite): [number, number] => [s.x, s.y - (spellAnchorY(key) > 0.8 ? 0 : s.tall * 0.45)];
      if (m.cast) this.paintOnce(m.cast, ...body(m.cast, by));
      if (m.self) this.paintOnce(m.self, by.x, by.y, { delay: delay * 0.5 });
      if (m.flare) this.paintOnce(m.flare, ...body(m.flare, by), { delay: e.ms });
      if (m.trail) {
        const run = events.find((x): x is Extract<BattleEvent, { kind: 'dash' | 'blink' }> => (x.kind === 'dash' || x.kind === 'blink') && x.by === e.by);
        if (run) {
          const lift = by.tall * 0.45;
          const [x0, y0] = this.tilePos(b, run.from.u, run.from.v);
          const [x1, y1] = this.tilePos(b, run.to.u, run.to.v);
          this.paintAlong(m.trail, x0, y0 - lift, x1, y1 - lift, { delay: 40 });
        }
      }
      if (m.land) {
        const me = b.units.find((u) => u.id === e.by);
        if (me) {
          const [lx, ly] = this.tilePos(b, me.u, me.v);
          this.paintOnce(m.land, lx, ly, { delay: e.ms });
        }
      }
      if (m.field) {
        const f = m.field;
        const until = b.t + f.ms;
        const key = `field:${e.by}`;
        if (!this.standShown.has(key)) {
          this.standShown.add(key);
          this.paintAura(f.sheet, f.reach, () => [by.x, by.y], () => b.t < until && by.unit.alive, () => this.standShown.delete(key));
        }
      }
      const targets = struck.map((id) => this.sprites.get(id)).filter((s): s is UnitSprite => !!s);
      if (m.ground) {
        // (a ground loop at its brief size for a moment: round the caster, or under those it struck, four at most)
        const gr = m.ground;
        const until = b.t + gr.ms;
        const on = gr.at === 'self' ? [by] : gr.at === 'first' ? targets.slice(0, 1) : targets.slice(0, 4);
        for (const s of on) this.paintLoop(gr.part, () => [s.x, s.y], () => b.t < until, { depthOf: () => -1, alpha: AURA_ALPHA });
      }
      if (m.streak) for (const to of targets) this.paintAlong(m.streak, by.x, by.y - by.tall * 0.45, to.x, to.y - to.tall * 0.45, { delay: 40 });
      if (m.chain && m.beam) {
        // (the bolt forks along each arc of the cast: from the caster, then from each it struck on to the next)
        const linked = new Set([e.by, ...struck]);
        for (const x of events) {
          if (x.kind !== 'arc' || !linked.has(x.from)) continue;
          const a = this.sprites.get(x.from);
          const z = this.sprites.get(x.to);
          if (a && z) this.paintBeam(m.beam, () => [a.x, a.y - a.tall * 0.45], () => [z.x, z.y - z.tall * 0.45], Math.max(450, e.ms * 0.8));
        }
      }
      // (a wave rolls once, out to the farthest it strikes, and breaks on each as it goes)
      const reach = (s: UnitSprite) => Math.hypot(s.x - by.x, s.y - by.y);
      const farthest = m.roll ? [...targets].sort((p, q) => reach(q) - reach(p))[0] : undefined;
      const lift = (s: UnitSprite) => s.tall * 0.45;
      targets.forEach((to, i) => {
        if (m.one && i > 0) return;
        const hit = (wait = 0) => {
          if (m.impact) this.paintOnce(m.impact, ...body(m.impact, to), { delay: wait });
          if (m.then) this.paintOnce(m.then, ...body(m.then, to), { delay: wait + 280 });
        };
        if (m.beam && !m.chain) {
          // (a hook flies first and the rope holds after it; a blast or a drain holds from the start)
          const ms = Math.max(500, e.ms);
          this.later(m.travel ? TRAVEL_MS : 0, () => this.paintBeam(m.beam!, () => [by.x, by.y - lift(by)], () => [to.x, to.y - lift(to)], ms));
        }
        if (!m.travel) this.later(delay, () => hit());
        else if (!m.roll) this.paintFly(m.travel, by.x, by.y - lift(by), to.x, to.y - lift(to), TRAVEL_MS, () => hit());
        else if (to === farthest) this.paintFly(m.travel, by.x, by.y - 6, to.x, to.y - 6, TRAVEL_MS * 2, () => undefined);
        if (m.roll) hit(Math.round((reach(to) / Math.max(1, reach(farthest!))) * TRAVEL_MS * 2));
      });
      if (m.stand) {
        const st = m.stand;
        const on = st.on === 'self' ? [e.by] : struck;
        for (const id of on) this.paintStand(b, st.part, id, st.state);
      }
    }
  }

  /** A painted loop held over a fighter (or at its feet, when it stands on the ground) while `state` lasts on it. */
  private paintStand(b: Battle, key: string, id: number, state: StandState): void {
    const s = this.sprites.get(id);
    const u = b.units.find((x) => x.id === id);
    const tag = `${key}:${id}`;
    if (!s || !u || this.standShown.has(tag)) return;
    const live = (): boolean => {
      if (!u.alive) return false;
      if (state === 'stun') return (u.stunUntil ?? 0) > b.t;
      if (state === 'bounty') return (u.kx?.bounty?.until ?? 0) > b.t;
      if (state === 'condemned') return (u.kx?.condemned?.until ?? 0) > b.t;
      if (state === 'siege') return (u.kx?.siege ?? 0) > b.t;
      return (u.kx?.fury ?? 0) > b.t;
    };
    if (!live()) return;
    this.standShown.add(tag);
    const footedPart = spellAnchorY(key) > 0.8;
    this.paintLoop(key, () => [s.x, footedPart ? s.y : s.y - s.tall - 12], live, { alpha: footedPart ? 0.8 : 1, onGone: () => this.standShown.delete(tag) });
  }

  /** A painted bolt (painted pointing right) flying from (x0, y0) to (x1, y1) over `ms`, turned along its way (flipped going left, so it
   *  stays the right way up), then `land`. */
  private paintFly(key: string, x0: number, y0: number, x1: number, y1: number, ms: number, land: () => void, heading = 0): boolean {
    const frames = spellFrames(key);
    if (!frames.length) {
      land();
      return false;
    }
    const sp = new Sprite(frames[0]);
    sp.anchor.set(0.5);
    const scale = spellScale(key);
    const left = x1 < x0;
    sp.rotation = Math.atan2(y1 - y0, x1 - x0) - (left ? -heading : heading);
    sp.scale.set(scale, left ? -scale : scale);
    sp.alpha = 0;
    this.root.addChild(sp);
    let t = 0;
    this.items.push({
      view: sp,
      step: (dt) => {
        t += dt;
        const f = Math.min(1, t / ms);
        sp.position.set(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        if (!this.reduced) sp.texture = frames[Math.floor(t / 70) % frames.length];
        sp.alpha = Math.min(1, t / 60);
        if (f >= 1) {
          land();
          return false;
        }
        return true;
      },
    });
    return true;
  }

  /** A painted throw of the `area` kind (`AREA_PAINT`): the ball flies from the sky (slanting down from the upper right, as the old meteor
   *  fell) or from its caster for the throw's own `ms`, and its burst plays where it lands, with the old landing's thud. */
  private paintArea(b: Battle, e: Extract<BattleEvent, { kind: 'area' }>, p: AreaPaint): boolean {
    const [cx, cy] = this.tilePos(b, e.u, e.v);
    const by = this.sprites.get(e.by);
    const land = () => {
      this.paintOnce(p.impact, cx, cy - 10);
      if (!this.calm()) this.stopLeft = Math.max(this.stopLeft, 34);
      this.microThud(cx, cy, 1.2, 0, 1);
      if (p.scorch) this.scorch(cx, cy);
    };
    if (!p.travel) {
      // (no ball: its mark plays on the spot as it is aimed, then the burst as it lands)
      if (!p.mark || !this.paintOnce(p.mark, cx, cy - 10)) return false;
      this.later(Math.max(200, e.ms), land);
      return true;
    }
    // (the volley's arrows come down from the upper left, the way they are painted pointing; the rest slant in from the upper right)
    const sky: [number, number] = p.heading ? [cx - 150, cy - 360] : [cx + 150, cy - 360];
    const [x0, y0] = p.from === 'caster' && by ? [by.x, by.y - by.tall * 0.45] : sky;
    // (a thrown ball comes down on the foes' middles; a keg rolls along the ground)
    const ground = p.travel.startsWith('keg');
    const ty = ground ? cy - 6 : cy - 14;
    return this.paintFly(p.travel, x0, ground && by ? by.y - 6 : y0, cx, ty, Math.max(200, e.ms), land, p.heading);
  }


  /** A healer raised a fallen hero (RPG-SPELLS batch 2): it gets up where it lay (the heart revive's `getUp`), with its healer's painted
   *  revive (the Cleric's ankh, the Priestess's wings, the Wanderer's elixir, the Druid's leaves: session C) at its feet, or a column of
   *  light from the pack where none is painted, and a thread of light runs to it from its healer. */
  private revive(e: Extract<BattleEvent, { kind: 'revive' }>): void {
    const to = this.sprites.get(e.to);
    if (!to) return;
    to.getUp();
    const x = to.x;
    const y = to.y;
    const by = this.sprites.get(e.by);
    const sheet = REVIVE_SHEET[by?.unit.def ?? ''] ?? 'resurrection';
    const painted = this.paintOnce(`${sheet}.cast`, x, y) && (this.paintOnce(`${sheet}.impact`, x, y, { delay: 280 }) || true);
    if (!painted) {
      this.lookOnce({ once: 'light-pillar', tint: 0xfff0b0 }, x, y - to.tall * 0.6, 2.2);
      this.lookOnce({ once: 'light-nova' }, x, y - 4, 1.8);
    }
    this.label('Revived!', x, y - to.tall - 14, 0xfff2a0, 14, 1400, true);
    if (by && by !== to) this.thread(by.x, by.y - by.tall * 0.5, x, y - to.tall * 0.5, 'light-sparkle');
    this.trauma = Math.min(1, this.trauma + 0.15);
  }

  /** The world position of a tile's top. */
  private tilePos(b: Battle, u: number, v: number): [number, number] {
    return at(u, v, tileAt(b.board, u, v)?.h ?? 0);
  }

  /** A dash leaves a streak between the tiles; a blink a puff of smoke at each end. */
  private streak(b: Battle, e: Extract<BattleEvent, { kind: 'dash' | 'blink' }>, slash?: Slash): void {
    const by = this.sprites.get(e.by);
    const lift = (by?.tall ?? 40) * 0.45;
    const [x0, y0] = this.tilePos(b, e.from.u, e.from.v);
    const [x1, y1] = this.tilePos(b, e.to.u, e.to.v);
    if (e.kind === 'blink' && spellFrames(PAINT.blinkOut).length) {
      // (painted: vanishing in a swirl, appearing out of a point; a blink that strikes leaves a slash streak and a crossed cut on the
      // foe, each hop of a teleport slash in turn)
      const delay = slash ? slash.hop * SLASH_HOP_MS : 0;
      this.paintOnce(PAINT.blinkOut, x0, y0 - lift, { delay });
      this.paintOnce(PAINT.blinkIn, x1, y1 - lift, { delay: delay + 60 });
      const foe = slash && this.sprites.get(slash.struck);
      if (foe) {
        this.paintAlong(PAINT.slash, x0, y0 - lift, x1, y1 - lift, { delay });
        this.paintOnce(PAINT.slashHit, foe.x, foe.y - foe.tall * 0.5, { delay: delay + 80 });
      }
      return;
    }
    if (e.kind === 'dash' && spellFrames(PAINT.dash).length) {
      // (painted: a long smear of speed along the run, after-images, and dust kicked up where it stops)
      if (by && !this.reduced) this.afterimages(by, x0, y0, x1, y1);
      this.paintAlong(PAINT.dash, x0, y0 - lift, x1, y1 - lift);
      this.paintOnce(PAINT.dashStop, x1, y1 - 6, { delay: 60 });
      return;
    }
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
    if (by && !this.reduced) this.afterimages(by, x0, y0, x1, y1);
    for (let i = 0; i <= 5; i++)
      this.particles.spawn({ frames: VFX.dustWhite, x: x0 + ((x1 - x0) * i) / 5, y: y0 + ((y1 - y0) * i) / 5, scale: 0.7, life: 420, delay: i * 25, vy: -0.02, grow: 0.0008, alpha: 0.8 });
    const left = x1 < x0;
    play(this.particles, 'wind-slash', x1, y1 - lift, {
      scale: 1.6,
      frameMs: 45,
      rotation: left ? Math.atan2(-(y1 - y0), -(x1 - x0)) : Math.atan2(y1 - y0, x1 - x0),
      ...(left ? { stretchX: -1 } : {}),
    });
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

  /** A dash's after-images, fading along the run. */
  private afterimages(by: UnitSprite, x0: number, y0: number, x1: number, y1: number): void {
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

  /** A 3x3 of tiles marked as a volley or meteor comes down on it after `ms`. */
  private area(b: Battle, e: Extract<BattleEvent, { kind: 'area' }>, royalSky?: 'meteor' | 'starfall'): void {
    const meteor = e.id === 'meteor';
    const color = meteor ? 0xff5a2a : 0xffe27a;
    const view = new Container();
    const g = new Graphics();
    view.addChild(g);
    this.root.addChild(view);
    const tiles: [number, number][] = [];
    // (a 3x3, or wider for a tier skill's widened volley or judgement)
    const r = 1 + (e.r ?? 0);
    for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) if (tileAt(b.board, e.u + du, e.v + dv)) tiles.push(this.tilePos(b, e.u + du, e.v + dv));
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
    const skyArt = e.by === 0 ? `spell:${royalSky ?? 'meteor'}` : `skill:${this.tickCasts.get(e.by) ?? this.casting.get(e.by) ?? 'Meteor'}`;
    // (RPG-SPELLS sessions D and E: a painted ball and burst for the moves that have them, `AREA_PAINT`)
    const paint = e.by === 0 ? undefined : AREA_PAINT[this.tickCasts.get(e.by) ?? this.casting.get(e.by) ?? ''];
    if (paint && spellFrames(paint.travel ?? paint.mark ?? '').length && this.paintArea(b, e, paint)) {
      this.root.removeChild(view);
      view.destroy({ children: true });
      return;
    }
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

  /** The meteor lands: a big explosion with a flash, a ring of fire, rubble and smoke, a crater that stays and cools, and a hard shake with a 2-frame hit-stop and micro-thud. */
  private meteorLanding(cx: number, cy: number, art: string): void {
    if (!this.calm()) this.stopLeft = Math.max(this.stopLeft, 34); // subtle 2-frame hit-stop
    this.microThud(cx, cy, 1.5, 0, 1.2); // localized downward camera micro-thud
    const p = this.particles;
    // (layers kept apart and thinned so the blast stays orange instead of clipping to white)
    const frames = abilityFrames(art, 'explosion');
    if (frames) this.particles.spawn({ frames, art, x: cx, y: cy - 12, scale: 3.5, frameMs: 70, alpha: 0.9, prio: true });
    play(p, 'fire-wave', cx, cy, { scale: 4.5, frameMs: 80, add: false, alpha: 0.7 });
    for (let i = 0; i < bits(8, p.density); i++)
      p.spawn({ frames: PACK['earth-puff'], x: cx + jitter(14), y: cy - 6, scale: 0.6, life: 800, vx: jitter(0.12), vy: -0.16 - Math.random() * 0.1, gravity: 0.0006, spin: jitter(0.014), prio: true });
    for (let i = 0; i < bits(4, p.density); i++)
      p.spawn({ frames: PACK['fire-smoke'], x: cx + jitter(22), y: cy - 10 + jitter(8), scale: 1.6, life: 1200, delay: i * 80, vy: -0.03, grow: 0.0006, alpha: 0.7 });
    this.scorch(cx, cy);
    this.trauma = Math.min(1, this.trauma + 0.6);
  }

  /** The crater a fiery landing leaves: a scorched ellipse that glows, then cools and fades. */
  private scorch(cx: number, cy: number): void {
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
    const targetPt = foes[0] ?? (SPELLS[e.id].target === 'all' ? allies[0] : undefined);
    const [svx, svy] = targetPt ? [targetPt.x - centre.x, (targetPt.y - targetPt.tall * 0.5) - (centre.y - 20)] : [0, -1];
    const slen = Math.hypot(svx, svy) || 1;
    playSteps(SPELL_SIGNATURES[e.id].cast, { p: this.particles, self: { ...centre, tall: 40 }, foes, allies, dir: { x: svx / slen, y: svy / slen }, ms: 700, size: 1 });
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
    // (painted, session B: the bristling patch over the 3x3, thorns jabbing up in it now and then)
    const [px, py] = this.tilePos(b, u, v);
    const until = b.t + ms;
    if (this.paintAura(SPIKES_SHEET, 1, () => [px, py], () => b.t < until, () => undefined)) return;
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
    if (e.what in WALL_LOOKS) return this.wallTile(b, e.u, e.v, e.what as WallKind);
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
    // (painted, session F: the hidden ring of teeth and rope while it waits, and the snap when it is sprung)
    if (spellFrames(SNARE.ground).length) {
      const [x, y] = this.tilePos(b, u, v);
      const born = b.t;
      const live = () => b.t - born < ms && (b.t - born < 200 || !!b.traps?.some((tr) => tr.u === u && tr.v === v));
      this.paintLoop(SNARE.ground, () => [x, y], live, { depthOf: () => -1, alpha: 0.9, onGone: () => b.t - born < ms - 150 && this.paintOnce(SNARE.impact, x, y - 8) });
      return;
    }
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

  /** A cabbage kicked onto a tile by Duchess: heals the first unit walking over it. */
  cabbage(b: Battle, u: number, v: number): void {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2f741d';
    ctx.fillRect(4, 5, 8, 8);
    ctx.fillStyle = '#59b83b';
    ctx.fillRect(5, 4, 6, 8);
    ctx.fillRect(4, 6, 8, 5);
    ctx.fillStyle = '#a6eb86';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 2, 2);

    const view = Sprite.from(c);
    view.anchor.set(0.5);
    const [x, y] = this.tilePos(b, u, v);
    view.position.set(x, y - 6);
    this.root.addChild(view);
    this.items.push({
      view,
      step: () => {
        const live = b.cabbages?.some((item) => item.u === u && item.v === v);
        if (!live) {
          view.destroy();
          return false;
        }
        return true;
      },
    });
  }

  /** An ailment shrugged off (resisted, a boss's ladder, a ward): its chip crossed out, and the word, rising a little (STATUS-FX). */
  private immune(id: number, what: AilmentKey): void {
    const s = this.sprites.get(id);
    if (!s || !settings().numbers) return;
    const { txt } = this.label('Immune', s.x + 6, s.y - s.tall - 12, IMMUNE_COLOUR, 9, 800);
    if (txt.children.length) return;
    const chip = ailmentChip(what, undefined, true);
    chip.position.set(-txt.width / 2 - 8, -txt.height / 2);
    txt.addChild(chip);
  }

  /** A frozen fighter's ice shatters: the burst of shards, once, and the word (the extra blow's number follows, ice-white and big). */
  private shatter(id: number): void {
    const s = this.sprites.get(id);
    if (!s) return;
    const part = STATUS_STYLES.freeze.parts.burst!;
    const frames = statusFrames(statusKey('freeze', 'burst'));
    if (frames.length) {
      // (with reduced motion: one still frame of it, fading)
      const calm = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const sp = this.anim({ frames: calm ? [frames[Math.floor(frames.length * 0.6)]] : frames }, s.x, s.y - s.tall * part.at, (s.tall * part.size) / STATUS_CELL, part.frameMs);
      sp.blendMode = 'normal';
    }
    this.label('SHATTER', s.x, s.y - s.tall - 44, SHATTER_COLOUR, 9, 900);
  }

  /** The damage numbers still rising over each spot, so a new one over the same fighter starts above the last, not on it. */
  private stacks = new Map<string, { at: number; n: number }>();

  /** A damage number: white (gold for a heavy blow, red on a hero), or an ailment's colour for its ticks and riders (STATUS-FX), and
   *  bigger and ice-white for a shatter. */
  private number(n: number, x: number, y: number, heavy: boolean, onHero: boolean, high = false, ail?: AilmentKey | 'shatter'): void {
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
      style: { fontFamily: "'Press Start 2P', monospace", fontWeight: 'normal', fontSize: ail === 'shatter' ? 13 : heavy ? 12 : 9, fill: numberColour(ail) ?? (onHero ? 0xff7a6a : heavy ? 0xffd34a : 0xffffff), stroke: { color: 0x1a1008, width: 3 } },
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
  private arc(fromId: number, toId: number, shock = false): void {
    const a = this.sprites.get(fromId);
    const c = this.sprites.get(toId);
    if (!a || !c) return;
    const style = shock ? 'lightning' : arcStyle(a.unit.def);
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
    const x1 = to.x;
    const y1 = to.y - to.tall * 0.45;
    const aim = Math.atan2(y1 - y0, x1 - x0);
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
    const [x0, y0, x1, y1] = [by.x, by.y - by.tall * 0.5, to.x, to.y - to.tall * 0.5];
    const sp = new Sprite(arrow);
    sp.anchor.set(0.5);
    sp.scale.set(1.1);
    sp.tint = 0xe8d8b8;
    sp.rotation = Math.atan2(y1 - y0, x1 - x0);
    this.root.addChild(sp);
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

/** A blink that strikes (a teleport slash's hop, or any blink behind a foe and a blow): the foe struck and which hop of the caster's
 *  this is in the tick (for the page to stagger them, `SLASH_HOP_MS`). */
interface Slash {
  struck: number;
  hop: number;
}

/** The blinks in a tick's events that strike: each followed, before the caster's next blink, by its skill blow on a foe. */
function slashesOf(events: readonly BattleEvent[]): Map<BattleEvent, Slash> {
  const out = new Map<BattleEvent, Slash>();
  const hops = new Map<number, number>();
  events.forEach((e, i) => {
    if (e.kind !== 'blink') return;
    const hop = hops.get(e.by) ?? 0;
    hops.set(e.by, hop + 1);
    for (let j = i + 1; j < events.length; j++) {
      const n = events[j];
      if (n.kind === 'blink' && n.by === e.by) break;
      if (n.kind === 'hit' && n.by === e.by && n.to !== e.by && n.src === 'skill') {
        out.set(e, { struck: n.to, hop });
        break;
      }
    }
  });
  return out;
}
