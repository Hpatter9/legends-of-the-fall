// The fighters drawn: an animated sprite from the unit's sheet, mirrored to face the way it's going, a shadow under it
// and a health bar over its head. A step is drawn as a glide between the two tiles with a hop (higher for a climb).

import { ColorMatrixFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Unit } from '../sim/battle';
import { formOf, UNITS } from '../sim/units';
import { AwakenAura } from './awakenAura';
import { auraOf } from './auraStyles';
import { awakenedSheet, battleSheet, combatAuraStep } from './awakenLook';
import { loadImage } from './loadImage';
import bannerUrl from '../art/castle/banner.png';
import { facesRightOf, framesOf, figureOf, hasSheet, type Anim } from './sheets';

/** The standard's look: the castle courtyard's banner (from the packs, already in the game; credited in CREDITS.md). */
let bannerTex: Texture | null = null;
if (typeof Image !== 'undefined') void loadImage(bannerUrl).then((img) => (bannerTex = Texture.from(img))).catch(() => {});

/** The scale a borrowed sheet is drawn at: that of a kind whose own sheet (or form) it is, else the fighter's own. */
const lookScales = new Map<string, number>();
function lookScale(sheet: string, own: number): number {
  if (!lookScales.has(sheet)) {
    const def = Object.values(UNITS).find((d) => d.sheet === sheet || d.forms?.includes(sheet));
    lookScales.set(sheet, def?.scale ?? own);
  }
  return lookScales.get(sheet)!;
}
import { CHARGE_MAX, kitOf, ultimateOf } from '../sim/abilities';
import { poolOf } from '../sim/heroKits';
import { at, depth, facesRight, facesAway, HH } from './iso';
import { heroLook, rearView, formScale } from './heroFacing';
import { VFX } from './vfxArt';
import { paintSprite } from './cinematicArt';
import { PACK } from './fxSheets';
import { deathKind, maxStatuses, statusesOf, STATUS_LOOKS } from './fxRules';
import { settings } from '../settings';
import { badgeOf } from '../sim/levels';
import { AURA_COLOURS, auraHalo, auraRings } from './levelLook';
import { attackMotion } from './motionRules';
import { AilmentFx, ailmentTint } from './ailmentLayer';

/** The sheet rows beyond `Anim`: the skills' casts (a sheet without one plays its plain attack). */
type Row = Anim | 'attack2' | 'defend';
const rowFrames = framesOf as (sheet: string, row: Row) => Texture[];
const hasRow = (sheet: string, row: Row) => rowFrames(sheet, row) !== framesOf(sheet, 'idle');

const BAR_W = 30;
/** How long a hurt flinch shows. */
const HURT_MS = 240;
/** The fallen fade out over this long, after lying still a while. */
const FADE_FROM = 1600;
const FADE_MS = 900;
/** A grade 3 hero is drawn this much bigger, and a grade 4 (rank 4, the top since MERGE-TWO) bigger again. */
const GRADE3_SIZE = 1.08;
const GRADE4_SIZE = 1.14;
/** Rank 4's colours: a violet halo and rim, and violet sparks (grade 3's are gold). */
const GRADE4_HALO = 0xb06aff;
const GRADE4_RIM = 0xd49aff;
const GRADE4_SPARK = 0xe6c2ff;
/** The ultimate's meter under the skill's: violet while it fills, gold when ready. */
const ULT_FILL = 0xb06aff;
const ULT_READY = 0xffd24a;
/** How long the evolve burst lasts (ms). */
const BURST_MS = 800;
/** How long a fallen hero takes to get up when a heart raises it (its dead row played backwards, FIGHT-FIXES). */
export const RISE_MS = 720;

/** The colour grade of a hero above the first: richer tones; grade 3 lifts red and green together and trims blue, so
 *  highlights go warm gold without turning grey armour pink. Built once per sprite. */
function gradeFilter(grade: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.saturate(grade > 2 ? 0.2 : 0.4, false);
  if (grade > 2) {
    const m = f.matrix;
    for (const r of [0, 1, 2]) {
      m[r] *= 1.07;
      m[5 + r] *= 1.07;
      m[10 + r] *= 0.84;
    }
    m[4] += 0.03;
    m[9] += 0.025;
  }
  return f;
}

/** A flat-colour filter for the rim copies of the sprite. */
function flatFilter(color: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  // prettier-ignore
  f.matrix = [0, 0, 0, 0, ((color >> 16) & 255) / 255, 0, 0, 0, 0, ((color >> 8) & 255) / 255, 0, 0, 0, 0, (color & 255) / 255, 0, 0, 0, 1, 0];
  return f;
}

/** A colour between two (k from 0 to 1). */
function mixTint(a: number, b: number, k: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - k) + ((b >> shift) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export class UnitSprite {
  readonly root = new Container();
  private body = new Sprite();
  private shadow = new Graphics();
  private bar = new Graphics();
  /** The shield's ring round a raised guard, the status icon over the head, and the light pillar of an evolve. */
  private shield = new Sprite();
  private badge = new Sprite();
  private pillar = new Sprite();
  /** The loops of the buffs on it (up to three, made as needed); `stars` only marks where they go in the drawing order. */
  private overlays: Sprite[] = [];
  private stars = new Graphics();
  /** Its ailments' look: body parts behind and in front of it, and the chips over its head (STATUS-FX). */
  private ail = new AilmentFx();
  /** A knock from a blow, in px (it eases back to nothing). */
  private kx = 0;
  private ky = 0;
  private flash = 0;
  private glow = new Graphics();
  /** The rings (and, higher up, the halo) of a deep level milestone, drawn once. */
  private aura = new Graphics();
  /** Four flat-coloured copies of the body, a pixel out each way: a rim behind the sprite. */
  private rim = new Container();
  private sparks = new Graphics();
  /** An awakened hero's class aura (null for the rest). */
  private awakenAura: AwakenAura | null;
  private burstAt = -1;
  /** When a heart raised this fighter (Date.now ms; -1 when it is not getting up), and how it fell (for its tint going back). */
  private riseAt = -1;
  private readonly grade: number;
  private sheet: string;
  /** Its own sheet, and the scale it is drawn at, when no kit lends it another look (`Unit.look`: a form, a guise, a wraith's shape). */
  private readonly ownSheet: string;
  private scaleNow = 1;
  private sizeNow = 1;
  /** What its root is scaled to when it stands still, and when and how big (0.25 steps) its promotion's pop began. */
  private baseSize = 1;
  private popAt = -1;
  private popBy = 0;
  private reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  /** Where it was last drawn (world pixels): for effects to aim at. */
  x = 0;
  y = 0;
  /** How tall it's drawn. */
  tall = 40;

  constructor(public unit: Unit, private readonly equipmentStep = unit.awaken ?? 0) {
    const def = defOf(unit);
    this.grade = unit.side === 'hero' ? (unit.grade ?? 1) : 1;
    const awake = unit.side === 'hero' ? this.equipmentStep : 0;
    this.sheet = unit.side === 'hero' ? battleSheet(unit.def, awake, this.grade) : formOf(def, this.grade);
    const auraStep = unit.side === 'hero' ? combatAuraStep(this.grade) : 0;
    this.awakenAura = auraStep ? new AwakenAura(unit.def, auraStep, settings().saver) : null;
    const size = (unit.size ?? 1) * (this.grade > 3 ? GRADE4_SIZE : this.grade > 2 ? GRADE3_SIZE : 1);
    this.tall = figureOf(this.sheet) * def.scale * size;
    this.ownSheet = this.sheet;
    this.scaleNow = def.scale;
    this.sizeNow = size;
    this.root.scale.set(size);
    this.baseSize = size;
    if (this.grade > 1) {
      // a halo of stacked ellipses behind the body (silver-blue, then gold), drawn once, and a rim of the body's own shape
      const col = this.grade > 3 ? GRADE4_HALO : auraOf(unit.def).colour;
      const h = this.tall * 0.62;
      for (let i = 5; i >= 1; i--) this.glow.ellipse(0, -this.tall * 0.45, (12 + i * 5) / size, (h * (0.5 + i * 0.13)) / size).fill({ color: col, alpha: this.grade > 3 ? 0.16 : this.grade > 2 ? 0.12 : 0.1 });
      for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) {
        const r = new Sprite();
        r.anchor.set(0.5, 1);
        r.position.set(dx, dy);
        this.rim.addChild(r);
      }
      this.rim.filters = [flatFilter(this.grade > 3 ? GRADE4_RIM : col)];
      const tone = this.grade > 1 ? [gradeFilter(this.grade)] : [];
      if (tone.length) this.body.filters = tone;
    }
    this.shadow.ellipse(0, 0, 13, 5).fill({ color: 0x000000, alpha: 0.32 });
    // a hero past a deep milestone (lasting level 40 and up) stands in steady rings of the badge's colour
    const tier = unit.side === 'hero' ? badgeOf(unit.level ?? 1) : 0;
    if (tier) {
      const col = AURA_COLOURS[tier];
      for (let i = 0; i < auraRings(tier); i++) this.aura.ellipse(0, 0, 15 + i * 4, 6.5 + i * 1.7).stroke({ color: col, width: 1.5, alpha: 0.85 - i * 0.2 });
      if (auraHalo(tier)) for (let i = 3; i >= 1; i--) this.aura.ellipse(0, -this.tall * 0.4, (10 + i * 5) / size, (this.tall * (0.28 + i * 0.12)) / size).fill({ color: col, alpha: 0.07 });
    }
    this.body.anchor.set(0.5, 1);
    this.shield.anchor.set(0.5);
    this.shield.visible = false;
    this.badge.anchor.set(0.5);
    this.badge.visible = false;
    this.pillar.anchor.set(0.5, 1);
    this.pillar.visible = false;
    this.pillar.blendMode = 'add';
    this.root.addChild(this.shadow, this.aura, this.glow, ...(this.awakenAura ? [this.awakenAura.back] : []), this.pillar, this.shield, this.ail.back, this.rim, this.body, ...(this.awakenAura ? [this.awakenAura.front] : []), this.sparks, this.stars, this.bar, this.badge, this.ail.front);
  }

  /** Draw it at the time `t` of the fight (ms), on the board. */
  update(b: Board, t: number, fighting: boolean, victory = false, victoryMs = 0): void {
    const u = this.unit;
    const def = defOf(u);
    // (a kit lends it another look for a while: a werewolf's form, a treant, a foe's guise, a wraith's shape; drawn at that shape's own scale)
    const borrowed = u.look ? awakenedSheet(heroLook(u.def, u.look), u.side === 'hero' ? this.equipmentStep : 0) : undefined;
    const base = borrowed && hasSheet(borrowed) ? borrowed : this.ownSheet;
    const facing = facesAway(u.facing) ? rearView(base) : base;
    const want = hasSheet(facing) ? facing : base;
    if (want !== this.sheet) {
      this.sheet = want;
      this.scaleNow = base === this.ownSheet ? def.scale : formScale(base) ?? lookScale(base, def.scale);
      this.tall = figureOf(want) * this.scaleNow * this.sizeNow;
    }
    const tile = tileAt(b, u.u, u.v)!;
    let [x, y] = at(u.u, u.v, tile.h);
    let z = depth(u.u, u.v) + 5;
    let anim: Anim = 'idle';
    let row: Row | undefined;
    let frame = Math.floor(t / 110);
    const step = u.step;
    let arcLift = 0;
    if (fighting && u.alive && step && t < step.at + step.ms) {
      const f = Math.max(0, (t - step.at) / step.ms);
      const [fx, fy] = at(step.u, step.v, step.h);
      const heightChange = Math.abs(tile.h - step.h);
      // (a launch or a leap, RPG-SPELLS: the step carries its arc's peak in levels, and the fighter flies over it)
      const hop = Math.sin(Math.PI * f) * (step.arc ? step.arc * HH * 2 : heightChange ? 5 + heightChange * HH * 0.6 : 1.5);
      x = fx + (x - fx) * f;
      y = fy + (y - fy) * f - hop;
      if (step.arc) arcLift = hop;
      z = Math.max(depth(step.u, step.v), z - 5) + 5;
      anim = 'walk';
      // One complete alternating stride per tile. A slow fighter walks the same
      // distance with slower footfalls instead of cycling its legs in place.
      const n = framesOf(this.sheet, 'walk').length;
      frame = Math.min(n - 1, Math.floor(f * n));
    }
    const swing = u.swing;
    if (fighting && u.alive && swing && t >= swing.at && t < swing.at + swing.ms) {
      anim = 'attack';
      const n = framesOf(this.sheet, 'attack').length;
      frame = Math.min(n - 1, Math.floor(((t - swing.at) / swing.ms) * n));
    }
    const cast = u.cast;
    let lift = 0;
    const guarded = u.alive && u.guardUntil !== undefined && t < u.guardUntil;
    if (fighting && u.alive && cast && t >= cast.at && t < cast.at + cast.ms) {
      const own = hasRow(this.sheet, cast.anim);
      row = own ? cast.anim : 'attack';
      const n = rowFrames(this.sheet, row).length;
      const p = Math.min(1, (t - cast.at) / cast.ms);
      // (a sheet with no cast row of its own gathers itself on the first frames, rising a little, and strikes the rest as the skill goes off)
      frame = Math.min(n - 1, Math.floor((own ? p : p < 0.7 ? (p / 0.7) * 0.35 : 0.35 + ((p - 0.7) / 0.3) * 0.65) * n));
      lift = own ? 0 : Math.sin(Math.PI * Math.min(1, p / 0.8)) * 3;
    } else if (guarded && anim === 'idle' && hasRow(this.sheet, 'defend')) {
      // (a raised guard holds the last frame of the defend row)
      row = 'defend';
      frame = 99;
    } else if (u.alive && anim === 'idle' && u.hurtAt !== undefined && t - u.hurtAt < HURT_MS) {
      anim = 'hurt';
      frame = Math.floor((t - u.hurtAt) / 80);
    }
    let rot = 0;
    if (victory && u.alive && u.side === 'hero' && anim === 'idle') {
      const heroName = def.name.toLowerCase();
      if (heroName.includes('knight')) {
        // Knight salutes / plants shield firmly
        if (hasRow(this.sheet, 'defend')) {
          row = 'defend';
          frame = 99;
        } else lift = -2;
      } else if (heroName.includes('peasant')) {
        // Peasant collapses in exhausted relief
        if (hasRow(this.sheet, 'hurt')) {
          row = 'hurt';
          frame = 1;
        }
        lift = -7 + (this.reduced?.matches ? 0 : Math.sin(victoryMs / 250) * 1.5);
      } else if (heroName.includes('wizard')) {
        // Wizard adjusts hat with a confident flourish and slight tilt
        rot = (facesRight(u.facing) ? 1 : -1) * (this.reduced?.matches ? 0.04 : 0.08);
        lift = -1;
      } else if (heroName.includes('samurai') || heroName.includes('commander')) {
        // Samurai sheathes blade with a formal victory bow
        rot = (facesRight(u.facing) ? 1 : -1) * -0.06;
        lift = -3;
      } else if (heroName.includes('archer') || heroName.includes('ranger')) {
        // Archer raises weapon high in triumph
        if (hasRow(this.sheet, 'attack')) {
          row = 'attack';
          frame = 1;
        }
        lift = this.reduced?.matches ? 2 : Math.sin(victoryMs / 200) * 3;
      } else if (heroName.includes('cleric') || heroName.includes('priestess')) {
        // Cleric offers thanksgiving prayer
        lift = -2;
      } else if (heroName.includes('kunoichi')) {
        // Kunoichi shadow stance
        lift = -3;
        rot = (facesRight(u.facing) ? 1 : -1) * 0.05;
      } else {
        // Other heroes strike a lively victory bounce
        lift = this.reduced?.matches ? 2 : Math.max(0, Math.sin((victoryMs + u.id * 120) / 160)) * 5;
      }
    }
    if (!u.alive) {
      anim = 'dead';
      frame = Math.floor((t - (u.diedAt ?? 0)) / 120);
    }
    // (raised by a heart: it gets up off the ground where it lay, its dead row backwards, then stands; at once with reduced motion)
    const rising = this.rising();
    if (u.alive && rising < 1) {
      anim = 'dead';
      row = undefined;
      lift = 0;
      rot = 0;
      const n = framesOf(this.sheet, 'dead').length;
      frame = n - 1 - Math.floor(rising * n);
    }
    const list = rowFrames(this.sheet, row ?? anim);
    this.body.texture = row || anim === 'dead' || anim === 'attack' || anim === 'hurt' ? list[Math.min(list.length - 1, Math.max(0, frame))] : list[frame % list.length];
    // (the Samurai Commander's standard is the castle's banner, planted)
    if (u.def === 'standard' && bannerTex) this.body.texture = bannerTex;
    // a raised guard is wrapped in the earth shield's ring; a status shows as a small icon over the left shoulder
    this.shield.visible = guarded;
    if (guarded) {
      const ring = VFX.earthShield;
      this.shield.texture = ring[Math.floor(t / 90) % ring.length];
      this.shield.scale.set(this.tall / 26);
      this.shield.position.set(0, -this.tall * 0.45);
      paintSprite(this.shield, 500, 1000, this.tall / 26, 0, 0.65, true, true);
    }
    this.drawBadge(u, t);
    // (most sheets face right, the forest and boss ones left; the board's +u runs down to the right, +v down to the left)
    const dx = (facesRight(u.facing) ? 1 : -1) * (facesRightOf(this.sheet) ? 1 : -1);
    this.body.scale.set(this.scaleNow * dx, this.scaleNow);
    this.body.rotation = rot;
    // a flyer hovers: its body bobs above a smaller shadow on the ground
    const bob = def.flies && u.alive ? Math.sin(t / 260) * 2 - 12 : 0;
    this.body.y = bob - lift;
    // Keep the feet planted while the torso draws back, strikes and settles.
    const motion = fighting && u.alive && !(cast && t < cast.at + cast.ms) && swing && t >= swing.at && t < swing.at + swing.ms && !this.reduced?.matches
      ? attackMotion((t - swing.at) / swing.ms) : { offset: 0, stretch: 0 };
    this.body.x = (facesRight(u.facing) ? 1 : -1) * motion.offset;
    this.body.scale.x *= 1 + motion.stretch;
    this.body.scale.y *= 1 - motion.stretch * 0.5;
    if (this.awakenAura) {
      this.awakenAura.back.visible = this.awakenAura.front.visible = u.alive;
      if (u.alive) this.awakenAura.update(t, this.tall / this.sizeNow, dx, !!this.reduced?.matches);
    }
    this.rim.x = this.body.x;
    this.rim.y = bob - lift;
    this.rim.rotation = rot;
    this.shadow.scale.set(def.flies ? 0.6 : 1);
    this.shadow.alpha = def.flies ? 0.5 : 1;
    // (in a launch's arc the shadow stays on the ground)
    this.shadow.y = arcLift;
    for (const r of this.rim.children as Sprite[]) {
      r.texture = this.body.texture;
      r.scale.copyFrom(this.body.scale);
    }
    // a blink of white when struck
    if (u.hurtAt !== undefined && t - u.hurtAt < 90 && u.alive) this.flash = 1;
    // (its ailments: their parts and chips, and the tint of the latest that has one (burning orange, frozen ice blue...); a flash wins over it)
    this.ail.update(u, this.tall, t, this.reduced?.matches ?? false, settings().saver);
    this.body.tint = this.flash > 0 ? 0xffb0b0 : ailmentTint(this.ail.shown) ?? 0xffffff;
    // (the kits' looks: a wraith is a pale ghost of the foe it was; a foe turned to stone is grey)
    if (u.def === 'wraith') this.body.tint = 0x9fd0ff;
    else if (u.alive && u.kx?.stone !== undefined && t < u.kx.stone) this.body.tint = 0x9a9a92;
    // (the fallen go dark as they burn away, or grey as they turn to stone)
    if (!u.alive || rising < 1) {
      const kind = deathKind(def.name, u.side);
      // (a burnt or stony fallen hero's colour comes back as it gets up, not all at once)
      const k = u.alive ? 1 - rising : Math.max(0, Math.min(1, (t - (u.diedAt ?? 0)) / 700));
      if (kind === 'burn') this.body.tint = mixTint(0xffffff, 0x2a1008, k);
      else if (kind === 'stone') this.body.tint = mixTint(0xffffff, 0x8e9488, k);
    }
    this.flash = Math.max(0, this.flash - 0.2);
    this.drawStatuses(u, t);
    this.kx *= 0.8;
    this.ky *= 0.8;
    if (Math.abs(this.kx) + Math.abs(this.ky) < 0.1) this.kx = this.ky = 0;
    this.root.position.set(x + this.kx, y + this.ky);
    this.root.zIndex = z;
    this.x = x;
    this.y = y;
    // Fallen heroes stay where they fell so a heart can raise them; foes fade away.
    const dead = u.alive || (u.side === 'hero' && !def.summon) ? 0 : t - (u.diedAt ?? 0);
    this.root.alpha = dead > FADE_FROM ? Math.max(0, 1 - (dead - FADE_FROM) / FADE_MS) : u.def === 'wraith' ? 0.78 : 1;
    // (a burrower underground is not seen: the page draws its mound instead, RPG-SPELLS)
    if (u.under) this.root.alpha = 0;
    this.root.visible = this.root.alpha > 0;
    this.drawBar(u.alive, t);
    this.drawSparks(u.alive);
    this.drawPillar(u.alive);
    if (this.popAt >= 0) this.root.scale.set(this.baseSize * this.popScale());
    else if (this.root.scale.x !== this.baseSize) this.root.scale.set(this.baseSize);
  }

  /** Use this sprite for another fighter of the same kind and size (a crowd's foes are drawn from a pool, so a wave of fifty makes no new sprites). */
  rebind(unit: Unit): void {
    this.unit = unit;
    this.barKey = '';
    this.kx = this.ky = this.flash = 0;
    this.popAt = this.burstAt = -1;
    this.root.alpha = 1;
    this.root.visible = true;
    this.bar.clear();
  }

  /** A blow pushes it a little way along (dx, dy), and it eases back. */
  nudge(dx: number, dy: number): void {
    this.kx = dx;
    this.ky = dy;
  }

  /** Copy the current pose for a short-lived dash silhouette; shares the loaded texture. */
  afterimage(): Sprite {
    const sp = new Sprite(this.body.texture);
    sp.anchor.copyFrom(this.body.anchor);
    sp.scale.set(this.body.scale.x * this.root.scale.x, this.body.scale.y * this.root.scale.y);
    sp.tint = 0x82d9ed;
    return sp;
  }

  /** The loops that stay on it while a buff lasts (a shield's bubble, wind, auras). Its ailments are `ailmentLayer.ts`'s. */
  private drawStatuses(u: Unit, t: number): void {
    const loops = statusesOf(u, t).slice(0, maxStatuses(settings().saver));
    for (let i = 0; i < Math.max(loops.length, this.overlays.length); i++) {
      if (i >= this.overlays.length) {
        const sp = new Sprite();
        sp.anchor.set(0.5);
        sp.blendMode = 'add';
        this.root.addChildAt(sp, this.root.getChildIndex(this.stars));
        this.overlays.push(sp);
      }
      const sp = this.overlays[i];
      const look = loops[i] ? STATUS_LOOKS[loops[i]] : undefined;
      const frames = look ? PACK[look.sheet] : undefined;
      sp.visible = !!frames?.length;
      if (!look || !frames?.length) continue;
      sp.texture = frames[Math.floor(t / look.frameMs) % frames.length];
      sp.scale.set((this.tall * look.size) / 32);
      sp.position.set(0, -this.tall * look.at);
      sp.alpha = look.alpha;
      sp.tint = look.tint ?? 0xffffff;
      // Use a held material sample so a persistent status never fades out at a strip boundary.
      paintSprite(sp, 500, 1000, (this.tall * look.size) / 32, 0, look.alpha, true, this.reduced?.matches ?? false);
    }
  }

  /** A charmed fighter's heart beside its bar (the ailments' chips took the old badge's other icons, STATUS-FX; a haste keeps its wind loop). */
  private drawBadge(u: Unit, t: number): void {
    const on = u.alive && u.charmUntil !== undefined && t < u.charmUntil;
    this.badge.visible = on;
    if (!on) return;
    const frames = VFX.pinkHeart;
    this.badge.texture = frames[Math.floor(t / 90) % frames.length];
    this.badge.scale.set(0.5);
    this.badge.position.set(-BAR_W / 2 - 8, -this.tall - 6);
    paintSprite(this.badge, 500, 1000, 0.5, 0, 1, true, true);
  }

  /** The evolve's light pillar: it rises over the fighter on the burst, then thins out. */
  private drawPillar(alive: boolean): void {
    const burst = this.burstAt >= 0 ? (Date.now() - this.burstAt) / BURST_MS : 2;
    this.pillar.visible = alive && burst <= 1;
    if (!this.pillar.visible) return;
    const frames = VFX.pillarLight;
    this.pillar.texture = frames[Math.min(frames.length - 1, Math.floor(burst * frames.length))];
    this.pillar.scale.set(this.tall / 26, (this.tall / 26) * 2.4);
    this.pillar.alpha = 1 - burst * 0.6;
    paintSprite(this.pillar, burst * BURST_MS, BURST_MS, this.tall / 26, 0, 0.65, false, this.reduced?.matches ?? false);
  }

  /** A heart has raised this fallen hero: it gets up from where it lay (`RISE_MS`), with no burst or light; at once with reduced motion. */
  getUp(): void {
    this.riseAt = this.reduced?.matches ? -1 : Date.now();
  }

  /** How far through getting up it is, 0 to 1 (1 when it is not getting up). */
  private rising(): number {
    if (this.riseAt < 0) return 1;
    const p = (Date.now() - this.riseAt) / RISE_MS;
    if (p >= 1) this.riseAt = -1;
    return Math.max(0, Math.min(1, p));
  }

  /** The evolve flash and burst (called when a merge makes this hero). */
  evolve(): void {
    this.burstAt = Date.now();
  }

  /** The grade this sprite is drawn as (a promotion to a higher one needs a new sprite). */
  get shownGrade(): number {
    return this.grade;
  }

  /** A promotion's beat: the hero scales up and settles back over about half a second (in quarter steps, so its pixels stay even), and the evolve burst plays. Tier 3 rises higher. */
  promote(grade: number): void {
    this.burstAt = this.popAt = Date.now();
    this.popBy = grade > 2 ? 0.5 : 0.25;
  }

  /** The pop's scale now: up fast over 120 ms, held a beat, then back in steps over the next 400. */
  private popScale(): number {
    if (this.popAt < 0) return 1;
    const el = Date.now() - this.popAt;
    if (el > 560) return (this.popAt = -1), 1;
    const k = el < 120 ? el / 120 : el < 240 ? 1 : 1 - (el - 240) / 320;
    return 1 + Math.round(this.popBy * k * 4) / 4;
  }

  /** Grade 3's rising sparkles, and the evolve burst's ring and flare. All cheap strokes, redrawn only while shown. */
  private drawSparks(alive: boolean): void {
    const g = this.sparks;
    const burst = this.burstAt >= 0 ? (Date.now() - this.burstAt) / BURST_MS : 2;
    if (!alive || (this.grade < 3 && burst > 1)) {
      if (g.visible) g.clear();
      g.visible = false;
      return;
    }
    g.visible = true;
    g.clear();
    const now = Date.now();
    const gold = this.grade > 3 ? GRADE4_SPARK : this.grade > 2 ? 0xffe27a : 0xdce8ff;
    // (rank 4 rises in more sparks, and violet ones)
    const n = this.grade > 3 ? 9 : 6;
    if (this.grade > 2)
      for (let i = 0; i < n; i++) {
        const f = ((now / 1500 + i / n) % 1);
        const x = Math.sin(i * 2.4 + now / 900) * 14;
        g.star(x, -this.tall * 0.1 - f * this.tall * 0.95, 4, 3.4, 1.3).fill({ color: gold, alpha: Math.sin(Math.PI * f) });
      }
    if (burst <= 1) {
      g.ellipse(0, -this.tall * 0.4, 8 + burst * 34, 4 + burst * 20).stroke({ color: 0xfff2b0, width: 3 * (1 - burst) + 0.5, alpha: 1 - burst });
      g.ellipse(0, -this.tall * 0.45, 12 + burst * 10, this.tall * 0.6).fill({ color: 0xffffff, alpha: 0.55 * (1 - burst) });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = burst * 38;
        g.star(Math.cos(a) * r, -this.tall * 0.4 + Math.sin(a) * r * 0.6, 4, 3, 1).fill({ color: 0xffe27a, alpha: 1 - burst });
      }
    }
  }

  /** What the health bar last showed (a fighter with no skill meter, which is most of a crowd's foes, redraws it only when this changes). */
  private barKey = '';

  private drawBar(alive: boolean, t: number): void {
    const u = this.unit;
    const g = this.bar;
    const share = u.hp / u.maxHp;
    if (!kitOf(u)) {
      const key = alive ? `${Math.round(share * BAR_W)}${u.side === 'hero' && share <= 0.35 ? 'l' : ''}` : '';
      if (key === this.barKey) return;
      this.barKey = key;
    }
    g.clear();
    if (!alive) return;
    const top = -this.tall - 8;
    g.rect(-BAR_W / 2 - 1, top - 1, BAR_W + 2, 5).fill({ color: 0x1a1410, alpha: 0.85 });
    g.rect(-BAR_W / 2, top, BAR_W * share, 3).fill(u.side === 'hero' ? (share > 0.35 ? 0x5fd35f : 0xe0c040) : 0xe04a3a);

    // a hero's pool (COMBAT-002): blue for mana, gold for stamina, and its ultimate's violet sliver (gold, steady, when ready)
    const pool = poolOf(u);
    if (pool) {
      const c = Math.min(1, u.charge / CHARGE_MAX);
      g.rect(-BAR_W / 2 - 1, top + 5, BAR_W + 2, 4).fill({ color: 0x1a1410, alpha: 0.85 });
      g.rect(-BAR_W / 2, top + 6, BAR_W * c, 2).fill(pool === 'mana' ? 0x4a90e8 : 0xf0b83a);
      const ult = ultimateOf(u);
      if (ult) {
        const ready = (u.charge2 ?? 0) >= ult.need;
        g.rect(-BAR_W / 2 - 1, top + 9, BAR_W + 2, 3).fill({ color: 0x1a1410, alpha: 0.85 });
        g.rect(-BAR_W / 2, top + 10, BAR_W * Math.min(1, (u.charge2 ?? 0) / CHARGE_MAX), 1).fill(ready ? ULT_READY : ULT_FILL);
      }
      return;
    }
    // the skill's charge, a thin bar under it (gold and pulsing when full)
    const kit = kitOf(u);
    if (kit) {
      const full = u.charge >= kit.skill.need;
      const c = Math.min(1, u.charge / CHARGE_MAX);
      g.rect(-BAR_W / 2 - 1, top + 5, BAR_W + 2, 4).fill({ color: 0x1a1410, alpha: 0.85 });
      g.rect(-BAR_W / 2, top + 6, BAR_W * c, 2).fill(full ? (Math.floor(t / 150) % 2 ? 0xffe27a : 0xffb030) : 0x4a90e8);
      // an ultimate (once the hero has reached its level), a violet sliver under it
      const ult = ultimateOf(u);
      if (ult) {
        const ready = (u.charge2 ?? 0) >= ult.need;
        g.rect(-BAR_W / 2 - 1, top + 9, BAR_W + 2, 3).fill({ color: 0x1a1410, alpha: 0.85 });
        g.rect(-BAR_W / 2, top + 10, BAR_W * Math.min(1, (u.charge2 ?? 0) / CHARGE_MAX), 1).fill(ready ? (Math.floor(t / 120) % 2 ? 0xffffff : ULT_READY) : ULT_FILL);
      }
    }
  }
}
