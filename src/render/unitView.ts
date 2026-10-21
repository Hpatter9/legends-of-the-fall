// The fighters drawn: an animated sprite from the unit's sheet, mirrored to face the way it's going, a shadow under it
// and a health bar over its head. A step is drawn as a glide between the two tiles with a hop (higher for a climb).

import { ColorMatrixFilter, Container, Graphics, Sprite } from 'pixi.js';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Unit } from '../sim/battle';
import { formOf } from '../sim/units';
import type { Texture } from 'pixi.js';
import { facesRightOf, framesOf, figureOf, type Anim } from './sheets';
import { CHARGE_MAX, kitOf } from '../sim/abilities';
import { at, depth, HH } from './iso';
import { VFX } from './vfxArt';

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
/** A grade 3 hero is drawn this much bigger. */
const GRADE3_SIZE = 1.08;
/** A Mythic hero (drawn a little bigger by its boost) keeps a crimson and gold aura and an ember trail. */
const MYTHIC_CRIMSON = 0xff3a4a;
const MYTHIC_GOLD = 0xffd24a;
/** How long the Mythic's trail remembers where it went (ms). */
const TRAIL_MS = 420;
/** How long the evolve burst lasts (ms). */
const BURST_MS = 800;

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

export class UnitSprite {
  readonly root = new Container();
  private body = new Sprite();
  private shadow = new Graphics();
  private bar = new Graphics();
  /** The shield's ring round a raised guard, the status icon over the head, and the light pillar of an evolve. */
  private shield = new Sprite();
  private badge = new Sprite();
  private pillar = new Sprite();
  private flash = 0;
  private glow = new Graphics();
  /** Four flat-coloured copies of the body, a pixel out each way: a rim behind the sprite. */
  private rim = new Container();
  private sparks = new Graphics();
  private burstAt = -1;
  private readonly grade: number;
  /** A Mythic hero: the aura and the trail. */
  private readonly mythic: boolean;
  private trail: { x: number; y: number; at: number }[] = [];
  private readonly sheet: string;
  /** Where it was last drawn (world pixels): for effects to aim at. */
  x = 0;
  y = 0;
  /** How tall it's drawn. */
  tall = 40;

  constructor(readonly unit: Unit) {
    const def = defOf(unit);
    this.grade = unit.side === 'hero' ? (unit.grade ?? 1) : 1;
    this.mythic = unit.side === 'hero' && def.rarity === 5;
    this.sheet = formOf(def, this.grade);
    const size = (unit.size ?? 1) * (this.grade > 2 ? GRADE3_SIZE : 1);
    this.tall = figureOf(this.sheet) * def.scale * size;
    this.root.scale.set(size);
    // (a Mythic steps onto the board in a burst of light)
    if (this.mythic) this.burstAt = Date.now();
    if (this.grade > 1 || this.mythic) {
      // a halo of stacked ellipses behind the body (silver-blue, then gold; crimson for a Mythic), drawn once, and a rim of the body's own shape
      const col = this.mythic ? MYTHIC_CRIMSON : this.grade > 2 ? 0xffc83a : 0x9cc8ff;
      const h = this.tall * 0.62;
      for (let i = 5; i >= 1; i--) this.glow.ellipse(0, -this.tall * 0.45, (12 + i * 5) / size, (h * (0.5 + i * 0.13)) / size).fill({ color: col, alpha: this.grade > 2 || this.mythic ? 0.14 : 0.1 });
      for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) {
        const r = new Sprite();
        r.anchor.set(0.5, 1);
        r.position.set(dx, dy);
        this.rim.addChild(r);
      }
      this.rim.filters = [flatFilter(this.mythic ? 0xff6a5a : this.grade > 2 ? 0xffd24a : 0xa8d0ff)];
      if (this.grade > 1) this.body.filters = [gradeFilter(this.grade)];
    }
    this.shadow.ellipse(0, 0, 13, 5).fill({ color: 0x000000, alpha: 0.32 });
    this.body.anchor.set(0.5, 1);
    this.shield.anchor.set(0.5);
    this.shield.visible = false;
    this.badge.anchor.set(0.5);
    this.badge.visible = false;
    this.pillar.anchor.set(0.5, 1);
    this.pillar.visible = false;
    this.pillar.blendMode = 'add';
    this.root.addChild(this.shadow, this.glow, this.pillar, this.shield, this.rim, this.body, this.sparks, this.bar, this.badge);
  }

  /** Draw it at the time `t` of the fight (ms), on the board. */
  update(b: Board, t: number, fighting: boolean): void {
    const u = this.unit;
    const def = defOf(u);
    const tile = tileAt(b, u.u, u.v)!;
    let [x, y] = at(u.u, u.v, tile.h);
    let z = depth(u.u, u.v) + 5;
    let anim: Anim = 'idle';
    let row: Row | undefined;
    let frame = Math.floor(t / 110);
    const step = u.step;
    if (fighting && u.alive && step && t < step.at + step.ms) {
      const f = Math.max(0, (t - step.at) / step.ms);
      const [fx, fy] = at(step.u, step.v, step.h);
      const hop = Math.sin(Math.PI * f) * (5 + Math.abs(tile.h - step.h) * HH * 0.6);
      x = fx + (x - fx) * f;
      y = fy + (y - fy) * f - hop;
      z = Math.max(depth(step.u, step.v), z - 5) + 5;
      anim = 'walk';
      frame = Math.floor(t / 90);
    }
    const swing = u.swing;
    if (fighting && u.alive && swing && t >= swing.at && t < swing.at + swing.ms) {
      anim = 'attack';
      const n = framesOf(this.sheet, 'attack').length;
      frame = Math.min(n - 1, Math.floor(((t - swing.at) / swing.ms) * n));
    }
    const cast = u.cast;
    const guarded = u.alive && u.guardUntil !== undefined && t < u.guardUntil;
    if (fighting && u.alive && cast && t >= cast.at && t < cast.at + cast.ms) {
      row = hasRow(this.sheet, cast.anim) ? cast.anim : 'attack';
      const n = rowFrames(this.sheet, row).length;
      frame = Math.min(n - 1, Math.floor(((t - cast.at) / cast.ms) * n));
    } else if (guarded && anim === 'idle' && hasRow(this.sheet, 'defend')) {
      // (a raised guard holds the last frame of the defend row)
      row = 'defend';
      frame = 99;
    } else if (u.alive && anim === 'idle' && u.hurtAt !== undefined && t - u.hurtAt < HURT_MS) {
      anim = 'hurt';
      frame = Math.floor((t - u.hurtAt) / 80);
    }
    if (!u.alive) {
      anim = 'dead';
      frame = Math.floor((t - (u.diedAt ?? 0)) / 120);
    }
    const list = rowFrames(this.sheet, row ?? anim);
    this.body.texture = row || anim === 'dead' || anim === 'attack' || anim === 'hurt' ? list[Math.min(list.length - 1, Math.max(0, frame))] : list[frame % list.length];
    // a raised guard is wrapped in the earth shield's ring; a status shows as a small icon over the left shoulder
    this.shield.visible = guarded;
    if (guarded) {
      const ring = VFX.earthShield;
      this.shield.texture = ring[Math.floor(t / 90) % ring.length];
      this.shield.scale.set(this.tall / 26);
      this.shield.position.set(0, -this.tall * 0.45);
    }
    this.drawBadge(u, t);
    // (most sheets face right, the forest and boss ones left; the board's +u runs down to the right, +v down to the left)
    const dx = [1, -1, -1, 1][u.facing] * (facesRightOf(this.sheet) ? 1 : -1);
    this.body.scale.set(def.scale * dx, def.scale);
    // a flyer hovers: its body bobs above a smaller shadow on the ground
    const bob = def.flies && u.alive ? Math.sin(t / 260) * 2 - 12 : 0;
    this.body.y = bob;
    this.rim.y = bob;
    this.shadow.scale.set(def.flies ? 0.6 : 1);
    this.shadow.alpha = def.flies ? 0.5 : 1;
    for (const r of this.rim.children as Sprite[]) {
      r.texture = this.body.texture;
      r.scale.copyFrom(this.body.scale);
    }
    // a blink of white when struck
    if (u.hurtAt !== undefined && t - u.hurtAt < 90 && u.alive) this.flash = 1;
    // (a slowed fighter is tinted frosty blue; a flash or a dot's tint wins over it)
    const frosty = u.alive && u.slowUntil !== undefined && t < u.slowUntil;
    this.body.tint = this.flash > 0 ? 0xffb0b0 : u.alive && u.dot ? (u.dot.kind === 'burn' ? 0xffc890 : 0xff9a9a) : frosty ? 0xb8e4ff : 0xffffff;
    this.flash = Math.max(0, this.flash - 0.2);
    this.root.position.set(x, y);
    this.root.zIndex = z;
    this.x = x;
    this.y = y;
    // the fallen fade away
    const dead = u.alive ? 0 : t - (u.diedAt ?? 0);
    this.root.alpha = dead > FADE_FROM ? Math.max(0, 1 - (dead - FADE_FROM) / FADE_MS) : 1;
    this.root.visible = this.root.alpha > 0;
    this.drawBar(u.alive, t);
    this.drawSparks(u.alive);
    this.drawPillar(u.alive);
  }

  /** The status icon: burning, then bleeding, charmed, hasted, slowed (one at a time, the first that holds). */
  private drawBadge(u: Unit, t: number): void {
    const key =
      !u.alive ? null
      : u.dot && t < u.dot.until ? (u.dot.kind === 'burn' ? 'burn' : 'bleed')
      : u.charmUntil !== undefined && t < u.charmUntil ? 'charm'
      : u.hasteUntil !== undefined && t < u.hasteUntil ? 'haste'
      : u.slowUntil !== undefined && t < u.slowUntil ? 'slow'
      : null;
    this.badge.visible = key !== null;
    if (!key) return;
    const frames = { burn: VFX.statusFire, bleed: VFX.statusBlood, charm: VFX.pinkHeart, haste: VFX.statusWind, slow: VFX.statusIce }[key];
    this.badge.texture = frames[Math.floor(t / 90) % frames.length];
    this.badge.scale.set(0.5);
    this.badge.position.set(-BAR_W / 2 - 8, -this.tall - 6);
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
  }

  /** The evolve flash and burst (called when a merge makes this hero). */
  evolve(): void {
    this.burstAt = Date.now();
  }

  /** Grade 3's rising sparkles, and the evolve burst's ring and flare. All cheap strokes, redrawn only while shown. */
  private drawSparks(alive: boolean): void {
    const g = this.sparks;
    const burst = this.burstAt >= 0 ? (Date.now() - this.burstAt) / BURST_MS : 2;
    if (!alive || (this.grade < 3 && !this.mythic && burst > 1)) {
      this.trail.length = 0;
      if (g.visible) g.clear();
      g.visible = false;
      return;
    }
    g.visible = true;
    g.clear();
    const now = Date.now();
    const gold = this.grade > 2 ? 0xffe27a : 0xdce8ff;
    if (this.grade > 2)
      for (let i = 0; i < 6; i++) {
        const f = ((now / 1500 + i / 6) % 1);
        const x = Math.sin(i * 2.4 + now / 900) * 14;
        g.star(x, -this.tall * 0.1 - f * this.tall * 0.95, 4, 3.4, 1.3).fill({ color: gold, alpha: Math.sin(Math.PI * f) });
      }
    if (this.mythic) this.drawAura(g, now);
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

  /** A Mythic's signature: a pulsing crimson ring at its feet, embers rising in two colours, and a trail of fading embers where it has been. */
  private drawAura(g: Graphics, now: number): void {
    const k = 1 / (this.unit.size ?? 1);
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    g.ellipse(0, -2, (15 + pulse * 5) * k, (6 + pulse * 2) * k).stroke({ color: MYTHIC_CRIMSON, width: 2, alpha: 0.5 + pulse * 0.4 });
    g.ellipse(0, -2, (22 - pulse * 4) * k, (9 - pulse) * k).stroke({ color: MYTHIC_GOLD, width: 1, alpha: 0.35 });
    for (let i = 0; i < 8; i++) {
      const f = (now / 1100 + i / 8) % 1;
      const x = Math.sin(i * 1.9 + now / 700) * 13 * k;
      g.circle(x, -f * this.tall * 1.05, (1.8 - f) * k + 0.4).fill({ color: i % 2 ? MYTHIC_GOLD : MYTHIC_CRIMSON, alpha: Math.sin(Math.PI * f) });
    }
    // (the trail: where the body has been, in world pixels, drawn back relative to where it is now)
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - this.x, last.y - this.y) > 3) this.trail.push({ x: this.x, y: this.y, at: now });
    while (this.trail.length && now - this.trail[0].at > TRAIL_MS) this.trail.shift();
    for (const p of this.trail) {
      const f = 1 - (now - p.at) / TRAIL_MS;
      g.circle((p.x - this.x) * k, (p.y - this.y - this.tall * 0.35) * k, (2 + 3 * f) * k).fill({ color: f > 0.5 ? MYTHIC_GOLD : MYTHIC_CRIMSON, alpha: f * 0.7 });
    }
  }

  private drawBar(alive: boolean, t: number): void {
    const u = this.unit;
    const g = this.bar;
    g.clear();
    if (!alive) return;
    const top = -this.tall - 8;
    const share = u.hp / u.maxHp;
    g.rect(-BAR_W / 2 - 1, top - 1, BAR_W + 2, 5).fill({ color: 0x1a1410, alpha: 0.85 });
    g.rect(-BAR_W / 2, top, BAR_W * share, 3).fill(u.side === 'hero' ? (share > 0.35 ? 0x5fd35f : 0xe0c040) : 0xe04a3a);

    // the skill's charge, a thin bar under it (gold and pulsing when full)
    const kit = kitOf(u);
    if (kit) {
      const full = u.charge >= kit.skill.need;
      const c = Math.min(1, u.charge / CHARGE_MAX);
      g.rect(-BAR_W / 2 - 1, top + 5, BAR_W + 2, 4).fill({ color: 0x1a1410, alpha: 0.85 });
      g.rect(-BAR_W / 2, top + 6, BAR_W * c, 2).fill(full ? (Math.floor(t / 150) % 2 ? 0xffe27a : 0xffb030) : 0x4a90e8);
      // a Mythic's ultimate, a crimson sliver under it
      if (kit.ultimate) {
        const ready = (u.charge2 ?? 0) >= kit.ultimate.need;
        g.rect(-BAR_W / 2 - 1, top + 9, BAR_W + 2, 3).fill({ color: 0x1a1410, alpha: 0.85 });
        g.rect(-BAR_W / 2, top + 10, BAR_W * Math.min(1, (u.charge2 ?? 0) / CHARGE_MAX), 1).fill(ready ? (Math.floor(t / 120) % 2 ? 0xffffff : MYTHIC_GOLD) : MYTHIC_CRIMSON);
      }
    }
  }
}
