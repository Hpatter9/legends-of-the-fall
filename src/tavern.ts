// The Heroes tab's picture: a side-view tavern with every unlocked hero idling at a spot of their own (tavernSpots.ts);
// a locked hero's spot stays an empty seat, so the room fills as you recruit. One canvas, drawn in the room's own pixels
// times a whole-number scale (nearest neighbour, so it stays crisp). Heroes wander through random idles: turn round, sip,
// hum, nod off, stroll a few steps and back, now and then a flourish. It only draws (Math.random is fine here: nothing
// that is played depends on it) and runs only while the tab is showing.

import { ALL_HEROES, formOf, UNITS } from './sim/units';
import { rankOf, rarityOf, type Meta } from './sim/meta';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { gradeOfRank, PROPS, ROOM_H, ROOM_W, RUG, SPOTS, WALL_H, type Spot } from './render/tavernSpots';
import wallUrl from './art/tavern/wall.png';
import floorUrl from './art/tavern/floor.png';
import rugUrl from './art/tavern/rug.png';
import barUrl from './art/tavern/bar.png';
import stoolUrl from './art/tavern/stool.png';
import chairUrl from './art/tavern/chair.png';
import tableUrl from './art/tavern/table.png';
import longtableUrl from './art/tavern/longtable.png';
import barrelsUrl from './art/tavern/barrels.png';
import cratesUrl from './art/tavern/crates.png';

const ART: Record<string, string> = {
  wall: wallUrl,
  floor: floorUrl,
  rug: rugUrl,
  bar: barUrl,
  stool: stoolUrl,
  chair: chairUrl,
  table: tableUrl,
  longtable: longtableUrl,
  barrels: barrelsUrl,
  crates: cratesUrl,
};
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

// ---- little pixel pictures for the emote bubbles (7 wide, 7 high; '.' is clear) ----
const EMOTES: Record<string, { rows: string[]; ink: Record<string, string> }> = {
  mug: { rows: ['wwwww..', '#ooo###', '#ooo#.#', '#ooo#.#', '#ooo###', '#####..', '.......'], ink: { w: '#ffffff', '#': '#4a2a14', o: '#e8a030' } },
  note: { rows: ['..#####', '..#...#', '..#....', '..#....', '###....', '###....', '.#.....'], ink: { '#': '#3a2a6a' } },
  zz: { rows: ['#####..', '...#...', '..#..##', '.#..#..', '#####..', '...#.##', '....###'], ink: { '#': '#4a68b8' } },
  bang: { rows: ['..###..', '..###..', '..###..', '...#...', '.......', '..###..', '..###..'], ink: { '#': '#d02a2a' } },
};
const EMOTE_NAMES = ['mug', 'mug', 'note', 'note', 'zz', 'bang'];

interface Rig {
  img: HTMLImageElement;
  w: number;
  h: number;
  rows: string[];
  counts: Record<string, number>;
  figure: number;
  facesRight: boolean;
}

type Mood = 'idle' | 'out' | 'pause' | 'back' | 'flourish';

interface Actor {
  kind: string;
  spot: Spot;
  rig: Rig;
  /** Room pixels per sheet pixel. */
  k: number;
  x: number;
  face: 1 | -1;
  mood: Mood;
  /** When the next thing happens, and how far into the present clip we are (ms). */
  at: number;
  clock: number;
  target: number;
  clip: string;
  emote: { name: string; until: number } | null;
  phase: number;
  rarity: number;
}

const RARITY_GEM: Record<number, string[]> = { 2: ['#5ab4ff'], 3: ['#b06aff'], 4: ['#f0b44a'], 5: ['#ff4a4a', '#ffd24a'] };

export class Tavern {
  readonly root = el('div', 'tvWrap');
  private scroll = el('div', 'tvScroll');
  private canvas = el('canvas', 'tvRoom');
  private count = el('div', 'tvCount');
  private ctx = this.canvas.getContext('2d')!;
  private still: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private actors = new Map<string, Actor>();
  private scale = 2;
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private down: { x: number; y: number; t: number } | null = null;
  private grip: { x: number; y: number } | null = null;
  private watch: ResizeObserver;

  constructor(private onPick: (kind: string) => void) {
    this.scroll.append(this.canvas);
    this.root.append(this.scroll, this.count);
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    // (a drag pans the room by hand, both ways, with a finger or the mouse; a short still press is a tap)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.grip = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.down || !this.grip) return;
      this.scroll.scrollLeft -= e.clientX - this.grip.x;
      this.scroll.scrollTop -= e.clientY - this.grip.y;
      this.grip = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointercancel', () => (this.down = this.grip = null));
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = this.grip = null;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 9 && performance.now() - d.t < 600) this.tap(e);
    });
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Show these heroes (the meta's unlocked ones, at their ranks). Keeps the ones already there as they are. */
  update(meta: Meta): void {
    const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k));
    this.count.replaceChildren(`${have.length} of ${ALL_HEROES.length} heroes`, el('small', '', 'tap a hero · drag to look round'));
    for (const k of [...this.actors.keys()]) if (!have.includes(k)) this.actors.delete(k);
    for (const kind of have) {
      const def = UNITS[kind];
      const rig = sheetInfo(formOf(def, gradeOfRank(rankOf(meta, kind))));
      const spot = SPOTS[kind];
      if (!rig || !spot) continue;
      const k = Math.min(54, Math.max(34, rig.figure * def.scale * 0.9)) / rig.figure;
      const a = this.actors.get(kind);
      if (a) {
        a.rig = rig;
        a.k = k;
        continue;
      }
      this.actors.set(kind, {
        kind,
        spot,
        rig,
        k,
        x: spot.x,
        face: spot.facing,
        mood: 'idle',
        at: this.now + rand(600, 5000),
        clock: rand(0, 4000),
        target: spot.x,
        clip: 'idle',
        emote: null,
        phase: rand(0, 6),
        rarity: rarityOf(kind),
      });
    }
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

  /** Stop drawing (another tab is showing, or a sheet is open over it). */
  stop(): void {
    this.running = false;
    this.halt();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Pick the whole-number scale and size the canvas; the room pans inside its frame when it is bigger than the screen. */
  private fit(): void {
    const h = this.root.clientHeight;
    if (!h || !art) return;
    // (the room is drawn a size bigger so the floor and the heroes fill the page, and it pans both ways)
    const s = 3;
    if (s === this.scale && this.still && this.canvas.width === ROOM_W * s) return;
    this.scale = s;
    this.canvas.width = ROOM_W * s;
    this.canvas.height = ROOM_H * s;
    this.canvas.style.width = `${ROOM_W * s}px`;
    this.canvas.style.height = `${ROOM_H * s}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.still = this.paintStill(art, s);
    this.glow = this.paintGlow(s);
    // (the middle of the room; the floor, where the heroes are, in view)
    requestAnimationFrame(() => {
      this.scroll.scrollLeft = (this.scroll.scrollWidth - this.scroll.clientWidth) / 2;
      this.scroll.scrollTop = this.scroll.scrollHeight;
    });
  }

  /** The part that never changes: wall, floor with its shade, rug and the lamp light. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = ROOM_H * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a0f0a';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(a.wall, 0, 0, ROOM_W * s, WALL_H * s);
    // (floorboards, laid across)
    const fw = a.floor.width;
    const fh = a.floor.height;
    for (let x = 0; x < ROOM_W; x += fw) for (let y = WALL_H; y < ROOM_H; y += fh) g.drawImage(a.floor, x * s, y * s, fw * s, fh * s);
    // (the floor is darker where the wall meets it: steps, not a smooth blend, to stay pixel art)
    [0.5, 0.36, 0.24, 0.14, 0.06].forEach((al, i) => {
      g.fillStyle = `rgba(14, 6, 2, ${al})`;
      g.fillRect(0, (WALL_H + i * 7) * s, ROOM_W * s, 7 * s);
    });
    g.drawImage(a.rug, (RUG.x - a.rug.width / 2) * s, (RUG.y - a.rug.height / 2) * s, a.rug.width * s, a.rug.height * s);
    // (the room is darker at its edges)
    const vg = g.createRadialGradient(c.width / 2, c.height * 0.62, c.height * 0.3, c.width / 2, c.height * 0.62, c.width * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,3,1,0.55)');
    g.fillStyle = vg;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** The firelight and lamp glow, drawn over everything and flickered by its opacity. */
  private paintGlow(s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = ROOM_H * s;
    const g = c.getContext('2d')!;
    const lamp = (x: number, y: number, r: number, al: number) => {
      const rg = g.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      rg.addColorStop(0, `rgba(255, 170, 70, ${al})`);
      rg.addColorStop(1, 'rgba(255, 140, 40, 0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    };
    lamp(52, 160, 110, 0.3);
    for (const x of [108, 143, 228, 277, 312, 361]) lamp(x, 70, 40, 0.16);
    return c;
  }

  // ---- behaviour ----

  private think(a: Actor, now: number): void {
    const home = a.spot.x;
    if (a.mood === 'idle' && now >= a.at) {
      const roll = Math.random();
      if (roll < 0.3) a.face = a.face === 1 ? -1 : 1;
      else if (roll < 0.58) a.emote = { name: EMOTE_NAMES[Math.floor(Math.random() * EMOTE_NAMES.length)], until: now + rand(1800, 3000) };
      else if (!this.reduced && roll < 0.8) {
        const dir = chance(0.5) ? 1 : -1;
        a.target = Math.max(14, Math.min(ROOM_W - 14, home + dir * rand(10, 26)));
        a.face = a.target > a.x ? 1 : -1;
        a.mood = 'out';
        a.clock = 0;
      } else if (!this.reduced) {
        a.mood = 'flourish';
        a.clip = a.rig.counts.attack2 && chance(0.4) ? 'attack2' : 'attack';
        a.clock = 0;
      }
      a.at = now + rand(2500, 9000);
    }
  }

  private step(a: Actor, dt: number, now: number): void {
    a.clock += dt;
    if (a.mood === 'out' || a.mood === 'back') {
      const goal = a.mood === 'out' ? a.target : a.spot.x;
      const dx = goal - a.x;
      const move = (a.rig.figure > 90 ? 11 : 14) * (dt / 1000);
      if (Math.abs(dx) <= move) {
        a.x = goal;
        if (a.mood === 'out') {
          a.mood = 'pause';
          a.at = now + rand(1500, 3500);
        } else {
          a.mood = 'idle';
          a.face = a.spot.facing;
          a.at = now + rand(2000, 7000);
        }
      } else a.x += Math.sign(dx) * move;
    } else if (a.mood === 'pause' && now >= a.at) {
      a.mood = 'back';
      a.face = a.spot.x > a.x ? 1 : -1;
    } else if (a.mood === 'flourish') {
      const n = a.rig.counts[a.clip] ?? 1;
      if (a.clock >= n * 110) {
        a.mood = 'idle';
        a.at = now + rand(2500, 8000);
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
    this.draw();
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    g.globalAlpha = 1;
    // (only the part of the room on the screen is repainted: the rest is out of sight, and the frame is a third of the room wide)
    const vx = Math.max(0, Math.floor(this.scroll.scrollLeft));
    const vy = Math.max(0, Math.floor(this.scroll.scrollTop));
    const vw = Math.min(this.canvas.width - vx, this.scroll.clientWidth + 1) || this.canvas.width;
    const vh = Math.min(this.canvas.height - vy, this.scroll.clientHeight + 1) || this.canvas.height;
    g.drawImage(this.still, vx, vy, vw, vh, vx, vy, vw, vh);
    const list: { depth: number; paint: () => void }[] = [];
    for (const p of PROPS) {
      const im = a[p.sprite];
      list.push({ depth: p.y, paint: () => g.drawImage(im, Math.round(p.x - im.width / 2) * s, (p.y - im.height) * s, im.width * s, im.height * s) });
    }
    for (const kind of ALL_HEROES) {
      const spot = SPOTS[kind];
      const actor = this.actors.get(kind);
      // (an empty seat: no one is recruited yet, or they have wandered off)
      if (!actor || Math.abs(actor.x - spot.x) > 3) list.push({ depth: spot.depth - 0.5, paint: () => this.seat(a, spot) });
      if (actor) list.push({ depth: spot.depth, paint: () => this.hero(actor) });
    }
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    // (the fire flickers)
    if (this.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55 + 0.25 * Math.sin(this.now / 130) * Math.sin(this.now / 410 + 1) + 0.08 * Math.sin(this.now / 47);
      g.drawImage(this.glow, vx, vy, vw, vh, vx, vy, vw, vh);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
  }

  private seat(a: Record<string, HTMLImageElement>, spot: Spot): void {
    const g = this.ctx;
    const s = this.scale;
    const im = a[spot.seat];
    const x = Math.round(spot.x - im.width / 2) * s;
    const y = (spot.y + 1 - im.height) * s;
    if (spot.seat === 'chair' && spot.facing === -1) {
      g.setTransform(-1, 0, 0, 1, x + im.width * s, y);
      g.drawImage(im, 0, 0, im.width * s, im.height * s);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(im, x, y, im.width * s, im.height * s);
  }

  /** What row and frame a hero shows now. */
  private pose(a: Actor): { row: string; i: number; lift: number } {
    const walking = a.mood === 'out' || a.mood === 'back';
    const row = a.mood === 'flourish' ? a.clip : walking ? 'walk' : 'idle';
    const n = a.rig.counts[row] ?? 1;
    const per = a.mood === 'flourish' ? 110 : walking ? 100 : 150;
    const i = Math.floor((a.clock + a.phase * 977) / per) % n;
    // (a hero with only one idle frame still breathes: a one-pixel rise and fall)
    const lift = row === 'idle' && n === 1 && Math.sin((this.now + a.phase * 1300) / 520) > 0.35 ? 1 : 0;
    return { row, i: a.mood === 'flourish' ? Math.min(i, n - 1) : i, lift };
  }

  private hero(a: Actor): void {
    const g = this.ctx;
    const s = this.scale;
    const { rig, k } = a;
    const { row, i, lift } = this.pose(a);
    const r = rig.rows.indexOf(rig.rows.includes(row) ? row : 'idle');
    const fx = Math.round(a.x);
    const fy = a.spot.y;
    // (a shadow and, for the rare kinds, a small gem under the feet)
    g.fillStyle = 'rgba(8, 3, 1, 0.38)';
    const sw = Math.round(rig.figure * k * 0.34);
    g.fillRect((fx - sw) * s, fy * s, sw * 2 * s, 2 * s);
    g.fillRect((fx - sw + 2) * s, (fy - 1) * s, (sw - 2) * 2 * s, s);
    const gem = RARITY_GEM[a.rarity];
    if (gem) {
      g.fillStyle = gem[a.rarity === 5 && Math.floor(this.now / 700) % 2 ? 1 : 0];
      g.fillRect((fx - 1) * s, (fy + 2) * s, 3 * s, s);
      g.fillRect(fx * s, (fy + 3) * s, s, s);
      g.fillRect(fx * s, (fy + 1) * s, s, s);
    }
    const dw = rig.w * k * s;
    const dh = rig.h * k * s;
    const dx = fx * s - dw / 2;
    const dy = (fy - lift) * s - dh;
    const flip = (a.face === 1) !== rig.facesRight;
    if (flip) {
      // (a mirrored transform set and put back by hand: save and restore are slow on a phone's canvas)
      g.setTransform(-1, 0, 0, 1, fx * s, 0);
      g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, -dw / 2, dy, dw, dh);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, dx, dy, dw, dh);
    if (a.emote) this.bubble(a, fx, fy - Math.round(rig.figure * k) - 15);
  }

  /** The speech bubbles drawn once each (a bubble is a couple of hundred pixel rectangles, too many to redraw every frame). */
  private bubbles = new Map<string, HTMLCanvasElement>();

  private bubbleArt(name: string): HTMLCanvasElement {
    const key = `${name}@${this.scale}`;
    let c = this.bubbles.get(key);
    if (c) return c;
    const s = this.scale;
    const e = EMOTES[name];
    c = document.createElement('canvas');
    c.width = 13 * s;
    c.height = 15 * s;
    const g = c.getContext('2d')!;
    // (drawn with its top left at 0, 0: the speech box is 13 across, the tail below it points at the speaker, 6 across from the left)
    g.fillStyle = '#3a2218';
    g.fillRect(s, 0, 11 * s, 13 * s);
    g.fillRect(0, s, 13 * s, 11 * s);
    g.fillRect(5 * s, 13 * s, 3 * s, 2 * s);
    g.fillStyle = '#f6ecd2';
    g.fillRect(s, s, 11 * s, 11 * s);
    g.fillRect(5 * s, 13 * s, 2 * s, s);
    e.rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        g.fillStyle = e.ink[ch];
        g.fillRect((3 + rx) * s, (3 + ry) * s, s, s);
      }),
    );
    this.bubbles.set(key, c);
    return c;
  }

  private bubble(a: Actor, cx: number, top: number): void {
    // (it hops a pixel now and then)
    const y = top + (Math.floor(this.now / 380) % 2);
    this.ctx.drawImage(this.bubbleArt(a.emote!.name), (cx - 6) * this.scale, y * this.scale);
  }

  // ---- tapping ----

  private tap(e: PointerEvent): void {
    const box = this.canvas.getBoundingClientRect();
    const rx = ((e.clientX - box.left) / box.width) * ROOM_W;
    const ry = ((e.clientY - box.top) / box.height) * ROOM_H;
    let best: { kind: string; depth: number } | null = null;
    for (const kind of ALL_HEROES) {
      const spot = SPOTS[kind];
      const a = this.actors.get(kind);
      // (a hero's body, or the empty seat that waits for them)
      const half = a ? (a.rig.w * a.k) / 4 : 14;
      const tall = a ? a.rig.figure * a.k : 34;
      const cx = a ? a.x : spot.x;
      if (rx < cx - half || rx > cx + half || ry < spot.y - tall || ry > spot.y + 3) continue;
      if (!best || spot.depth > best.depth) best = { kind, depth: spot.depth };
    }
    if (best) this.onPick(best.kind);
  }
}
