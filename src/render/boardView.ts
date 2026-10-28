// The board drawn: each tile a column, its top a detailed grass (cracked flagstones on the high ground) laid onto the
// diamond, its two sides the dark rock face of the Undead tileset, down to a common foot. Boulders and bushes are the
// Fields tileset's own. The column sprite is drawn as in Chronos's raid board (tacticsView.ts
// `column`).

import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { LAVA_LANDS, tileAt, type Area, type Board, type Tile } from '../sim/board';
import { loadImage } from './loadImage';
import { ColumnTextures, columnKey, type ColumnLease } from './columnTextures';
import { depthIn, FOOT, HH, project, rawAt, TH, TW, type Frame } from './iso';
import { footDims, liesBehind, type Rot } from '../sim/turn';
import { AREA_URLS, BUSH_URLS, GROUND_URLS } from './areaArt';
import { TERRAIN_URLS } from './terrainArt';
import { LIT_PROPS } from './weatherRules';
import { fallFrames, FALL_FRAMES, flairOf, flowFrames, FLOW_FRAMES, glow, loadRoadArt, piece, sceneryPictures, setPiece, type Pic } from './roadArt';
import { settings } from '../settings';
import { sceneDepth } from '../sim/armyRoad';
import { mixSeed } from '../sim/rng';
import gateUrl from '../art/camp/gate.png';
import towerUrl from '../art/camp/tower.png';

/** From this height up, a tile's top is stony. */
const STONY = 3;
/** How many steps of an army road's column are drawn below its top (they fade out past the first two). */
const ROAD_SKIRT = 5;

type Mark = 'deploy' | 'hover' | 'bad' | 'chosen' | null;
const MARK_COLOUR: Record<Exclude<Mark, null>, [number, number]> = {
  deploy: [0x4a9cff, 0.28],
  hover: [0xffe066, 0.5],
  bad: [0xff4a4a, 0.4],
  chosen: [0x6dff8a, 0.45],
};

/** The colour of the lip at the edge of a tile's top: grass-like, then stony. */
const LIP: Record<Area, [string, string]> = {
  highlands: ['#7e9a48', '#a39e94'],
  forest: ['#3f7a40', '#8a9484'],
  snow: ['#dfe9f6', '#c4d6ee'],
  desert: ['#d9b878', '#e2c690'],
  volcano: ['#4a3430', '#6a5450'],
  dungeon: ['#585874', '#7c7c98'],
  plains: ['#6ea23c', '#a4ac84'],
  autumn: ['#b0641e', '#a08a74'],
  swamp: ['#2c5a40', '#667a68'],
  graveyard: ['#3c4a42', '#6e7690'],
  ruins: ['#948462', '#a8a08c'],
  temple: ['#3a7a48', '#d2c28e'],
  crystal: ['#3c3c92', '#7c8cd0'],
  forge: ['#463630', '#807672'],
  shrine: ['#4a3678', '#8c80a6'],
  warcamp: ['#6e6230', '#8c7258'],
  oasis: ['#64aa50', '#e4cc9a'],
};

/** The lip of a boss arena's tiles. */
const BOSS_LIP = '#c9a24a';
/** Where the baked sections sit among the host's tiles and the fighters: those nearer the screen than the host in front of
 *  all of them, under the effects; those further off (the road can turn back up the screen) behind all of them. */
const SCENERY_Z = 5000;
const SCENERY_BACK_Z = -100000;

/** The rim drawn round each kind of ground. */
const RIM = { water: 'rgba(120,190,255,0.9)', deep: 'rgba(40,90,180,0.95)', ice: 'rgba(210,245,255,0.95)', lava: 'rgba(255,150,40,0.95)', tall: 'rgba(30,70,20,0.6)', shrine: 'rgba(140,255,225,0.95)' };
/** The rim round a bridge's planks. */
const BRIDGE_RIM = 'rgba(44,26,12,0.9)';

/** The ground textures' side (they are laid onto the diamond whole). */
const SRC = 64;

interface AreaArt {
  tops: HTMLImageElement[];
  high: HTMLImageElement;
  side: HTMLImageElement;
  boulders: Texture[];
  tall: Texture[];
}
interface Art {
  areas: Record<Area, AreaArt>;
  water: HTMLImageElement;
  ice: HTMLImageElement;
  lava: HTMLImageElement;
  bushes: Texture[];
  barrel: Texture;
  walls: Texture[];
  crystal: Texture;
  planks: HTMLImageElement;
  gate: Texture;
  tower: Texture;
}
let art: Art | null = null;
let artEpoch = 0;

export async function loadBoardArt(): Promise<void> {
  const all = (urls: string[]) => Promise.all(urls.map(loadImage));
  const areas = {} as Record<Area, AreaArt>;
  await Promise.all(
    (Object.keys(AREA_URLS) as Area[]).map(async (a) => {
      const u = AREA_URLS[a];
      const [tops, high, side, boulders, tall] = await Promise.all([all(u.tops), loadImage(u.high), loadImage(u.side), all(u.boulders), all(u.tall)]);
      areas[a] = { tops, high, side, boulders: boulders.map((i) => Texture.from(i)), tall: tall.map((i) => Texture.from(i)) };
    }),
  );
  const [water, ice, lava] = await Promise.all([loadImage(GROUND_URLS.water), loadImage(GROUND_URLS.ice), loadImage(GROUND_URLS.lava)]);
  const bushes = (await all(BUSH_URLS)).map((i) => Texture.from(i));
  const [barrel, crystal, planks] = await Promise.all([loadImage(TERRAIN_URLS.barrel), loadImage(TERRAIN_URLS.crystal), loadImage(TERRAIN_URLS.planks)]);
  const walls = (await all(TERRAIN_URLS.walls)).map((i) => Texture.from(i));
  const [gate, tower] = await all([gateUrl, towerUrl]);
  await loadRoadArt();
  artEpoch++;
  art = { areas, water, ice, lava, bushes, barrel: Texture.from(barrel), walls, crystal: Texture.from(crystal), planks, gate: Texture.from(gate), tower: Texture.from(tower) };
}

/** One section's tiles, built: a container for each tile (in row order), the marks over them, and the column textures made for them. */
interface Built {
  landmark: Container | null;
  tiles: Container[];
  marks: Graphics[];
  tex: ColumnLease<Texture>[];
  /** The powder barrels still standing (by tile index), so a blast can take one away. */
  barrels: Map<number, Sprite>;
  /** What moves on its own (an army's road): swaying growth, flickering lights, running water, falls. */
  live: Live;
}
/** The living land's moving parts on a section (looks only): each is a sprite made once and only moved or re-framed each frame. */
interface Live {
  sway: { sp: Sprite; ph: number; amp: number }[];
  lights: { sp: Sprite; ph: number; base: number }[];
  loops: { sp: Sprite; frames: Texture[]; ph: number; ms: number }[];
}
const noLive = (): Live => ({ sway: [], lights: [], loops: [] });
/** A finished section baked into one texture, and where its top left lies against the section's own origin. */
interface Baked {
  tex: Texture;
  x: number;
  y: number;
}
/** What a section looks like beyond its board: a boss arena is drawn on flagstones with a gilded lip and a deeper plinth. */
export interface Look {
  boss?: boolean;
}
/** A section of the long map as the view needs it. */
export interface Scene {
  board: Board;
  look: Look;
  /** How many quarter turns it lies, and where its footprint's corner lies against the host's, in world tiles. */
  rot: Rot;
  ou: number;
  ov: number;
}

/** Stand a picture on a tile (its foot at the tile's middle, moved by its offset); note it if it sways or gives light. */
function addPic(tile: Container, p: Pic, x: number, y: number, live: Live): void {
  const tex = piece(p.name);
  if (!tex) return;
  const r = new Sprite(tex);
  r.anchor.set(p.ax ?? 0.5, p.ay ?? 0.88);
  r.scale.set(p.flip ? -p.scale : p.scale, p.scale);
  r.position.set(x + p.dx, y + p.dy);
  tile.addChild(r);
  const ph = (x * 0.071 + y * 0.113) % (Math.PI * 2);
  // (taller growth sways less at the foot, the same at the top: a skew about the foot)
  if (p.sway) live.sway.push({ sp: r, ph, amp: 0.035 });
  if (p.light) {
    const g = new Sprite(glow());
    g.anchor.set(0.5);
    g.tint = p.light.colour;
    g.blendMode = 'add';
    g.position.set(x + p.dx, y + p.dy - p.light.y * p.scale);
    g.alpha = 0.55;
    tile.addChild(g);
    live.lights.push({ sp: g, ph, base: 0.55 });
  }
}

/** The most baked sections kept at once (a long map is fifteen). */
const BAKED_MAX = 20;

export class BoardView {
  readonly root = new Container();
  private columns = new ColumnTextures<Texture>((texture) => texture.destroy(true));
  get columnStats() { return this.columns.stats; }
  private marks: Graphics[] = [];
  private board: Board | null = null;
  private built: Built | null = null;
  /** Layers that outlive a rebuild (the effects': `build` must not destroy them, or nothing in a fight would show). */
  readonly keep: Container[] = [];
  /** The finished sections, each one sprite: those nearer the screen than the host drawn in front of the fight's own tiles,
   *  those further off (`sceneryBack`) behind them, so a section the road turned back past never covers the fighters. */
  readonly scenery = new Container();
  readonly sceneryBack = new Container();
  private sceneryOf = new Map<Board, Sprite>();
  private baked = new Map<Board, Baked>();
  private toBake: Scene[] = [];
  private scenesWanted: Scene[] = [];
  private viewBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
  /** The section just fought, kept as live tiles while the heroes walk off it. */
  private old: (Built & { rot: Rot; ou: number; ov: number; section: Board }) | null = null;
  /** How the host section lies. */
  private rot: Rot = 0;
  /** The renderer, for baking (set by the page). */
  renderer: Renderer | null = null;

  constructor() {
    this.root.sortableChildren = true;
    this.scenery.zIndex = SCENERY_Z;
    this.sceneryBack.zIndex = SCENERY_BACK_Z;
    this.scenery.sortableChildren = this.sceneryBack.sortableChildren = true;
    this.keep.push(this.sceneryBack, this.scenery);
  }

  /** Build the board's columns (again, for a new board). `keepOld` leaves everything on the stage (the section handed to `demote`, the fighters walking off it) and only adds the new columns. */
  build(b: Board, look: Look = {}, rot: Rot = 0, keepOld = false): void {
    this.board = b;
    this.rot = rot;
    if (!keepOld) {
      for (const c of this.root.removeChildren()) if (!this.keep.includes(c)) c.destroy({ children: true });
      this.dropOld();
      this.root.addChild(...this.keep);
    }
    this.freeBuilt();
    this.built = this.section(b, look, { rot, ou: 0, ov: 0, w: b.w, d: b.d });
    this.marks = this.built.marks;
    this.root.addChild(...this.built.tiles);
  }

  /** A whole board baked into one sprite, for a big field (the Last Stand's 24 x 24 is 576 columns): drawn once, with the boulders and growth in it, and then it is a single quad each frame. The sprite is at the world's origin, behind everything (`zIndex`). */
  bakeField(b: Board, look: Look = {}): Sprite {
    const built = this.section(b, look, { rot: 0, ou: 0, ov: 0 });
    const c = new Container();
    c.sortableChildren = true;
    c.addChild(...built.tiles);
    const bounds = c.getLocalBounds();
    let tex: Texture;
    try {
      tex = this.renderer ? this.renderer.generateTexture({ target: c, resolution: 1 }) : Texture.EMPTY;
    } finally {
      c.destroy({ children: true });
      for (const x of built.tex) x.release();
    }
    const sp = new Sprite(tex);
    sp.position.set(bounds.minX, bounds.minY);
    sp.zIndex = -1e6;
    this.board = b;
    return sp;
  }

  /** The host is now behind the one to come (`section` is its board in the chain): its live tiles stay on show where they lie against the new host. */
  demote(section: Board, ou: number, ov: number): void {
    if (!this.built || !this.board) return;
    this.dropOld();
    // The destination is rendered once by the approaching/current host, never again in retired scenery.
    this.built.landmark?.destroy({ children: true });
    this.built.landmark = null;
    const [ox, oy] = rawAt(ou, ov, 0);
    const f = { rot: this.rot, ou, ov, w: this.board.w, d: this.board.d };
    this.built.tiles.forEach((t, i) => {
      t.position.set(ox, oy);
      t.zIndex = depthIn(f, i % this.board!.w, Math.floor(i / this.board!.w));
    });
    this.old = { ...this.built, rot: this.rot, ou, ov, section };
    for (const g of this.old.marks) g.clear();
    this.built = null;
  }

  /** The old section has done: it goes to the scenery as one sprite (`look` as it was drawn). */
  retire(look: Look): void {
    const o = this.old;
    if (!o) return;
    const scene = { board: o.section, look, rot: o.rot, ou: o.ou, ov: o.ov };
    for (const t of o.tiles) t.destroy({ children: true });
    for (const x of o.tex) x.release();
    this.old = null;
    this.bake(scene);
    this.place(scene);
  }

  private dropOld(): void {
    if (!this.old) return;
    for (const t of this.old.tiles) if (!t.destroyed) t.destroy({ children: true });
    for (const x of this.old.tex) x.release();
    this.old = null;
  }

  private freeBuilt(): void {
    if (!this.built) return;
    for (const x of this.built.tex) x.release();
    this.built = null;
  }

  private liveT = 0;
  private liveSkip = false;
  private calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Each frame: the living land of the live sections moves (the host, and the one the heroes are walking off). Held still when the device asks
   *  for reduced motion; on a battery saver every other frame. Nothing is made here: the sprites are moved, re-tinted or re-framed. */
  step(dt: number): void {
    if (this.calm) return;
    if (settings().saver && (this.liveSkip = !this.liveSkip)) return;
    this.liveT += settings().saver ? dt * 2 : dt;
    const t = this.liveT / 1000;
    for (const live of [this.built?.live, this.old?.live]) {
      if (!live) continue;
      for (const s of live.sway) s.sp.skew.x = Math.sin(t * 1.3 + s.ph) * s.amp + Math.sin(t * 2.9 + s.ph * 2) * s.amp * 0.3;
      // (a flame's glow breathes and wavers, never going out)
      for (const l of live.lights) {
        l.sp.alpha = l.base + Math.sin(t * 7.1 + l.ph) * 0.08 + Math.sin(t * 12.7 + l.ph * 3) * 0.05;
        l.sp.scale.set(0.95 + Math.sin(t * 5.3 + l.ph) * 0.06);
      }
      for (const lp of live.loops) lp.sp.texture = lp.frames[(Math.floor(this.liveT / lp.ms) + lp.ph) % lp.frames.length];
    }
  }

  /** A tile of the host falls: `dy` px above where it lies (up is negative), `alpha` how much of it shows. */
  lift(i: number, dy: number, alpha: number): void {
    const t = this.built?.tiles[i];
    if (!t) return;
    t.y = dy;
    t.alpha = alpha;
    t.visible = alpha > 0;
  }

  /** Show the finished sections behind the fight (those of `scenes`, each against the host), baking what is not baked yet, a section a frame (`pump`). Those no longer wanted go. */
  setScenery(scenes: Scene[]): void {
    this.scenesWanted = scenes;
    const want = new Set(scenes.map((s) => s.board));
    for (const [b, sp] of this.sceneryOf)
      if (!want.has(b)) {
        sp.destroy();
        this.sceneryOf.delete(b);
      }
    this.toBake = [];
    for (const s of scenes) {
      if (this.baked.has(s.board)) this.place(s);
      else if (s.board.w < 12 || (this.viewBox && this.inView(s, this.viewBox))) this.toBake.push(s);
    }
  }

  get sceneryReady(): boolean { return this.toBake.length === 0; }

  /** Bake one waiting section (called each frame, so a long map comes up a section a frame). */
  pump(): void {
    const s = this.toBake.shift();
    if (!s || !art) return;
    this.bake(s);
    this.place(s);
  }

  /** A conservative projected board rectangle, excluding destinations which retired sections never draw. */
  private inView(s: Scene, view: { x0: number; x1: number; y0: number; y1: number }): boolean {
    const f = { rot: s.rot, ou: s.ou, ov: s.ov, w: s.board.w, d: s.board.d };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const u of [0, s.board.w - 1]) for (const v of [0, s.board.d - 1]) {
      const [x, y] = project(f, u, v, 0);
      x0 = Math.min(x0, x - TW); x1 = Math.max(x1, x + TW);
      y0 = Math.min(y0, y - 12 * HH - 120); y1 = Math.max(y1, y + FOOT + TH);
    }
    return x0 < view.x1 && x1 > view.x0 && y0 < view.y1 && y1 > view.y0;
  }

  /** Hide the baked sections that lie off the screen (`view`, in world px). */
  cull(view: { x0: number; x1: number; y0: number; y1: number }): void {
    this.viewBox = view;
    // On large prototypes, resume/pan only bakes the sections near the camera; panning back queues them on demand.
    this.toBake = this.toBake.filter(s => s.board.w < 12 || this.inView(s, view));
    for (const s of this.scenesWanted) {
      if (s.board.w >= 12 && !this.baked.has(s.board) && !this.toBake.some(q => q.board === s.board) && this.inView(s, view)) this.toBake.push(s);
    }
    for (const sp of this.sceneryOf.values()) {
      const x = sp.x;
      const y = sp.y;
      sp.visible = x < view.x1 && x + sp.width > view.x0 && y < view.y1 && y + sp.height > view.y0;
    }
  }

  private bake(s: Scene): void {
    if (this.baked.has(s.board) || !this.renderer) return;
    const built = this.section({ ...s.board, landmark: undefined, landmarkAt: undefined }, s.look, { rot: s.rot, ou: 0, ov: 0, w: s.board.w, d: s.board.d });
    const c = new Container();
    c.sortableChildren = true;
    c.addChild(...built.tiles);
    const bounds = c.getLocalBounds();
    let tex: Texture;
    try {
      tex = this.renderer.generateTexture({ target: c, resolution: s.board.w >= 12 ? 0.5 : 1 });
    } finally {
      c.destroy({ children: true });
      for (const x of built.tex) x.release();
    }
    this.baked.set(s.board, { tex, x: bounds.minX, y: bounds.minY });
    // (the oldest are let go once there are too many)
    while (this.baked.size > BAKED_MAX) {
      const [old, b] = this.baked.entries().next().value!;
      this.sceneryOf.get(old)?.destroy();
      this.sceneryOf.delete(old);
      b.tex.destroy(true);
      this.baked.delete(old);
    }
  }

  private place(s: Scene): void {
    const b = this.baked.get(s.board);
    if (!b) return;
    let sp = this.sceneryOf.get(s.board);
    if (!sp) {
      sp = new Sprite(b.tex);
      this.sceneryOf.set(s.board, sp);
    }
    // (a section further off than the host goes behind it, any other in front; among themselves, by their middles' depth)
    const [w, d] = footDims(s.rot, s.board.w, s.board.d);
    const layer = liesBehind(s.rot, s.ou, s.ov, this.rot, s.board.w, s.board.d, this.board?.w, this.board?.d) ? this.sceneryBack : this.scenery;
    if (sp.parent !== layer) layer.addChild(sp);
    sp.zIndex = (s.ou + s.ov) * 2 + w + d;
    const [ox, oy] = rawAt(s.ou, s.ov, 0);
    sp.position.set(ox + b.x, oy + b.y);
  }

  /** The tiles of a board, laid as the frame says (turned, and its footprint's corner some tiles from the origin). */
  private section(b: Board, look: Look, f: Frame): Built {
    const tiles: Container[] = [];
    const marks: Graphics[] = [];
    const tex: ColumnLease<Texture>[] = [];
    const barrels = new Map<number, Sprite>();
    const live = noLive();
    // (an army's road: the land beside it sinks a little and its far edge is left ragged, so a section reads as a road through the land, not a slab)
    const depth = b.tiles.some((t) => t.scene) ? sceneDepth(b) : null;
    const held = new Set((b.pieces ?? []).map((p) => p.v * b.w + p.u));
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const raw = tileAt(b, u, v)!;
        const far = depth ? depth[v * b.w + u] : 0;
        const tile = new Container();
        tile.zIndex = depthIn(f, u, v);
        const edge = Math.min(u, v, b.w - 1 - u, b.d - 1 - v);
        // (water and lava are never trimmed: a river runs on to the edge, and pours off it)
        if (depth && far >= 3 && !held.has(v * b.w + u) && raw.scene !== 'water' && raw.scene !== 'lava' && edge < 1 + ((mixSeed(b.seed, 0xed9e, u, v) >>> 0) % 3)) {
          // (trimmed: nothing drawn, the tile is still there to the rules as land nobody stands on)
          const mark = new Graphics();
          tile.addChild(mark);
          marks.push(mark);
          tiles.push(tile);
          continue;
        }
        const sink = raw.scene ? Math.min(2, Math.max(0, far - 1)) : 0;
        const t: Tile = raw.scene === 'water' || raw.scene === 'lava' ? { ...raw, h: raw.h - sink, ground: raw.scene === 'water' ? 'deep' : 'lava' } : sink ? { ...raw, h: raw.h - sink } : raw;
        const [x, y] = project(f, u, v, t.h);
        const ct = this.column(t, u, v, b.area, depth ? !!t.paved : !!look.boss, !!depth);
        tex.push(ct);
        const col = new Sprite(ct.value);
        col.position.set(x - TW / 2, y - TH / 2);
        tile.addChild(col);
        const mark = new Graphics();
        mark.position.set(x, y);
        tile.addChild(mark);
        marks.push(mark);
        const set = art?.areas[b.area];
        if (t.scene === 'grave') {
          addPic(tile, { name: 'gravestones', scale: 0.62, ay: 0.86, dx: 0, dy: 4 }, x, y, live);
        } else if (t.scene) {
          // (an arena's ring is a run of wall along the ring: down to the right on the screen, or mirrored down to the left)
          let across = false;
          if (t.ring) {
            const ringAt = (du: number, dv: number) => !!tileAt(b, u + du, v + dv)?.ring;
            const alongU = +ringAt(1, 0) + +ringAt(-1, 0) >= +ringAt(0, 1) + +ringAt(0, -1);
            const [ax, ay] = project(f, u + (alongU ? 1 : 0), v + (alongU ? 0 : 1), t.h);
            across = (ax - x) * (ay - y) < 0;
          }
          for (const p of sceneryPictures(t.scene, b.area, t.deco, !!t.ring, across, far)) addPic(tile, p, x, y, live);
          if (t.scene === 'ruin' && !t.ring && art && t.deco % 3 !== 0) {
            const r = new Sprite(art.walls[t.deco % art.walls.length]);
            r.anchor.set(0.5, 0.85);
            r.position.set(x, y + 4);
            tile.addChild(r);
          }
        }
        // (running water: streaks sliding the way the river runs)
        if (depth && t.stream && b.flow && (t.ground === 'water' || t.ground === 'deep' || t.ground === 'lava' || t.ground === 'ice')) {
          const [fx, fy] = project(f, u + b.flow[0], v + b.flow[1], t.h);
          const frames = flowFrames(fx - x, fy - y, t.ground === 'lava' || (t.ground === 'deep' && LAVA_LANDS.includes(b.area)));
          const sp = new Sprite(frames[0]);
          sp.position.set(x - TW / 2, y - TH / 2);
          tile.addChild(sp);
          live.loops.push({ sp, frames, ph: (u * 3 + v * 5) % FLOW_FRAMES, ms: 110 });
        }
        if (t.scene) {
          // (the scenery's own picture is set; nothing more on it)
        } else if (t.rock && set) {        } else if (t.rock && set) {
          const tex = set.boulders[t.deco % set.boulders.length];
          const r = new Sprite(tex);
          r.anchor.set(0.5, 0.8);
          r.scale.set(Math.min(56 / tex.width, 66 / tex.height));
          r.position.set(x, y);
          tile.addChild(r);
        } else if (t.wall && art) {
          // (a ruined wall: a piece of ruin, the three kinds by the tile's own number)
          const w = art.walls[t.deco % art.walls.length];
          const r = new Sprite(w);
          r.anchor.set(0.5, 0.85);
          r.position.set(x, y + 4);
          tile.addChild(r);
        } else if (t.barrel && art) {
          const r = new Sprite(art.barrel);
          r.anchor.set(0.5, 0.85);
          r.scale.set(2);
          r.position.set(x, y + 2);
          tile.addChild(r);
          barrels.set(v * b.w + u, r);
        } else if (t.ground === 'shrine' && art) {
          // (the shrine's crystal, a little behind the tile's middle)
          const r = new Sprite(art.crystal);
          r.anchor.set(0.5, 0.82);
          r.position.set(x, y + 3);
          tile.addChild(r);
        } else if (t.ground === 'tall' && set) {
          // (tall growth: a clump of tufts that stands in front of the tile's top, hiding it from shots)
          const urls = AREA_URLS[b.area];
          for (let k = 0; k < urls.tallCount; k++) {
            const s = new Sprite(set.tall[(t.deco + k) % set.tall.length]);
            s.anchor.set(0.5, 1);
            s.scale.set(urls.tallScale);
            const a = ((t.deco >> 2) + k * 2.1) % (Math.PI * 2);
            s.position.set(x + Math.cos(a) * (urls.tallCount > 2 ? 17 : 10), y + 6 + Math.sin(a) * 6);
            tile.addChild(s);
          }
        } else if (t.bush && b.area === 'highlands' && set) {
          // (a bush grows at the tile's back corner, behind whoever stands there)
          const s = new Sprite(art!.bushes[t.deco % art!.bushes.length]);
          s.anchor.set(0.5, 0.9);
          s.position.set(x + ((t.deco >> 3) % 2 ? 12 : -12), y - 5);
          tile.addChild(s);
        }
        // (an army's road: small things growing on it now and then)
        const flair = depth && !t.scene && !t.ground && !t.bridge && !t.rock && !t.wall && !t.barrel && !t.paved ? flairOf(b.area, t.deco) : null;
        if (flair) addPic(tile, flair, x, y, live);
        tiles.push(tile);
      }
    // an arena's set pieces, each on its tile of the land round it
    for (const p of b.pieces ?? []) {
      const tile = tiles[p.v * b.w + p.u];
      if (!tile) continue;
      const t = tileAt(b, p.u, p.v)!;
      const far = depth ? depth[p.v * b.w + p.u] : 0;
      const [x, y] = project(f, p.u, p.v, t.h - Math.min(2, Math.max(0, far - 1)));
      addPic(tile, setPiece(p.kind, b.area), x, y, live);
    }
    // water pouring off an open edge, where its face is towards the screen
    for (const fall of b.falls ?? []) {
      const tile = tiles[fall.v * b.w + fall.u];
      const t = tileAt(b, fall.u, fall.v)!;
      if (!tile || !depth) continue;
      const h = t.h - Math.min(2, Math.max(0, depth[fall.v * b.w + fall.u] - 1));
      const [x, y] = project(f, fall.u, fall.v, h);
      const [ox, oy] = project(f, fall.u + fall.du, fall.v + fall.dv, h);
      if (oy <= y) continue;
      const left = ox < x;
      const frames = fallFrames(left, fall.lava);
      const sp = new Sprite(frames[0]);
      sp.position.set(left ? x - TW / 2 : x, y);
      tile.addChild(sp);
      live.loops.push({ sp, frames, ph: fall.v % FALL_FRAMES, ms: 70 });
    }
    let landmark: Container | null = null;
    // (an army road's final arena is the destination itself: its set pieces stand in for the distant compound)
    if (b.landmark && b.landmarkAt && art && !b.pieces?.length) {
      // Existing credited gate/tower sprites form a scenic compound beyond the far edge, never collision terrain.
      const base = tiles[Math.floor(b.w / 2)];
      const site = b.landmarkAt;
      landmark = new Container();
      landmark.sortableChildren = true;
      base.addChild(landmark);
      // A nonwalkable scenic plinth anchors the compound in the landscape instead of suspending it over the sky.
      for (let v = -2; v <= 1; v++) for (let u = -5; u <= 5; u++) {
        const t: Tile = { h: site.h, deco: (u + 5) * 7 + v + 2 };
        const texture = this.column(t, u, v, b.area, true);
        tex.push(texture);
        const column = new Sprite(texture.value);
        const [x, y] = project(f, site.u + u, site.v + v, site.h);
        column.position.set(x - TW / 2, y - TH / 2);
        column.zIndex = depthIn(f, site.u + u, site.v + v);
        landmark.addChild(column);
      }
      for (const [u, v, tower] of [[2, -2, true], [5.5, -2, false], [9, -2, true]] as const) {
        const sp = new Sprite(tower ? art.tower : art.gate);
        sp.anchor.set(0.5, 1);
        sp.scale.set(tower ? 2.4 : 2.8);
        sp.tint = b.landmark === 'mausoleum' ? 0x8c91ae : b.landmark === 'temple' ? 0xd7cb9d : 0xffffff;
        const [x, y] = project(f, site.u + u - 5.5, site.v + v + 2, site.h);
        sp.position.set(x, y);
        sp.zIndex = 100000;
        landmark.addChild(sp);
      }
    }
    return { tiles, marks, tex, barrels, landmark, live };
  }

  /** Where the board's lit props stand (world px; a lantern, a torch, a forge fire), for night's glows (`weatherView.ts`). */
  litSpots(): [number, number][] {
    const b = this.board;
    const lit = b && LIT_PROPS[b.area];
    if (!b || !lit) return [];
    const n = AREA_URLS[b.area].boulders.length;
    const f = { rot: this.rot, ou: 0, ov: 0, w: b.w, d: b.d };
    const out: [number, number][] = [];
    b.tiles.forEach((t, i) => {
      if (t.rock && lit.includes(t.deco % n)) out.push(project(f, i % b.w, Math.floor(i / b.w), t.h));
    });
    return out;
  }

  /** Light a tile (or clear it). */
  mark(u: number, v: number, kind: Mark): void {
    const b = this.board;
    if (!b) return;
    const g = this.marks[v * b.w + u];
    g.clear();
    if (!kind) return;
    const [col, alpha] = MARK_COLOUR[kind];
    g.poly([0, -TH / 2 + 2, TW / 2 - 3, 0, 0, TH / 2 - 2, -TW / 2 + 3, 0])
      .fill({ color: col, alpha })
      .stroke({ color: col, alpha: Math.min(1, alpha * 2.2), width: 1.5 });
  }

  /** A powder barrel has gone off: its sprite goes. */
  removeBarrel(u: number, v: number): void {
    const b = this.board;
    if (!b || !this.built) return;
    const i = v * b.w + u;
    this.built.barrels.get(i)?.destroy();
    this.built.barrels.delete(i);
    // (the tile's own column is the same without it)
  }

  clearMarks(): void {
    for (const g of this.marks) g.clear();
  }

  /** One tile's column: its top laid on the diamond, its two sides down to the foot. */
  private column(t: Tile, u: number, v: number, area: Area, boss = false, road = false): ColumnLease<Texture> {
    const set = art?.areas[area];
    const top = (!road && t.h >= STONY) || boss || t.perch ? -1 : set ? (t.deco + u + v) % set.tops.length : -1;
    const skirt = road ? Math.min(t.h, ROAD_SKIRT) : -1;
    const key = columnKey(area, boss, t.h, !!t.bridge, t.ground, top, artEpoch, u, v, !!t.perch, !!t.ramp, road ? `skirt${skirt}` : undefined);
    const bytes = TW * (TH + (road ? skirt : t.h) * HH + FOOT + (boss && !road ? HH : 0)) * 4;
    return this.columns.acquire(key, bytes, () => this.paintColumn(t, u, v, area, boss, road ? skirt : -1));
  }

  /** Original full-resolution painter; reuse only columns whose appearance inputs match. */
  private paintColumn(t: Tile, u: number, v: number, area: Area, boss = false, skirt = -1): Texture {
    const set = art?.areas[area];
    // (a boss arena stands on a plinth one step deeper; an army road's tile has a short skirt instead of a cliff to the foot)
    const road = skirt >= 0;
    const deep = road ? skirt * HH + FOOT : t.h * HH + FOOT + (boss ? HH : 0);
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH + deep;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    // (a boss arena is all flagstone, with a gilded lip; on an army's road only the paved tiles are, whatever the height)
    const stony = road ? boss : t.h >= STONY || boss;
    const lip = boss ? BOSS_LIP : LIP[area][stony ? 1 : 0];
    const face = (pts: [number, number][], fill: string | CanvasPattern) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
      g.fill();
    };
    // the sides: the rock face tiled down them, the left lit and the right in shade
    const rock = set?.side;
    const side = (x0: number, x1: number, y0: number, y1: number, shade: string) => {
      g.save();
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1, y1 + deep);
      g.lineTo(x0, y0 + deep);
      g.closePath();
      if (rock) {
        g.clip();
        const off = ((u * 23 + v * 11) % 5) * 16;
        for (let y = 0; y < TH + deep; y += rock.height)
          for (let x = -off; x < TW; x += rock.width) g.drawImage(rock, x, y);
        g.fillStyle = shade;
        g.fillRect(0, 0, TW, TH + deep);
      } else {
        g.fillStyle = '#6e6a62';
        g.fill();
      }
      g.restore();
    };
    side(0, TW / 2, TH / 2, TH, 'rgba(60,40,20,0.12)');
    side(TW / 2, TW, TH, TH / 2, 'rgba(8,6,14,0.45)');
    if (road && deep > 3 * HH) {
      // (the skirt fades out below its first steps: the land goes on into the haze rather than ending in a wall)
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fade = g.createLinearGradient(0, TH + 2.2 * HH, 0, TH + deep);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = fade;
      g.fillRect(0, TH / 2 + 2.2 * HH, TW, deep + TH);
      g.restore();
    }
    // faint lines at each step
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    for (let k = HH; k < deep; k += HH) {
      g.beginPath();
      g.moveTo(0, TH / 2 + k);
      g.lineTo(TW / 2, TH + k);
      g.lineTo(TW, TH / 2 + k);
      g.stroke();
    }
    face([[0, TH / 2], [TW / 2, TH], [TW, TH / 2], [TW, TH / 2 + 3], [TW / 2, TH + 3], [0, TH / 2 + 3]], lip);
    // the top: the tile's ground laid onto the diamond
    g.save();
    g.beginPath();
    g.moveTo(TW / 2, 0);
    g.lineTo(TW, TH / 2);
    g.lineTo(TW / 2, TH);
    g.lineTo(0, TH / 2);
    g.closePath();
    g.clip();
    if (art && set) {
      const a = TW / (2 * SRC);
      const b = TH / (2 * SRC);
      g.imageSmoothingEnabled = true;
      g.setTransform(a, b, -a, b, TW / 2, 0);
      const lie = t.bridge ? art.planks : t.ground === 'deep' ? (LAVA_LANDS.includes(area) ? art.lava : art.water) : t.ground && t.ground !== 'tall' && t.ground !== 'shrine' ? art[t.ground] : null;
      // (planks are pixel art: not smoothed)
      if (t.bridge) g.imageSmoothingEnabled = false;
      g.drawImage(lie ?? (stony ? set.high : set.tops[(t.deco + u + v) % set.tops.length]), 0, 0, SRC, SRC);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      g.fillStyle = lip;
      g.fillRect(0, 0, TW, TH);
    }
    // (high ground a shade lighter, so the heights read at a glance)
    // (an army road stands tens of steps high: its tops take a soft band of light that rises and falls with the height, never bleaching out)
    const band = Math.abs((t.h % 16) - 8) / 8;
    g.fillStyle = `rgba(255,248,220,${road ? 0.02 + band * 0.1 : 0.03 + t.h * 0.035})`;
    g.fillRect(0, 0, TW, TH);
    // (the ground that matters is marked so it reads at a glance: ripples on shallows, glints on ice, a glow on lava)
    g.lineWidth = 1;
    if (t.ground === 'water') {
      g.strokeStyle = 'rgba(220,240,255,0.7)';
      for (const [x, y] of [[TW * 0.34, TH * 0.5], [TW * 0.6, TH * 0.36], [TW * 0.56, TH * 0.68]]) {
        g.beginPath();
        g.moveTo(x - 5, y);
        g.quadraticCurveTo(x, y - 2.5, x + 5, y);
        g.stroke();
      }
    } else if (t.ground === 'ice') {
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y] of [[TW * 0.38, TH * 0.42], [TW * 0.64, TH * 0.6]]) {
        g.beginPath();
        g.moveTo(x - 4, y + 3);
        g.lineTo(x + 4, y - 3);
        g.moveTo(x - 2, y - 3);
        g.lineTo(x + 2, y + 3);
        g.stroke();
      }
    } else if (t.ground === 'lava') {
      const glow = g.createRadialGradient(TW / 2, TH / 2, 2, TW / 2, TH / 2, TW / 2.4);
      glow.addColorStop(0, 'rgba(255,230,120,0.5)');
      glow.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, TW, TH);
    } else if (t.ground === 'tall') {
      g.fillStyle = 'rgba(0,20,0,0.16)';
      g.fillRect(0, 0, TW, TH);
    } else if (t.ground === 'deep') {
      // (deep water: the shallows' texture, darkened, with a few long ripples; on a volcano a lake of lava, darkened to a crust)
      g.fillStyle = LAVA_LANDS.includes(area) ? 'rgba(30,6,0,0.4)' : 'rgba(6,22,66,0.5)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = LAVA_LANDS.includes(area) ? 'rgba(255,170,80,0.45)' : 'rgba(160,200,255,0.4)';
      for (const [x, y] of [[TW * 0.4, TH * 0.4], [TW * 0.62, TH * 0.62]]) {
        g.beginPath();
        g.moveTo(x - 7, y);
        g.quadraticCurveTo(x, y - 3, x + 7, y);
        g.stroke();
      }
    } else if (t.ground === 'shrine') {
      // (a soft teal glow on the stone, and a ring of runes round the crystal: still, no pulse)
      const glow = g.createRadialGradient(TW / 2, TH / 2, 2, TW / 2, TH / 2, TW / 2.2);
      glow.addColorStop(0, 'rgba(150,255,230,0.55)');
      glow.addColorStop(1, 'rgba(60,200,180,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(190,255,240,0.85)';
      g.beginPath();
      g.ellipse(TW / 2, TH / 2, TW * 0.3, TH * 0.3, 0, 0, Math.PI * 2);
      g.stroke();
    } else if (t.perch) {
      // (elevated archer perch: defensive flagstone tint and firing chevron pointing toward the enemy)
      g.fillStyle = 'rgba(235,215,180,0.18)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(255,235,175,0.7)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(TW * 0.32, TH * 0.58);
      g.lineTo(TW * 0.5, TH * 0.36);
      g.lineTo(TW * 0.68, TH * 0.58);
      g.stroke();
    } else if (t.ramp) {
      // (stepped ramp: wooden / stone stepped riser slats)
      g.fillStyle = 'rgba(180,150,110,0.15)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(240,210,165,0.75)';
      g.lineWidth = 1.4;
      for (const yFrac of [0.38, 0.52, 0.66]) {
        g.beginPath();
        g.moveTo(TW * 0.28, TH * yFrac);
        g.lineTo(TW * 0.72, TH * yFrac);
        g.stroke();
      }
    }
    g.restore();
    g.strokeStyle = t.bridge ? BRIDGE_RIM : t.ground === 'deep' && LAVA_LANDS.includes(area) ? 'rgba(255,120,30,0.95)' : t.ground ? RIM[t.ground] : t.perch ? 'rgba(245,220,150,0.85)' : t.ramp ? 'rgba(215,185,135,0.75)' : boss ? 'rgba(255,226,140,0.75)' : 'rgba(20,14,8,0.35)';
    g.lineWidth = t.bridge || (t.ground && t.ground !== 'tall') || t.perch || t.ramp ? 2 : 1;
    g.beginPath();
    g.moveTo(TW / 2, 0.5);
    g.lineTo(TW - 0.5, TH / 2);
    g.lineTo(TW / 2, TH - 0.5);
    g.lineTo(0.5, TH / 2);
    g.closePath();
    g.stroke();
    return Texture.from(c);
  }
}
