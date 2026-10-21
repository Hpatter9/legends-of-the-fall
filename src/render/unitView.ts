// The fighters drawn: an animated sprite from the unit's sheet, mirrored to face the way it's going, a shadow under it
// and a health bar over its head. A step is drawn as a glide between the two tiles with a hop (higher for a climb).

import { ColorMatrixFilter, Container, Graphics, Sprite } from 'pixi.js';
import { tileAt, type Board } from '../sim/board';
import { defOf, type Unit } from '../sim/battle';
import { formOf } from '../sim/units';
import type { Texture } from 'pixi.js';
import { framesOf, figureOf, type Anim } from './sheets';
import { CHARGE_MAX, kitOf } from '../sim/abilities';
import { at, depth, HH } from './iso';

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
/** How long the evolve burst lasts (ms). */
const BURST_MS = 800;

/** The colour grade of a hero above the first: richer tones, and for grade 3 a warm gold cast. Built once per sprite. */
function gradeFilter(grade: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  f.saturate(grade > 2 ? 0.35 : 0.22, false);
  if (grade > 2) {
    const m = f.matrix;
    m[0] *= 1.12; m[1] *= 1.12; m[2] *= 1.12;
    m[10] *= 0.82; m[11] *= 0.82; m[12] *= 0.82;
    m[5] *= 1.04; m[6] *= 1.04; m[7] *= 1.04;
  }
  return f;
}

export class UnitSprite {
  readonly root = new Container();
  private body = new Sprite();
  private shadow = new Graphics();
  private bar = new Graphics();
  private aura = new Graphics();
  private flash = 0;
  private glow = new Graphics();
  private sparks = new Graphics();
  private burstAt = -1;
  private readonly grade: number;
  private readonly sheet: string;
  /** Where it was last drawn (world pixels): for effects to aim at. */
  x = 0;
  y = 0;
  /** How tall it's drawn. */
  tall = 40;

  constructor(readonly unit: Unit) {
    const def = defOf(unit);
    this.grade = unit.side === 'hero' ? (unit.grade ?? 1) : 1;
    this.sheet = formOf(def, this.grade);
    const size = (unit.size ?? 1) * (this.grade > 2 ? GRADE3_SIZE : 1);
    this.tall = figureOf(this.sheet) * def.scale * size;
    this.root.scale.set(size);
    if (this.grade > 1) {
      // a soft halo of stacked ellipses behind the body (silver, then gold), drawn once
      const col = this.grade > 2 ? 0xffd45a : 0xcfe0ff;
      const h = this.tall * 0.62;
      for (let i = 4; i >= 1; i--) this.glow.ellipse(0, -this.tall * 0.45, (10 + i * 4) / size, (h * (0.55 + i * 0.12)) / size).fill({ color: col, alpha: this.grade > 2 ? 0.1 : 0.07 });
      this.body.filters = [gradeFilter(this.grade)];
    }
    this.shadow.ellipse(0, 0, 13, 5).fill({ color: 0x000000, alpha: 0.32 });
    this.body.anchor.set(0.5, 1);
    this.aura.ellipse(0, -this.tall * 0.4, 17, this.tall * 0.62).stroke({ color: 0x8fc4ff, width: 2, alpha: 0.9 });
    this.aura.visible = false;
    this.root.addChild(this.shadow, this.glow, this.aura, this.body, this.sparks, this.bar);
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
    this.aura.visible = guarded;
    this.aura.alpha = 0.6 + 0.4 * Math.sin(t / 120);
    // (the sheets face right; the board's +u runs down to the right, +v down to the left)
    const dx = [1, -1, -1, 1][u.facing];
    this.body.scale.set(def.scale * dx, def.scale);
    // a blink of white when struck
    if (u.hurtAt !== undefined && t - u.hurtAt < 90 && u.alive) this.flash = 1;
    this.body.tint = this.flash > 0 ? 0xffb0b0 : u.alive && u.dot ? (u.dot.kind === 'burn' ? 0xffc890 : 0xff9a9a) : 0xffffff;
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
  }

  /** The evolve flash and burst (called when a merge makes this hero). */
  evolve(): void {
    this.burstAt = Date.now();
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
    const gold = this.grade > 2 ? 0xffe27a : 0xdce8ff;
    if (this.grade > 2)
      for (let i = 0; i < 4; i++) {
        const f = ((now / 1400 + i / 4) % 1);
        const x = Math.sin(i * 2.4 + now / 900) * 11;
        g.star(x, -this.tall * 0.15 - f * this.tall * 0.8, 4, 2.2, 0.8).fill({ color: gold, alpha: Math.sin(Math.PI * f) });
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
    }
  }
}
