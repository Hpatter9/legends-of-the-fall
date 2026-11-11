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
import { statusFrames } from './statusArt';
import { batFrames } from './zoneLife';
import { LAND_LIGHT, lightsOf, MAX_DARK, rimOf, type LightSpot } from './landRimRules';
import type { PackKey } from './fxRules';
import { BAT_CROSS_MS, BAT_FLIT, batsFor, DRIP_EVERY, DRIPS, critterSpots, DECAL_NAMES, edgeFalls, FLEE_MS, landDecals, markOf, MARK_MS, MARKS_MAX, RETURN_MS, scaredBy, shaftsFor, SMOKE_EVERY, STEP_EVERY, stepPuff, type Critter, type DecalName, type Spot } from './boardLifeRules';
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

/** The colour of a snare's mark on the fighter it holds (rope). */
const ROOT_TINT = 0xd8b060;

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
  if (kind === 'dragonfly') {
    // (a thin body and two pairs of wings, blurred or folded)
    frames = [6, 3].map((span) =>
      make(14, 6, (g) => {
        g.fillStyle = 'rgba(200,240,255,0.75)';
        g.fillRect(7 - span, 1, span * 2, 2);
        g.fillStyle = '#2ac0b0';
        g.fillRect(2, 3, 10, 1);
        g.fillStyle = '#103a40';
        g.fillRect(11, 2, 2, 2);
      }),
    );
  } else if (kind === 'butterfly') {
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
  /** The mark on each snared fighter (by its id): a ring at its feet and an icon over its head, while the snare holds it. */
  private roots = new Map<number, { ring: Sprite | null; icon: Sprite | null }>();
  /** LAND-IDENTITY: the dark over a dark land, with a pool cut out round each light (one low-resolution picture, made when the board is
   *  built and again when a light goes out or falls). */
  private dark: Sprite | null = null;
  /** The bats: where each hangs, and where it is on a crossing. */
  private bats: { sp: Sprite; hx: number; hy: number; tx: number; ty: number; t: number; next: number; gone: boolean }[] = [];
  private fought = false;
  private dripAt = 0;
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
    this.roots.clear();
    this.dark = null;
    this.bats = [];
    this.fought = false;
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
      const y = ty + spot.dy + (spot.kind === 'firefly' || spot.kind === 'butterfly' || spot.kind === 'dragonfly' ? -14 : spot.kind === 'fish' ? 0 : 4);
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
    this.light();
    this.hangBats(b, saver);
    // what lies about the land (once its sheet is here)
    const hold = FLOORS[b.area].hold;
    const lay = () => {
      if (this.board !== b) return;
      for (const d of landDecals(b, weather)) this.decal(d.i % b.w, Math.floor(d.i / b.w), d.name, d.turn, d.alpha);
    };
    if (floorArt(hold)) lay();
    else void loadFloorArt(hold).then((got) => got && lay());
  }

  /** LAND-IDENTITY: lay the dark over a dark land (`LAND_LIGHT`): a picture a quarter of the screen's size, the land's dark colour at its
   *  weight, with a soft pool cut out round every light (`lightsOf`: wall torches, glowing crystals, braziers, lava, shrines), and faded
   *  out at its own edges so it has no box. It lies over the board and the fighters and under the effects; the lights' own glows flicker
   *  on the board (`boardView.ts`). Called again when the rim is laid and when a light changes. */
  light(): void {
    const b = this.board;
    if (this.dark && !this.dark.destroyed) this.dark.destroy(true);
    this.dark = null;
    const spec = b && LAND_LIGHT[b.area];
    if (!b || !spec || !this.on || b.w * b.d > 400) return;
    const Q = 4;
    const [xa] = at(-4, b.d + 3, 0);
    const [xb] = at(b.w + 3, -4, 0);
    const [, ya] = at(-4, -4, 12);
    const [, yb] = at(b.w + 3, b.d + 3, 0);
    const [x0, y0, cw, ch] = [xa, ya - 40, Math.ceil((xb - xa) / Q), Math.ceil((yb - ya + 100) / Q)];
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
    const col = spec.colour;
    g.fillStyle = `rgba(${(col >> 16) & 255},${(col >> 8) & 255},${col & 255},${Math.min(MAX_DARK, spec.dark)})`;
    g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'destination-out';
    const pool = (s: LightSpot) => {
      const [x, y] = at(s.u, s.v, s.h);
      const px = (x - x0) / Q;
      const py = (y - y0) / Q;
      const r = (s.reach * TW * 0.85) / Q;
      // (a pool lies on the ground: wider than it is deep)
      g.save();
      g.translate(px, py);
      g.scale(1, 0.62);
      const grad = g.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
      grad.addColorStop(0, 'rgba(0,0,0,0.95)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    for (const s of lightsOf(b, rimOf(b))) pool(s);
    // (no box: the dark fades out toward the picture's edges)
    for (const [gx0, gy0, gx1, gy1] of [[0, 0, cw * 0.14, 0], [cw, 0, cw * 0.86, 0], [0, 0, 0, ch * 0.14], [0, ch, 0, ch * 0.86]]) {
      const fade = g.createLinearGradient(gx0, gy0, gx1, gy1);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fade;
      g.fillRect(0, 0, cw, ch);
    }
    const sp = new Sprite(Texture.from(c));
    sp.position.set(x0, y0);
    sp.scale.set(Q);
    sp.zIndex = 4300;
    this.view.root.addChild(sp);
    this.dark = sp;
  }

  /** LAND-IDENTITY: the bats of a dark land hang along its far walls (`BATS`); `stepBats` flits them. */
  private hangBats(b: Board, saver: boolean): void {
    const frames = batFrames();
    const n = batsFor(b.area, saver);
    if (!frames?.length || !n) return;
    const salt = (b.seed & 0xffff) + 97;
    for (let k = 0; k < n; k++) {
      // (along the two far edges in turn, over the board's rim)
      const along = ((k * 2 + 1) / (n * 2)) * (k % 2 ? b.d : b.w);
      const t = tileAt(b, k % 2 ? 0 : Math.min(b.w - 1, Math.floor(along)), k % 2 ? Math.min(b.d - 1, Math.floor(along)) : 0)!;
      const [hx, hy] = k % 2 ? at(-1, along, t.h + 4.2) : at(along, -1, t.h + 4.2);
      const sp = new Sprite(frames[0]);
      sp.anchor.set(0.5);
      sp.scale.set(1.3);
      sp.tint = 0x1a1420;
      sp.position.set(hx, hy);
      sp.zIndex = 4350;
      this.view.root.addChild(sp);
      this.things.push(sp);
      this.bats.push({ sp, hx, hy, tx: hx, ty: hy, t: -1, next: BAT_FLIT[0] + ((salt + k * 2371) % (BAT_FLIT[1] - BAT_FLIT[0])), gone: false });
    }
  }

  /** Each frame: a bat hangs, flits across to another roost now and then, and they all take off when the fight begins (they come back to
   *  their roosts when the board is next laid). Still with reduced motion: they hang, and are gone in a fight. */
  private stepBats(dt: number, b: Battle): void {
    const frames = batFrames();
    if (!this.bats.length || !frames) return;
    const start = b.phase === 'fight' && !this.fought;
    if (b.phase === 'fight') this.fought = true;
    for (const [k, bat] of this.bats.entries()) {
      if (bat.sp.destroyed || bat.gone) continue;
      if (start) {
        // (up and away, each its own way)
        bat.t = 0;
        bat.tx = bat.hx + (k % 2 ? -1 : 1) * (120 + k * 30);
        bat.ty = bat.hy - 260;
        bat.gone = this.calm;
        if (this.calm) bat.sp.visible = false;
        continue;
      }
      if (this.calm) continue;
      if (bat.t < 0) {
        bat.next -= dt;
        if (bat.next > 0 || this.fought) continue;
        // (across to the next bat's roost)
        const to = this.bats[(k + 1 + Math.floor(this.clock / 977) % Math.max(1, this.bats.length - 1)) % this.bats.length];
        bat.t = 0;
        bat.tx = to.hx + 6;
        bat.ty = to.hy + 4;
        continue;
      }
      bat.t += dt;
      const p = Math.min(1, bat.t / BAT_CROSS_MS);
      // (a dip in the middle of the crossing)
      bat.sp.position.set(bat.hx + (bat.tx - bat.hx) * p, bat.hy + (bat.ty - bat.hy) * p + Math.sin(p * Math.PI) * (this.fought ? 0 : 46));
      bat.sp.texture = frames[Math.floor(bat.t / 90) % frames.length];
      if (p >= 1) {
        if (this.fought) {
          bat.gone = true;
          bat.sp.visible = false;
        } else {
          bat.hx = bat.tx;
          bat.hy = bat.ty;
          bat.t = -1;
          bat.next = BAT_FLIT[0] + ((k * 1931 + Math.floor(this.clock)) % (BAT_FLIT[1] - BAT_FLIT[0]));
          bat.sp.texture = frames[0];
        }
      }
    }
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
    // (a light has fallen or gone out: the dark is laid again round the lights that are left)
    if (this.dark && events.some((e) => e.kind === 'fieldTrap' && e.gone)) this.light();
  }

  /** A snared fighter is marked while the snare holds its feet (`Unit.rootUntil`, `sim/fieldTraps.ts`): an icon over its
   *  head. A stand-in from the status art (the weakening's icon, tinted rope) until a root has its own; the status art's ground rings are
   *  all too dark to tint to rope, so there is none at its feet yet. */
  private markRoots(b: Battle, where: ReadonlyMap<number, { x: number; y: number; tall: number }>): void {
    for (const x of b.units) {
      const held = x.alive && (x.rootUntil ?? 0) > b.t;
      const have = this.roots.get(x.id);
      if (held && !have) {
        const at2 = where.get(x.id);
        if (!at2) continue;
        const make = (key: string, scale: number, px: number, py: number, parent: Container, z?: number): Sprite | null => {
          const frames = statusFrames(key);
          if (!frames.length) return null;
          const sp = new Sprite(frames[0]);
          sp.anchor.set(0.5);
          // (`scale` is how wide it is drawn, in px: the status art's cells are of more than one size)
          sp.scale.set(scale / Math.max(1, frames[0].width));
          sp.tint = ROOT_TINT;
          sp.position.set(px, py);
          if (z !== undefined) sp.zIndex = z;
          parent.addChild(sp);
          return sp;
        };
        this.roots.set(x.id, { ring: null, icon: make('weak.icon', 14, at2.x, at2.y - at2.tall - 14, this.view.root, 4600) });
      } else if (!held && have) {
        for (const sp of [have.ring, have.icon]) if (sp && !sp.destroyed) sp.destroy();
        this.roots.delete(x.id);
      } else if (held && have && !this.calm) {
        // (the ring turns through its frames; the icon bobs a little)
        const ring = have.ring;
        const frames = statusFrames('curse.ground');
        if (ring && !ring.destroyed && frames.length) ring.texture = frames[Math.floor(this.clock / 110) % frames.length];
        const at2 = where.get(x.id);
        if (have.icon && !have.icon.destroyed && at2) have.icon.position.set(at2.x, at2.y - at2.tall - 14 + Math.sin(this.clock / 260) * 1.5);
      }
    }
  }

  /** Each frame: `where` is each fighter's feet on the screen (world px) and its height, by its id. */
  step(dt: number, b: Battle, where: ReadonlyMap<number, { x: number; y: number; tall: number }>): void {
    if (!this.on || this.board !== b.board) return;
    const t0 = performance.now();
    const fighters = [...where.values()];
    this.markRoots(b, where);
    this.stepBats(dt, b);
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
        } else if (kind === 'butterfly' || kind === 'dragonfly') {
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
        const flies = kind === 'bird' || kind === 'butterfly' || kind === 'dragonfly';
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
    if (!calm && !saver && DRIPS.includes(b.board.area) && this.clock >= this.dripAt) {
      // (water drips from the roof, somewhere on the floor)
      this.dripAt = this.clock + DRIP_EVERY;
      const i = Math.floor(this.clock / 13) % b.board.tiles.length;
      const t = b.board.tiles[i];
      const [dx, dy] = at(i % b.board.w, Math.floor(i / b.board.w), t.h);
      this.fx.puff('ice-puff', dx, dy, { scale: 0.22, alpha: 0.7, tint: 0xbfe0ff });
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
