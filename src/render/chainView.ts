// The long map drawn: the finished sections of an army run behind the fight, and the move from one wave to the next. When a
// wave is won the next section's columns fall from the sky onto the edge of the one just fought, and the heroes still
// standing walk across the seam into their formation, while the recap is up. The sim only ever knows the one section the
// fight is on; this reads the chain and the finished battle and changes nothing in them.

import type { Container } from 'pixi.js';
import { DIRS, type Board } from '../sim/board';
import type { Unit } from '../sim/battle';
import { against, seam, walkAcross, type Section } from '../sim/chain';
import { UNITS } from '../sim/units';
import { dropDelay, dropEnd, dropPose, stepMs } from './dropRules';
import type { Fx } from './fx';
import { at, FOOT, HH, TH, TW } from './iso';
import type { BoardView, Look, Scene } from './boardView';
import { playAll } from './sound';
import { UnitSprite } from './unitView';

/** A hero that walks: the finished fight's unit, and the tile it is to stand on in the new section. */
export interface Walker {
  unit: Unit;
  goal: [number, number];
}

interface Moving {
  sprite: UnitSprite;
  /** A copy of the fighter, moved along the path in the new section's frame (the finished battle's own unit is not touched). */
  unit: Unit;
  path: { u: number; v: number }[];
  i: number;
  /** When the step in hand began (null between steps), and when the last one ended. */
  moveAt: number | null;
  freeAt: number;
  startAt: number;
  ms: number;
}

interface Active {
  old: Section;
  next: Section;
  t: number;
  delay: number[];
  landed: boolean[];
  comp: Board;
  moving: Moving[];
  end: number;
  lastThud: number;
  done: () => void;
}

/** The walk begins this long after the fall does (the deploy rows are down by then), and each hero sets off a little after the one before. */
const WALK_AT_MS = 750;
const WALK_GAP_MS = 110;
/** The walkers stay on show this long after the last has arrived. */
const LINGER_MS = 350;

const look = (s: Section): Look => ({ boss: s.boss });

export class ChainView {
  private act: Active | null = null;
  private sections: Section[] = [];
  private host = 0;
  private reach: { x0: number; x1: number; y0: number; y1: number } | null = null;

  constructor(
    private readonly view: BoardView,
    private readonly fx: Fx,
    private readonly layer: Container,
  ) {}

  get active(): boolean {
    return this.act !== null;
  }

  /** The road behind the host (section `host`, from 0): every finished section a sprite, no moving parts. */
  sync(sections: Section[], host: number): void {
    this.finish();
    this.sections = sections;
    this.host = Math.min(host, sections.length - 1);
    this.view.setScenery(this.scenes(this.host));
    this.reach = null;
  }

  /** No long map (any other kind of run). */
  clear(): void {
    this.finish();
    this.sections = [];
    this.view.setScenery([]);
    this.reach = null;
  }

  private scenes(host: number): Scene[] {
    const h = this.sections[host];
    return this.sections.slice(0, host).map((s) => {
      const o = against(s, h);
      return { board: s.board, look: look(s), ou: o.u, ov: o.v };
    });
  }

  /** The box the whole road covers (world px, the host at the origin) for the camera's limits: every section up to the host. */
  box(): { x0: number; x1: number; y0: number; y1: number } | null {
    if (!this.sections.length) return null;
    if (this.reach) return this.reach;
    const h = this.sections[this.host];
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const s of this.sections.slice(0, this.host + 1)) {
      const o = against(s, h);
      for (let v = 0; v < s.board.d; v++)
        for (let u = 0; u < s.board.w; u++) {
          const t = s.board.tiles[v * s.board.w + u];
          const [x, y] = at(u + o.u, v + o.v, t.h);
          x0 = Math.min(x0, x - TW / 2);
          x1 = Math.max(x1, x + TW / 2);
          y0 = Math.min(y0, y - TH / 2 - 52);
          y1 = Math.max(y1, y + TH / 2 + t.h * HH + FOOT);
        }
    }
    return (this.reach = { x0, x1, y0, y1 });
  }

  /** Set the move from section `from` to the one after it going: the new columns up in the sky, the heroes at the start of their paths. The finished fight's tiles stay on show where they lie against the new section. */
  begin(sections: Section[], from: number, walkers: Walker[], done: () => void): void {
    this.finish();
    this.sections = sections;
    const old = sections[from];
    const next = sections[from + 1];
    this.host = from + 1;
    this.reach = null;
    const o = against(old, next);
    this.view.demote(old.board, o.u, o.v);
    this.view.build(next.board, look(next), true);
    this.view.setScenery(this.scenes(from));
    const { board: comp } = seam(old.board, next.board, next.join!);
    const delay: number[] = [];
    for (let v = 0; v < next.board.d; v++) for (let u = 0; u < next.board.w; u++) delay.push(dropDelay(next.join!, u, v));
    const moving: Moving[] = walkers.map((w, i) => {
      const def = UNITS[w.unit.def];
      const path = walkAcross(old.board, next.board, next.join!, w.unit, { u: w.goal[0], v: w.goal[1] }, def.jump);
      const unit: Unit = { ...w.unit, u: path[0].u, v: path[0].v, step: undefined, swing: undefined, cast: undefined, hurtAt: undefined, guardUntil: undefined, slowUntil: undefined, hasteUntil: undefined, charmUntil: undefined, dot: undefined };
      const sprite = new UnitSprite(unit);
      this.layer.addChild(sprite.root);
      sprite.update(comp, 0, true);
      return { sprite, unit, path, i: 0, moveAt: null, freeAt: 0, startAt: WALK_AT_MS + i * WALK_GAP_MS, ms: stepMs(def.moveMs) };
    });
    this.act = { old, next, t: 0, delay, landed: delay.map(() => false), comp, moving, end: dropEnd(next.join!), lastThud: -1000, done };
    this.step(0);
  }

  /** Where the camera should look while the move goes on (world px): over the walking party. Null when nothing is going on. */
  focus(): { x: number; y: number } | null {
    const a = this.act;
    if (!a) return null;
    if (!a.moving.length) {
      const [x, y] = at(a.next.board.w / 2, a.next.board.d - 2, 0);
      return { x, y };
    }
    let x = 0;
    let y = 0;
    for (const m of a.moving) {
      x += m.sprite.x;
      y += m.sprite.y - m.sprite.tall * 0.4;
    }
    return { x: x / a.moving.length, y: y / a.moving.length };
  }

  /** One frame of the move, `dt` ms (real time). */
  step(dt: number): void {
    const a = this.act;
    if (!a) return;
    a.t += dt;
    const { next } = a;
    const w = next.board.w;
    for (let i = 0; i < a.delay.length; i++) {
      const p = dropPose(a.t, a.delay[i]);
      this.view.lift(i, p.dy, p.alpha);
      if (p.landed && !a.landed[i]) {
        a.landed[i] = true;
        const u = i % w;
        const v = Math.floor(i / w);
        const [x, y] = at(u, v, next.board.tiles[i].h);
        const area = next.board.area;
        this.fx.puffAt(x, y, area === 'desert' ? 'sand' : area === 'snow' ? 'ice' : 'white', 0.8);
        if (a.t - a.lastThud > 110) {
          a.lastThud = a.t;
          playAll([{ cue: 'deathThud', gain: 0.22 }]);
        }
      }
    }
    let walking = false;
    for (const m of a.moving) walking = this.walk(a, m) || walking;
    if (!walking && a.t >= Math.max(a.end, ...a.moving.map((m) => m.freeAt)) + LINGER_MS) this.finish();
  }

  /** Move one walker on; whether it still has a way to go. */
  private walk(a: Active, m: Moving): boolean {
    const u = m.unit;
    const last = m.path.length - 1;
    const landed = (p: { u: number; v: number }) => (p.u < a.next.board.w && p.v < a.next.board.d ? a.landed[p.v * a.next.board.w + p.u] : true);
    for (;;) {
      if (m.i >= last) {
        u.step = undefined;
        break;
      }
      const to = m.path[m.i + 1];
      if (m.moveAt === null) {
        if (a.t < m.startAt || !landed(to)) {
          u.step = undefined;
          break;
        }
        m.moveAt = Math.max(m.startAt, m.freeAt);
        const from = m.path[m.i];
        u.facing = Math.max(0, DIRS.findIndex(([du, dv]) => du === to.u - from.u && dv === to.v - from.v));
        u.step = { u: from.u, v: from.v, h: a.comp.tiles[from.v * a.comp.w + from.u].h, at: m.moveAt, ms: m.ms };
        u.u = to.u;
        u.v = to.v;
      }
      if (a.t >= m.moveAt + m.ms) {
        m.freeAt = m.moveAt + m.ms;
        m.i++;
        m.moveAt = null;
        u.u = m.path[m.i].u;
        u.v = m.path[m.i].v;
        continue;
      }
      break;
    }
    m.sprite.update(a.comp, a.t, true);
    return m.i < last;
  }

  /** The move is over (or cut short): every column down, the walkers gone (the next fight puts the heroes on their tiles), the old section a sprite among the others. */
  finish(): void {
    const a = this.act;
    if (!a) return;
    this.act = null;
    for (let i = 0; i < a.delay.length; i++) this.view.lift(i, 0, 1);
    for (const m of a.moving) m.sprite.root.destroy({ children: true });
    this.view.retire(look(a.old));
    this.view.setScenery(this.scenes(this.host));
    a.done();
  }
}
