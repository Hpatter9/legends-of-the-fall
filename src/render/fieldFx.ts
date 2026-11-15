// ASSAULT-SKILLS (`docs/notes/assault-skills.md`): the skills, ultimates, heals and the king's spells of an assault, drawn on the hold's field
// with the ordinary fight's own effects (not drawn anew): its particle pool (`particles.ts`), its wind-ups and element bursts
// (`combatFx.ts`, the pack sheets of `fxSheets.ts`), each skill's own painting (`abilityArt.ts`), the Blender clips (`vfxArt.ts`), the
// elements of `fxRules.ts` and the emit points (`emitRules.ts`). Which events are drawn, how many, and how simply at each level of detail is
// `fieldFxRules.ts`. Looks only: it reads the battle, never changes it.

import { Container, Text } from 'pixi.js';
import type { Battle, BattleEvent, Unit } from '../sim/battle';
import { ultKeyOf } from '../sim/abilities';
import { skillShown } from '../sim/heroKits';
import { Particles } from './particles';
import { impactBurst, play, windUp } from './combatFx';
import { packKey, skillElement, SPELL_ELEMENT, ULT_TINT, type Element } from './fxRules';
import { abilityFrames } from './abilityArt';
import { VFX } from './vfxArt';
import { emitOffset, emitWorld } from './emitRules';
import { FIELD_FX, fxWeight, pickFx, type FxLevel } from './fieldFxRules';

/** A fighter as the field draws it now: its feet on screen, its height, its body's scale (negative x when mirrored), its sheet. */
export interface FieldBody {
  x: number;
  y: number;
  tall: number;
  sx: number;
  sy: number;
  sheet: string;
  unit: Unit;
}

/** What the field gives the effects: a fighter's body on screen (null where it is not drawn), a tile's spot, and the screen's middle. */
export interface FieldLook {
  body(id: number): FieldBody | null;
  spot(u: number, v: number): [number, number];
  middle(): [number, number];
  inView(x: number, y: number): boolean;
}

const SPELL_EL = SPELL_ELEMENT as Record<string, Element>;

export class FieldFx {
  readonly root = new Container();
  private particles = new Particles();
  private later: { at: number; run: () => void }[] = [];
  private names: { t: Text; until: number; by: number }[] = [];
  /** The last ultimate of ours the field showed: where and when (the page's camera may glance at it). */
  lastUlt: { x: number; y: number; at: number } | null = null;
  private last = 0;

  constructor(calm: boolean) {
    this.particles.calm = calm;
    this.root.addChild(this.particles.root);
    this.root.zIndex = 1e6 + 1;
  }

  /** The frame's events, drawn at this level of detail; `simT` is the battle's time drawn, `now` the page's clock. */
  show(b: Battle, events: readonly BattleEvent[], level: FxLevel, look: FieldLook, simT: number, now: number): void {
    const dt = this.last ? Math.min(100, now - this.last) : 16;
    this.last = now;
    if (level === 'none') {
      this.clear();
      return;
    }
    this.particles.cap = FIELD_FX.LIVE[level];
    // (what is due of an effect begun earlier: a nova as its wind-up ends)
    for (let i = this.later.length - 1; i >= 0; i--)
      if (this.later[i].at <= simT) {
        const l = this.later.splice(i, 1)[0];
        l.run();
      }
    const ult = (by: number, name: string) => {
      const u = b.field?.byId[by] ?? b.units.find((x) => x.id === by);
      return !!u && u.side === 'hero' && ultKeyOf(u) === name;
    };
    const ours = (id: number) => (b.field?.byId[id] ?? b.units.find((x) => x.id === id))?.side === 'hero';
    const [mx, my] = look.middle();
    const where = (e: BattleEvent): number => {
      const p = this.placeOf(e, look);
      if (!p || !look.inView(p[0], p[1])) return Infinity;
      return Math.hypot(p[0] - mx, p[1] - my);
    };
    const picked = pickFx(events, (e) => fxWeight(e, ult, ours), where, FIELD_FX.PER_FRAME[level]);
    for (const e of picked) this.one(b, e, level, look, simT, now, ult);
    this.particles.step(dt);
    for (let i = this.names.length - 1; i >= 0; i--) {
      const n = this.names[i];
      const left = n.until - simT;
      if (left <= 0) {
        n.t.destroy();
        this.names.splice(i, 1);
      } else {
        n.t.alpha = Math.min(1, left / 400);
        n.t.y -= dt * 0.01;
      }
    }
  }

  /** Where an event happens on screen. */
  private placeOf(e: BattleEvent, look: FieldLook): [number, number] | null {
    switch (e.kind) {
      case 'skill':
      case 'burst':
      case 'aura':
      case 'dash':
      case 'blink': {
        const by = look.body(e.by);
        return by ? [by.x, by.y - by.tall * 0.5] : null;
      }
      case 'heal':
      case 'revive': {
        const to = look.body(e.to);
        return to ? [to.x, to.y - to.tall * 0.5] : null;
      }
      case 'area':
      case 'spell':
        return look.spot(e.u, e.v);
      default:
        return null;
    }
  }

  private one(b: Battle, e: BattleEvent, level: FxLevel, look: FieldLook, simT: number, now: number, ult: (by: number, name: string) => boolean): void {
    const p = this.particles;
    const full = level === 'full';
    switch (e.kind) {
      case 'skill': {
        const by = look.body(e.by);
        if (!by) return;
        const el = skillElement(e.name);
        const big = ult(e.by, e.name);
        // (the wind-up round the caster as the skill gathers, then its own painting where it goes off; an ultimate's nova and ring after)
        if (full) windUp(p, el, by.x, by.y, e.ms, by.tall, big);
        const id = e.by;
        const name = e.name;
        this.later.push({
          at: simT + e.ms,
          run: () => {
            const at = look.body(id) ?? by;
            const paint = abilityFrames(name, 'hit');
            if (paint?.length && (full || big)) p.spawn({ frames: paint, x: at.x, y: at.y - at.tall * 0.55, scale: (big ? 1.1 : 0.7) * (at.tall / 66), frameMs: 70, alpha: 0.95, half: 48, solid: true, prio: big });
            if (!big) return;
            const tint = ULT_TINT[el];
            play(p, packKey(el, 'nova'), at.x, at.y - at.tall * 0.4, { scale: full ? 3 : 2, frameMs: 80, alpha: 0.6, tint });
            if (full) play(p, packKey(el, 'wave'), at.x, at.y, { scale: 4, frameMs: 90, add: false, alpha: 0.7, tint });
          },
        });
        if (big) {
          this.name(e.by, skillShown(by.unit, e.name), by.x, by.y - by.tall - 14, simT, full);
          if (by.unit.side === 'hero') this.lastUlt = { x: by.x, y: by.y - by.tall * 0.5, at: now };
        }
        return;
      }
      case 'spell': {
        const [x, y] = look.spot(e.u, e.v);
        const el = SPELL_EL[e.id] ?? 'light';
        impactBurst(p, el, x, y, full ? 1.6 : 1.1, true);
        if (full) play(p, packKey(el, 'wave'), x, y, { scale: 3, frameMs: 90, add: false, alpha: 0.6 });
        return;
      }
      case 'area': {
        const [x, y] = look.spot(e.u, e.v);
        const el: Element = e.id === 'meteor' ? 'fire' : 'wind';
        this.later.push({ at: simT + Math.min(e.ms, 900), run: () => impactBurst(p, el, x, y, full ? 1.4 : 1, true) });
        return;
      }
      case 'heal':
      case 'revive': {
        const to = look.body(e.to);
        if (!to) return;
        // (a green ring rises round the healed; a revive a bright nova)
        if (e.kind === 'heal') play(p, 'forest-aura', to.x, to.y - 4, { scale: (to.tall / 26) * (full ? 1 : 0.8), frameMs: 80 });
        else play(p, 'light-nova', to.x, to.y - to.tall * 0.4, { scale: 2, frameMs: 70, alpha: 0.8 });
        return;
      }
      case 'burst': {
        const by = look.body(e.by);
        if (by) play(p, 'light-wave', by.x, by.y, { scale: 2 + e.reach * 0.5, frameMs: 80, add: false, alpha: 0.6 });
        return;
      }
      case 'aura': {
        if (!full) return;
        const by = look.body(e.by);
        if (by) play(p, 'light-aura', by.x, by.y - 4, { scale: by.tall / 26, frameMs: 90, alpha: 0.7 });
        return;
      }
      case 'dash':
      case 'blink': {
        if (!full) return;
        const by = look.body(e.by);
        if (!by || !VFX.dashWhite?.length) return;
        const [x0, y0] = look.spot(e.from.u, e.from.v);
        const [x1, y1] = look.spot(e.to.u, e.to.v);
        p.spawn({ frames: VFX.dashWhite, x: (x0 + x1) / 2, y: (y0 + y1) / 2 - by.tall * 0.4, scale: 1.1, frameMs: 40, alpha: 0.85, add: true, stretchX: x1 >= x0 ? 1 : -1 });
        return;
      }
      default:
        void b;
    }
  }

  /** An ultimate's name over its caster, a moment (three at most at once; one a caster). */
  private name(by: number, text: string, x: number, y: number, simT: number, full: boolean): void {
    // (a caster whose name still shows keeps that one: no new label)
    const had = this.names.find((n) => n.by === by && n.t.text === text);
    if (had) {
      had.until = simT + 1400;
      had.t.position.set(x, y);
      return;
    }
    while (this.names.length >= FIELD_FX.NAMES) this.names.shift()!.t.destroy();
    const t = new Text({ text, style: { fontFamily: 'Alegreya Sans', fontWeight: '800', fontSize: full ? 22 : 34, fill: 0xfff2a0, stroke: { color: 0x2a1408, width: 5 } } });
    t.anchor.set(0.5, 1);
    t.position.set(x, y);
    this.root.addChild(t);
    this.names.push({ t, until: simT + 1400, by });
  }

  /** The point a fighter's shot leaves from (its emit point, as in the ordinary fight), else a share of its height. */
  static shotFrom(by: FieldBody): [number, number] {
    const at = emitOffset(by.unit.def, by.sheet, undefined);
    return at ? emitWorld(by.x, by.y, at, by.sx, by.sy) : [by.x, by.y - by.tall * 0.45];
  }

  /** The bits alive (for the bench). */
  live(): number {
    return this.particles.root.children.length;
  }

  clear(): void {
    this.particles.clear();
    this.later = [];
    for (const n of this.names) n.t.destroy();
    this.names = [];
  }

  destroy(): void {
    this.clear();
    this.root.destroy({ children: true });
  }
}
