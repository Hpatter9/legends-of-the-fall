// The Castle tab's picture: a courtyard where every upgrade is a building that stands on its own plot and grows with its
// level (an empty plot, then a small, a bigger and a grand one: castleSpots.ts). Flags wave on the wall, the armoury's
// chimney smokes, the mage tower glows with runes, the treasury glints, and a few of your heroes stroll the yard. Tapping a
// building (or its name tag) opens its upgrade card; a level bought plays a short build: scaffolding, dust, then the new
// look and sparkles. One canvas in the scene's own pixels times a whole-number scale (nearest neighbour), panned by native
// scroll. It only draws (Math.random is fine here: nothing that is played depends on it) and runs only while the tab shows.

import { BUILDING_IDS, maxLevel, nextCost, type BuildingId } from './sim/castle';
import { formOf, UNITS } from './sim/units';
import { rankOf, type Meta } from './sim/meta';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { gradeOfRank } from './render/tavernSpots';
import { strongest } from './menuHeroes';
import { layoutFor, NAME_OF, spriteName, stageOf, VENTS, WIDE, type Layout } from './render/castleSpots';
import skyUrl from './art/castle/sky.png';
import hillsUrl from './art/castle/hills.png';
import wallUrl from './art/castle/wall.png';
import gateUrl from './art/castle/gate.png';
import grassUrl from './art/castle/grass.png';
import cobbleUrl from './art/castle/cobble.png';
import wellUrl from './art/castle/well.png';
import treeUrl from './art/castle/tree.png';
import cratesUrl from './art/castle/crates.png';

const ART: Record<string, string> = { sky: skyUrl, hills: hillsUrl, wall: wallUrl, gate: gateUrl, grass: grassUrl, cobble: cobbleUrl, well: wellUrl, tree: treeUrl, crates: cratesUrl };
import t0 from './art/castle/treasury0.png';
import t1 from './art/castle/treasury1.png';
import t2 from './art/castle/treasury2.png';
import t3 from './art/castle/treasury3.png';
import b0 from './art/castle/barracks0.png';
import b1 from './art/castle/barracks1.png';
import b2 from './art/castle/barracks2.png';
import b3 from './art/castle/barracks3.png';
import a0 from './art/castle/armoury0.png';
import a1 from './art/castle/armoury1.png';
import a2 from './art/castle/armoury2.png';
import a3 from './art/castle/armoury3.png';
import m0 from './art/castle/mageTower0.png';
import m1 from './art/castle/mageTower1.png';
import m2 from './art/castle/mageTower2.png';
import m3 from './art/castle/mageTower3.png';

const LOOKS: Record<BuildingId, string[]> = { treasury: [t0, t1, t2, t3], barracks: [b0, b1, b2, b3], armoury: [a0, a1, a2, a3], mageTower: [m0, m1, m2, m3] };
for (const id of BUILDING_IDS) LOOKS[id].forEach((u, stage) => (ART[spriteName(id, stage)] = u));

/** The picture of a building at a level (for its upgrade card). */
export const lookUrl = (id: BuildingId, level: number): string => LOOKS[id][stageOf(id, level)];

let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
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

type Mood = 'idle' | 'walk';

interface Walker {
  kind: string;
  rig: Rig;
  /** Scene pixels per sheet pixel. */
  k: number;
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
  kind: 'dust' | 'smoke' | 'spark' | 'rune';
}

/** A level just bought: the old look shows behind scaffolding until `swapAt`, then the new look and sparkles. */
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
  private scale = 2;
  private lay: Layout = WIDE;
  private raf = 0;
  private last = 0;
  private now = 0;
  private nextSmoke = 0;
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
    // heroes: the strongest few that are unlocked stroll the yard
    const want = strongest(meta, 5);
    for (const k of [...this.walkers.keys()]) if (!want.includes(k)) this.walkers.delete(k);
    want.forEach((kind, i) => {
      const def = UNITS[kind];
      const rig = sheetInfo(formOf(def, gradeOfRank(rankOf(meta, kind))));
      if (!rig) return;
      const k = Math.min(46, Math.max(30, rig.figure * def.scale * 0.8)) / rig.figure;
      const w = this.walkers.get(kind);
      if (w) {
        w.rig = rig;
        w.k = k;
        return;
      }
      const x = rand(this.lay.walk.x0, this.lay.walk.x1);
      const y = rand(this.lay.walk.y0, this.lay.walk.y1);
      this.walkers.set(kind, { kind, rig, k, x, y, gx: x, gy: y, face: chance(0.5) ? 1 : -1, mood: 'idle', at: this.now + 300 * i + rand(300, 2500), clock: rand(0, 3000), phase: rand(0, 6) });
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

  /** Pick the whole-number scale and size the canvas; the scene pans inside its frame when it is bigger than the screen. */
  private fit(): void {
    const h = this.root.clientHeight;
    const w = this.root.clientWidth;
    if (!h || !art) return;
    // (upright the tall yard fits the width at scale 2 with nothing clipped, and pans down if the page is shorter than it;
    // sideways the wide yard is drawn at 2 and pans both ways)
    const portrait = w < h;
    const lay = layoutFor(portrait);
    const s = portrait ? Math.max(2, Math.min(4, Math.floor(w / lay.w))) : Math.max(2, Math.min(4, Math.floor(h / (lay.h * 0.8))));
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
    // (the heroes go back to the new yard's lawn when the arrangement changes)
    if (changed)
      for (const wk of this.walkers.values()) {
        wk.x = wk.gx = rand(lay.walk.x0, lay.walk.x1);
        wk.y = wk.gy = rand(lay.walk.y0, lay.walk.y1);
        wk.mood = 'idle';
      }
    this.layTags();
    // (open with the buildings in view: the middle across, and the row the layout names down)
    requestAnimationFrame(() => {
      this.scroll.scrollLeft = (this.scroll.scrollWidth - this.scroll.clientWidth) / 2;
      this.scroll.scrollTop = Math.max(0, lay.openTop * s);
    });
  }

  /** The part that never changes: sky, hills, the wall and gate, the lawn with its cobbled path, and the shade. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const { w, h, groundY } = this.lay;
    const c = el('canvas');
    c.width = w * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#7fa8d8';
    g.fillRect(0, 0, c.width, c.height);
    // (the sky and hills are 384 across; a narrower yard shows their middle)
    const cut = Math.max(0, Math.floor((a.sky.width - w) / 2));
    g.drawImage(a.sky, cut, 0, w, a.sky.height, 0, 0, w * s, a.sky.height * s);
    g.drawImage(a.hills, cut, 0, w, a.hills.height, 0, (groundY - 62) * s, w * s, a.hills.height * s);
    // (the lawn)
    const gw = a.grass.width;
    for (let x = 0; x < w; x += gw) for (let y = groundY - 6; y < h; y += gw) g.drawImage(a.grass, x * s, y * s, gw * s, gw * s);
    // (cobbled patches: the path from the gate and a plaza)
    const cw = a.cobble.width;
    const ch = a.cobble.height;
    for (const { x0, y0, x1, y1 } of this.lay.paths) {
      for (let x = x0; x < x1; x += cw) for (let y = y0; y < y1; y += ch) g.drawImage(a.cobble, 0, 0, Math.min(cw, x1 - x), Math.min(ch, y1 - y), x * s, y * s, Math.min(cw, x1 - x) * s, Math.min(ch, y1 - y) * s);
      g.fillStyle = 'rgba(20, 12, 4, 0.6)';
      g.fillRect(x0 * s, y0 * s, (x1 - x0) * s, s);
      g.fillRect(x0 * s, (y1 - 1) * s, (x1 - x0) * s, s);
      g.fillRect(x0 * s, y0 * s, s, (y1 - y0) * s);
      g.fillRect((x1 - 1) * s, y0 * s, s, (y1 - y0) * s);
    }
    // (the back wall, with a gate in its middle)
    const wy = groundY + 2 - a.wall.height;
    this.lay.wallXs.forEach((x, i) => {
      if (this.lay.mirrorWall && i > 0) {
        g.save();
        g.translate(w * s, 0);
        g.scale(-1, 1);
        g.drawImage(a.wall, 0, wy * s, a.wall.width * s, a.wall.height * s);
        g.restore();
      } else g.drawImage(a.wall, x * s, wy * s, a.wall.width * s, a.wall.height * s);
    });
    g.drawImage(a.gate, Math.round(this.lay.gateX - a.gate.width / 2) * s, (groundY + 3 - a.gate.height) * s, a.gate.width * s, a.gate.height * s);
    // (the yard is darker near the wall; steps, not a smooth blend, to stay pixel art)
    [0.3, 0.2, 0.12, 0.06].forEach((al, i) => {
      g.fillStyle = `rgba(10, 20, 6, ${al})`;
      g.fillRect(0, (groundY + 3 + i * 6) * s, w * s, 6 * s);
    });
    return c;
  }

  /** The soft glows (tower runes, treasury shine) drawn over everything with a pulse. */
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
    return c;
  }

  /** Place the name tags over their buildings (percentages of the scene, so they follow its scale). */
  private layTags(): void {
    const a = art;
    if (!a) return;
    for (const id of BUILDING_IDS) {
      const tag = this.tagEls.get(id)!;
      const p = this.lay.plots[id];
      const im = a[spriteName(id, stageOf(id, this.levels[id] ?? 0))];
      tag.style.left = `${(p.x / this.lay.w) * 100}%`;
      tag.style.top = `${((p.y - im.height - 4) / this.lay.h) * 100}%`;
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
    const move = (w.rig.figure > 90 ? 12 : 16) * (dt / 1000);
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

  /** A bunch of motes at a building: dust and sparks round its foot, the build's puffs. */
  private burst(id: BuildingId, kind: 'dust' | 'spark', n: number): void {
    const p = this.lay.plots[id];
    const wide = 30;
    for (let i = 0; i < n; i++) {
      if (kind === 'dust') this.motes.push({ x: p.x + rand(-wide, wide), y: p.y - rand(0, 6), vx: rand(-14, 14), vy: rand(-18, -4), age: 0, life: rand(600, 1100), size: rand(2, 4), color: chance(0.5) ? '#d8c29a' : '#a58a62', grow: 5, kind });
      else this.motes.push({ x: p.x + rand(-wide, wide), y: p.y - rand(10, 60), vx: rand(-6, 6), vy: rand(-22, -6), age: 0, life: rand(700, 1300), size: 2, color: chance(0.5) ? '#ffe48a' : '#ffffff', grow: 0, kind });
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
    }
    this.motes = this.motes.filter((m) => m.age < m.life);
    this.draw();
  }

  /** The steady life: chimney smoke, the tower's floating runes and the treasury's glints. */
  private emit(): void {
    const a = art;
    if (!a || this.motes.length > 140) return;
    if (this.now >= this.nextSmoke) {
      this.nextSmoke = this.now + rand(260, 460);
      for (const id of BUILDING_IDS) {
        const stage = this.shown(id);
        for (const v of VENTS[id]) {
          if (!v.stages.includes(stage)) continue;
          const im = a[spriteName(id, stage)];
          const x = this.lay.plots[id].x - im.width / 2 + v.fx * im.width;
          const y = this.lay.plots[id].y - im.height + v.fy * im.height;
          if (v.kind === 'smoke') this.motes.push({ x, y, vx: rand(-1, 3), vy: rand(-14, -8), age: 0, life: rand(2000, 3000), size: 3, color: '#d8d4cc', grow: 3, kind: 'smoke' });
          else if (v.kind === 'rune') {
            if (chance(0.6)) this.motes.push({ x: x + rand(-14, 14), y: y + rand(-20, 20), vx: rand(-2, 2), vy: rand(-9, -4), age: 0, life: rand(1400, 2400), size: 2, color: chance(0.5) ? '#7fe8ff' : '#c9a6ff', grow: 0, kind: 'rune' });
          }
        }
      }
    }
    if (this.now >= this.nextGlint) {
      this.nextGlint = this.now + rand(350, 900);
      const stage = this.shown('treasury');
      const glints = VENTS.treasury.filter((v) => v.kind === 'glint' && v.stages.includes(stage));
      if (glints.length) {
        const v = glints[Math.floor(Math.random() * glints.length)];
        const im = a[spriteName('treasury', stage)];
        this.motes.push({ x: this.lay.plots.treasury.x - im.width / 2 + v.fx * im.width + rand(-6, 6), y: this.lay.plots.treasury.y - im.height + v.fy * im.height + rand(-4, 4), vx: 0, vy: 0, age: 0, life: 380, size: 3, color: '#fff6c0', grow: 0, kind: 'spark' });
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
    this.glows(a);
    this.motesDraw();
  }

  private building(a: Record<string, HTMLImageElement>, id: BuildingId): void {
    const g = this.ctx;
    const s = this.scale;
    const p = this.lay.plots[id];
    const stage = this.shown(id);
    const im = a[spriteName(id, stage)];
    const b = this.builds.find((x) => x.id === id);
    const x = Math.round(p.x - im.width / 2) * s;
    // (a building being built: it settles and the scaffolding comes down)
    const age = b ? this.now - b.start : BUILD_MS;
    const pop = b && age >= SWAP_MS && age < SWAP_MS + 180 ? Math.round((1 - (age - SWAP_MS) / 180) * 3) : 0;
    g.fillStyle = 'rgba(10, 20, 6, 0.3)';
    g.fillRect(x + 2 * s, (p.y - 3) * s, (im.width - 4) * s, 3 * s);
    g.drawImage(im, x, (p.y - im.height + pop) * s, im.width * s, im.height * s);
    if (b && age < SWAP_MS + 300) this.scaffold(p, Math.max(im.width, a[spriteName(id, b.to)].width), Math.max(im.height, a[spriteName(id, b.to)].height), age < SWAP_MS ? 1 : 1 - (age - SWAP_MS) / 300);
  }

  /** Poles and planks round the footprint; they shrink away as the build finishes. */
  private scaffold(p: { x: number; y: number }, w: number, h: number, grow: number): void {
    const g = this.ctx;
    const s = this.scale;
    const top = p.y - Math.round(h * grow) - 4;
    const left = Math.round(p.x - w / 2) - 3;
    const right = Math.round(p.x + w / 2) + 2;
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

  /** Pennants on the wall's end towers; the cloth ripples one pixel at a time. */
  private flags(): void {
    const g = this.ctx;
    const s = this.scale;
    for (const { x: px, dir } of this.lay.flags) {
      const py = this.lay.groundY - 52;
      g.fillStyle = '#2a1a0e';
      g.fillRect(px * s, (py - 12) * s, s, 13 * s);
      for (let i = 0; i < 12; i++) {
        const wave = this.reduced ? 0 : Math.round(Math.sin(this.now / 180 + i * 0.6) * (0.4 + i * 0.12));
        const edge = i / 12;
        const hgt = Math.max(2, Math.round(6 * (1 - edge * 0.7)));
        const x = px + dir * (1 + i);
        g.fillStyle = '#c8302a';
        g.fillRect(x * s - (dir === -1 ? s : 0), (py - 12 + wave) * s, s, hgt * s);
        g.fillStyle = '#f0b44a';
        g.fillRect(x * s - (dir === -1 ? s : 0), (py - 12 + wave) * s, s, s);
      }
    }
  }

  /** The tower's window light and a gold shine on the treasury, pulsing, added over the picture. */
  private glows(a: Record<string, HTMLImageElement>): void {
    const g = this.ctx;
    const s = this.scale;
    if (!this.glow) return;
    g.globalCompositeOperation = 'lighter';
    const pulse = this.reduced ? 0.6 : 0.55 + 0.25 * Math.sin(this.now / 480) + 0.08 * Math.sin(this.now / 130);
    const spot = (id: BuildingId, fx: number, fy: number, size: number, al: number, tint: string) => {
      const stage = this.shown(id);
      if (stage < 1) return;
      const im = a[spriteName(id, stage)];
      const cx = this.lay.plots[id].x - im.width / 2 + fx * im.width;
      const cy = this.lay.plots[id].y - im.height + fy * im.height;
      g.globalAlpha = Math.max(0, Math.min(1, al * pulse * (0.4 + stage * 0.3)));
      const tmp = this.tinted(tint);
      g.drawImage(tmp, (cx - size / 2) * s, (cy - size / 2) * s, size * s, size * s);
    };
    spot('mageTower', 0.5, 0.55, 54, 0.8, '#58d8ff');
    spot('mageTower', 0.5, 0.2, 36, 0.7, '#b890ff');
    spot('armoury', 0.45, 0.8, 30, 0.5, '#ff9a3c');
    spot('treasury', 0.5, 0.7, 50, 0.35, '#ffd24a');
    // (a build in progress gives a warm flash as the new look arrives)
    for (const b of this.builds) {
      const age = this.now - b.start;
      if (age > SWAP_MS - 100 && age < SWAP_MS + 450) {
        const im = a[spriteName(b.id, b.to)];
        g.globalAlpha = 0.65 * (1 - (age - SWAP_MS + 100) / 550);
        const sz = Math.max(im.width, im.height) + 30;
        g.drawImage(this.tinted('#fff0b0'), (this.lay.plots[b.id].x - sz / 2) * s, (this.lay.plots[b.id].y - im.height / 2 - sz / 2) * s, sz * s, sz * s);
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
      if (m.kind === 'spark') {
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

  /** What row and frame a hero shows now. */
  private pose(w: Walker): { row: string; i: number; lift: number } {
    const row = w.mood === 'walk' ? 'walk' : 'idle';
    const n = w.rig.counts[row] ?? 1;
    const per = w.mood === 'walk' ? 100 : 150;
    const i = Math.floor((w.clock + w.phase * 977) / per) % n;
    const lift = row === 'idle' && n === 1 && Math.sin((this.now + w.phase * 1300) / 520) > 0.35 ? 1 : 0;
    return { row, i, lift };
  }

  private hero(w: Walker): void {
    const g = this.ctx;
    const s = this.scale;
    const { rig, k } = w;
    const { row, i, lift } = this.pose(w);
    const r = rig.rows.indexOf(rig.rows.includes(row) ? row : 'idle');
    const fx = Math.round(w.x);
    const fy = Math.round(w.y);
    g.fillStyle = 'rgba(8, 20, 4, 0.4)';
    const sw = Math.round(rig.figure * k * 0.34);
    g.fillRect((fx - sw) * s, fy * s, sw * 2 * s, 2 * s);
    g.fillRect((fx - sw + 2) * s, (fy - 1) * s, (sw - 2) * 2 * s, s);
    const dw = rig.w * k * s;
    const dh = rig.h * k * s;
    const dy = (fy - lift) * s - dh;
    const flip = (w.face === 1) !== rig.facesRight;
    if (flip) {
      g.save();
      g.translate(fx * s, 0);
      g.scale(-1, 1);
      g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, -dw / 2, dy, dw, dh);
      g.restore();
    } else g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, fx * s - dw / 2, dy, dw, dh);
  }

  // ---- tapping ----

  private tap(e: PointerEvent): void {
    const a = art;
    if (!a) return;
    const box = this.canvas.getBoundingClientRect();
    const rx = ((e.clientX - box.left) / box.width) * this.lay.w;
    const ry = ((e.clientY - box.top) / box.height) * this.lay.h;
    let best: { id: BuildingId; depth: number } | null = null;
    for (const id of BUILDING_IDS) {
      const p = this.lay.plots[id];
      const im = a[spriteName(id, stageOf(id, this.levels[id] ?? 0))];
      // (an empty plot is small to hit, so every building has at least a generous patch of ground)
      const half = Math.max(im.width / 2, 26);
      const tall = Math.max(im.height, 34);
      if (rx < p.x - half || rx > p.x + half || ry < p.y - tall || ry > p.y + 4) continue;
      if (!best || p.y > best.depth) best = { id, depth: p.y };
    }
    if (best) this.onPick(best.id);
  }
}
