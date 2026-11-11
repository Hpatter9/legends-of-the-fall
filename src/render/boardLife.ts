// LIVING-FIELDS, step 4 (docs/notes/living-fields.md): the life of an ordinary battlefield, drawn (`boardLifeRules.ts` says what and where).
// Creatures that take fright when a fighter comes near and come back when the ground is quiet, fish in the water, fireflies, what lies about
// the land and the marks a fight leaves, water pouring off the near edges, shafts of light, smoke off the fires, dust and splashes under
// walking feet. Looks only: it reads the battle and never changes it. Everything is made when the board is built; a frame only moves,
// fades or re-frames what is there. Reduced motion holds it still; a battery saver has half the creatures and none of the rest that moves.

import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Battle, BattleEvent } from '../sim/battle';
import { LAVA_LANDS, tileAt, type Board } from '../sim/board';
import type { Weather } from '../sim/weather';
import { settings } from '../settings';
import { at, TH, TW } from './iso';
import { flicker } from './ambient';
import type { BoardView } from './boardView';
import { birdOf, fallFrames, FALL_FRAMES, glow } from './roadArt';
import { FLOORS } from './floorRules';
import { floorArt, loadFloorArt } from './floorArt';
import { loadImage } from './loadImage';
import type { PackKey } from './fxRules';
import { critterSpots, DECAL_NAMES, edgeFalls, FLEE_MS, landDecals, markOf, MARK_MS, MARKS_MAX, RETURN_MS, scaredBy, shaftsFor, SMOKE_EVERY, STEP_EVERY, stepPuff, type Critter, type DecalName, type Spot } from './boardLifeRules';
import lifeUrl from '../art/living-fields/life.png';
import LIFE from '../art/living-fields/life.json';

/** The painted creatures (`art-source/living-fields/life.png`, cut by `tools/living-fields/import-art.py life`): each kind's eight frames,
 *  four at rest and four fleeing. Empty until the sheet is painted: birds are the road's own pecking birds, a butterfly, a firefly and a
 *  fish are drawn here, and a rabbit or a frog is not shown at all. */
const cells = LIFE as Record<string, [number, number, number, number, number, number]>;
let lifeSheet: Texture | null = null;
export async function loadLifeArt(): Promise<void> {
  if (!Object.keys(cells).length || lifeSheet) return;
  lifeSheet = Texture.from(await loadImage(lifeUrl));
}
const paintedOf = (kind: string): Texture[] | null => {
  if (!lifeSheet || !(`${kind === 'bird' ? 'crow' : kind}0` in cells)) return null;
  const name = kind === 'bird' ? 'crow' : kind;
  return Array.from({ length: 8 }, (_, k) => cells[`${name}${k}`]).filter(Boolean).map(([x, y, w, h]) => new Texture({ source: lifeSheet!.source, frame: new Rectangle(x, y, w, h) }));
};

/** A small picture drawn once (a stand-in until the painted sheet lands). */
const drawn = new Map<string, Texture[]>();
function standIn(kind: Critter): Texture[] | null {
  const have = drawn.get(kind);
  if (have) return have;
  const make = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): Texture => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d')!);
    return Texture.from(c);
  };
  let frames: Texture[] | null = null;
  if (kind === 'butterfly') {
    // (two frames: wings open, wings shut)
    frames = [5, 2].map((span) =>
      make(12, 8, (g) => {
        g.fillStyle = '#fff4e0';
        g.fillRect(6 - span, 2, span, 4);
        g.fillRect(6, 2, span, 4);
        g.fillStyle = '#e8862a';
        g.fillRect(6 - span, 3, Math.max(1, span - 1), 2);
        g.fillRect(7, 3, Math.max(1, span - 1), 2);
        g.fillStyle = '#2a1a10';
        g.fillRect(5, 1, 2, 6);
      }),
    );
  } else if (kind === 'fish') {
    frames = [0, 1].map((k) =>
      make(14, 6, (g) => {
        g.fillStyle = 'rgba(20,30,40,0.9)';
        g.beginPath();
        g.ellipse(6, 3, 5, 2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(10, 3);
        g.lineTo(14, k ? 0 : 1);
        g.lineTo(14, k ? 6 : 5);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(200,220,235,0.8)';
        g.fillRect(3, 2, 2, 1);
      }),
    );
  }
  if (frames) drawn.set(kind, frames);
  return frames;
}

let shaftTex: Texture | null = null;
function shaftOf(): Texture {
  if (shaftTex) return shaftTex;
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 256;
  const g = c.getContext('2d')!;
  const down = g.createLinearGradient(0, 0, 0, 256);
  down.addColorStop(0, 'rgba(255,255,255,0.9)');
  down.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = down;
  g.fillRect(0, 0, 48, 256);
  // (soft at its two sides)
  g.globalCompositeOperation = 'destination-in';
  const across = g.createLinearGradient(0, 0, 48, 0);
  across.addColorStop(0, 'rgba(0,0,0,0)');
  across.addColorStop(0.5, 'rgba(0,0,0,1)');
  across.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = across;
  g.fillRect(0, 0, 48, 256);
  return (shaftTex = Texture.from(c));
}

interface Beast {
  spot: Spot;
  sp: Sprite;
  frames: Texture[];
  /** Whether its frames are the painted sheet's (four at rest, four fleeing). */
  painted: boolean;
  x: number;
  y: number;
  state: 'home' | 'flee' | 'away';
  /** Ms in its state, and ms the ground about its home has been quiet. */
  t: number;
  quiet: number;
}

/** What the effects give this layer: one small strip at a world point (`Fx.puff`). */
export interface Puffer {
  puff(key: PackKey, x: number, y: number, o?: { scale?: number; alpha?: number; tint?: number; life?: number; vy?: number; grow?: number }): void;
}

export class BoardLife {
  /** Off: nothing is built or stepped (the bench turns it off to measure its cost). */
  on = true;
  private board: Board | null = null;
  private beasts: Beast[] = [];
  private things: Container[] = [];
  private falls: { sp: Sprite; frames: Texture[]; ph: number }[] = [];
  private shafts: { sp: Sprite; ph: number }[] = [];
  private marks: { c: Container; t: number }[] = [];
  private fires: [number, number][] = [];
  private decalTex = new Map<string, Texture>();
  private clock = 0;
  private smokeAt = 0;
  private stepAt = 0;
  private seen = new Map<number, number>();
  private calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Ms spent in `step` over the frames so far (the bench reads it). */
  cost = { ms: 0, frames: 0 };

  constructor(private view: BoardView, private fx: Puffer) {}

  /** Lay a board's life (after `BoardView.build`, which made its tiles and so takes the old board's life away with them). */
  build(b: Board, weather: Weather): void {
    this.beasts = [];
    this.things = [];
    this.falls = [];
    this.shafts = [];
    this.marks = [];
    this.fires = [];
    this.seen.clear();
    this.board = b;
    if (!this.on || b.w * b.d > 400) return;
    const saver = !!settings().saver;
    // the creatures
    for (const spot of critterSpots(b, weather, saver)) {
      const u = spot.i % b.w;
      const v = Math.floor(spot.i / b.w);
      const layer = this.view.groundAt(u, v);
      const t = tileAt(b, u, v)!;
      if (!layer) continue;
      const [tx, ty] = at(u, v, t.h);
      const painted = paintedOf(spot.kind);
      const frames = painted ?? (spot.kind === 'bird' ? birdOf(b.area, spot.seed) ?? birdOf('plains', spot.seed) : spot.kind === 'firefly' ? [glow()] : standIn(spot.kind));
      if (!frames?.length) continue;
      const sp = new Sprite(frames[0]);
      const x = tx + spot.dx;
      const y = ty + spot.dy + (spot.kind === 'firefly' || spot.kind === 'butterfly' ? -14 : spot.kind === 'fish' ? 0 : 4);
      sp.anchor.set(0.5, spot.kind === 'bird' || spot.kind === 'rabbit' || spot.kind === 'frog' ? 1 : 0.5);
      sp.position.set(x, y);
      if (spot.kind === 'firefly') {
        sp.scale.set(0.16);
        sp.blendMode = 'add';
        sp.tint = b.area === 'graveyard' ? 0x9dffc8 : b.area === 'crystal' ? 0xc0ccff : 0xfff0a0;
      } else if (spot.kind === 'fish') sp.alpha = 0.55;
      else sp.scale.set(painted ? spot.way * 0.6 : spot.way * 1.1, painted ? 0.6 : 1.1);
      layer.addChild(sp);
      this.beasts.push({ spot, sp, frames, painted: !!painted, x, y, state: 'home', t: spot.seed * 7, quiet: RETURN_MS });
    }
    // water and lava pouring off the near edges
    for (const f of edgeFalls(b)) {
      const layer = this.view.groundAt(f.u, f.v);
      if (!layer) continue;
      const t = tileAt(b, f.u, f.v)!;
      const [x, y] = at(f.u, f.v, t.h);
      const [ox] = at(f.u + f.du, f.v + f.dv, t.h);
      const left = ox < x;
      const frames = fallFrames(left, f.lava);
      const sp = new Sprite(frames[0]);
      sp.position.set(left ? x - TW / 2 : x, y);
      sp.alpha = 0.7;
      layer.addChild(sp);
      this.falls.push({ sp, frames, ph: (f.u + f.v) % FALL_FRAMES });
    }
    // shafts of light over the board
    const n = shaftsFor(b.area, weather, saver, this.calm);
    if (n) {
      const [x0] = at(0, b.d - 1, 0);
      const [x1] = at(b.w - 1, 0, 0);
      const [, y0] = at(0, 0, 4);
      for (let k = 0; k < n; k++) {
        const sp = new Sprite(shaftOf());
        sp.anchor.set(0.5, 0);
        sp.blendMode = 'add';
        sp.tint = b.area === 'crystal' ? 0xc8c0ff : b.area === 'dungeon' ? 0xd0d8ff : 0xfff0c0;
        sp.rotation = 0.3;
        sp.scale.set(1.2 + (k % 2) * 0.5, 1.3);
        sp.position.set(x0 + ((k + 0.7) / (n + 0.4)) * (x1 - x0), y0 - 70);
        sp.alpha = 0.1;
        sp.zIndex = 4000;
        this.view.root.addChild(sp);
        this.things.push(sp);
        this.shafts.push({ sp, ph: k * 2.1 });
      }
    }
    // the fires that smoke: braziers, lava, coals
    b.tiles.forEach((t, i) => {
      if (t.brazier || t.ground === 'lava' || t.ground === 'coals' || (t.ground === 'deep' && LAVA_LANDS.includes(b.area))) this.fires.push(at(i % b.w, Math.floor(i / b.w), t.h));
    });
    // what lies about the land (once its sheet is here)
    const hold = FLOORS[b.area].hold;
    const lay = () => {
      if (this.board !== b) return;
      for (const d of landDecals(b, weather)) this.decal(d.i % b.w, Math.floor(d.i / b.w), d.name, d.turn, d.alpha);
    };
    if (floorArt(hold)) lay();
    else void loadFloorArt(hold).then((got) => got && lay());
  }

  /** A decal laid flat on a tile (the sheet's cell covers two tiles by two: it is laid a little wider than the tile), or null. */
  private decal(u: number, v: number, name: DecalName, turn: number, alpha: number): Container | null {
    const b = this.board;
    const art = b && floorArt(FLOORS[b.area].hold);
    const layer = this.view.groundAt(u, v);
    const t = b && tileAt(b, u, v);
    if (!b || !art || !layer || !t) return null;
    const key = `${FLOORS[b.area].hold}:${name}`;
    let tex = this.decalTex.get(key);
    if (!tex) {
      const i = DECAL_NAMES.indexOf(name);
      tex = new Texture({ source: Texture.from(art.decals).source, frame: new Rectangle((i % 4) * 128, Math.floor(i / 4) * 128, 128, 128) });
      this.decalTex.set(key, tex);
    }
    const [x, y] = at(u, v, t.h);
    const c = new Container();
    c.position.set(x, y);
    // (a square picture laid on the diamond: turned a half quarter, then squashed to the tile's 2:1)
    c.scale.set(1, 0.5);
    const sp = new Sprite(tex);
    sp.anchor.set(0.5);
    sp.rotation = Math.PI / 4 + (turn * Math.PI) / 2;
    sp.scale.set((TW / Math.SQRT2 / 128) * 1.25);
    c.alpha = alpha;
    c.addChild(sp);
    layer.addChild(c);
    return c;
  }

  /** The fight's events: the marks they leave on the ground (scorch, rubble, cracks, a puddle, embers), which fade. */
  events(b: Battle, events: readonly BattleEvent[]): void {
    if (!this.on || this.board !== b.board) return;
    const w = b.board.w;
    for (const e of events) {
      let tiles: [number, number][] = [];
      let name: DecalName | null = null;
      if (e.kind === 'boom') {
        name = markOf('boom');
        tiles = [[e.u, e.v]];
      } else if (e.kind === 'hazard' && e.phase === 'go') {
        name = markOf(e.what);
        // (one mark for the strike, on its first tile: a patch of five would crowd the board)
        tiles = e.tiles.slice(0, 1).map((i) => [i % w, Math.floor(i / w)]);
      } else if (e.kind === 'fieldTrap' && e.gone) {
        name = markOf(e.what);
        tiles = [[e.u, e.v]];
      } else if (e.kind === 'slam' && e.what !== 'unit') {
        name = markOf('slam');
        tiles = [[e.at.u, e.at.v]];
      }
      if (!name) continue;
      for (const [u, v] of tiles) {
        const c = this.decal(u, v, name, (u + v) % 4, 0.85);
        if (!c) continue;
        this.marks.push({ c, t: 0 });
        if (this.marks.length > MARKS_MAX) this.marks.shift()!.c.destroy({ children: true });
      }
    }
  }

  /** Each frame: `fighters` are the fighters' feet on the screen (world px). */
  step(dt: number, b: Battle, fighters: readonly { x: number; y: number }[]): void {
    if (!this.on || this.board !== b.board) return;
    const t0 = performance.now();
    const saver = !!settings().saver;
    const calm = this.calm;
    this.clock += dt;
    const sec = this.clock / 1000;
    // the creatures
    for (const c of this.beasts) {
      if (c.sp.destroyed) continue;
      c.t += dt;
      const near = fighters.some((f) => scaredBy(c.x, c.y, f.x, f.y, TW, TH));
      c.quiet = near ? 0 : c.quiet + dt;
      const kind = c.spot.kind;
      if (c.state === 'home') {
        if (near && kind !== 'firefly') {
          c.state = calm ? 'away' : 'flee';
          c.t = 0;
          if (calm) c.sp.visible = false;
          continue;
        }
        if (calm) continue;
        const ph = c.spot.seed * 0.37;
        if (kind === 'firefly') {
          c.sp.position.set(c.x + Math.sin(sec * 0.7 + ph) * 9, c.y + Math.sin(sec * 1.1 + ph * 2) * 5);
          c.sp.alpha = (near ? 0.25 : 0.55) + 0.35 * Math.sin(sec * 2.3 + ph);
        } else if (kind === 'butterfly') {
          c.sp.position.set(c.x + Math.sin(sec * 1.3 + ph) * 10, c.y + Math.sin(sec * 2.1 + ph) * 4);
          c.sp.texture = c.frames[c.painted ? Math.floor(c.t / 160) % 4 : Math.floor(c.t / 110) % c.frames.length];
        } else if (kind === 'fish') {
          c.sp.position.set(c.x + Math.cos(sec * 0.8 + ph) * 8, c.y + Math.sin(sec * 0.8 + ph) * 3);
          c.sp.scale.x = Math.sin(sec * 0.8 + ph) > 0 ? 1 : -1;
          c.sp.texture = c.frames[c.painted ? Math.floor(c.t / 180) % 4 : Math.floor(c.t / 240) % c.frames.length];
        } else c.sp.texture = c.frames[c.painted ? Math.floor(c.t / 220) % 4 : Math.floor(c.t / (380 + (c.spot.seed % 5) * 120)) % c.frames.length];
      } else if (c.state === 'flee') {
        const k = Math.min(1, c.t / FLEE_MS);
        // (up and away for what flies, a dart for a fish, a bound for what runs)
        const flies = kind === 'bird' || kind === 'butterfly';
        c.sp.position.set(c.x + c.spot.way * k * (kind === 'fish' ? 26 : 60), c.y - (flies ? k * k * 70 : kind === 'fish' ? 0 : Math.abs(Math.sin(k * Math.PI * 3)) * 8));
        c.sp.alpha = (kind === 'fish' ? 0.55 : 1) * (1 - k);
        c.sp.texture = c.frames[c.painted ? 4 + (Math.floor(c.t / 90) % 4) : Math.floor(c.t / 80) % c.frames.length];
        if (k >= 1) {
          c.state = 'away';
          c.sp.visible = false;
        }
      } else if (c.quiet >= RETURN_MS) {
        // (the ground is quiet again: it comes back to where it was)
        c.state = 'home';
        c.t = 0;
        c.sp.visible = true;
        c.sp.position.set(c.x, c.y);
        c.sp.alpha = kind === 'fish' ? 0.55 : 1;
      }
    }
    // the marks a fight left fade
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      m.t += dt;
      if (m.c.destroyed || m.t >= MARK_MS) {
        if (!m.c.destroyed) m.c.destroy({ children: true });
        this.marks.splice(i, 1);
      } else m.c.alpha = 0.85 * Math.min(1, (MARK_MS - m.t) / (MARK_MS * 0.4));
    }
    if (!calm) {
      for (const f of this.falls) if (!f.sp.destroyed) f.sp.texture = f.frames[(Math.floor(this.clock / 70) + f.ph) % f.frames.length];
      for (const s of this.shafts) if (!s.sp.destroyed) s.sp.alpha = 0.07 + 0.05 * flicker(sec * 0.25, Math.round(s.ph * 100), 'window');
    }
    if (!calm && !saver && b.phase === 'fight') {
      // smoke off a fire, now and then
      if (this.fires.length && this.clock >= this.smokeAt) {
        this.smokeAt = this.clock + SMOKE_EVERY;
        const [x, y] = this.fires[Math.floor(this.clock / SMOKE_EVERY) % this.fires.length];
        this.fx.puff('fire-smoke', x, y - 18, { scale: 0.8, alpha: 0.4, life: 1100, vy: -0.03, grow: 0.0005 });
      }
      // dust and splashes under walking feet
      for (const x of b.units) {
        if (!x.alive || x.under) continue;
        const i = x.v * b.board.w + x.u;
        const was = this.seen.get(x.id);
        this.seen.set(x.id, i);
        if (was === undefined || was === i || this.clock < this.stepAt || b.units.length > 30) continue;
        const t = b.board.tiles[i];
        const puff = stepPuff(b.board.area, t.trap === 'mud' || t.trap === 'bog' ? 'water' : t.ground);
        if (!puff) continue;
        this.stepAt = this.clock + STEP_EVERY;
        const [px, py] = at(x.u, x.v, t.h);
        this.fx.puff(puff.key, px, py + 2, { scale: puff.scale, alpha: puff.alpha, tint: puff.tint });
      }
    }
    this.cost.ms += performance.now() - t0;
    this.cost.frames++;
  }

  /** Take everything this layer put outside the tiles away (the tiles' own go with the board). */
  clear(): void {
    for (const c of this.things) if (!c.destroyed) c.destroy();
    this.things = [];
    this.shafts = [];
  }
}
