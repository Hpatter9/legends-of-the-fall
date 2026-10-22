// The Castle tab's picture: a village courtyard seen from slightly above, drawn with Chronos's village art (flat-colour pixel houses, tents,
// props, palisade and cobbles) in the scene's own pixels, whole-number times bigger. A cobbled road leads from the palisade gate to a plaza with a
// well; each upgrade is a building on its own plot that grows through four looks (castleSpots.ts): an empty plot, a small, a bigger and a grand
// one. Flags wave at the gate, chimneys smoke, sparks fly at the forge, the tower's windows glow and shed runes, the gold glints, and a few of
// your heroes (their sheets shrunk by a whole number so they stand a little taller than a door) stroll the road. Tapping a building (or its name tag)
// opens its upgrade card; a level bought plays a short build: scaffolding and dust, the new look with a flash, then sparkles. One canvas, drawn
// with nearest neighbour and panned by native scroll when the screen is smaller than the scene. It only draws (Math.random is fine here:
// nothing that is played depends on it) and runs only while the tab shows.

import { BUILDING_IDS, maxLevel, nextCost, type BuildingId } from './sim/castle';
import { formOf, UNITS } from './sim/units';
import { rankOf, type Meta } from './sim/meta';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { gradeOfRank } from './render/tavernSpots';
import { strongest } from './menuHeroes';
import { GRASS, layoutFor, LIGHTS, LOOKS, lookBox, NAME_OF, stageOf, VENTS, WIDE, type Layout, type Look } from './render/castleSpots';
import anvilUrl from './art/castle/anvil.png';
import barrelUrl from './art/castle/barrel.png';
import box1Url from './art/castle/box1.png';
import box2Url from './art/castle/box2.png';
import bush1Url from './art/castle/bush1.png';
import bush2Url from './art/castle/bush2.png';
import camp3Url from './art/castle/camp3.png';
import cartUrl from './art/castle/cart.png';
import chest_goldUrl from './art/castle/chest_gold.png';
import cobbleUrl from './art/castle/cobble.png';
import crateUrl from './art/castle/crate.png';
import crate_stackUrl from './art/castle/crate_stack.png';
import crates_tallUrl from './art/castle/crates_tall.png';
import fenceUrl from './art/castle/fence.png';
import flower1Url from './art/castle/flower1.png';
import flower3Url from './art/castle/flower3.png';
import flower5Url from './art/castle/flower5.png';
import gateUrl from './art/castle/gate.png';
import gb_barrelsUrl from './art/castle/gb_barrels.png';
import gb_canopyUrl from './art/castle/gb_canopy.png';
import gb_cratesUrl from './art/castle/gb_crates.png';
import gb_houseUrl from './art/castle/gb_house.png';
import gb_sacksUrl from './art/castle/gb_sacks.png';
import gb_shopUrl from './art/castle/gb_shop.png';
import gb_signpostUrl from './art/castle/gb_signpost.png';
import gold1Url from './art/castle/gold1.png';
import gold2Url from './art/castle/gold2.png';
import house1Url from './art/castle/house1.png';
import house2Url from './art/castle/house2.png';
import house4Url from './art/castle/house4.png';
import lanternUrl from './art/castle/lantern.png';
import logUrl from './art/castle/log.png';
import palisadeUrl from './art/castle/palisade.png';
import palisade2Url from './art/castle/palisade2.png';
import pebble1Url from './art/castle/pebble1.png';
import pebble3Url from './art/castle/pebble3.png';
import pebble5Url from './art/castle/pebble5.png';
import planksUrl from './art/castle/planks.png';
import rackUrl from './art/castle/rack.png';
import sign_swordUrl from './art/castle/sign_sword.png';
import tower1Url from './art/castle/tower1.png';
import tower2Url from './art/castle/tower2.png';
import tower3Url from './art/castle/tower3.png';
import tree1Url from './art/castle/tree1.png';
import tree2Url from './art/castle/tree2.png';
import tt_gableUrl from './art/castle/tt_gable.png';
import tt_longUrl from './art/castle/tt_long.png';
import tuft1Url from './art/castle/tuft1.png';
import tuft2Url from './art/castle/tuft2.png';
import tuft3Url from './art/castle/tuft3.png';
import wellUrl from './art/castle/well.png';
import yurt1Url from './art/castle/yurt1.png';
import yurt2Url from './art/castle/yurt2.png';

const ART: Record<string, string> = {
  anvil: anvilUrl,
  barrel: barrelUrl,
  box1: box1Url,
  box2: box2Url,
  bush1: bush1Url,
  bush2: bush2Url,
  camp3: camp3Url,
  cart: cartUrl,
  chest_gold: chest_goldUrl,
  cobble: cobbleUrl,
  crate: crateUrl,
  crate_stack: crate_stackUrl,
  crates_tall: crates_tallUrl,
  fence: fenceUrl,
  flower1: flower1Url,
  flower3: flower3Url,
  flower5: flower5Url,
  gate: gateUrl,
  gb_barrels: gb_barrelsUrl,
  gb_canopy: gb_canopyUrl,
  gb_crates: gb_cratesUrl,
  gb_house: gb_houseUrl,
  gb_sacks: gb_sacksUrl,
  gb_shop: gb_shopUrl,
  gb_signpost: gb_signpostUrl,
  gold1: gold1Url,
  gold2: gold2Url,
  house1: house1Url,
  house2: house2Url,
  house4: house4Url,
  lantern: lanternUrl,
  log: logUrl,
  palisade: palisadeUrl,
  palisade2: palisade2Url,
  pebble1: pebble1Url,
  pebble3: pebble3Url,
  pebble5: pebble5Url,
  planks: planksUrl,
  rack: rackUrl,
  sign_sword: sign_swordUrl,
  tower1: tower1Url,
  tower2: tower2Url,
  tower3: tower3Url,
  tree1: tree1Url,
  tree2: tree2Url,
  tt_gable: tt_gableUrl,
  tt_long: tt_longUrl,
  tuft1: tuft1Url,
  tuft2: tuft2Url,
  tuft3: tuft3Url,
  well: wellUrl,
  yurt1: yurt1Url,
  yurt2: yurt2Url,
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

function shrinkRig(rig: Rig): Small {
  const n = Math.max(2, Math.round(rig.figure / 24));
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
  gx: number;
  gy: number;
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
  private tagEls = new Map<BuildingId, HTMLButtonElement>();
  private scale = 1;
  private lay: Layout = WIDE;
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

  constructor(private onPick: (id: BuildingId) => void) {
    this.stage.append(this.canvas, this.tags);
    this.scroll.append(this.stage);
    this.root.append(this.scroll);
    this.ctx.imageSmoothingEnabled = false;
    for (const id of BUILDING_IDS) {
      const b = el('button', 'ctTag');
      b.addEventListener('click', () => this.onPick(id));
      this.tags.append(b);
      this.tagEls.set(id, b);
    }
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
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
      tag.replaceChildren(el('b', '', NAME_OF(id)), el('span', '', level === 0 ? 'not built' : `level ${level}/${maxLevel(id)}`));
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
        if (w.small.facesRight !== rig.facesRight || w.small.fh !== Math.floor(rig.h / Math.max(2, Math.round(rig.figure / 24)))) w.small = shrinkRig(rig);
        return;
      }
      const x = rand(this.lay.walk.x0, this.lay.walk.x1);
      const y = rand(this.lay.walk.y0, this.lay.walk.y1);
      this.walkers.set(kind, { kind, small: shrinkRig(rig), x, y, gx: x, gy: y, face: chance(0.5) ? 1 : -1, mood: 'idle', at: this.now + 300 * i + rand(300, 2500), clock: rand(0, 3000), phase: rand(0, 6) });
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

  /** Pick the arrangement and the whole-number scale (the yard bigger on a big screen); on a small one it pans inside its frame. */
  private fit(): void {
    const h = this.root.clientHeight;
    const w = this.root.clientWidth;
    if (!h || !art) return;
    const lay = layoutFor(w < h);
    const s = Math.max(1, Math.min(4, Math.floor(Math.min(w / lay.w, h / lay.h))));
    if (lay === this.lay && s === this.scale && this.still && this.canvas.width === lay.w * s) return;
    const changed = lay !== this.lay;
    this.lay = lay;
    this.scale = s;
    this.canvas.width = lay.w * s;
    this.canvas.height = lay.h * s;
    for (const e of [this.canvas, this.stage]) {
      e.style.width = `${lay.w * s}px`;
      e.style.height = `${lay.h * s}px`;
    }
    this.ctx.imageSmoothingEnabled = false;
    this.still = this.paintStill(art, s);
    this.glow = this.paintGlow(s);
    // (the heroes go back onto the new arrangement's road when it changes)
    if (changed)
      for (const wk of this.walkers.values()) {
        wk.x = wk.gx = rand(lay.walk.x0, lay.walk.x1);
        wk.y = wk.gy = rand(lay.walk.y0, lay.walk.y1);
        wk.mood = 'idle';
      }
    this.layTags();
    requestAnimationFrame(() => {
      this.scroll.scrollLeft = (this.scroll.scrollWidth - this.scroll.clientWidth) / 2;
      this.scroll.scrollTop = Math.max(0, lay.openTop * s);
    });
  }

  /** The part that never changes: flat grass with its tufts and flowers, the cobbled road and plaza, the palisade with its gate. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const { w, h } = this.lay;
    const c = el('canvas');
    c.width = w * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = GRASS;
    g.fillRect(0, 0, c.width, c.height);
    // (tufts and flowers laid by a fixed pattern, so the yard looks the same every time)
    let seed = w * 31 + h;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const bits = ['tuft1', 'tuft2', 'tuft3', 'flower1', 'flower3', 'flower5', 'tuft2', 'tuft3'];
    for (let i = 0; i < Math.round((w * h) / 2600); i++) {
      const im = a[bits[Math.floor(next() * bits.length)]];
      g.drawImage(im, Math.floor(next() * (w - im.width)) * s, Math.floor((this.lay.wallY + 40 + next() * (h - this.lay.wallY - 50)) * s), im.width * s, im.height * s);
    }
    // (the road: the cobble sheet's inner tile, with a dark edge)
    const cob = a.cobble;
    for (const { x0, y0, x1, y1 } of this.lay.roads) {
      for (let x = x0; x < x1; x += 16) for (let y = y0; y < y1; y += 16) g.drawImage(cob, 0, 0, Math.min(16, x1 - x), Math.min(16, y1 - y), x * s, y * s, Math.min(16, x1 - x) * s, Math.min(16, y1 - y) * s);
    }
    g.fillStyle = 'rgba(30, 44, 74, 0.9)';
    for (const { x0, y0, x1, y1 } of this.lay.roads) {
      g.fillRect(x0 * s, y0 * s, s, (y1 - y0) * s);
      g.fillRect((x1 - 1) * s, y0 * s, s, (y1 - y0) * s);
    }
    // (the palisade runs across the top, with the gate in the middle)
    const pal = [a.palisade, a.palisade2];
    for (let x = 0, i = 0; x < w; x += 32, i++) g.drawImage(pal[i % 2 && i % 3 ? 1 : 0], x * s, this.lay.wallY * s, 32 * s, 32 * s);
    for (const dx of [-48, -16, 16]) g.drawImage(a.gate, (this.lay.gateX + dx) * s, this.lay.wallY * s, 32 * s, 32 * s);
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
    for (const id of BUILDING_IDS) {
      const tag = this.tagEls.get(id)!;
      const p = this.lay.plots[id];
      const box = lookBox(LOOKS[id][stageOf(id, this.levels[id] ?? 0)]);
      tag.style.left = `${((p.x + (box.x0 + box.x1) / 2) / this.lay.w) * 100}%`;
      tag.style.top = `${((p.y - box.h - 4) / this.lay.h) * 100}%`;
    }
  }

  // ---- behaviour ----

  private think(w: Walker, now: number): void {
    if (w.mood !== 'idle' || now < w.at) return;
    const roll = Math.random();
    if (roll < 0.3) w.face = w.face === 1 ? -1 : 1;
    else if (!this.reduced && roll < 0.95) {
      w.gx = rand(this.lay.walk.x0, this.lay.walk.x1);
      w.gy = rand(this.lay.walk.y0, this.lay.walk.y1);
      w.mood = 'walk';
      w.face = w.gx > w.x ? 1 : -1;
    }
    w.at = now + rand(1500, 5000);
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
      w.mood = 'idle';
      w.at = now + rand(1200, 4000);
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
    for (const id of BUILDING_IDS) {
      const p = this.lay.plots[id];
      for (const v of VENTS[id][this.shown(id)] ?? []) {
        const x = p.x + v.dx;
        const y = p.y + v.dy;
        if (v.kind === 'smoke' && puff) this.motes.push({ x, y, vx: rand(-1, 3), vy: rand(-14, -8), age: 0, life: rand(2000, 3000), size: 3, color: '#d8d4cc', grow: 3, kind: 'smoke' });
        else if (v.kind === 'rune' && puff && chance(0.7)) this.motes.push({ x: x + rand(-14, 14), y: y + rand(-26, 26), vx: rand(-2, 2), vy: rand(-9, -4), age: 0, life: rand(1400, 2400), size: 2, color: chance(0.5) ? '#7fe8ff' : '#c9a6ff', grow: 0, kind: 'rune' });
        else if (v.kind === 'spark' && spark && chance(0.6)) this.motes.push({ x: x + rand(-3, 3), y, vx: rand(-14, 14), vy: rand(-34, -14), age: 0, life: rand(350, 700), size: 1, color: chance(0.5) ? '#ffb347' : '#fff0b0', grow: 0, kind: 'spark' });
        else if (v.kind === 'glint' && glint && chance(0.35)) this.motes.push({ x: x + rand(-5, 5), y: y + rand(-4, 4), vx: 0, vy: 0, age: 0, life: 380, size: 3, color: '#fff6c0', grow: 0, kind: 'glint' });
      }
    }
  }

  /** The look a building shows now (while it is being built, the old one until the swap). */
  private shown(id: BuildingId): number {
    const b = this.builds.find((x) => x.id === id);
    if (b) return this.now - b.start < SWAP_MS ? b.from : b.to;
    return stageOf(id, this.levels[id] ?? 0);
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    g.globalAlpha = 1;
    g.drawImage(this.still, 0, 0);
    const list: { depth: number; paint: () => void }[] = [];
    for (const p of this.lay.props) {
      const im = a[p.sprite];
      list.push({ depth: p.y, paint: () => g.drawImage(im, Math.round(p.x - im.width / 2) * s, (p.y - im.height) * s, im.width * s, im.height * s) });
    }
    for (const id of BUILDING_IDS) list.push({ depth: this.lay.plots[id].y, paint: () => this.building(a, id) });
    for (const w of this.walkers.values()) list.push({ depth: w.y, paint: () => this.hero(w) });
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    this.flags();
    this.glows();
    this.motesDraw();
  }

  private drawLook(a: Record<string, HTMLImageElement>, id: BuildingId, look: Look, lift = 0): void {
    const g = this.ctx;
    const s = this.scale;
    const p = this.lay.plots[id];
    for (const part of look.parts) {
      const im = a[part.sprite];
      g.drawImage(im, Math.round(p.x + part.dx - im.width / 2) * s, (p.y + part.dy - im.height + lift) * s, im.width * s, im.height * s);
    }
  }

  private building(a: Record<string, HTMLImageElement>, id: BuildingId): void {
    const stage = this.shown(id);
    const b = this.builds.find((x) => x.id === id);
    const age = b ? this.now - b.start : BUILD_MS;
    // (a look that has just arrived settles three pixels, and the scaffolding comes down)
    const pop = b && age >= SWAP_MS && age < SWAP_MS + 180 ? Math.round((1 - (age - SWAP_MS) / 180) * 3) : 0;
    this.drawLook(a, id, LOOKS[id][stage], pop);
    if (b && age < SWAP_MS + 300) {
      const o = lookBox(LOOKS[id][b.from]);
      const n = lookBox(LOOKS[id][b.to]);
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
    for (const id of BUILDING_IDS) {
      const p = this.lay.plots[id];
      const stage = this.shown(id);
      for (const l of LIGHTS[id][stage] ?? []) spot(p.x + l.dx, p.y + l.dy, l.size, l.al, l.tint);
      for (const part of LOOKS[id][stage].parts) if (part.sprite === 'lantern') spot(p.x + part.dx, p.y + part.dy - 32, 22, 0.45, '#ffcf70');
    }
    for (const pr of this.lay.props) if (pr.sprite === 'lantern') spot(pr.x, pr.y - 32, 22, 0.45, '#ffcf70');
    // (a build in progress gives a warm flash as the new look arrives)
    for (const b of this.builds) {
      const age = this.now - b.start;
      if (age > SWAP_MS - 100 && age < SWAP_MS + 450) {
        const box = lookBox(LOOKS[b.id][b.to]);
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

  private tap(e: PointerEvent): void {
    const box = this.canvas.getBoundingClientRect();
    const rx = ((e.clientX - box.left) / box.width) * this.lay.w;
    const ry = ((e.clientY - box.top) / box.height) * this.lay.h;
    let best: { id: BuildingId; depth: number } | null = null;
    for (const id of BUILDING_IDS) {
      const p = this.lay.plots[id];
      const b = lookBox(LOOKS[id][stageOf(id, this.levels[id] ?? 0)]);
      // (an empty plot is small to hit, so every building has at least a generous patch of ground)
      const cx = p.x + (b.x0 + b.x1) / 2;
      const half = Math.max(b.w / 2, 24);
      const tall = Math.max(b.h, 36);
      if (rx < cx - half || rx > cx + half || ry < p.y - tall || ry > p.y + 6) continue;
      if (!best || p.y > best.depth) best = { id, depth: p.y };
    }
    if (best) this.onPick(best.id);
  }
}

