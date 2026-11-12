// The long map drawn: the finished sections of an army run behind the fight, and the move from one wave to the next. When a
// wave is won the next section's columns fall from the sky onto the edge of the one just fought, and the heroes still
// standing walk across the seam into their formation, while the recap is up. The sim only ever knows the one section the
// fight is on; this reads the chain and the finished battle and changes nothing in them.

import type { Container } from 'pixi.js';
import { DIRS, type Board } from '../sim/board';
import type { Unit } from '../sim/battle';
import { against, boardTileAt, frameOf, seam, walkAcross, type Section } from '../sim/chain';
import { dropDelay, dropEnd, dropPose, WALK_STEP_MS } from './dropRules';
import type { Fx } from './fx';
import { FOOT, HH, inFrame, landmarkBounds, project, TH, TW, type Frame } from './iso';
import type { BoardView, Look, Scene } from './boardView';
import { marcherAfter, marcherDrawn, standFacing, type Marcher } from './marchStayRules';
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
  /** MARCH-STAYS: walking, standing where it arrived, or gone (`marchStayRules.ts`). */
  at: Marcher;
}

/** MARCH-STAYS: the party standing on the section it marched to, once the walk is over, until the next fight's fighters are made. */
interface Stand {
  comp: Board;
  walkFrame: Frame;
  t: number;
}

interface Active {
  old: Section;
  next: Section;
  t: number;
  delay: number[];
  landed: boolean[];
  /** The two sections as one board of world tiles, and the frame its tiles are drawn in (the walkers move over it). */
  comp: Board;
  walkFrame: Frame;
  /** The world tile of the board's (0, 0) (`seam`). */
  min: { u: number; v: number };
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
  /** MARCH-STAYS: the marchers kept on the stage after the walk (`stood`), and what they stand on. They are the board's to keep
   *  through a build (`BoardView.keep`), and go only by `release`. */
  private stood: Moving[] = [];
  private stand: Stand | null = null;

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
      return { board: s.board, look: look(s), rot: s.rot, ou: o.u, ov: o.v };
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
      const f = frameOf(s, h);
      const scenic = landmarkBounds(s.board, f);
      if (scenic) {
        x0 = Math.min(x0, scenic.x0); x1 = Math.max(x1, scenic.x1);
        y0 = Math.min(y0, scenic.y0); y1 = Math.max(y1, scenic.y1);
      }
      let minH = Infinity;
      for (const t of s.board.tiles) if (t.h < minH) minH = t.h;
      if (!Number.isFinite(minH)) minH = 0;
      const large = s.board.w >= 12;
      for (let v = 0; v < s.board.d; v++)
        for (let u = 0; u < s.board.w; u++) {
          const t = s.board.tiles[v * s.board.w + u];
          const [x, y] = project(f, u, v, t.h);
          x0 = Math.min(x0, x - TW / 2);
          x1 = Math.max(x1, x + TW / 2);
          y0 = Math.min(y0, y - TH / 2 - 52);
          const skirt = large ? Math.min(t.h, Math.max(t.h - minH + 4, 14)) : t.h;
          y1 = Math.max(y1, y + TH / 2 + skirt * HH + FOOT);
        }
    }
    return (this.reach = { x0, x1, y0, y1 });
  }

  /** Set the move from section `from` to the one after it going: the new columns up in the sky, the heroes at the start of their paths. The finished fight's tiles stay on show where they lie against the new section. */
  /** WAVE-DELAY: the section after `from` will be marched to: its columns are painted ahead, a few a frame (`BoardView.prewarm`). */
  prewarm(sections: readonly Section[], from: number, slow = false): void {
    const next = sections[from + 1];
    if (next) this.view.prewarm(next.board, look(next), next.rot, slow);
  }

  begin(sections: Section[], from: number, walkers: Walker[], done: () => void): void {
    this.finish();
    // (a party still standing from the march before: its fight was fought, so its fighters were made long ago)
    this.release();
    this.sections = sections;
    const old = sections[from];
    const next = sections[from + 1];
    this.host = from + 1;
    this.reach = null;
    const o = against(old, next);
    this.view.demote(old.board, o.u, o.v);
    this.view.build(next.board, look(next), next.rot, true);
    this.view.setScenery(this.scenes(from));
    const { board: comp, minU, minV } = seam(old, next);
    const walkFrame: Frame = { rot: 0, ou: minU - next.origin.u, ov: minV - next.origin.v };
    const delay: number[] = [];
    for (let v = 0; v < next.board.d; v++) for (let u = 0; u < next.board.w; u++) delay.push(dropDelay(u, v, next.board.w, next.board.d));
    const moving: Moving[] = walkers.map((w, i) => {
      // (the path is over world tiles; the walkers are drawn on the joined board, whose tile (0, 0) is `min`. Between waves every hero walks
      // the fewest tiles at the same pace: no hero's own jump or slowness, and a climb costs no more than a level step)
      const path = walkAcross(old, next, w.unit, { u: w.goal[0], v: w.goal[1] }).map((p) => ({ u: p.u - minU, v: p.v - minV }));
      const unit: Unit = { ...w.unit, u: path[0].u, v: path[0].v, step: undefined, swing: undefined, cast: undefined, hurtAt: undefined, guardUntil: undefined, slowUntil: undefined, hasteUntil: undefined, charmUntil: undefined, dot: undefined, ail: undefined };
      const sprite = new UnitSprite(unit);
      this.layer.addChild(sprite.root);
      inFrame(walkFrame, () => sprite.update(comp, 0, true));
      return { sprite, unit, path, i: 0, moveAt: null, freeAt: 0, startAt: WALK_AT_MS + i * WALK_GAP_MS, ms: WALK_STEP_MS, at: 'walking' as Marcher };
    });
    this.act = { old, next, t: 0, delay, landed: delay.map(() => false), comp, walkFrame, min: { u: minU, v: minV }, moving, end: dropEnd(next.board.w, next.board.d), lastThud: -1000, done };
    this.step(0);
  }

  /** Where the camera should look while the move goes on (world px): over the walking party. Null when nothing is going on. */
  focus(): { x: number; y: number } | null {
    const a = this.act;
    if (!a) return null;
    if (!a.moving.length) {
      const [x, y] = project({ rot: a.next.rot, ou: 0, ov: 0, w: a.next.board.w, d: a.next.board.d }, a.next.board.w / 2, a.next.board.d - 2, 0);
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
    if (!a) return void this.idle(dt);
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
        const [x, y] = project({ rot: next.rot, ou: 0, ov: 0 }, u, v, next.board.tiles[i].h);
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
    const landed = (p: { u: number; v: number }) => {
      const t = boardTileAt(a.next, p.u + a.min.u, p.v + a.min.v);
      return t ? a.landed[t[1] * a.next.board.w + t[0]] : true;
    };
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
    // (MARCH-STAYS: arrived, it turns to face as the deploy's fighter will)
    if (m.i >= last && m.at === 'walking') {
      m.at = marcherAfter(m.at, 'arrived');
      u.facing = standFacing(a.next.rot);
    }
    inFrame(a.walkFrame, () => m.sprite.update(a.comp, a.t, true));
    return m.i < last;
  }

  /** MARCH-STAYS: each frame after the walk, the party stands (its idle pose moving) on the section it marched to. */
  private idle(dt: number): void {
    const s = this.stand;
    if (!s) return;
    s.t += dt;
    for (const m of this.stood) if (!m.sprite.root.destroyed) inFrame(s.walkFrame, () => m.sprite.update(s.comp, s.t, true));
  }

  /** MARCH-STAYS: how many marchers are on the stage (walking or standing), for the film's measure. */
  get onStage(): number {
    return (this.act?.moving ?? this.stood).filter((m) => marcherDrawn(m.at) && !m.sprite.root.destroyed).length;
  }

  /** MARCH-STAYS: the heroes standing here from the march (their run ids), so the fighters that take their places come up with no
   *  puff of dust: they were never set down, they walked. */
  standing(): Set<number> {
    return new Set(this.stood.flatMap((m) => (m.unit.tag === undefined ? [] : [m.unit.tag])));
  }

  /** MARCH-STAYS: the next fight's fighters have been made, in this same frame: the marchers go, and not before. */
  release(): void {
    for (const m of this.stood) {
      m.at = marcherAfter(m.at, 'fighters');
      const at = this.view.keep.indexOf(m.sprite.root);
      if (at >= 0) this.view.keep.splice(at, 1);
      if (!m.sprite.root.destroyed) m.sprite.root.destroy({ children: true });
    }
    this.stood = [];
    this.stand = null;
  }

  /** The move is over (or cut short): every column down, the old section a sprite among the others. MARCH-STAYS: the walkers are
   *  NOT taken off the stage here, as they were (the owner saw the party vanish until the next round was ready): each stands at the
   *  tile it walked to, kept through the next board's build, until the next fight's fighters are made (`release`). */
  finish(): void {
    const a = this.act;
    if (!a) return;
    this.act = null;
    for (let i = 0; i < a.delay.length; i++) this.view.lift(i, 0, 1);
    for (const m of a.moving) {
      // (a walk cut short: the hero is stood at its tile, where the deploy will set it down)
      if (m.at === 'walking') {
        m.at = marcherAfter(m.at, 'cut');
        const end = m.path[m.path.length - 1];
        Object.assign(m.unit, { u: end.u, v: end.v, step: undefined, facing: standFacing(a.next.rot) });
        m.i = m.path.length - 1;
      }
      this.view.keep.push(m.sprite.root);
      inFrame(a.walkFrame, () => m.sprite.update(a.comp, a.t, true));
    }
    this.stood = a.moving;
    this.stand = { comp: a.comp, walkFrame: a.walkFrame, t: a.t };
    // (a fault in baking the old section must not leave the march unfinished: the card over it waits on `done`)
    try {
      this.view.retire(look(a.old));
      this.view.setScenery(this.scenes(this.host));
    } finally {
      a.done();
    }
  }
}
