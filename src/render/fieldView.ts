// The Assault's field drawn (phase 0, `docs/notes/assault-0.md`; the design's sections 2.4 and 7.4): a 100 x 100 field is far too big
// for one baked texture on a phone, so it is drawn in CHUNKS of 10 x 10 tiles, each baked on demand as it comes into view (at most
// two a frame, at half resolution) and kept in a small cache, and at three LEVELS OF DETAIL by the camera's zoom:
//
// - NEAR (0.35 and up): the chunks, the tall things (boulders, walls, gates) as sprites sorted with the fighters, every fighter in
//   view animated on its sheet, hit sparks and arrows.
// - MID (0.15 to 0.35): the same, the fighters a little smaller, with no sparks or arrows.
// - FAR (below 0.15): one overview texture of the whole field baked at the start (1,024 px), each platoon a banner with its count
//   and every fighter a dot. No chunk is drawn.
//
// The levels change with a band either side of each threshold (`fieldDetail.ts`), so a pinch at the edge does not flicker. Fighters out
// of view have no sprite: theirs goes back to a pool. The renderer only reads the battle; it never changes it.

import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { Battle, Unit } from '../sim/battle';
import type { FieldState } from '../sim/assault/field';
import type { FieldEvent } from '../sim/assault/spike';
import type { Tile } from '../sim/board';
import { AREA_URLS, BUSH_URLS, GROUND_URLS } from './areaArt';
import { TERRAIN_URLS } from './terrainArt';
import { loadImage } from './loadImage';
import { facesRight, FOOT, HH, rawAt, TH, TW } from './iso';
import { facesRightOf, figureOf, framesOf, type Anim } from './sheets';
import { detailFor, type Detail } from './fieldDetail';

export { MID_AT, NEAR_AT, type Detail } from './fieldDetail';
import gateUrl from '../art/camp/gate.png';
import impactUrl from '../art/fx/impact.png';
import arrowUrl from '../art/fx/arrow.png';

/** A chunk's side, in tiles. */
export const CHUNK = 10;
/** The chunks' bake resolution (of the world's pixels). */
const BAKE_RES = 0.5;
/** At most this many chunks are baked in one frame. */
const BAKES_A_FRAME = 2;
/** The chunk cache: this many kept (chunks in view are never let go while in view). */
const CACHE = 36;
/** The overview's width in pixels. */
const OVERVIEW_W = 1024;
/** Effects at once (sparks and arrows). */
const FX_POOL = 64;

/** The land a zone wears: the highlands outside the palisade, the war camp's mud and stone inside it (the design's 2.3). */
const CAMP_ZONES = new Set(['D', 'E', 'P', 'G', 'B', 'S', 'H', 'I', 'M'].map((c) => c.charCodeAt(0)));

interface LandArt {
  tops: HTMLImageElement[];
  high: HTMLImageElement;
  side: HTMLImageElement;
  boulders: Texture[];
  tall: HTMLImageElement[];
}
interface FieldArt {
  highlands: LandArt;
  warcamp: LandArt;
  water: HTMLImageElement;
  planks: HTMLImageElement;
  bushes: Texture[];
  walls: Texture[];
  gate: Texture;
  sparks: Texture[];
  arrow: Texture;
}
let art: FieldArt | null = null;

/** Load the field's art (the land's ground, sides and boulders, the ruins, the gate, a spark and an arrow from the fx packs). */
export async function loadFieldArt(): Promise<void> {
  if (art) return;
  const land = async (a: 'highlands' | 'warcamp'): Promise<LandArt> => {
    const u = AREA_URLS[a];
    const [tops, high, side, boulders, tall] = await Promise.all([Promise.all(u.tops.map(loadImage)), loadImage(u.high), loadImage(u.side), Promise.all(u.boulders.map(loadImage)), Promise.all(u.tall.map(loadImage))]);
    return { tops, high, side, boulders: boulders.map((i) => Texture.from(i)), tall };
  };
  const tex = async (url: string) => Texture.from(await loadImage(url));
  const [highlands, warcamp, water, planks, bushes, walls, gate, impact, arrow] = await Promise.all([
    land('highlands'), land('warcamp'), loadImage(GROUND_URLS.water), loadImage(TERRAIN_URLS.planks),
    Promise.all(BUSH_URLS.map(tex)), Promise.all(TERRAIN_URLS.walls.map(tex)), tex(gateUrl), tex(impactUrl), tex(arrowUrl),
  ]);
  // (the impact strip: seven frames of 48 x 48)
  const sparks = Array.from({ length: 7 }, (_, i) => new Texture({ source: impact.source, frame: new Rectangle(i * 48, 0, 48, 48) }));
  art = { highlands, warcamp, water, planks, bushes, walls, gate, sparks, arrow };
}

interface Chunk {
  sprite: Sprite;
  /** Its tall things (boulders, walls, gates), in the fighters' layer. */
  props: Sprite[];
  used: number;
}

interface FxLive {
  sp: Sprite;
  until: number;
  start: number;
  kind: 'spark' | 'arrow';
  from?: [number, number];
  to?: [number, number];
}

/** The field's view: add `root` to the stage, then call `update` each frame. */
export class FieldView {
  readonly root = new Container();
  private chunkLayer = new Container();
  private unitLayer = new Container();
  private farLayer = new Container();
  private dots = new Graphics();
  private overview: Sprite | null = null;
  private chunks = new Map<number, Chunk>();
  private sprites = new Map<number, { body: Sprite; ring: Sprite }>();
  private pool: { body: Sprite; ring: Sprite }[] = [];
  private banners: Text[] = [];
  private fxLive: FxLive[] = [];
  private fxPool: Sprite[] = [];
  private rings: { hero: Texture; foe: Texture };
  private frame = 0;
  detail: Detail = 'near';
  /** What the last frame drew (for the bench's readout). */
  drawn = { chunks: 0, fighters: 0, props: 0, baked: 0, fx: 0 };
  private brokenGates = new Set<number>();

  constructor(private b: Battle, private renderer: { generateTexture: (o: Container | { target: Container }) => Texture }) {
    this.unitLayer.sortableChildren = true;
    this.root.addChild(this.chunkLayer, this.unitLayer, this.farLayer);
    this.farLayer.addChild(this.dots);
    // (the team rings under the fighters' feet: a ring, as the selection ring is drawn, blue for ours and red for theirs)
    const ring = (c: number) => {
      const g = new Graphics().ellipse(0, 0, 18, 9).stroke({ width: 3, color: c, alpha: 0.85 });
      const t = this.renderer.generateTexture(g);
      g.destroy();
      return t;
    };
    this.rings = { hero: ring(0x4a9cff), foe: ring(0xff4a4a) };
    this.bakeOverview();
  }

  private get f(): FieldState {
    return this.b.field!;
  }

  // ----- the terrain -----

  private landOf(i: number): LandArt {
    return CAMP_ZONES.has(this.f.zone[i]) ? art!.warcamp : art!.highlands;
  }

  /** Bake one chunk's ground: each tile's two visible sides down to its front neighbours and its top, back to front. */
  private bakeChunk(cx: number, cy: number): Chunk {
    const b = this.b.board;
    const u0 = cx * CHUNK;
    const v0 = cy * CHUNK;
    const u1 = Math.min(b.w, u0 + CHUNK) - 1;
    const v1 = Math.min(b.d, v0 + CHUNK) - 1;
    const hOf = (u: number, v: number) => (u < b.w && v < b.d ? b.tiles[v * b.w + u].h : -FOOT / HH);
    // the chunk's bounds in world pixels
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const t = b.tiles[v * b.w + u];
        const [x, y] = rawAt(u, v, t.h);
        const low = Math.min(hOf(u + 1, v), hOf(u, v + 1), t.h);
        x0 = Math.min(x0, x - TW / 2);
        x1 = Math.max(x1, x + TW / 2);
        y0 = Math.min(y0, y - TH / 2);
        y1 = Math.max(y1, y + TH / 2 + (t.h - low) * HH);
      }
    const cw = Math.ceil((x1 - x0) * BAKE_RES) + 2;
    const ch = Math.ceil((y1 - y0) * BAKE_RES) + 2;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const g = canvas.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const S = BAKE_RES;
    const ox = -x0;
    const oy = -y0;
    // (a square texture laid onto a tile's diamond: its x along +u, its y along +v; the corner (u - 0.5, v - 0.5) at the top)
    const top = (img: HTMLImageElement, u: number, v: number, h: number) => {
      const [x, y] = rawAt(u - 0.5, v - 0.5, h);
      g.setTransform(((TW / 2) / img.width) * S, ((TH / 2) / img.width) * S, (-(TW / 2) / img.height) * S, ((TH / 2) / img.height) * S, (x + ox) * S, (y + oy) * S);
      g.drawImage(img, 0, 0);
    };
    // (a side face from corner a to corner b, `steps` tall, the side texture once a step, and a shade over it)
    const face = (img: HTMLImageElement, a: [number, number], z: [number, number], steps: number, shade: number) => {
      for (let s = 0; s < steps; s++) {
        g.setTransform(((z[0] - a[0]) / img.width) * S, ((z[1] - a[1]) / img.width) * S, 0, (HH / img.height) * S, (a[0] + ox) * S, (a[1] + oy + s * HH) * S);
        g.drawImage(img, 0, 0);
      }
      g.setTransform(S, 0, 0, S, ox * S, oy * S);
      g.fillStyle = `rgba(0,0,0,${shade})`;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(z[0], z[1]);
      g.lineTo(z[0], z[1] + steps * HH);
      g.lineTo(a[0], a[1] + steps * HH);
      g.closePath();
      g.fill();
    };
    // back to front: by u + v, then u
    for (let s = u0 + v0; s <= u1 + v1; s++)
      for (let u = Math.max(u0, s - v1); u <= Math.min(u1, s - v0); u++) {
        const v = s - u;
        const i = v * b.w + u;
        const t = b.tiles[i];
        const land = this.landOf(i);
        // (the bottom-right face, over the +u neighbour, and the bottom-left, over the +v one)
        const dr = Math.ceil(t.h - hOf(u + 1, v));
        const dl = Math.ceil(t.h - hOf(u, v + 1));
        if (dr > 0) face(land.side, rawAt(u + 0.5, v - 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dr, 0.32);
        if (dl > 0) face(land.side, rawAt(u - 0.5, v + 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dl, 0.12);
        top(this.topOf(t, land), u, v, t.h);
        if (t.ground === 'deep' || t.ground === 'water') {
          g.setTransform(S, 0, 0, S, ox * S, oy * S);
          this.diamond(g, u, v, t.h, t.ground === 'deep' ? 'rgba(20,50,120,0.45)' : 'rgba(120,190,255,0.12)');
        } else if (t.ground === 'tall') {
          // (tufts of tall grass, the land's own, in front of the tile's middle)
          const [x, y] = rawAt(u, v, t.h);
          for (let k = 0; k < 5; k++) {
            const img = land.tall[(t.deco + k) % land.tall.length];
            const a = ((t.deco >> 2) + k * 2.1) % 6.283;
            const px = x + Math.cos(a) * 15;
            const py = y + 4 + Math.sin(a) * 5;
            g.setTransform(S * 3, 0, 0, S * 3, (px + ox) * S - (img.width * 3 * S) / 2, (py + oy) * S - img.height * 3 * S);
            g.drawImage(img, 0, 0);
          }
        }
      }
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    const sprite = new Sprite(texture);
    sprite.position.set(x0 - 1 / S, y0 - 1 / S);
    sprite.scale.set(1 / S);
    sprite.zIndex = cx + cy;
    // the tall things on the chunk's tiles, as sprites among the fighters
    const props: Sprite[] = [];
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const i = v * b.w + u;
        const t = b.tiles[i];
        const p = this.propOf(t, i);
        if (!p) continue;
        const [x, y] = rawAt(u, v, t.h);
        p.position.set(x, y);
        p.zIndex = (u + v) * 10 + 4;
        props.push(p);
        this.unitLayer.addChild(p);
      }
    this.drawn.baked++;
    return { sprite, props, used: this.frame };
  }

  private topOf(t: Tile, land: LandArt): HTMLImageElement {
    if (t.ground === 'deep' || t.ground === 'water') return art!.water;
    if (t.bridge) return art!.planks;
    if (t.paved || t.h >= 7) return land.high;
    return land.tops[t.deco % land.tops.length];
  }

  private diamond(g: CanvasRenderingContext2D, u: number, v: number, h: number, fill: string): void {
    const [x, y] = rawAt(u, v, h);
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(x, y - TH / 2);
    g.lineTo(x + TW / 2, y);
    g.lineTo(x, y + TH / 2);
    g.lineTo(x - TW / 2, y);
    g.closePath();
    g.fill();
  }

  /** The tall thing on a tile, if any: a boulder, a bush, a piece of palisade, a gate. */
  private propOf(t: Tile, i: number): Sprite | null {
    const a = art!;
    if (t.rock) {
      const set = this.landOf(i).boulders;
      const tex = set[t.deco % set.length];
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.8);
      s.scale.set(Math.min(56 / tex.width, 66 / tex.height));
      return s;
    }
    if (t.wall && this.f.zone[i] === 72) {
      // (a gate of the stone wall: the camp's gate, once for each pair of tiles)
      if (i % this.b.board.w % 2 || Math.floor(i / this.b.board.w) % 2) return null;
      const s = new Sprite(a.gate);
      s.anchor.set(0.5, 0.85);
      s.scale.set(0.8);
      s.label = `gate:${i}`;
      return s;
    }
    if (t.wall) {
      const s = new Sprite(a.walls[t.deco % a.walls.length]);
      s.anchor.set(0.5, 0.85);
      return s;
    }
    if (t.bush) {
      const s = new Sprite(a.bushes[t.deco % a.bushes.length]);
      s.anchor.set(0.5, 0.9);
      return s;
    }
    return null;
  }

  /** The whole field in one texture, for FAR: every tile's top, shaded by its height. */
  private bakeOverview(): void {
    const b = this.b.board;
    const [left] = rawAt(-0.5, b.d - 0.5, 0);
    const [right] = rawAt(b.w - 0.5, -0.5, 0);
    const [, topY] = rawAt(-0.5, -0.5, 12);
    const [, bottomY] = rawAt(b.w - 0.5, b.d - 0.5, -1);
    const S = OVERVIEW_W / (right - left);
    const canvas = document.createElement('canvas');
    canvas.width = OVERVIEW_W;
    canvas.height = Math.ceil((bottomY - topY) * S);
    const g = canvas.getContext('2d')!;
    for (let s = 0; s <= b.w + b.d - 2; s++)
      for (let u = Math.max(0, s - b.d + 1); u <= Math.min(b.w - 1, s); u++) {
        const v = s - u;
        const i = v * b.w + u;
        const t = b.tiles[i];
        const img = this.topOf(t, this.landOf(i));
        const [x, y] = rawAt(u - 0.5, v - 0.5, t.h);
        g.setTransform(((TW / 2) / img.width) * S, ((TH / 2) / img.width) * S, (-(TW / 2) / img.height) * S, ((TH / 2) / img.height) * S, (x - left) * S, (y - topY) * S);
        g.drawImage(img, 0, 0);
        g.setTransform(S, 0, 0, S, -left * S, -topY * S);
        const shade = t.rock || t.wall ? 'rgba(40,30,20,0.55)' : t.ground === 'deep' ? 'rgba(20,50,120,0.45)' : `rgba(0,0,0,${Math.max(0, 0.25 - t.h * 0.03)})`;
        this.diamond(g, u, v, t.h, shade);
      }
    const texture = Texture.from(canvas);
    this.overview = new Sprite(texture);
    this.overview.position.set(left, topY);
    this.overview.scale.set(1 / S);
    this.farLayer.addChildAt(this.overview, 0);
  }

  /** A gate broken: its picture comes down, and its chunk will be baked again. */
  breach(tiles: readonly number[]): void {
    for (const i of tiles) this.brokenGates.add(i);
    const w = this.b.board.w;
    for (const i of tiles) {
      const key = Math.floor(Math.floor(i / w) / CHUNK) * 100 + Math.floor((i % w) / CHUNK);
      this.dropChunk(key);
    }
  }

  private dropChunk(key: number): void {
    const c = this.chunks.get(key);
    if (!c) return;
    c.sprite.texture.destroy(true);
    c.sprite.destroy();
    for (const p of c.props) p.destroy();
    this.chunks.delete(key);
  }

  // ----- each frame -----

  /** Draw the field for a camera centred on world (x, y) at `zoom`, with a view `vw` x `vh` screen pixels. `simT` is the battle's
   *  time to draw (between ticks, for smooth steps). */
  update(cam: { x: number; y: number; zoom: number }, vw: number, vh: number, simT: number, events: readonly FieldEvent[]): void {
    this.frame++;
    this.detail = detailFor(cam.zoom, this.detail);
    this.root.scale.set(cam.zoom);
    this.root.position.set(vw / 2 - cam.x * cam.zoom, vh / 2 - cam.y * cam.zoom);
    const far = this.detail === 'far';
    this.chunkLayer.visible = !far;
    this.unitLayer.visible = !far;
    this.farLayer.visible = far;
    // the world rectangle in view, and a margin
    const halfW = vw / 2 / cam.zoom;
    const halfH = vh / 2 / cam.zoom;
    const view = { x0: cam.x - halfW - TW, x1: cam.x + halfW + TW, y0: cam.y - halfH - 120, y1: cam.y + halfH + 160 };
    this.drawn = { chunks: 0, fighters: 0, props: 0, baked: 0, fx: 0 };
    if (far) this.drawFar(simT, cam.zoom);
    else {
      this.drawChunks(view);
      this.drawFighters(view, simT, events);
    }
  }

  private drawChunks(view: { x0: number; x1: number; y0: number; y1: number }): void {
    const b = this.b.board;
    const n = Math.ceil(b.w / CHUNK);
    const want: number[] = [];
    for (let cy = 0; cy < n; cy++)
      for (let cx = 0; cx < n; cx++) {
        // (a chunk's rough bounds: its four corners, with room for the tallest column)
        const u0 = cx * CHUNK - 0.5;
        const v0 = cy * CHUNK - 0.5;
        const u1 = u0 + CHUNK;
        const v1 = v0 + CHUNK;
        const xs = [rawAt(u0, v1, 0)[0], rawAt(u1, v0, 0)[0]];
        const y0 = rawAt(u0, v0, 12)[1];
        const y1 = rawAt(u1, v1, -1)[1];
        if (xs[1] < view.x0 || xs[0] > view.x1 || y1 < view.y0 || y0 > view.y1) continue;
        want.push(cy * 100 + cx);
      }
    // (the nearest to the middle of the view first, so a pan fills in from the middle out)
    const mx = (view.x0 + view.x1) / 2;
    const my = (view.y0 + view.y1) / 2;
    const mid = (key: number) => {
      const [x, y] = rawAt((key % 100) * CHUNK + CHUNK / 2, Math.floor(key / 100) * CHUNK + CHUNK / 2, 2);
      return Math.abs(x - mx) + Math.abs(y - my);
    };
    want.sort((p, q) => mid(p) - mid(q));
    let baked = 0;
    const showing = new Set(want);
    for (const key of want) {
      let c = this.chunks.get(key);
      if (!c) {
        if (baked >= BAKES_A_FRAME) continue;
        c = this.bakeChunk(key % 100, Math.floor(key / 100));
        this.chunks.set(key, c);
        baked++;
      }
      c.used = this.frame;
      if (!c.sprite.parent) this.chunkLayer.addChild(c.sprite);
      for (const p of c.props) {
        const gate = p.label?.startsWith('gate:') && this.brokenGates.has(Number(p.label.slice(5)));
        p.visible = !gate;
      }
      this.drawn.chunks++;
      this.drawn.props += c.props.length;
    }
    this.drawn.baked = baked;
    this.chunkLayer.sortableChildren = true;
    // (chunks out of view leave the scene; past the cache's size, the longest unused are let go)
    for (const [key, c] of this.chunks) {
      if (showing.has(key)) continue;
      if (c.sprite.parent) c.sprite.removeFromParent();
      for (const p of c.props) p.visible = false;
    }
    if (this.chunks.size > CACHE) {
      const idle = [...this.chunks].filter(([k]) => !showing.has(k)).sort((x, y) => x[1].used - y[1].used);
      for (const [key] of idle.slice(0, this.chunks.size - CACHE)) this.dropChunk(key);
    }
  }

  private drawFighters(view: { x0: number; x1: number; y0: number; y1: number }, simT: number, events: readonly FieldEvent[]): void {
    const f = this.f;
    const mid = this.detail === 'mid';
    const seen = new Set<number>();
    for (const x of this.b.units) {
      // (the fallen lie a moment, then are gone)
      if (!x.alive && simT - (x.diedAt ?? 0) > 1200) continue;
      const [px, py, depth] = this.placeOf(x, simT);
      if (px < view.x0 || px > view.x1 || py < view.y0 || py > view.y1) continue;
      seen.add(x.id);
      let s = this.sprites.get(x.id);
      if (!s) {
        s = this.pool.pop() ?? { body: new Sprite(), ring: new Sprite() };
        s.body.anchor.set(0.5, 1);
        s.ring.anchor.set(0.5, 0.5);
        this.unitLayer.addChild(s.ring, s.body);
        this.sprites.set(x.id, s);
      }
      const info = f.info[x.id];
      const [anim, ms] = this.animOf(x, simT);
      const frames = framesOf(info.sheet, anim);
      const per = anim === 'dead' ? 120 : anim === 'attack' ? Math.max(60, (x.swing?.ms ?? 500) / frames.length) : 110;
      const k = anim === 'dead' ? Math.min(frames.length - 1, Math.floor(ms / per)) : Math.floor(ms / per) % frames.length;
      s.body.texture = frames[k];
      // (heroes stand a head taller than their soldiers; the foes by their kind)
      const tall = (info.role === 'leader' && x.side === 'hero' ? 66 : x.side === 'hero' ? 50 : info.def.id === 'orcBrute' || info.def.id === 'orcWarlord' ? 62 : 52) * (mid ? 0.85 : 1);
      const scale = tall / figureOf(info.sheet);
      const flip = facesRight(x.facing) !== facesRightOf(info.sheet);
      s.body.scale.set(flip ? -scale : scale, scale);
      s.body.position.set(px, py + 6);
      s.body.zIndex = depth + 5;
      s.body.tint = x.alive && x.hurtAt !== undefined && simT - x.hurtAt < 120 ? 0xff9a9a : 0xffffff;
      s.body.alpha = x.alive ? 1 : Math.max(0, 1 - (simT - (x.diedAt ?? 0)) / 1200);
      s.ring.texture = x.side === 'hero' ? this.rings.hero : this.rings.foe;
      s.ring.position.set(px, py + 2);
      s.ring.zIndex = depth + 3;
      s.ring.visible = x.alive;
      this.drawn.fighters++;
    }
    for (const [id, s] of this.sprites) {
      if (seen.has(id)) continue;
      s.body.removeFromParent();
      s.ring.removeFromParent();
      this.sprites.delete(id);
      this.pool.push(s);
    }
    // the effects (NEAR only): a spark on each hit in view, an arrow for each shot
    if (!mid)
      for (const e of events) {
        if (this.fxLive.length >= FX_POOL) break;
        if (e.kind === 'hit') {
          const to = f.byId[e.to];
          const [x, y] = this.placeOf(to, simT);
          if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
          this.addFx('spark', simT, 260, [x, y - 26]);
        } else if (e.kind === 'blow' && e.shot) {
          const by = f.byId[e.by];
          const to = f.byId[e.to];
          const a = this.placeOf(by, simT);
          const z = this.placeOf(to, simT);
          if (a[0] < view.x0 || a[0] > view.x1 || a[1] < view.y0 || a[1] > view.y1) continue;
          this.addFx('arrow', simT, 300, [a[0], a[1] - 30], [z[0], z[1] - 26]);
        }
      }
    for (let i = this.fxLive.length - 1; i >= 0; i--) {
      const e = this.fxLive[i];
      const p = (simT - e.start) / (e.until - e.start);
      if (p >= 1 || mid) {
        e.sp.removeFromParent();
        this.fxPool.push(e.sp);
        this.fxLive.splice(i, 1);
        continue;
      }
      if (e.kind === 'spark') e.sp.texture = art!.sparks[Math.min(6, Math.floor(p * 7))];
      else {
        const [x0, y0] = e.from!;
        const [x1, y1] = e.to!;
        e.sp.position.set(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p - 40 * p * (1 - p) * 4);
        e.sp.rotation = Math.atan2(y1 - y0, x1 - x0);
      }
      this.drawn.fx++;
    }
  }

  private addFx(kind: 'spark' | 'arrow', simT: number, ms: number, at: [number, number], to?: [number, number]): void {
    const sp = this.fxPool.pop() ?? new Sprite();
    sp.anchor.set(0.5);
    sp.rotation = 0;
    sp.texture = kind === 'spark' ? art!.sparks[0] : art!.arrow;
    sp.scale.set(kind === 'spark' ? 0.9 : 0.5);
    sp.position.set(at[0], at[1]);
    sp.zIndex = 1e6;
    this.unitLayer.addChild(sp);
    this.fxLive.push({ sp, start: simT, until: simT + ms, kind, from: at, to });
  }

  /** Where a fighter is drawn at time `simT` (between the tiles of a step under way), and its depth. */
  private placeOf(x: Unit, simT: number): [number, number, number] {
    const b = this.b.board;
    const h = b.tiles[x.v * b.w + x.u].h;
    let u = x.u;
    let v = x.v;
    let hh = h;
    if (x.step && simT < x.step.at + x.step.ms) {
      const p = Math.max(0, (simT - x.step.at) / x.step.ms);
      u = x.step.u + (x.u - x.step.u) * p;
      v = x.step.v + (x.v - x.step.v) * p;
      hh = x.step.h + (h - x.step.h) * p;
    }
    const [px, py] = rawAt(u, v, hh);
    return [px, py, Math.round((u + v) * 10)];
  }

  private animOf(x: Unit, simT: number): [Anim, number] {
    if (!x.alive) return ['dead', simT - (x.diedAt ?? simT)];
    if (x.swing && simT < x.swing.at + x.swing.ms) return ['attack', simT - x.swing.at];
    if (x.step && simT < x.step.at + x.step.ms) return ['walk', simT];
    if (x.hurtAt !== undefined && simT - x.hurtAt < 200) return ['hurt', simT - x.hurtAt];
    return ['idle', simT + x.id * 37];
  }

  /** FAR: the overview, a dot for each fighter, a banner with its count over each platoon and each post still standing. */
  private drawFar(simT: number, zoom: number): void {
    const f = this.f;
    const g = this.dots;
    g.clear();
    for (const x of this.b.units) {
      if (!x.alive) continue;
      const [px, py] = this.placeOf(x, simT);
      // (a dot three screen pixels across, whatever the zoom)
      const r = 1.5 / zoom;
      g.rect(px - r, py - r, 2 * r, 2 * r).fill({ color: x.side === 'hero' ? 0x6ab8ff : 0xff5a4a });
    }
    let n = 0;
    for (const grp of f.groups) {
      const living = grp.members.filter((id) => f.byId[id].alive);
      if (!living.length || (grp.side === 'foe' && !grp.awake && grp.members.length < 4)) continue;
      const lead = f.byId[living[0]];
      const [px, py] = this.placeOf(lead, simT);
      let t = this.banners[n];
      if (!t) {
        t = new Text({ text: '', style: { fontFamily: 'Alegreya Sans, sans-serif', fontSize: 120, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x000000, width: 14 } } });
        t.anchor.set(0.5, 1);
        this.banners.push(t);
        this.farLayer.addChild(t);
      }
      t.visible = true;
      t.text = String(living.length);
      t.style.fill = grp.side === 'hero' ? 0x9ad0ff : 0xffb0a0;
      t.position.set(px, py - 4 / zoom);
      // (the count about fourteen screen pixels tall, whatever the zoom)
      t.scale.set(14 / 120 / zoom);
      n++;
    }
    for (let i = n; i < this.banners.length; i++) this.banners[i].visible = false;
    this.drawn.fighters = this.b.units.filter((x) => x.alive).length;
  }

  /** The world's middle and size, for fitting the camera. */
  bounds(): { x0: number; x1: number; y0: number; y1: number } {
    const b = this.b.board;
    return { x0: rawAt(-0.5, b.d - 0.5, 0)[0], x1: rawAt(b.w - 0.5, -0.5, 0)[0], y0: rawAt(-0.5, -0.5, 10)[1], y1: rawAt(b.w - 0.5, b.d - 0.5, 0)[1] };
  }

  destroy(): void {
    for (const key of [...this.chunks.keys()]) this.dropChunk(key);
    this.root.destroy({ children: true });
  }
}
