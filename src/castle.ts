// The Castle tab's picture: a castle courtyard in the isometric view of Chronos's building kits (stone wall, gate and tower, a lattice of grass
// and cobble tiles, houses, forges, a statue), drawn half size in the scene's own pixels, whole-number times bigger. A cobbled road leads from the
// wall's gate to a plaza; each upgrade is a building on its own plot that grows through four looks (castleSpots.ts): an empty plot, a small, a
// bigger and a grand one. Flags wave on the wall towers, chimneys smoke, sparks fly at the forge, the tower's windows glow and shed runes, the gold
// glints, and a few of your heroes (their sheets shrunk by a whole number so they stand about a door high) stroll the plaza. Tapping a building (or
// its name tag) opens its upgrade card; a level bought plays a short build: scaffolding and dust, the new look with a flash, then sparkles. One
// canvas, drawn with nearest neighbour and panned by native scroll when the screen is smaller than the scene. It only draws (Math.random is fine
// here: nothing that is played depends on it) and runs only while the tab shows.

import { BUILDING_IDS, maxLevel, nextCost, type BuildingId } from './sim/castle';
import { formOf, UNITS } from './sim/units';
import { rankOf, type Meta } from './sim/meta';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { gradeOfRank } from './render/tavernSpots';
import { strongest } from './menuHeroes';
import { cellX, cellY, decorAt, GRASS, isPlaceId, pavingAt, layoutFor, LIGHTS, lookBox, lookFor, LOOKS, NAME_OF, viewFor, PLACE_IDS, PLACE_VENTS, PLACES, PLOT_IDS, stageOf, TILE_H, TILE_W, VENTS, walkTiles, YARD, type Layout, type Look, type PlotId } from './render/castleSpots';
import anvil_stallUrl from './art/castle/anvil_stall.png';
import atelierUrl from './art/castle/atelier.png';
import bannerUrl from './art/castle/banner.png';
import barracksUrl from './art/castle/barracks.png';
import barrelsUrl from './art/castle/barrels.png';
import basketsUrl from './art/castle/baskets.png';
import berriesUrl from './art/castle/berries.png';
import birchUrl from './art/castle/birch.png';
import brazierUrl from './art/castle/brazier.png';
import bushUrl from './art/castle/bush.png';
import campfireUrl from './art/castle/campfire.png';
import cartUrl from './art/castle/cart.png';
import chapelUrl from './art/castle/chapel.png';
import chestsUrl from './art/castle/chests.png';
import churchUrl from './art/castle/church.png';
import cobble_tileUrl from './art/castle/cobble_tile.png';
import cottageUrl from './art/castle/cottage.png';
import cratesUrl from './art/castle/crates.png';
import crystalsUrl from './art/castle/crystals.png';
import fieldUrl from './art/castle/field.png';
import field2Url from './art/castle/field2.png';
import flagstoneUrl from './art/castle/flagstone.png';
import flowersUrl from './art/castle/flowers.png';
import forgeUrl from './art/castle/forge.png';
import granaryUrl from './art/castle/granary.png';
import grass_tileUrl from './art/castle/grass_tile.png';
import greatUrl from './art/castle/great.png';
import great_hallUrl from './art/castle/great_hall.png';
import hayUrl from './art/castle/hay.png';
import hedgeUrl from './art/castle/hedge.png';
import herbUrl from './art/castle/herb.png';
import lampUrl from './art/castle/lamp.png';
import longhouseUrl from './art/castle/longhouse.png';
import manorUrl from './art/castle/manor.png';
import oakUrl from './art/castle/oak.png';
import pineUrl from './art/castle/pine.png';
import potsUrl from './art/castle/pots.png';
import rackUrl from './art/castle/rack.png';
import rocksUrl from './art/castle/rocks.png';
import rosesUrl from './art/castle/roses.png';
import shedUrl from './art/castle/shed.png';
import shrineUrl from './art/castle/shrine.png';
import signUrl from './art/castle/sign.png';
import signpostUrl from './art/castle/signpost.png';
import spiralUrl from './art/castle/spiral.png';
import stableUrl from './art/castle/stable.png';
import stallUrl from './art/castle/stall.png';
import stall2Url from './art/castle/stall2.png';
import stall3Url from './art/castle/stall3.png';
import statueUrl from './art/castle/statue.png';
import stockpileUrl from './art/castle/stockpile.png';
import tavernUrl from './art/castle/tavern.png';
import thatchUrl from './art/castle/thatch.png';
import wallUrl from './art/castle/wall.png';
import watchtowerUrl from './art/castle/watchtower.png';
import wellUrl from './art/castle/well.png';
import woodpileUrl from './art/castle/woodpile.png';
import workshopUrl from './art/castle/workshop.png';

const ART: Record<string, string> = {
  anvil_stall: anvil_stallUrl,
  atelier: atelierUrl,
  banner: bannerUrl,
  barracks: barracksUrl,
  barrels: barrelsUrl,
  baskets: basketsUrl,
  berries: berriesUrl,
  birch: birchUrl,
  brazier: brazierUrl,
  bush: bushUrl,
  campfire: campfireUrl,
  cart: cartUrl,
  chapel: chapelUrl,
  chests: chestsUrl,
  church: churchUrl,
  cobble_tile: cobble_tileUrl,
  cottage: cottageUrl,
  crates: cratesUrl,
  crystals: crystalsUrl,
  field: fieldUrl,
  field2: field2Url,
  flagstone: flagstoneUrl,
  flowers: flowersUrl,
  forge: forgeUrl,
  granary: granaryUrl,
  grass_tile: grass_tileUrl,
  great: greatUrl,
  great_hall: great_hallUrl,
  hay: hayUrl,
  hedge: hedgeUrl,
  herb: herbUrl,
  lamp: lampUrl,
  longhouse: longhouseUrl,
  manor: manorUrl,
  oak: oakUrl,
  pine: pineUrl,
  pots: potsUrl,
  rack: rackUrl,
  rocks: rocksUrl,
  roses: rosesUrl,
  shed: shedUrl,
  shrine: shrineUrl,
  sign: signUrl,
  signpost: signpostUrl,
  spiral: spiralUrl,
  stable: stableUrl,
  stall: stallUrl,
  stall2: stall2Url,
  stall3: stall3Url,
  statue: statueUrl,
  stockpile: stockpileUrl,
  tavern: tavernUrl,
  thatch: thatchUrl,
  wall: wallUrl,
  watchtower: watchtowerUrl,
  well: wellUrl,
  woodpile: woodpileUrl,
  workshop: workshopUrl,
};

let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

const picCache = new Map<string, string>();
/** A building's look at a level as one picture (a data URL) for its card; empty until the courtyard has loaded its art. */
export function lookPicture(id: BuildingId, level: number): string {
  if (!art) return '';
  const stage = stageOf(id, level);
  const key = `${id}${stage}`;
  let url = picCache.get(key);
  if (url === undefined) {
    const look = LOOKS[id][stage];
    const box = lookBox(look);
    const c = el('canvas');
    c.width = Math.ceil(box.w) + 2;
    c.height = Math.ceil(box.h) + 12;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    for (const p of look.parts) {
      const im = art[p.sprite];
      g.drawImage(im, Math.round(p.dx - im.width / 2 - box.x0) + 1, c.height - 6 + p.dy - im.height);
    }
    url = c.toDataURL();
    picCache.set(key, url);
  }
  return url;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;

interface Rig {
  img: HTMLImageElement;
  w: number;
  h: number;
  rows: string[];
  counts: Record<string, number>;
  figure: number;
  facesRight: boolean;
}

/** A hero's idle and walk frames shrunk by a whole number (box average, then clear or solid), so they stay crisp pixel art beside the houses. */
interface Small {
  c: HTMLCanvasElement;
  fw: number;
  fh: number;
  idle: number;
  walk: number;
  facesRight: boolean;
}

/** How tall a hero stands in the yard, about: a sheet is shrunk by the whole number that comes nearest. */
const HERO_PX = 44;
const heroShrink = (figure: number): number => Math.max(1, Math.round(figure / HERO_PX));

function shrinkRig(rig: Rig): Small {
  const n = heroShrink(rig.figure);
  const fw = Math.floor(rig.w / n);
  const fh = Math.floor(rig.h / n);
  const rows = ['idle', 'walk'].map((r) => (rig.rows.includes(r) ? r : 'idle'));
  const counts = rows.map((r) => rig.counts[r] ?? 1);
  const src = el('canvas');
  src.width = rig.img.width;
  src.height = rig.img.height;
  const sg = src.getContext('2d', { willReadFrequently: true })!;
  sg.drawImage(rig.img, 0, 0);
  const out = el('canvas');
  out.width = fw * Math.max(...counts);
  out.height = fh * 2;
  const og = out.getContext('2d')!;
  rows.forEach((r, ri) => {
    const row = rig.rows.indexOf(r);
    for (let i = 0; i < counts[ri]; i++) {
      const data = sg.getImageData(i * rig.w, row * rig.h, rig.w, rig.h).data;
      const dst = og.createImageData(fw, fh);
      for (let oy = 0; oy < fh; oy++)
        for (let ox = 0; ox < fw; ox++) {
          let a = 0;
          let rr = 0;
          let gg = 0;
          let bb = 0;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              const k = ((oy * n + y) * rig.w + ox * n + x) * 4;
              const al = data[k + 3];
              a += al;
              rr += data[k] * al;
              gg += data[k + 1] * al;
              bb += data[k + 2] * al;
            }
          const o = (oy * fw + ox) * 4;
          if (a >= 255 * n * n * 0.5) {
            dst.data[o] = rr / a;
            dst.data[o + 1] = gg / a;
            dst.data[o + 2] = bb / a;
            dst.data[o + 3] = 255;
          }
        }
      og.putImageData(dst, i * fw, ri * fh);
    }
  });
  return { c: out, fw, fh, idle: counts[0], walk: counts[1], facesRight: rig.facesRight };
}

type Mood = 'idle' | 'walk';

interface Walker {
  kind: string;
  small: Small;
  x: number;
  y: number;
  /** The waypoint being walked to, and the tiles still to come after it. */
  gx: number;
  gy: number;
  route: { u: number; v: number }[];
  tile: { u: number; v: number };
  face: 1 | -1;
  mood: Mood;
  at: number;
  clock: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  grow: number;
  kind: 'dust' | 'smoke' | 'spark' | 'rune' | 'glint';
}

/** A level just bought: the old look shows behind scaffolding until `SWAP_MS`, then the new look and sparkles. */
interface Build {
  id: BuildingId;
  from: number;
  to: number;
  start: number;
}

/** The pictures with a flame: where it burns from the picture's foot, and its glow. */
const GLOWING: Record<string, { dx: number; dy: number; size: number; al: number; tint: string }> = {
  brazier: { dx: 0, dy: -72, size: 34, al: 0.55, tint: '#ff9a3c' },
  lamp: { dx: 0, dy: -66, size: 26, al: 0.5, tint: '#ffcf70' },
};

const isPlace = isPlaceId;

const BUILD_MS = 1500;
const SWAP_MS = 800;

export class CastleScene {
  readonly root = el('div', 'ctWrap');
  private scroll = el('div', 'ctScroll');
  private stage = el('div', 'ctStage');
  private canvas = el('canvas', 'ctRoom');
  private tags = el('div', 'ctTags');
  private ctx = this.canvas.getContext('2d')!;
  private still: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private walkers = new Map<string, Walker>();
  private motes: Mote[] = [];
  private builds: Build[] = [];
  private levels: Partial<Record<BuildingId, number>> = {};
  private tagEls = new Map<PlotId, HTMLButtonElement>();
  private scale = 1;
  private lay: Layout = YARD;
  /** Css pixels per scene pixel (the scale in device pixels over the device pixel ratio). */
  private css = 1;
  /** The canvas in scene pixels: the village in the middle, and grass all round it to fill the frame (`ox`, `oy` is where the village's corner sits). */
  private view = { w: YARD.w, h: YARD.h, ox: 0, oy: 0 };
  private raf = 0;
  private last = 0;
  private now = 0;
  private nextSmoke = 0;
  private nextSpark = 0;
  private nextGlint = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private down: { x: number; y: number; t: number } | null = null;
  private watch: ResizeObserver;

  constructor(private onPick: (id: PlotId) => void) {
    this.stage.append(this.canvas, this.tags);
    this.scroll.append(this.stage);
    this.root.append(this.scroll);
    this.ctx.imageSmoothingEnabled = false;
    for (const id of PLOT_IDS) {
      const b = el('button', 'ctTag');
      b.addEventListener('click', () => this.onPick(id));
      this.tags.append(b);
      this.tagEls.set(id, b);
    }
    // (the places' tags say where they lead, and never change)
    for (const id of PLACE_IDS) {
      const tag = this.tagEls.get(id)!;
      tag.className = 'ctTag place';
      tag.replaceChildren(el('b', '', PLACES[id].name), el('span', '', `· ${PLACES[id].to}`));
      tag.setAttribute('aria-label', `${PLACES[id].name} · ${PLACES[id].to}`);
    }
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    // (a short tap on a building opens it; the page scrolls up and down by itself when the village is taller than the frame, and the tags take their own taps)
    this.canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 9 && performance.now() - d.t < 600) this.tap(e);
    });
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Show the castle as the meta has it. A level that has risen since the last call plays its build (while the tab is showing). */
  update(meta: Meta): void {
    for (const id of BUILDING_IDS) {
      const level = meta.castle[id];
      const before = this.levels[id];
      this.levels[id] = level;
      if (before !== undefined && level > before && this.running && !this.reduced) {
        this.builds = this.builds.filter((b) => b.id !== id);
        this.builds.push({ id, from: stageOf(id, before), to: stageOf(id, level), start: this.now });
        this.burst(id, 'dust', 26);
      } else if (before !== undefined && level > before) this.burst(id, 'spark', 14);
      const tag = this.tagEls.get(id)!;
      const cost = nextCost(meta.castle, id);
      const ready = cost !== null && meta.crowns >= cost;
      // (rebuilt only when it changes, so a finger that is down on a tag is not pulled out from under)
      const key = `${level}|${ready}|${cost === null}`;
      if (tag.dataset.key === key) continue;
      tag.dataset.key = key;
      tag.className = `ctTag${ready ? ' ready' : ''}${cost === null ? ' full' : ''}`;
      tag.replaceChildren(el('b', '', NAME_OF(id)), el('span', '', level === 0 ? 'not built' : `${level}/${maxLevel(id)}`));
      if (ready) tag.append(el('i', 'ctUp', '▲'));
      tag.setAttribute('aria-label', `${NAME_OF(id)}, level ${level} of ${maxLevel(id)}${ready ? ', can upgrade' : ''}`);
    }
    // heroes: the strongest few that are unlocked stroll the road
    const want = strongest(meta, 5);
    for (const k of [...this.walkers.keys()]) if (!want.includes(k)) this.walkers.delete(k);
    want.forEach((kind, i) => {
      const def = UNITS[kind];
      const rig = sheetInfo(formOf(def, gradeOfRank(rankOf(meta, kind))));
      if (!rig) return;
      const w = this.walkers.get(kind);
      if (w) {
        // (a new form after a rank-up: re-cut only when the sheet changed)
        if (w.small.facesRight !== rig.facesRight || w.small.fh !== Math.floor(rig.h / heroShrink(rig.figure))) w.small = shrinkRig(rig);
        return;
      }
      const wk: Walker = { kind, small: shrinkRig(rig), x: 0, y: 0, gx: 0, gy: 0, route: [], tile: { u: 0, v: 0 }, face: chance(0.5) ? 1 : -1, mood: 'idle', at: this.now + 300 * i + rand(300, 2500), clock: rand(0, 3000), phase: rand(0, 6) };
      this.putOnRoad(wk);
      this.walkers.set(kind, wk);
    });
    this.layTags();
  }

  /** Start drawing (the tab is showing). */
  start(): void {
    this.running = true;
    if (this.raf || document.hidden) return;
    void loadArt().then(() => {
      if (!this.running || this.raf) return;
      this.fit();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  /** Stop drawing (another tab is showing, or a card is open over it). */
  stop(): void {
    this.running = false;
    this.halt();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Draw the village as a close-up at the one scale (`pickScale`: a whole number of device pixels per scene pixel, so it stays sharp at any pixel ratio), the
   *  plaza's column in the middle of the frame and the back corner tower just under the top; the wall runs off both sides of the screen. The canvas is exactly the
   *  frame (no scrolling): a taller phone shows more of the front lawn, a narrower one crops the outer edges. */
  private fit(): void {
    const h = this.root.clientHeight;
    const w = this.root.clientWidth;
    if (!h || !art) return;
    const lay = layoutFor();
    const dpr = window.devicePixelRatio || 1;
    const { k, css, w: vw, h: vh, ox, oy } = viewFor(lay, w, h, dpr);
    if (lay === this.lay && k === this.scale && css === this.css && this.still && this.view.w === vw && this.view.h === vh && this.view.ox === ox && this.view.oy === oy) return;
    const changed = lay !== this.lay;
    this.lay = lay;
    this.scale = k;
    this.css = css;
    // (the backing store is in device pixels, k to a scene pixel; its css size is that over the pixel ratio, so one scene pixel is k whole device pixels)
    this.view = { w: vw, h: vh, ox, oy };
    this.canvas.width = vw * k;
    this.canvas.height = vh * k;
    for (const e of [this.canvas, this.stage]) {
      e.style.width = `${vw * css}px`;
      e.style.height = `${vh * css}px`;
    }
    this.ctx.imageSmoothingEnabled = false;
    // (heroes stroll the road only as far down as the picture shows)
    this.tiles = walkTiles(lay).filter((t) => cellY(lay.grid, t.u, t.v) + oy < vh - 20);
    this.still = this.paintStill(art, k);
    this.glow = this.paintGlow(k);
    // (the heroes go back onto the new arrangement's road when it changes)
    if (changed)
      for (const wk of this.walkers.values()) {
        this.putOnRoad(wk);
      }
    this.layTags();
    this.scroll.scrollTop = 0;
  }

  /** The part that never changes: the ground (a lattice of grass tiles, cobbles where the roads and plaza are) with a few flowers laid by a fixed pattern. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const { grid } = this.lay;
    const { w, h, ox, oy } = this.view;
    const c = el('canvas');
    c.width = w * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = GRASS;
    g.fillRect(0, 0, c.width, c.height);
    // (from here on the village's own coordinates)
    g.translate(ox * s, oy * s);
    const draw = (im: HTMLImageElement, x: number, y: number, mirror = false): void => {
      if (mirror) {
        g.save();
        g.translate(x + im.width * s, y);
        g.scale(-1, 1);
        g.drawImage(im, 0, 0, im.width * s, im.height * s);
        g.restore();
      } else g.drawImage(im, x, y, im.width * s, im.height * s);
    };
    // (rows of tiles from the back to the front, each row half a tile along from the last, so a tile's rim is covered by the row in front)
    const rows0 = Math.floor((-oy - grid.y) / (TILE_H / 2)) - 2;
    const rows1 = Math.ceil((h - oy - grid.y) / (TILE_H / 2)) + 2;
    const first = Math.floor((-ox - grid.x) / (TILE_W / 2)) - 2;
    const decor: { x: number; y: number; im: HTMLImageElement; mirror: boolean }[] = [];
    for (let r = rows0; r <= rows1; r++) {
      const cy = grid.y + r * (TILE_H / 2);
      for (let k = first; (k * TILE_W) / 2 + grid.x < w - ox + TILE_W; k++) {
        if ((k - r) % 2 !== 0) continue;
        const cx = grid.x + (k * TILE_W) / 2;
        const u = (r + k) / 2;
        const v = (r - k) / 2;
        const paving = pavingAt(this.lay, u, v);
        const tile = paving ? a[paving] : a.grass_tile;
        // (every other grass tile is mirrored, so the lawn does not show its repeat)
        draw(tile, Math.round(cx - tile.width / 2) * s, (cy - TILE_H / 2) * s, tile === a.grass_tile && (r * 7 + k * 3) % 5 < 2);
        const d = decorAt(this.lay, u, v);
        if (d) {
          const im = a[d.sprite];
          decor.push({ x: Math.round(cx - im.width / 2) * s, y: (cy + TILE_H / 2 - im.height) * s, im, mirror: d.mirror });
        }
      }
    }
    for (const d of decor) draw(d.im, d.x, d.y, d.mirror);
    return c;
  }

  /** A soft round glow, white, tinted per use. */
  private paintGlow(s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = 64 * s;
    c.height = 64 * s;
    const g = c.getContext('2d')!;
    const rg = g.createRadialGradient(32 * s, 32 * s, 0, 32 * s, 32 * s, 32 * s);
    rg.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    rg.addColorStop(0.35, 'rgba(255, 255, 255, 0.35)');
    rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, c.width, c.height);
    this.tints.clear();
    return c;
  }

  /** Place the name tags over their buildings (percentages of the scene, so they follow its scale). */
  private layTags(): void {
    for (const id of PLOT_IDS) {
      const tag = this.tagEls.get(id)!;
      const p = this.lay.plots[id];
      const box = lookBox(lookFor(id, this.stageNow(id)), p.flip);
      tag.style.left = `${((this.view.ox + p.x + (box.x0 + box.x1) / 2 + (p.tagDx ?? 0)) / this.view.w) * 100}%`;
      tag.style.top = `${((this.view.oy + (p.tagY ?? p.y - box.h - 4)) / this.view.h) * 100}%`;
      // (a signpost below the bottom of a short screen has no tag to tap)
      tag.hidden = this.view.oy + p.y > this.view.h - 6;
    }
  }

  // ---- behaviour ----

  private think(w: Walker, now: number): void {
    if (w.mood !== 'idle' || now < w.at) return;
    const roll = Math.random();
    if (roll < 0.3) w.face = w.face === 1 ? -1 : 1;
    else if (!this.reduced && roll < 0.95) {
      const to = this.tiles[Math.floor(Math.random() * this.tiles.length)];
      w.route = this.route(w.tile, to);
      if (w.route.length) {
        this.nextStop(w);
        w.mood = 'walk';
      }
    }
    w.at = now + rand(1500, 5000);
  }

  /** The tiles a hero may stroll on (the plaza's ring and the roads), for the arrangement showing. */
  private tiles: { u: number; v: number }[] = walkTiles(YARD);

  /** Stand a hero on a random paved tile. */
  private putOnRoad(w: Walker): void {
    const t = this.tiles[Math.floor(Math.random() * this.tiles.length)] ?? { u: 0, v: 0 };
    w.tile = t;
    w.x = w.gx = cellX(this.lay.grid, t.u, t.v);
    w.y = w.gy = cellY(this.lay.grid, t.u, t.v) + 6;
    w.route = [];
    w.mood = 'idle';
  }

  /** The shortest way along the paved tiles from one to another, not counting the start. */
  private route(from: { u: number; v: number }, to: { u: number; v: number }): { u: number; v: number }[] {
    const key = (t: { u: number; v: number }) => `${t.u},${t.v}`;
    const ok = new Set(this.tiles.map(key));
    const prev = new Map<string, { u: number; v: number } | null>([[key(from), null]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      if (t.u === to.u && t.v === to.v) break;
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { u: t.u + du, v: t.v + dv };
        if (ok.has(key(n)) && !prev.has(key(n))) {
          prev.set(key(n), t);
          queue.push(n);
        }
      }
    }
    if (!prev.has(key(to))) return [];
    const path: { u: number; v: number }[] = [];
    for (let t: { u: number; v: number } | null | undefined = to; t && key(t) !== key(from); t = prev.get(key(t))) path.unshift(t);
    return path;
  }

  /** Aim at the next tile of a hero's route. */
  private nextStop(w: Walker): void {
    const t = w.route.shift()!;
    w.tile = t;
    w.gx = cellX(this.lay.grid, t.u, t.v);
    w.gy = cellY(this.lay.grid, t.u, t.v) + 6;
    if (Math.abs(w.gx - w.x) > 2) w.face = w.gx > w.x ? 1 : -1;
  }

  private step(w: Walker, dt: number, now: number): void {
    w.clock += dt;
    if (w.mood !== 'walk') return;
    const dx = w.gx - w.x;
    const dy = w.gy - w.y;
    const dist = Math.hypot(dx, dy);
    const move = 16 * (dt / 1000);
    if (dist <= move) {
      w.x = w.gx;
      w.y = w.gy;
      if (w.route.length) this.nextStop(w);
      else {
        w.mood = 'idle';
        w.at = now + rand(1200, 4000);
      }
    } else {
      w.x += (dx / dist) * move;
      w.y += (dy / dist) * move;
      if (Math.abs(dx) > 2) w.face = dx > 0 ? 1 : -1;
    }
  }

  /** A bunch of motes at a building: dust round its foot, the build's puffs, or sparkles. */
  private burst(id: BuildingId, kind: 'dust' | 'spark', n: number): void {
    const p = this.lay.plots[id];
    const wide = 34;
    for (let i = 0; i < n; i++) {
      if (kind === 'dust') this.motes.push({ x: p.x + rand(-wide, wide), y: p.y - rand(0, 6), vx: rand(-14, 14), vy: rand(-18, -4), age: 0, life: rand(600, 1100), size: rand(2, 4), color: chance(0.5) ? '#d8c29a' : '#a58a62', grow: 5, kind });
      else this.motes.push({ x: p.x + rand(-wide, wide), y: p.y - rand(10, 70), vx: rand(-6, 6), vy: rand(-22, -6), age: 0, life: rand(700, 1300), size: 2, color: chance(0.5) ? '#ffe48a' : '#ffffff', grow: 0, kind });
    }
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    for (const w of this.walkers.values()) {
      this.think(w, this.now);
      this.step(w, dt, this.now);
    }
    this.builds = this.builds.filter((b) => this.now - b.start < BUILD_MS);
    if (!this.reduced) this.emit();
    for (const m of this.motes) {
      m.age += dt;
      m.x += (m.vx * dt) / 1000;
      m.y += (m.vy * dt) / 1000;
      if (m.kind === 'smoke') m.vx += (dt / 1000) * 0.8;
      if (m.kind === 'spark') m.vy += (dt / 1000) * 30;
    }
    this.motes = this.motes.filter((m) => m.age < m.life);
    this.draw();
  }

  /** The steady life: chimney smoke, sparks at the forge, runes round the tower and glints on the gold. */
  private emit(): void {
    if (this.motes.length > 160) return;
    const puff = this.now >= this.nextSmoke;
    if (puff) this.nextSmoke = this.now + rand(260, 460);
    const spark = this.now >= this.nextSpark;
    if (spark) this.nextSpark = this.now + rand(140, 320);
    const glint = this.now >= this.nextGlint;
    if (glint) this.nextGlint = this.now + rand(350, 800);
    for (const id of PLOT_IDS) {
      const p = this.lay.plots[id];
      for (const v of isPlace(id) ? PLACE_VENTS[id] : VENTS[id][this.shown(id)] ?? []) {
        const x = p.x + (p.flip ? -v.dx : v.dx);
        const y = p.y + v.dy;
        if (v.kind === 'smoke' && puff) this.motes.push({ x, y, vx: rand(-1, 3), vy: rand(-14, -8), age: 0, life: rand(2000, 3000), size: 3, color: '#d8d4cc', grow: 3, kind: 'smoke' });
        else if (v.kind === 'rune' && puff && chance(0.7)) this.motes.push({ x: x + rand(-14, 14), y: y + rand(-26, 26), vx: rand(-2, 2), vy: rand(-9, -4), age: 0, life: rand(1400, 2400), size: 2, color: chance(0.5) ? '#7fe8ff' : '#c9a6ff', grow: 0, kind: 'rune' });
        else if (v.kind === 'spark' && spark && chance(0.6)) this.motes.push({ x: x + rand(-3, 3), y, vx: rand(-14, 14), vy: rand(-34, -14), age: 0, life: rand(350, 700), size: 1, color: chance(0.5) ? '#ffb347' : '#fff0b0', grow: 0, kind: 'spark' });
        else if (v.kind === 'glint' && glint && chance(0.35)) this.motes.push({ x: x + rand(-5, 5), y: y + rand(-4, 4), vx: 0, vy: 0, age: 0, life: 380, size: 3, color: '#fff6c0', grow: 0, kind: 'glint' });
      }
    }
  }

  /** The look a building shows now (while it is being built, the old one until the swap). */
  private shown(id: PlotId): number {
    if (isPlace(id)) return 0;
    const b = this.builds.find((x) => x.id === id);
    if (b) return this.now - b.start < SWAP_MS ? b.from : b.to;
    return this.stageNow(id);
  }

  /** The look a plot has at its level (a place has only one). */
  private stageNow(id: PlotId): number {
    return isPlace(id) ? 0 : stageOf(id, this.levels[id] ?? 0);
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    g.globalAlpha = 1;
    g.drawImage(this.still, 0, 0);
    g.save();
    g.translate(this.view.ox * s, this.view.oy * s);
    const list: { depth: number; paint: () => void }[] = [];
    const wallsOnly = (window as unknown as { __castleWallsOnly?: boolean }).__castleWallsOnly === true;
    for (const p of this.lay.props) {
      if (wallsOnly && p.sprite !== 'wall' && p.sprite !== 'watchtower') continue;
      const im = a[p.sprite];
      const x = Math.round(p.x - im.width / 2) * s;
      const y = (p.y - im.height) * s;
      const paint = () => {
        g.save();
        // (the last cell of a wall run is cut where its tower covers it: only the columns of the picture as drawn from `cut[0]` to `cut[1]` show)
        if (p.cut) {
          g.beginPath();
          g.rect(x + p.cut[0] * s, y, (p.cut[1] - p.cut[0]) * s, im.height * s);
          g.clip();
        }
        if (p.flip) {
          g.translate(x + im.width * s, 0);
          g.scale(-1, 1);
          g.drawImage(im, 0, y, im.width * s, im.height * s);
        } else g.drawImage(im, x, y, im.width * s, im.height * s);
        g.restore();
      };
      list.push({ depth: p.depth ?? p.y, paint });
    }
    if (!wallsOnly) for (const id of PLOT_IDS) list.push({ depth: this.lay.plots[id].y, paint: () => this.building(a, id) });
    if (!wallsOnly) for (const w of this.walkers.values()) list.push({ depth: w.y, paint: () => this.hero(w) });
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    this.flags();
    this.glows();
    this.motesDraw();
    g.restore();
  }

  private drawLook(a: Record<string, HTMLImageElement>, id: PlotId, look: Look, lift = 0): void {
    const g = this.ctx;
    const s = this.scale;
    const p = this.lay.plots[id];
    for (const part of look.parts) {
      const im = a[part.sprite];
      const x = Math.round(p.x + (p.flip ? -part.dx : part.dx) - im.width / 2) * s;
      if (p.flip) {
        g.save();
        g.translate(x + im.width * s, 0);
        g.scale(-1, 1);
        g.drawImage(im, 0, (p.y + part.dy - im.height + lift) * s, im.width * s, im.height * s);
        g.restore();
      } else g.drawImage(im, x, (p.y + part.dy - im.height + lift) * s, im.width * s, im.height * s);
    }
  }

  private building(a: Record<string, HTMLImageElement>, id: PlotId): void {
    const stage = this.shown(id);
    const b = isPlace(id) ? undefined : this.builds.find((x) => x.id === id);
    const age = b ? this.now - b.start : BUILD_MS;
    // (a look that has just arrived settles three pixels, and the scaffolding comes down)
    const pop = b && age >= SWAP_MS && age < SWAP_MS + 180 ? Math.round((1 - (age - SWAP_MS) / 180) * 3) : 0;
    this.drawLook(a, id, lookFor(id, stage), pop);
    if (b && !isPlace(id) && age < SWAP_MS + 300) {
      const o = lookBox(LOOKS[id][b.from], this.lay.plots[id].flip);
      const n = lookBox(LOOKS[id][b.to], this.lay.plots[id].flip);
      this.scaffold(id, Math.min(o.x0, n.x0), Math.max(o.x1, n.x1), Math.max(o.h, n.h), age < SWAP_MS ? 1 : 1 - (age - SWAP_MS) / 300);
    }
  }

  /** Poles and planks round the footprint; they shrink away as the build finishes. */
  private scaffold(id: BuildingId, x0: number, x1: number, h: number, grow: number): void {
    const g = this.ctx;
    const s = this.scale;
    const p = this.lay.plots[id];
    const top = p.y - Math.round(h * grow) - 3;
    const left = Math.round(p.x + x0) - 3;
    const right = Math.round(p.x + x1) + 1;
    g.fillStyle = '#4a2c14';
    for (const x of [left, right]) g.fillRect(x * s, top * s, 2 * s, (p.y - top) * s);
    g.fillStyle = '#b8863c';
    for (let y = p.y - 14; y > top; y -= 16) g.fillRect(left * s, y * s, (right - left + 2) * s, 2 * s);
    g.fillStyle = '#6b4128';
    for (let y = p.y - 14; y > top + 14; y -= 16) {
      g.fillRect((left + 2) * s, (y - 14) * s, s, 14 * s);
      g.fillRect((right - 1) * s, (y - 14) * s, s, 14 * s);
    }
  }

  /** Pennants on poles at the gate; the cloth ripples one pixel at a time. */
  private flags(): void {
    const g = this.ctx;
    const s = this.scale;
    for (const { x: px, y: py, dir } of this.lay.flags) {
      g.fillStyle = '#2a1a0e';
      g.fillRect(px * s, (py - 16) * s, s, 17 * s);
      g.fillStyle = '#f0b44a';
      g.fillRect((px - 1) * s, (py - 17) * s, 3 * s, s);
      for (let i = 0; i < 12; i++) {
        const wave = this.reduced ? 0 : Math.round(Math.sin(this.now / 180 + i * 0.6) * (0.4 + i * 0.12));
        const hgt = Math.max(2, Math.round(6 * (1 - (i / 12) * 0.7)));
        const x = px + dir * (1 + i);
        g.fillStyle = '#c8302a';
        g.fillRect(x * s - (dir === -1 ? s : 0), (py - 16 + wave) * s, s, hgt * s);
        g.fillStyle = '#f0b44a';
        g.fillRect(x * s - (dir === -1 ? s : 0), (py - 16 + wave) * s, s, s);
      }
    }
  }

  /** The tower's window light, the forge's glow, the gold's shine and the lanterns, pulsing, added over the picture. */
  private glows(): void {
    const g = this.ctx;
    const s = this.scale;
    if (!this.glow) return;
    g.globalCompositeOperation = 'lighter';
    const pulse = this.reduced ? 0.6 : 0.55 + 0.25 * Math.sin(this.now / 480) + 0.08 * Math.sin(this.now / 130);
    const spot = (cx: number, cy: number, size: number, al: number, tint: string) => {
      g.globalAlpha = Math.max(0, Math.min(1, al * pulse));
      g.drawImage(this.tinted(tint), (cx - size / 2) * s, (cy - size / 2) * s, size * s, size * s);
    };
    for (const id of PLOT_IDS) {
      const p = this.lay.plots[id];
      const stage = this.shown(id);
      for (const l of isPlace(id) ? [] : LIGHTS[id][stage] ?? []) spot(p.x + (p.flip ? -l.dx : l.dx), p.y + l.dy, l.size, l.al, l.tint);
      for (const part of lookFor(id, stage).parts) {
        const glow = GLOWING[part.sprite];
        if (glow) spot(p.x + (p.flip ? -part.dx : part.dx) + glow.dx, p.y + part.dy + glow.dy, glow.size, glow.al, glow.tint);
      }
    }
    for (const pr of this.lay.props) {
      const glow = GLOWING[pr.sprite];
      if (glow) spot(pr.x + glow.dx, pr.y + glow.dy, glow.size, glow.al, glow.tint);
    }
    // (a build in progress gives a warm flash as the new look arrives)
    for (const b of this.builds) {
      const age = this.now - b.start;
      if (age > SWAP_MS - 100 && age < SWAP_MS + 450) {
        const box = lookBox(LOOKS[b.id][b.to], this.lay.plots[b.id].flip);
        const p = this.lay.plots[b.id];
        const sz = Math.max(box.w, box.h) + 30;
        g.globalAlpha = 0.65 * (1 - (age - SWAP_MS + 100) / 550);
        g.drawImage(this.tinted('#fff0b0'), (p.x + (box.x0 + box.x1) / 2 - sz / 2) * s, (p.y - box.h / 2 - sz / 2) * s, sz * s, sz * s);
      }
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  private tints = new Map<string, HTMLCanvasElement>();
  /** The glow in a colour (made once per colour and scale). */
  private tinted(color: string): HTMLCanvasElement {
    const key = `${color}|${this.scale}`;
    let c = this.tints.get(key);
    if (!c) {
      c = el('canvas');
      c.width = this.glow!.width;
      c.height = this.glow!.height;
      const g = c.getContext('2d')!;
      g.drawImage(this.glow!, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      this.tints.set(key, c);
    }
    return c;
  }

  private motesDraw(): void {
    const g = this.ctx;
    const s = this.scale;
    for (const m of this.motes) {
      const t = m.age / m.life;
      if (m.kind === 'glint') {
        // (a little cross that twinkles)
        g.globalAlpha = 1 - t;
        g.fillStyle = m.color;
        const x = Math.round(m.x);
        const y = Math.round(m.y);
        const r = t < 0.5 ? 2 : 1;
        g.fillRect((x - r) * s, y * s, (2 * r + 1) * s, s);
        g.fillRect(x * s, (y - r) * s, s, (2 * r + 1) * s);
        continue;
      }
      g.globalAlpha = m.kind === 'smoke' ? 0.75 * (1 - t) : m.kind === 'rune' ? 0.9 * (1 - t) * (0.6 + 0.4 * Math.sin(m.age / 90)) : 0.85 * (1 - t);
      g.fillStyle = m.color;
      const size = Math.max(1, Math.round(m.size + m.grow * t));
      g.fillRect(Math.round(m.x - size / 2) * s, Math.round(m.y - size / 2) * s, size * s, size * s);
    }
    g.globalAlpha = 1;
  }

  private hero(w: Walker): void {
    const g = this.ctx;
    const s = this.scale;
    const sm = w.small;
    const walking = w.mood === 'walk';
    const n = walking ? sm.walk : sm.idle;
    const i = Math.floor((w.clock + w.phase * 977) / (walking ? 100 : 160)) % n;
    const fx = Math.round(w.x);
    const fy = Math.round(w.y);
    g.fillStyle = 'rgba(30, 50, 10, 0.35)';
    const sw = Math.max(5, Math.round(sm.fw * 0.18));
    g.fillRect((fx - sw) * s, (fy - 1) * s, sw * 2 * s, 2 * s);
    const flip = (w.face === 1) !== sm.facesRight;
    const dy = (fy - sm.fh + 1) * s;
    if (flip) {
      g.save();
      g.translate(fx * s, 0);
      g.scale(-1, 1);
      g.drawImage(sm.c, i * sm.fw, (walking ? 1 : 0) * sm.fh, sm.fw, sm.fh, (-sm.fw * s) / 2, dy, sm.fw * s, sm.fh * s);
      g.restore();
    } else g.drawImage(sm.c, i * sm.fw, (walking ? 1 : 0) * sm.fh, sm.fw, sm.fh, fx * s - (sm.fw * s) / 2, dy, sm.fw * s, sm.fh * s);
  }

  // ---- tapping ----

  /** A tap on a building opens it; false when it fell on empty ground. */
  private tap(e: PointerEvent): boolean {
    const box = this.canvas.getBoundingClientRect();
    const rx = ((e.clientX - box.left) / box.width) * this.view.w - this.view.ox;
    const ry = ((e.clientY - box.top) / box.height) * this.view.h - this.view.oy;
    let best: { id: PlotId; depth: number } | null = null;
    for (const id of PLOT_IDS) {
      const p = this.lay.plots[id];
      const b = lookBox(lookFor(id, this.stageNow(id)), p.flip);
      // (an empty plot is small to hit, so every building has at least a generous patch of ground)
      const cx = p.x + (b.x0 + b.x1) / 2;
      const half = Math.max(b.w / 2, 24, 22 / this.css);
      const tall = Math.max(b.h, 36, 40 / this.css);
      if (rx < cx - half || rx > cx + half || ry < p.y - tall || ry > p.y + 6) continue;
      if (!best || p.y > best.depth) best = { id, depth: p.y };
    }
    if (best) this.onPick(best.id);
    return !!best;
  }
}

