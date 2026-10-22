// The Battle tab's picture: a war camp outside the castle gate at dusk, in the castle courtyard's isometric (2:1) view. The party of
// five stands round a crackling campfire and idles (turns, hums, strolls a little, now and then a flourish); a map table shows the
// next army and its boss; a cart on the left is where the chest stash mounts (`stashMount`); the daily and tower cards hang on two
// signposts (`dailySlot`, `towerSlot`). One canvas drawn in scene pixels times a whole-number scale (nearest neighbour). It only
// draws (Math.random is fine here: nothing that is played depends on it) and runs only while the tab is showing.

import { formOf, UNITS } from './sim/units';
import { gradeOfRank } from './render/tavernSpots';
import { rankOf, type Meta } from './sim/meta';
import type { Army } from './sim/armies';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { EMOTE_NAMES, EMOTES } from './tavern';
import { BOARD, campLayout, groundCells, starsFor, TABLE, type Camp, type Piece } from './render/campSpots';
import gateUrl from './art/camp/gate.png';
import tent1Url from './art/camp/tent1.png';
import tent2Url from './art/camp/tent2.png';
import standardUrl from './art/camp/standard.png';
import skinsUrl from './art/camp/skins.png';
import torchUrl from './art/camp/torch.png';
import dirtUrl from './art/camp/dirt_tile.png';
import skyUrl from './art/camp/sky.png';
import cloud1Url from './art/camp/cloud1.png';
import cloud2Url from './art/camp/cloud2.png';
import nightUrl from './art/camp/night.png';
import wallUrl from './art/castle/wall.png';
import campfireUrl from './art/castle/campfire.png';
import rackUrl from './art/castle/rack.png';
import barrelsUrl from './art/castle/barrels.png';
import cratesUrl from './art/castle/crates.png';
import cartUrl from './art/castle/cart.png';
import woodpileUrl from './art/castle/woodpile.png';
import hayUrl from './art/castle/hay.png';
import pineUrl from './art/castle/pine.png';
import bushUrl from './art/castle/bush.png';
import rocksUrl from './art/castle/rocks.png';
import grassUrl from './art/castle/grass_tile.png';

const ART: Record<string, string> = {
  gate: gateUrl, tent1: tent1Url, tent2: tent2Url, standard: standardUrl, skins: skinsUrl, torch: torchUrl, dirt_tile: dirtUrl,
  sky: skyUrl, cloud1: cloud1Url, cloud2: cloud2Url, night: nightUrl,
  wall: wallUrl, campfire: campfireUrl, rack: rackUrl, barrels: barrelsUrl, crates: cratesUrl, cart: cartUrl, woodpile: woodpileUrl, hay: hayUrl, pine: pineUrl, bush: bushUrl, rocks: rocksUrl, grass_tile: grassUrl,
};
type Art = Record<string, HTMLImageElement>;
let art: Art | null = null;
async function loadArt(): Promise<Art> {
  if (art) return art;
  const got: Art = {};
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
const canvasOf = (w: number, h: number): HTMLCanvasElement => {
  const c = el('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// ---- heroes: the idle, walk and attack rows shrunk by a whole number so a hero is about 52 scene pixels tall ----

/** How tall a hero's figure is drawn, near enough, in scene pixels (the sheet is shrunk by the whole number that comes closest). */
const HERO_PX = 52;
interface Small {
  c: HTMLCanvasElement;
  fw: number;
  fh: number;
  counts: Record<string, number>;
  rows: string[];
  facesRight: boolean;
  figure: number;
}
const ROWS = ['idle', 'walk', 'attack'];

function shrinkRig(rig: NonNullable<ReturnType<typeof sheetInfo>>, px = HERO_PX): Small {
  const n = Math.max(1, Math.round(rig.figure / px));
  // (a tiny figure is drawn twice as big instead, a whole number again)
  const up = n === 1 && rig.figure < px * 0.7 ? 2 : 1;
  const fw = Math.floor(rig.w / n);
  const fh = Math.floor(rig.h / n);
  const rows = ROWS.map((r) => (rig.rows.includes(r) ? r : 'idle'));
  const counts = rows.map((r) => rig.counts[r] ?? 1);
  const src = canvasOf(rig.img.width, rig.img.height);
  const sg = src.getContext('2d', { willReadFrequently: true })!;
  sg.drawImage(rig.img, 0, 0);
  const out = canvasOf(fw * up * Math.max(...counts), fh * up * ROWS.length);
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
      if (up === 1) og.putImageData(dst, i * fw, ri * fh);
      else {
        const tmp = canvasOf(fw, fh);
        tmp.getContext('2d')!.putImageData(dst, 0, 0);
        og.imageSmoothingEnabled = false;
        og.drawImage(tmp, 0, 0, fw, fh, i * fw * up, ri * fh * up, fw * up, fh * up);
      }
    }
  });
  return { c: out, fw: fw * up, fh: fh * up, counts: Object.fromEntries(ROWS.map((r, i) => [r, counts[i]])), rows: ROWS, facesRight: rig.facesRight, figure: Math.round((rig.figure * up) / n) };
}

type Mood = 'idle' | 'out' | 'pause' | 'back' | 'flourish';

interface Actor {
  kind: string;
  spot: { x: number; y: number; face: 1 | -1 };
  small: Small;
  /** The sheet's figure height the shrink was cut for (a new form re-cuts it). */
  cut: string;
  x: number;
  face: 1 | -1;
  mood: Mood;
  at: number;
  clock: number;
  target: number;
  clip: string;
  emote: { name: string; until: number } | null;
  phase: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  sway: number;
}

/** What the camp shows of the next army (the table's plate and its figurine). */
export interface CampArmy {
  army: Army;
  /** The boss's name and its sheet. */
  boss: string;
  sheet: string;
}

/** A 2:1 diamond `w` across and `h` down, centred on (cx, cy), one pixel row at a time (it stays pixel art). */
function diamond(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill;
  for (let r = 0; r < h; r++) {
    const u = Math.abs(r + 0.5 - h / 2) / (h / 2);
    const hw = Math.max(1, Math.round((w / 2) * (1 - u)));
    g.fillRect(cx - hw, Math.round(cy - h / 2) + r, hw * 2, 1);
  }
}

export class CampScene {
  readonly root = el('div', 'cpWrap');
  /** Where the chest stash module mounts: a box over the cart's bed on the left of the scene (placed and sized by this scene; the stash fills it). */
  readonly stashMount = el('div', 'cpStash');
  /** The two notice boards' slots: the page hangs its Daily and Tower cards in these (each is the board's box). */
  readonly dailySlot = el('div', 'cpSlot');
  readonly towerSlot = el('div', 'cpSlot');
  /** The table's plate: the next army's name and boss; a tap opens the party. */
  private plate = el('button', 'cpPlate');
  private canvas = el('canvas', 'cpRoom');
  private ctx = this.canvas.getContext('2d')!;
  private camp: Camp | null = null;
  /** Css pixels per scene pixel: a whole number of device pixels each (`k`) over the device pixel ratio, so it stays crisp. */
  private unit = 1;
  private back: HTMLCanvasElement | null = null;
  private front: HTMLCanvasElement | null = null;
  private dusk: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private flame: { base: HTMLCanvasElement; layer: HTMLCanvasElement; w: number; h: number } | null = null;
  private table: HTMLCanvasElement | null = null;
  private actors = new Map<string, Actor>();
  private party: string[] = [];
  private meta: Meta | null = null;
  private next: CampArmy | null = null;
  private sparks: Spark[] = [];
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private shown = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private down: { x: number; y: number; t: number } | null = null;
  private watch: ResizeObserver;
  private bubbles = new Map<string, HTMLCanvasElement>();

  constructor(
    private onPick: (kind: string) => void,
    private onParty: () => void,
  ) {
    this.plate.addEventListener('click', () => this.onParty());
    this.root.append(this.canvas, this.stashMount, this.dailySlot, this.towerSlot, this.plate);
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    this.canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    this.canvas.addEventListener('pointercancel', () => (this.down = null));
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14 && performance.now() - d.t < 700) this.tap(e);
    });
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Show the party (hero kinds, the best first) at their ranks, and the next army on the table. Keeps the heroes already there as they are. */
  update(meta: Meta, party: string[], next: CampArmy | null): void {
    this.meta = meta;
    this.party = party;
    for (const k of [...this.actors.keys()]) if (!party.includes(k)) this.actors.delete(k);
    const changed = next?.army.id !== this.next?.army.id || next?.boss !== this.next?.boss;
    this.next = next;
    if (art && this.camp) {
      this.dress(meta);
      if (changed || !this.table) this.paintTable();
      this.layPlate();
    }
  }

  /** Make an actor for each party member (once the pictures are ready) and re-cut a sheet that has changed form. */
  private dress(meta: Meta): void {
    const camp = this.camp!;
    this.party.forEach((kind, i) => {
      const def = UNITS[kind];
      const sheet = formOf(def, gradeOfRank(rankOf(meta, kind)));
      const rig = sheetInfo(sheet);
      const spot = camp.heroes[i];
      if (!rig || !spot) return;
      const a = this.actors.get(kind);
      if (a) {
        a.spot = spot;
        if (a.cut !== sheet) {
          a.small = shrinkRig(rig);
          a.cut = sheet;
        }
        return;
      }
      this.actors.set(kind, {
        kind,
        spot,
        small: shrinkRig(rig),
        cut: sheet,
        x: spot.x,
        face: spot.face,
        mood: 'idle',
        at: this.now + rand(500, 3500) + i * 400,
        clock: rand(0, 4000),
        target: spot.x,
        clip: 'idle',
        emote: null,
        phase: rand(0, 6),
      });
    });
  }

  /** Start drawing (the tab is showing). */
  start(): void {
    this.running = true;
    if (this.raf || document.hidden) return;
    void loadArt().then(() => {
      if (!this.running || this.raf) return;
      this.fit();
      this.last = performance.now();
      this.shown = this.now;
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  stop(): void {
    this.running = false;
    this.halt();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ---- layout and the parts that never change ----

  private fit(): void {
    const bw = this.root.clientWidth;
    const bh = this.root.clientHeight;
    if (!bw || !bh || !art) return;
    // (a scene pixel is `k` device pixels, about a css pixel: the canvas holds the scene one to one and the page stretches it by whole device pixels)
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(dpr));
    this.unit = k / dpr;
    const w = Math.ceil((bw * dpr) / k);
    const h = Math.ceil((bh * dpr) / k);
    if (this.camp && this.camp.w === w && this.camp.h === h && this.back) return;
    const camp = campLayout(w, h);
    this.camp = camp;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * this.unit}px`;
    this.canvas.style.height = `${h * this.unit}px`;
    this.canvas.style.left = `${(bw - w * this.unit) / 2}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.paintBack(art, camp);
    this.paintFront(art, camp);
    this.dusk = this.paintDusk(camp);
    this.glow = this.paintGlow(camp);
    this.flame = this.cutFlame(art);
    this.table = null;
    if (this.meta) {
      this.dress(this.meta);
      if (this.next) this.paintTable();
    }
    this.layOut();
  }

  /** Where a scene pixel is on the page. */
  private at(x: number, y: number): { left: string; top: string } {
    const ox = (this.root.clientWidth - this.camp!.w * this.unit) / 2;
    return { left: `${ox + x * this.unit}px`, top: `${y * this.unit}px` };
  }

  /** The DOM pieces over the canvas sit at scene positions turned to css pixels. */
  private layOut(): void {
    const camp = this.camp!;
    const u = this.unit;
    const box = (e: HTMLElement, r: { x: number; y: number; w: number; h: number }) => Object.assign(e.style, this.at(r.x, r.y), { width: `${r.w * u}px`, height: `${r.h * u}px` });
    box(this.stashMount, camp.stash);
    box(this.dailySlot, camp.boards.daily);
    box(this.towerSlot, camp.boards.tower);
    this.layPlate();
  }

  private layPlate(): void {
    const camp = this.camp;
    if (!camp) return;
    const n = this.next;
    this.plate.hidden = !n;
    if (!n) return;
    this.plate.replaceChildren(el('b', '', n.army.name), el('small', '', `led by ${n.boss}`));
    this.plate.setAttribute('aria-label', `War table: ${n.army.name}, led by ${n.boss}. Opens your party.`);
    Object.assign(this.plate.style, this.at(camp.table.x, camp.table.y + 1));
  }

  /** The sky: the dusk's own sky picture with the night's showing through at the top, in a few steps (so it keeps its pixels). */
  private paintBack(a: Art, camp: Camp): void {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const bottom = camp.gateY + 40;
    const x = Math.round((camp.w - a.sky.width) / 2);
    g.fillStyle = '#2c2a55';
    g.fillRect(0, 0, camp.w, camp.h);
    g.drawImage(a.sky, x, bottom - a.sky.height);
    const bands = 7;
    const reach = Math.max(60, Math.round(bottom * 0.62));
    for (let i = 0; i < bands; i++) {
      g.globalAlpha = 0.9 - (i * 0.85) / bands;
      const y0 = Math.round((i * reach) / bands);
      const y1 = Math.round(((i + 1) * reach) / bands);
      g.drawImage(a.night, 0, y0 - (bottom - a.night.height), a.night.width, y1 - y0, x, y0, a.night.width, y1 - y0);
    }
    g.globalAlpha = 1;
    this.back = c;
  }

  /** The ground, the wall, the gate and the boards' posts: everything that is behind the fire and never moves (the sky shows through above). */
  private paintFront(a: Art, camp: Camp): void {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const cy = camp.fire.y - 16;
    // (trampled earth round the fire and along the way from the gate to it)
    const trampled = (x: number, y: number) => Math.hypot((x - camp.fire.x) / 92, (y - cy) / 54) < 1 || (Math.abs(x - camp.cx) < 50 && y > camp.gateY - 30 && y < cy);
    for (const { x, y } of groundCells(camp)) {
      const dirt = trampled(x, y);
      const im = dirt ? a.dirt_tile : a.grass_tile;
      if (y + 33 < camp.gateY - 40) continue;
      const flip = !dirt && (Math.round(x / 45) * 7 + Math.round(y / 26) * 3) % 4 === 0;
      if (flip) {
        g.setTransform(-1, 0, 0, 1, Math.round(x + im.width / 2), 0);
        g.drawImage(im, 0, Math.round(y - 26));
        g.setTransform(1, 0, 0, 1, 0, 0);
      } else g.drawImage(im, Math.round(x - im.width / 2), Math.round(y - 26));
    }
    // (the wall's cells, the far ones first so the near ones overlap them; then the gate)
    const wall = [...camp.wall].sort((p, q) => p.y - q.y || Math.abs(q.x - camp.cx) - Math.abs(p.x - camp.cx));
    for (const p of wall) this.piece(g, a, p);
    this.piece(g, a, { sprite: 'gate', x: camp.cx, y: camp.gateY });
    for (const b of [camp.boards.daily, camp.boards.tower]) this.posts(g, b.x, b.y + b.h);
    this.front = c;
  }

  /** Two wooden posts under a notice board, from its bottom edge down to the ground. */
  private posts(g: CanvasRenderingContext2D, x: number, top: number): void {
    const foot = top + BOARD.post;
    g.fillStyle = 'rgba(8, 3, 1, 0.35)';
    g.fillRect(x + 2, foot - 1, BOARD.w - 4, 3);
    for (const px of [x + 8, x + BOARD.w - 14]) {
      g.fillStyle = '#2a160a';
      g.fillRect(px, top - 2, 6, BOARD.post + 2);
      g.fillStyle = '#7a5230';
      g.fillRect(px + 1, top - 2, 3, BOARD.post + 1);
      g.fillStyle = '#a87a46';
      g.fillRect(px + 1, top - 2, 1, BOARD.post + 1);
      g.fillStyle = '#4a4036';
      g.fillRect(px - 1, foot - 3, 8, 3);
    }
  }

  private piece(g: CanvasRenderingContext2D, a: Art, p: Piece): void {
    const im = a[p.sprite];
    const x = Math.round(p.x - im.width / 2);
    const y = Math.round(p.y - im.height);
    if (p.flip) {
      g.setTransform(-1, 0, 0, 1, x + im.width, 0);
      g.drawImage(im, 0, y);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(im, x, y);
  }

  /** The dusk: a cool purple laid over everything by multiplying, with the firelit ground left warm. */
  private paintDusk(camp: Camp): HTMLCanvasElement {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    const fx = camp.fire.x;
    const fy = camp.fire.y - 14;
    g.save();
    g.translate(fx, fy);
    g.scale(1, 0.7);
    const rg = g.createRadialGradient(0, 0, 20, 0, 0, 300);
    rg.addColorStop(0, '#fff2dc');
    rg.addColorStop(0.3, '#e8c8b4');
    rg.addColorStop(0.62, '#a89cc8');
    rg.addColorStop(1, '#7f76b6');
    g.fillStyle = rg;
    g.fillRect(-camp.w, -camp.h * 2, camp.w * 2, camp.h * 4);
    g.restore();
    return c;
  }

  /** The firelight: warm orange over the ground and the faces, drawn additively and flickered by its opacity. */
  private paintGlow(camp: Camp): HTMLCanvasElement {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    const lamp = (x: number, y: number, r: number, al: number, squash = 1) => {
      g.save();
      g.translate(x, y);
      g.scale(1, squash);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, `rgba(255, 170, 70, ${al})`);
      rg.addColorStop(0.5, `rgba(255, 130, 40, ${al * 0.4})`);
      rg.addColorStop(1, 'rgba(255, 110, 30, 0)');
      g.fillStyle = rg;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    };
    lamp(camp.fire.x, camp.fire.y - 14, 190, 0.34, 0.6);
    lamp(camp.fire.x, camp.fire.y - 30, 56, 0.34);
    for (const p of camp.props) if (p.sprite === 'torch') lamp(p.x, p.y - 62, 34, 0.3);
    return c;
  }

  /** The campfire's picture split in two: the logs and stones, and the flame cut out of it (for the flame to wave by itself). */
  private cutFlame(a: Art): { base: HTMLCanvasElement; layer: HTMLCanvasElement; w: number; h: number } {
    const im = a.campfire;
    const src = canvasOf(im.width, im.height);
    const sg = src.getContext('2d', { willReadFrequently: true })!;
    sg.drawImage(im, 0, 0);
    const data = sg.getImageData(0, 0, im.width, im.height);
    const flame = sg.createImageData(im.width, im.height);
    const base = sg.createImageData(im.width, im.height);
    for (let y = 0; y < im.height; y++)
      for (let x = 0; x < im.width; x++) {
        const k = (y * im.width + x) * 4;
        const [r, g, b, al] = [data.data[k], data.data[k + 1], data.data[k + 2], data.data[k + 3]];
        const hot = al > 0 && r > 185 && r - b > 110 && g > 70;
        if (!hot) {
          for (let j = 0; j < 4; j++) base.data[k + j] = data.data[k + j];
        } else {
          for (let j = 0; j < 4; j++) flame.data[k + j] = data.data[k + j];
          // (the logs keep a dark ember where the flame was low among the sticks, and nothing above)
          if (y > im.height * 0.5) {
            base.data[k] = 120;
            base.data[k + 1] = 44;
            base.data[k + 2] = 16;
            base.data[k + 3] = 255;
          }
        }
      }
    const layer = canvasOf(im.width, im.height);
    layer.getContext('2d')!.putImageData(flame, 0, 0);
    const bc = canvasOf(im.width, im.height);
    bc.getContext('2d')!.putImageData(base, 0, 0);
    return { base: bc, layer, w: im.width, h: im.height };
  }

  /** The war table: a plain wooden table with a map on it and, standing on the map, a figurine of the next army's boss. Its bottom edge is its foot line. */
  private paintTable(): void {
    const n = this.next;
    const rig = n && sheetInfo(n.sheet);
    if (!n || !rig) {
      this.table = null;
      return;
    }
    const fig = shrinkRig(rig, 34);
    const w = TABLE.w + 6;
    const topH = TABLE.h;
    const legs = 18;
    const h = fig.figure + topH + legs + 8;
    const c = canvasOf(w, h);
    const g = c.getContext('2d')!;
    const cx = Math.round(w / 2);
    const cy = fig.figure + Math.round(topH / 2) - 4;
    const ink = '#2a160a';
    const px = (x: number, y: number, col: string, ww = 1, hh = 1) => {
      g.fillStyle = col;
      g.fillRect(x, y, ww, hh);
    };
    // (legs first, the top over their tops)
    for (const [lx, ly] of [[cx - TABLE.w / 2 + 7, cy + 6], [cx + TABLE.w / 2 - 11, cy + 6], [cx - 2, cy + topH / 2 + 1]]) {
      px(lx, ly, ink, 4, legs);
      px(lx + 1, ly, '#7a5230', 2, legs - 1);
    }
    diamond(g, cx, cy + 6, TABLE.w + 2, topH + 2, ink);
    for (let t = 5; t >= 1; t--) diamond(g, cx, cy + t, TABLE.w, topH, t > 1 ? '#5e3e22' : '#7a5230');
    diamond(g, cx, cy, TABLE.w, topH, '#a87a46');
    // (the map: a parchment with a river, a road, a red cross and a fort)
    diamond(g, cx, cy, TABLE.w - 8, topH - 5, '#7a5a2a');
    diamond(g, cx, cy, TABLE.w - 11, topH - 7, '#e3d29c');
    px(cx - 16, cy + 1, '#4a78b8', 12, 1);
    px(cx - 8, cy + 2, '#4a78b8', 10, 1);
    for (let i = 0; i < 4; i++) px(cx + 4 + i * 3, cy - 3 + i, '#8a6a3a', 1, 1);
    px(cx + 9, cy - 6, '#c02a20', 5, 1);
    px(cx + 11, cy - 8, '#c02a20', 1, 5);
    px(cx - 14, cy - 3, '#6a6a72', 5, 2);
    px(cx - 14, cy - 5, '#6a6a72', 1, 2);
    px(cx - 10, cy - 5, '#6a6a72', 1, 2);
    // (the figurine, facing the camp's middle: the table stands on the right)
    const flip = rig.facesRight;
    const fx = cx - Math.round(fig.fw / 2);
    const fy = cy + 2 - fig.fh;
    if (flip) {
      g.setTransform(-1, 0, 0, 1, fx + fig.fw, 0);
      g.drawImage(fig.c, 0, 0, fig.fw, fig.fh, 0, fy, fig.fw, fig.fh);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(fig.c, 0, 0, fig.fw, fig.fh, fx, fy, fig.fw, fig.fh);
    this.table = c;
  }

  // ---- behaviour ----

  private think(a: Actor, now: number): void {
    if (a.mood === 'idle' && now >= a.at) {
      const roll = Math.random();
      if (roll < 0.3) a.face = a.face === 1 ? -1 : 1;
      else if (roll < 0.62) a.emote = { name: EMOTE_NAMES[Math.floor(Math.random() * EMOTE_NAMES.length)], until: now + rand(1800, 3000) };
      else if (!this.reduced && roll < 0.84) {
        a.target = a.spot.x + (chance(0.5) ? 1 : -1) * rand(8, 18);
        a.face = a.target > a.x ? 1 : -1;
        a.mood = 'out';
        a.clock = 0;
      } else if (!this.reduced) {
        a.mood = 'flourish';
        a.clip = 'attack';
        a.clock = 0;
      }
      a.at = now + rand(2500, 8000);
    }
  }

  private step(a: Actor, dt: number, now: number): void {
    a.clock += dt;
    if (a.mood === 'out' || a.mood === 'back') {
      const goal = a.mood === 'out' ? a.target : a.spot.x;
      const dx = goal - a.x;
      const move = 18 * (dt / 1000);
      if (Math.abs(dx) <= move) {
        a.x = goal;
        if (a.mood === 'out') {
          a.mood = 'pause';
          a.at = now + rand(1500, 3000);
        } else {
          a.mood = 'idle';
          a.face = a.spot.face;
          a.at = now + rand(2000, 6000);
        }
      } else a.x += Math.sign(dx) * move;
    } else if (a.mood === 'pause' && now >= a.at) {
      a.mood = 'back';
      a.face = a.spot.x > a.x ? 1 : -1;
    } else if (a.mood === 'flourish') {
      if (a.clock >= (a.small.counts.attack ?? 1) * 110) {
        a.mood = 'idle';
        a.at = now + rand(2500, 7000);
      }
    }
    if (a.emote && now >= a.emote.until) a.emote = null;
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    for (const a of this.actors.values()) {
      this.think(a, this.now);
      this.step(a, dt, this.now);
    }
    this.burn(dt);
    this.draw();
  }

  /** Sparks lift off the fire and drift up and out, cooling from yellow to orange to dark. */
  private burn(dt: number): void {
    if (this.reduced || !this.camp) return;
    const f = this.camp.fire;
    if (this.sparks.length < 40 && Math.random() < dt / 60) {
      this.sparks.push({ x: f.x + rand(-9, 9), y: f.y - 24, vx: rand(-5, 5), vy: -rand(18, 46), age: 0, life: rand(1000, 2600), sway: rand(0, 6) });
    }
    for (const s of this.sparks) {
      s.age += dt;
      s.y += s.vy * (dt / 1000);
      s.x += (s.vx + Math.sin(s.age / 260 + s.sway) * 8) * (dt / 1000);
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const camp = this.camp;
    const a = art;
    if (!a || !camp || !this.back || !this.front || !this.dusk) return;
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(this.back, 0, 0);
    // (the clouds drift slowly, the nearer ones faster)
    const sx = Math.round((camp.w - a.sky.width) / 2);
    const bottom = camp.gateY + 40;
    const drift = this.reduced ? 0 : this.now / 1000;
    g.globalAlpha = 0.85;
    for (const [im, speed] of [[a.cloud2, 2], [a.cloud1, 4]] as const) {
      const off = Math.floor(drift * speed) % im.width;
      for (let k = -1; k <= 1; k++) g.drawImage(im, sx + k * im.width - off, bottom - im.height);
    }
    g.globalAlpha = 1;
    this.stars(g, camp);
    g.drawImage(this.front, 0, 0);
    // (the things on the ground, sorted by their feet: props, the fire, the table, the cart and the heroes)
    const list: { depth: number; paint: () => void }[] = [];
    for (const p of camp.props) list.push({ depth: p.depth ?? p.y, paint: () => this.piece(g, a, p) });
    list.push({ depth: camp.fire.y, paint: () => this.fire(g, camp) });
    list.push({ depth: camp.cart.y, paint: () => this.piece(g, a, { sprite: 'cart', x: camp.cart.x, y: camp.cart.y }) });
    if (this.table) {
      const t = this.table;
      list.push({ depth: camp.table.y, paint: () => g.drawImage(t, Math.round(camp.table.x - t.width / 2), Math.round(camp.table.y - t.height)) });
    }
    for (const actor of this.actors.values()) list.push({ depth: actor.spot.y, paint: () => this.hero(g, actor) });
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    this.sparksDraw(g);
    g.globalCompositeOperation = 'multiply';
    g.drawImage(this.dusk, 0, 0);
    g.globalCompositeOperation = 'lighter';
    if (this.glow) {
      g.globalAlpha = this.reduced ? 0.8 : 0.72 + 0.2 * Math.sin(this.now / 130) * Math.sin(this.now / 410 + 1) + 0.06 * Math.sin(this.now / 47);
      g.drawImage(this.glow, 0, 0);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    // (the emote bubbles stay clear of the dusk)
    for (const actor of this.actors.values()) if (actor.emote) this.bubble(g, actor);
  }

  /** A few stars come out as the dusk falls (over a few seconds after the tab opens), each twinkling in its own time. */
  private stars(g: CanvasRenderingContext2D, camp: Camp): void {
    const fall = this.reduced ? 1 : Math.min(1, (this.now - this.shown) / 9000);
    for (const s of starsFor(camp)) {
      if (s.at > fall) continue;
      const tw = this.reduced ? 1 : 0.55 + 0.45 * Math.sin(this.now / 700 + s.phase);
      g.fillStyle = `rgba(255, 244, 214, ${0.35 + 0.65 * tw})`;
      g.fillRect(s.x, s.y, 1, 1);
      if (s.big && tw > 0.6) {
        g.fillStyle = `rgba(255, 244, 214, ${0.3 * tw})`;
        g.fillRect(s.x - 1, s.y, 3, 1);
        g.fillRect(s.x, s.y - 1, 1, 3);
      }
    }
  }

  /** The campfire: its logs, then its flame waving row by row and breathing taller and shorter. */
  private fire(g: CanvasRenderingContext2D, camp: Camp): void {
    const f = this.flame;
    if (!f) return;
    const x = Math.round(camp.fire.x - f.w / 2);
    const y = Math.round(camp.fire.y - f.h);
    g.drawImage(f.base, x, y);
    const t = this.reduced ? 0 : this.now;
    const breathe = this.reduced ? 0 : Math.round(Math.sin(t / 150) * 0.8 + Math.sin(t / 61) * 0.6);
    for (let row = 0; row < f.h; row++) {
      const lean = (f.h - row) / f.h;
      const dx = this.reduced ? 0 : Math.round(Math.sin(t / 170 + row * 0.55) * 2 * lean);
      g.drawImage(f.layer, 0, row, f.w, 1, x + dx, y + row - (row < f.h / 2 ? breathe : 0), f.w, 1);
    }
  }

  private sparksDraw(g: CanvasRenderingContext2D): void {
    for (const s of this.sparks) {
      const k = s.age / s.life;
      g.fillStyle = k < 0.3 ? '#fff0a0' : k < 0.65 ? '#ffa030' : '#c0501c';
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      if (k < 0.2) g.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1);
    }
  }

  /** What row and frame a hero shows now. */
  private pose(a: Actor): { row: number; i: number; lift: number } {
    const walking = a.mood === 'out' || a.mood === 'back';
    const name = a.mood === 'flourish' ? 'attack' : walking ? 'walk' : 'idle';
    const n = a.small.counts[name] ?? 1;
    const per = a.mood === 'flourish' ? 110 : walking ? 100 : 150;
    const i = Math.floor((a.clock + a.phase * 977) / per) % n;
    const lift = name === 'idle' && n === 1 && Math.sin((this.now + a.phase * 1300) / 520) > 0.35 ? 1 : 0;
    return { row: ROWS.indexOf(name), i: a.mood === 'flourish' ? Math.min(i, n - 1) : i, lift };
  }

  private hero(g: CanvasRenderingContext2D, a: Actor): void {
    const { small } = a;
    const { row, i, lift } = this.pose(a);
    const fx = Math.round(a.x);
    const fy = a.spot.y;
    g.fillStyle = 'rgba(8, 3, 1, 0.4)';
    const sw = Math.max(8, Math.round(small.figure * 0.28));
    g.fillRect(fx - sw, fy - 1, sw * 2, 2);
    g.fillRect(fx - sw + 3, fy - 2, sw * 2 - 6, 1);
    g.fillRect(fx - sw + 3, fy + 1, sw * 2 - 6, 1);
    const dy = fy - lift - small.fh;
    // (a sheet's figures face right unless the sheet says otherwise; a mirror turns them)
    if ((a.face === 1) !== small.facesRight) {
      g.setTransform(-1, 0, 0, 1, fx, 0);
      g.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, -Math.round(small.fw / 2), dy, small.fw, small.fh);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, fx - Math.round(small.fw / 2), dy, small.fw, small.fh);
  }

  /** The speech bubbles, each drawn once into a small canvas (the tavern's emotes). */
  private bubbleArt(name: string): HTMLCanvasElement {
    let c = this.bubbles.get(name);
    if (c) return c;
    const e = EMOTES[name];
    c = canvasOf(13, 15);
    const g = c.getContext('2d')!;
    g.fillStyle = '#3a2218';
    g.fillRect(1, 0, 11, 13);
    g.fillRect(0, 1, 13, 11);
    g.fillRect(5, 13, 3, 2);
    g.fillStyle = '#f6ecd2';
    g.fillRect(1, 1, 11, 11);
    g.fillRect(5, 13, 2, 1);
    e.rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        g.fillStyle = e.ink[ch];
        g.fillRect(3 + rx, 3 + ry, 1, 1);
      }),
    );
    this.bubbles.set(name, c);
    return c;
  }

  private bubble(g: CanvasRenderingContext2D, a: Actor): void {
    const y = a.spot.y - a.small.fh - 14 + (Math.floor(this.now / 380) % 2);
    g.drawImage(this.bubbleArt(a.emote!.name), Math.round(a.x) - 6, y);
  }

  // ---- tapping ----

  private tap(e: PointerEvent): void {
    const camp = this.camp;
    if (!camp) return;
    const box = this.canvas.getBoundingClientRect();
    const rx = (e.clientX - box.left) / this.unit;
    const ry = (e.clientY - box.top) / this.unit;
    // (generous: the hero whose body is nearest the finger wins, within a reach a little wider and taller than the body)
    let best: { kind: string; d: number; y: number } | null = null;
    for (const a of this.actors.values()) {
      const half = Math.max(16, a.small.fw / 4) + 10;
      const tall = a.small.fh + 8;
      if (rx < a.x - half || rx > a.x + half || ry < a.spot.y - tall || ry > a.spot.y + 12) continue;
      const d = Math.hypot((rx - a.x) / half, (ry - (a.spot.y - tall / 2)) / (tall / 2));
      if (!best || d < best.d - 0.15 || (Math.abs(d - best.d) <= 0.15 && a.spot.y > best.y)) best = { kind: a.kind, d, y: a.spot.y };
    }
    if (best) return this.onPick(best.kind);
    // (the war table opens the party)
    const t = camp.table;
    const th = this.table?.height ?? 80;
    if (Math.abs(rx - t.x) < TABLE.w / 2 + 8 && ry > t.y - th && ry < t.y + 6) this.onParty();
  }
}
