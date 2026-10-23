// The board drawn: each tile a column, its top a detailed grass (cracked flagstones on the high ground) laid onto the
// diamond, its two sides the dark rock face of the Undead tileset, down to a common foot. Boulders and bushes are the
// Fields tileset's own. The column sprite is drawn as in Chronos's raid board (tacticsView.ts
// `column`).

import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { tileAt, type Area, type Board, type Tile } from '../sim/board';
import { loadImage } from './loadImage';
import { depthIn, FOOT, HH, project, rawAt, TH, TW, type Frame } from './iso';
import { footDims, liesBehind, type Rot } from '../sim/turn';
import { AREA_URLS, BUSH_URLS, GROUND_URLS } from './areaArt';

/** From this height up, a tile's top is stony. */
const STONY = 3;

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
};

/** The lip of a boss arena's tiles. */
const BOSS_LIP = '#c9a24a';
/** Where the baked sections sit among the host's tiles and the fighters: those nearer the screen than the host in front of
 *  all of them, under the effects; those further off (the road can turn back up the screen) behind all of them. */
const SCENERY_Z = 5000;
const SCENERY_BACK_Z = -100000;

/** The rim drawn round each kind of ground. */
const RIM = { water: 'rgba(120,190,255,0.9)', ice: 'rgba(210,245,255,0.95)', lava: 'rgba(255,150,40,0.95)', tall: 'rgba(30,70,20,0.6)' };

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
}
let art: Art | null = null;

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
  art = { areas, water, ice, lava, bushes };
}

/** One section's tiles, built: a container for each tile (in row order), the marks over them, and the column textures made for them. */
interface Built {
  tiles: Container[];
  marks: Graphics[];
  tex: Texture[];
}
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

/** The most baked sections kept at once (a long map is fifteen). */
const BAKED_MAX = 20;

export class BoardView {
  readonly root = new Container();
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
    this.built = this.section(b, look, { rot, ou: 0, ov: 0 });
    this.marks = this.built.marks;
    this.root.addChild(...this.built.tiles);
  }

  /** The host is now behind the one to come (`section` is its board in the chain): its live tiles stay on show where they lie against the new host. */
  demote(section: Board, ou: number, ov: number): void {
    if (!this.built || !this.board) return;
    this.dropOld();
    const [ox, oy] = rawAt(ou, ov, 0);
    const f = { rot: this.rot, ou, ov };
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
    for (const x of o.tex) x.destroy(true);
    this.old = null;
    this.bake(scene);
    this.place(scene);
  }

  private dropOld(): void {
    if (!this.old) return;
    for (const t of this.old.tiles) if (!t.destroyed) t.destroy({ children: true });
    for (const x of this.old.tex) x.destroy(true);
    this.old = null;
  }

  private freeBuilt(): void {
    if (!this.built) return;
    for (const x of this.built.tex) x.destroy(true);
    this.built = null;
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
    const want = new Set(scenes.map((s) => s.board));
    for (const [b, sp] of this.sceneryOf)
      if (!want.has(b)) {
        sp.destroy();
        this.sceneryOf.delete(b);
      }
    this.toBake = [];
    for (const s of scenes) {
      if (this.baked.has(s.board)) this.place(s);
      else this.toBake.push(s);
    }
  }

  /** Bake one waiting section (called each frame, so a long map comes up a section a frame). */
  pump(): void {
    const s = this.toBake.shift();
    if (!s || !art) return;
    this.bake(s);
    this.place(s);
  }

  /** Hide the baked sections that lie off the screen (`view`, in world px). */
  cull(view: { x0: number; x1: number; y0: number; y1: number }): void {
    for (const sp of this.sceneryOf.values()) {
      const x = sp.x;
      const y = sp.y;
      sp.visible = x < view.x1 && x + sp.width > view.x0 && y < view.y1 && y + sp.height > view.y0;
    }
  }

  private bake(s: Scene): void {
    if (this.baked.has(s.board) || !this.renderer) return;
    const built = this.section(s.board, s.look, { rot: s.rot, ou: 0, ov: 0 });
    const c = new Container();
    c.sortableChildren = true;
    c.addChild(...built.tiles);
    const bounds = c.getLocalBounds();
    const tex = this.renderer.generateTexture({ target: c, resolution: 1 });
    c.destroy({ children: true });
    for (const x of built.tex) x.destroy(true);
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
    const [w, d] = footDims(s.rot);
    const layer = liesBehind(s.rot, s.ou, s.ov, this.rot) ? this.sceneryBack : this.scenery;
    if (sp.parent !== layer) layer.addChild(sp);
    sp.zIndex = (s.ou + s.ov) * 2 + w + d;
    const [ox, oy] = rawAt(s.ou, s.ov, 0);
    sp.position.set(ox + b.x, oy + b.y);
  }

  /** The tiles of a board, laid as the frame says (turned, and its footprint's corner some tiles from the origin). */
  private section(b: Board, look: Look, f: Frame): Built {
    const tiles: Container[] = [];
    const marks: Graphics[] = [];
    const tex: Texture[] = [];
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const t = tileAt(b, u, v)!;
        const [x, y] = project(f, u, v, t.h);
        const tile = new Container();
        tile.zIndex = depthIn(f, u, v);
        const ct = this.column(t, u, v, b.area, !!look.boss);
        tex.push(ct);
        const col = new Sprite(ct);
        col.position.set(x - TW / 2, y - TH / 2);
        tile.addChild(col);
        const mark = new Graphics();
        mark.position.set(x, y);
        tile.addChild(mark);
        marks.push(mark);
        const set = art?.areas[b.area];
        if (t.rock && set) {
          const tex = set.boulders[t.deco % set.boulders.length];
          const r = new Sprite(tex);
          r.anchor.set(0.5, 0.8);
          r.scale.set(Math.min(56 / tex.width, 66 / tex.height));
          r.position.set(x, y);
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
        tiles.push(tile);
      }
    return { tiles, marks, tex };
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

  clearMarks(): void {
    for (const g of this.marks) g.clear();
  }

  /** One tile's column: its top laid on the diamond, its two sides down to the foot. */
  private column(t: Tile, u: number, v: number, area: Area, boss = false): Texture {
    const set = art?.areas[area];
    // (a boss arena stands on a plinth one step deeper)
    const deep = t.h * HH + FOOT + (boss ? HH : 0);
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH + deep;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    // (a boss arena is all flagstone, with a gilded lip)
    const stony = t.h >= STONY || boss;
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
      const lie = t.ground && t.ground !== 'tall' ? art[t.ground] : null;
      g.drawImage(lie ?? (stony ? set.high : set.tops[(t.deco + u + v) % set.tops.length]), 0, 0, SRC, SRC);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      g.fillStyle = lip;
      g.fillRect(0, 0, TW, TH);
    }
    // (high ground a shade lighter, so the heights read at a glance)
    g.fillStyle = `rgba(255,248,220,${0.03 + t.h * 0.035})`;
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
    }
    g.restore();
    g.strokeStyle = t.ground ? RIM[t.ground] : boss ? 'rgba(255,226,140,0.75)' : 'rgba(20,14,8,0.35)';
    g.lineWidth = t.ground && t.ground !== 'tall' ? 2 : 1;
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
