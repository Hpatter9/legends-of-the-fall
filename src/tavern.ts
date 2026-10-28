// The Heroes tab's picture: a side-view tavern three rooms wide (the bar room, the hearth hall and the games room, joined by
// doorways) with every unlocked hero idling at a spot of their own (tavernSpots.ts); a locked hero's spot stays an empty seat,
// so the rooms fill as you recruit. The rooms are baked once into one big picture (walls, floors, rugs, doorways) and each frame
// only blits the part on the screen, then draws the furniture and the heroes near it. The view pans sideways by a drag, with
// a little momentum, or by a tap on a room's name. Heroes wander through random idles: turn round, sip, hum, nod off, stroll a
// few steps and back, now and then a flourish. It only draws (Math.random is fine here: nothing that is played depends on it)
// and runs only while the tab is showing.

import { tok } from './render/tok';
import { ALL_HEROES, UNITS } from './sim/units';
import type { Meta } from './sim/meta';
import { awakenedStep, heroRig } from './render/awakenRig';
import { drawAura, drawAuraGlow } from './render/auraCanvas';
import { auraParts, type AuraPart } from './render/auraStyles';
import { loadImage } from './render/loadImage';
import { onSettings, setSetting, settings } from './settings';
import { goatHalfSheet } from './duchess';
import { goatSays } from './quips';
import { showQuip } from './quipView';
import { chewBob, drawDuchessCosmetic, DUCHESS_COSMETICS, FRAME, goatFrame, hopLift, newGoat, stepGoat, tapGoat, type Goat } from './render/duchessRules';
import { CEIL_H, DOORWAYS, figureHeight, FLOOR_PAD, GLOWS, PROPS, ROOM_H, ROOM_NAMES, ROOM_W, ROOMS, RUGS, SCENE_W, SPOTS, WALL_H, type Spot } from './render/tavernSpots';
import { TrophyWallModal } from './trophyWall';
import wallUrl from './art/tavern/wall.png';
import wallHearthUrl from './art/tavern/wall_hearth.png';
import wallBackUrl from './art/tavern/wall_back.png';
import archUrl from './art/tavern/arch.png';
import floorUrl from './art/tavern/floor.png';
import rugUrl from './art/tavern/rug.png';
import barUrl from './art/tavern/bar.png';
import stoolUrl from './art/tavern/stool.png';
import chairUrl from './art/tavern/chair.png';
import benchUrl from './art/tavern/bench.png';
import tableUrl from './art/tavern/table.png';
import longtableUrl from './art/tavern/longtable.png';
import barrelsUrl from './art/tavern/barrels.png';
import cratesUrl from './art/tavern/crates.png';
import stageUrl from './art/tavern/stage.png';

const ART: Record<string, string> = {
  wall: wallUrl,
  wallHearth: wallHearthUrl,
  wallBack: wallBackUrl,
  arch: archUrl,
  floor: floorUrl,
  rug: rugUrl,
  bar: barUrl,
  stool: stoolUrl,
  chair: chairUrl,
  bench: benchUrl,
  table: tableUrl,
  longtable: longtableUrl,
  barrels: barrelsUrl,
  crates: cratesUrl,
  stage: stageUrl,
};
let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

/** Where the doorway's opening is inside the arch picture (across from its left edge, and from the top down). */
const ARCH_IN = { x0: 12, x1: 44, y0: 23 };
/** The view keeps its place for the session. */
const CAM_KEY = 'lotf.tavern.cam';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;

// ---- little pixel pictures for the emote bubbles (7 wide, 7 high; '.' is clear) ----
export const EMOTES: Record<string, { rows: string[]; ink: Record<string, string> }> = {
  mug: { rows: ['wwwww..', '#ooo###', '#ooo#.#', '#ooo#.#', '#ooo###', '#####..', '.......'], ink: { w: '#ffffff', '#': '#4a2a14', o: '#e8a030' } },
  note: { rows: ['..#####', '..#...#', '..#....', '..#....', '###....', '###....', '.#.....'], ink: { '#': '#3a2a6a' } },
  zz: { rows: ['#####..', '...#...', '..#..##', '.#..#..', '#####..', '...#.##', '....###'], ink: { '#': '#4a68b8' } },
  bang: { rows: ['..###..', '..###..', '..###..', '...#...', '.......', '..###..', '..###..'], ink: { '#': '#d02a2a' } },
};
export const EMOTE_NAMES = ['mug', 'mug', 'note', 'note', 'zz', 'bang'];

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
  /** Its awakened step, and the parts of its class's aura (none below the first step). */
  step: number;
  aura: readonly AuraPart[];
}


const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class Tavern {
  readonly root = el('div', 'tvWrap');
  private canvas = el('canvas', 'tvRoom');
  private count = el('div', 'tvCount');
  private nav = el('div', 'tvNav');
  private edgeL = el('div', 'tvEdge tvEdgeL');
  private edgeR = el('div', 'tvEdge tvEdgeR');
  private roomBtns: HTMLButtonElement[] = [];
  private ctx = this.canvas.getContext('2d')!;
  private still: HTMLCanvasElement | null = null;
  private glows = new Map<string, HTMLCanvasElement>();
  private actors = new Map<string, Actor>();
  /** Duchess, who wanders the hearth hall's floor (`render/duchessRules.ts`). */
  private goat: Goat | null = null;
  private goatArt: HTMLImageElement | null = null;
  /** Room pixels to a screen pixel (a whole number), the size of the view in screen pixels, and where it looks (room pixels). */
  private scale = 2;
  private viewW = 0;
  private viewH = 0;
  private camX = 0;
  private camY = 0;
  private placed = false;
  /** Momentum after a swipe (room pixels per ms) and a glide to a room (a tap on its name). */
  private vel = 0;
  private glide: { from: number; to: number; t0: number; dur: number } | null = null;
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private down: { x: number; y: number; t: number } | null = null;
  private drag = false;
  private grip: { x: number; t: number }[] = [];
  private lastRoom = -1;
  private watch: ResizeObserver;
  private meta: Meta | null = null;
  private trophyModal = new TrophyWallModal();

  constructor(
    private onPick: (kind: string) => void,
    onRoster: () => void,
  ) {
    const roster = el('button', 'tvRoster', 'Roster');
    roster.addEventListener('click', onRoster);
    const trophies = el('button', 'tvTrophies', '🏆 Trophies');
    trophies.title = 'Defeated Boss Trophy Wall';
    trophies.addEventListener('click', () => {
      if (this.meta) this.trophyModal.open(this.meta);
    });
    ROOM_NAMES.forEach((r, i) => {
      if (i) this.nav.append(el('span', 'tvDot', '·'));
      const b = el('button', 'tvRoom1', r.name);
      b.addEventListener('click', () => this.goTo(r.focus));
      this.roomBtns.push(b);
      this.nav.append(b);
    });
    this.root.append(this.canvas, this.count, trophies, roster, this.edgeL, this.edgeR, this.nav, this.trophyModal.root);
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    // (a drag pans the view sideways with a finger or the mouse, and lets go with a little momentum; a short still press is a tap,
    // so a pan never picks a hero)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.drag = false;
      this.grip = [{ x: e.clientX, t: performance.now() }];
      this.vel = 0;
      this.glide = null;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const d = this.down;
      if (!d) return;
      if (!this.drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) {
        this.drag = true;
        this.grip = [{ x: e.clientX, t: performance.now() }];
      }
      if (!this.drag) return;
      const prev = this.grip[this.grip.length - 1];
      this.camX = this.clampX(this.camX - (e.clientX - prev.x) / this.scale);
      const t = performance.now();
      this.grip.push({ x: e.clientX, t });
      while (this.grip.length > 2 && t - this.grip[0].t > 100) this.grip.shift();
    });
    this.canvas.addEventListener('pointercancel', () => this.release(null));
    this.canvas.addEventListener('pointerup', (e) => this.release(e));
    // (the wheel and a trackpad's sideways swipe pan too)
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.glide = null;
        this.camX = this.clampX(this.camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / this.scale);
        this.remember();
      },
      { passive: false },
    );
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** The finger or the mouse lets go: a tap, or the end of a pan (which carries on a little). */
  private release(e: PointerEvent | null): void {
    const d = this.down;
    const wasDrag = this.drag;
    this.down = null;
    this.drag = false;
    if (!d || !e) return;
    const t = performance.now();
    if (!wasDrag) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14 && t - d.t < 700) this.tap(e);
      return;
    }
    // (the speed over the last tenth of a second, as room pixels a millisecond; a finger that stopped before it lifted leaves none)
    const first = this.grip[0];
    const dt = t - first.t;
    const v = dt > 0 && t - this.grip[this.grip.length - 1].t < 80 ? (-(e.clientX - first.x) / this.scale) / Math.max(dt, 30) : 0;
    this.vel = this.reduced ? 0 : clamp(v, -1.6, 1.6);
    if (Math.abs(this.vel) < 0.02) {
      this.vel = 0;
      this.remember();
    }
  }

  /** Show these heroes (the meta's unlocked ones, at their ranks). Keeps the ones already there as they are. */
  update(meta: Meta): void {
    this.meta = meta;
    const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k));
    this.count.replaceChildren(`${have.length} of ${ALL_HEROES.length} heroes`, el('small', '', `${meta.equipment?.length ?? 0} equipment`), el('small', '', 'tap a hero · swipe to look'));
    for (const k of [...this.actors.keys()]) if (!have.includes(k)) this.actors.delete(k);
    for (const kind of have) {
      const def = UNITS[kind];
      const rig = heroRig(meta, kind);
      const spot = SPOTS[kind];
      if (!rig || !spot) continue;
      const k = figureHeight(rig.figure, def.scale) / rig.figure;
      const step = awakenedStep(meta, kind);
      const aura = auraParts(kind, step, this.saver);
      const a = this.actors.get(kind);
      if (a) {
        a.rig = rig;
        a.k = k;
        a.step = step;
        a.aura = aura;
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
        step,
        aura,
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

  /** Paint one still picture without starting the loop: the tab is behind a sheet, but its page still slides through the view when
   *  the tab changes, and an unpainted canvas showed there as an empty band. */
  paintOnce(): void {
    if (this.raf || document.hidden) return;
    void loadArt().then(() => {
      if (this.raf) return;
      this.fit();
      this.draw();
    });
  }

  /** Stop drawing (another tab is showing, or a sheet is open over it). */
  stop(): void {
    this.running = false;
    this.halt();
    this.remember();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ---- the view ----

  private clampX(x: number): number {
    return clamp(x, 0, Math.max(0, SCENE_W - this.viewW / this.scale));
  }

  /** The camera that centres the view on this spot across the scene. */
  private centreOn(x: number): number {
    return this.clampX(x - this.viewW / this.scale / 2);
  }

  /** Glide to a room (a jump when motion is reduced). */
  private goTo(focus: number): void {
    const to = this.centreOn(focus);
    this.vel = 0;
    if (this.reduced) {
      this.camX = to;
      this.glide = null;
      this.remember();
    } else this.glide = { from: this.camX, to, t0: this.now, dur: clamp(Math.abs(to - this.camX) * 2.2, 260, 700) };
  }

  /** Keep the view's place for the session. */
  private remember(): void {
    if (!this.placed) return;
    try {
      sessionStorage.setItem(CAM_KEY, String(Math.round(this.camX)));
    } catch {
      /* (no storage here: the view opens on the bar room each time) */
    }
  }

  private saved(): number | null {
    try {
      const v = Number(sessionStorage.getItem(CAM_KEY));
      return sessionStorage.getItem(CAM_KEY) !== null && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }

  /** Size the canvas to the page, pick the whole-number scale, and bake the rooms when the scale changes. */
  private fit(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h || !art) return;
    // (two screen pixels to a room pixel on a phone, which fits the rooms' height; three where the page is tall enough for it)
    const s = h >= ROOM_H * 3 ? 3 : 2;
    if (w !== this.viewW || h !== this.viewH) {
      const keep = this.placed ? this.camX + this.viewW / this.scale / 2 : 0;
      this.viewW = w;
      this.viewH = h;
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx.imageSmoothingEnabled = false;
      if (this.placed) this.camX = this.centreOn(keep);
    }
    if (s !== this.scale || !this.still) {
      const keep = this.placed ? this.camX + this.viewW / this.scale / 2 : 0;
      this.scale = s;
      this.still = this.paintStill(art, s);
      this.glows.clear();
      if (this.placed) this.camX = this.centreOn(keep);
    }
    // (the view sits on the floor: the bottom of the rooms, and the strip of floor under the front row where the room names sit, at the bottom of the page; a taller page shows more dark ceiling)
    this.camY = Math.max(-CEIL_H, ROOM_H + FLOOR_PAD - h / s);
    if (!this.placed) {
      this.placed = true;
      const was = this.saved();
      this.camX = was === null ? this.centreOn(ROOM_NAMES[0].focus) : this.clampX(was);
    } else this.camX = this.clampX(this.camX);
  }

  /** The part that never changes: ceiling, the three walls with their doorways, the floor with its shade and the rugs. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = SCENE_W * s;
    c.height = (ROOM_H + FLOOR_PAD + CEIL_H) * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    // (everything below is in room pixels, with the top of the walls at 0 and the ceiling above it)
    g.setTransform(s, 0, 0, s, 0, CEIL_H * s);
    g.fillStyle = '#120a06';
    g.fillRect(0, -CEIL_H, SCENE_W, ROOM_H + FLOOR_PAD + CEIL_H);
    [a.wall, a.wallHearth, a.wallBack].forEach((im, i) => g.drawImage(im, i * ROOM_W, WALL_H - im.height));
    // (the ceiling is darker the higher it is: steps, not a smooth blend, to stay pixel art)
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(10, 5, 2, ${0.5 - i * 0.08})`;
      g.fillRect(0, i * 6, SCENE_W, 6);
    }
    // (floorboards, laid across)
    const fw = a.floor.width;
    const fh = a.floor.height;
    for (let x = 0; x < SCENE_W; x += fw) for (let y = WALL_H; y < ROOM_H + FLOOR_PAD; y += fh) g.drawImage(a.floor, 0, 0, fw, Math.min(fh, ROOM_H + FLOOR_PAD - y), x, y, fw, Math.min(fh, ROOM_H + FLOOR_PAD - y));
    // (the floor is darker where the wall meets it)
    [0.5, 0.36, 0.24, 0.14, 0.06].forEach((al, i) => {
      g.fillStyle = `rgba(14, 6, 2, ${al})`;
      g.fillRect(0, WALL_H + i * 7, SCENE_W, 7);
    });
    for (const r of RUGS) g.drawImage(a.rug, Math.round(r.x - a.rug.width / 2), Math.round(r.y - a.rug.height / 2));
    // (a doorway between each two rooms: dark through the opening, a little firelight on its floor, the timber frame over it)
    for (const d of DOORWAYS) {
      const ax = d - Math.round(a.arch.width / 2);
      g.fillStyle = '#0a0503';
      g.fillRect(ax + ARCH_IN.x0, ARCH_IN.y0, ARCH_IN.x1 - ARCH_IN.x0, WALL_H - ARCH_IN.y0);
      [0.1, 0.18, 0.28].forEach((al, i) => {
        g.fillStyle = `rgba(150, 80, 30, ${al})`;
        g.fillRect(ax + ARCH_IN.x0, WALL_H - 3 * (i + 1), ARCH_IN.x1 - ARCH_IN.x0, 3);
      });
      g.drawImage(a.arch, ax, WALL_H - a.arch.height);
    }
    // (the two far ends of the building are darker)
    [0.4, 0.28, 0.16, 0.08].forEach((al, i) => {
      g.fillStyle = `rgba(8, 3, 1, ${al})`;
      g.fillRect(i * 6, 0, 6, ROOM_H + FLOOR_PAD);
      g.fillRect(SCENE_W - (i + 1) * 6, 0, 6, ROOM_H + FLOOR_PAD);
    });
    return c;
  }

  /** A soft round light, drawn once for each size and strength and then reused for every lamp that has it. */
  private glowArt(r: number, al: number): HTMLCanvasElement {
    const key = `${r}@${al}@${this.scale}`;
    let c = this.glows.get(key);
    if (c) return c;
    const s = this.scale;
    c = el('canvas');
    c.width = c.height = Math.ceil(r * 2 * s);
    const g = c.getContext('2d')!;
    const rg = g.createRadialGradient(r * s, r * s, 0, r * s, r * s, r * s);
    rg.addColorStop(0, `rgba(255, 170, 70, ${al})`);
    rg.addColorStop(1, 'rgba(255, 140, 40, 0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, c.width, c.height);
    this.glows.set(key, c);
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
        a.target = clamp(home + dir * rand(10, 26), 14, SCENE_W - 14);
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

  /** Move the view: a glide to a room, or the momentum of a swipe slowing down. */
  private pan(dt: number): void {
    if (this.drag) return;
    if (this.glide) {
      const gl = this.glide;
      const u = clamp((this.now - gl.t0) / gl.dur, 0, 1);
      this.camX = gl.from + (gl.to - gl.from) * (u * u * (3 - 2 * u));
      if (u >= 1) {
        this.glide = null;
        this.remember();
      }
    } else if (this.vel) {
      const before = this.camX;
      this.camX = this.clampX(this.camX + this.vel * dt);
      // (a gentle slow-down: a fiftieth of the speed is left after a second; an edge stops it dead)
      this.vel *= Math.pow(0.02, dt / 1000);
      if (this.camX === before || Math.abs(this.vel) < 0.02) {
        this.vel = 0;
        this.remember();
      }
    }
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    this.pan(dt);
    for (const a of this.actors.values()) {
      this.think(a, this.now);
      this.step(a, dt, this.now);
    }
    this.stepGoat(dt);
    this.draw();
    this.hint();
  }

  /** Duchess's patch: the floor in front of the hearth, between the round tables. */
  private static GOAT = { y: 254, min: ROOM_W + 100, max: ROOM_W + 290 };

  private stepGoat(dt: number): void {
    if (!this.goatArt) {
      void goatHalfSheet().then((im) => (this.goatArt = im));
      return;
    }
    const p = Tavern.GOAT;
    this.goat ??= { ...newGoat((p.min + p.max) / 2, this.now), face: -1 };
    stepGoat(this.goat, dt, this.now, { min: p.min, max: p.max, friends: [] }, Math.random, this.reduced);
  }

  /** Duchess, with a shadow under her feet. */
  private duchess(): void {
    const g = this.ctx;
    const goat = this.goat!;
    const x = Math.round(goat.x);
    const foot = Tavern.GOAT.y;
    g.fillStyle = 'rgba(8, 3, 1, 0.38)';
    g.fillRect(x - 6, foot, 12, 1);
    // (the half-size sheet: she stands about half a hero's height in the hall)
    const f = FRAME / 2;
    const lift = Math.round(hopLift(goat, this.now) / 2);
    const bob = chewBob(goat, this.now, this.reduced);
    const dy = foot - f - lift - bob;
    g.drawImage(this.goatArt!, goatFrame(goat) * f, 0, f, f, x - f / 2, dy, f, f);
    drawDuchessCosmetic(g, settings().duchessHat, x - f / 2, dy, 0.5, goat.face, 0);
  }

  /** The room names and edge arrows under the picture: which room the view is on, and which ways there is more to see. */
  private hint(): void {
    const mid = this.camX + this.viewW / this.scale / 2;
    const room = clamp(Math.floor(mid / ROOM_W), 0, ROOMS - 1);
    if (room !== this.lastRoom) {
      this.lastRoom = room;
      this.roomBtns.forEach((b, i) => b.classList.toggle('on', i === room));
    }
    const max = Math.max(0, SCENE_W - this.viewW / this.scale);
    this.edgeL.classList.toggle('on', this.camX > 6);
    this.edgeR.classList.toggle('on', this.camX < max - 6);
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    g.globalAlpha = 1;
    // (the view is a whole number of screen pixels from the baked picture, so the pixels stay crisp)
    const px = Math.round(this.camX * s);
    const py = Math.round(this.camY * s);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#120a06';
    g.fillRect(0, 0, this.viewW, this.viewH);
    const sy = py + CEIL_H * s;
    g.drawImage(this.still, px, Math.max(0, sy), this.viewW, this.viewH, 0, Math.max(0, -sy), this.viewW, this.viewH);
    // (from here on everything is in room pixels, moved by the view)
    g.setTransform(s, 0, 0, s, -px, -py);
    const left = this.camX - 110;
    const right = this.camX + this.viewW / s + 110;
    const list: { depth: number; paint: () => void }[] = [];
    for (const p of PROPS) {
      if (p.x < left || p.x > right) continue;
      const im = a[p.sprite];
      list.push({ depth: p.depth ?? p.y, paint: () => g.drawImage(im, Math.round(p.x - im.width / 2), p.y - im.height) });
    }
    for (const kind of ALL_HEROES) {
      const spot = SPOTS[kind];
      if (spot.x < left || spot.x > right) continue;
      const actor = this.actors.get(kind);
      // (an empty seat: no one is recruited yet, or they have wandered off)
      if (spot.seat !== 'none' && (!actor || Math.abs(actor.x - spot.x) > 3)) list.push({ depth: spot.depth - 0.5, paint: () => this.seat(a, spot) });
      if (actor) list.push({ depth: spot.depth, paint: () => this.hero(actor) });
    }
    if (this.goat && this.goatArt && Tavern.GOAT.min - 30 < right && Tavern.GOAT.max + 30 > left) list.push({ depth: Tavern.GOAT.y, paint: () => this.duchess() });
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    // (the fire and the lamps burn steadily: no flicker)
    g.globalCompositeOperation = 'lighter';
    const flick = 0.55;
    for (const l of GLOWS) {
      if (l.x + l.r < this.camX || l.x - l.r > this.camX + this.viewW / s) continue;
      g.globalAlpha = clamp(flick, 0, 1);
      const im = this.glowArt(l.r, l.al);
      g.drawImage(im, Math.round(l.x - l.r), Math.round(l.y - l.r), im.width / s, im.height / s);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  private seat(a: Record<string, HTMLImageElement>, spot: Spot): void {
    const g = this.ctx;
    const s = this.scale;
    const im = a[spot.seat];
    const x = Math.round(spot.x - im.width / 2);
    const y = spot.y + 1 - im.height;
    if (spot.seat === 'chair' && spot.facing === -1) {
      g.transform(-1, 0, 0, 1, x + im.width, 0);
      g.drawImage(im, 0, y);
      this.reset(s);
    } else g.drawImage(im, x, y);
  }

  /** Put the view's transform back after a mirrored drawing (the one the frame is in the middle of). */
  private reset(s: number): void {
    this.ctx.setTransform(s, 0, 0, s, -Math.round(this.camX * s), -Math.round(this.camY * s));
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
    // (a shadow under the feet)
    g.fillStyle = 'rgba(8, 3, 1, 0.38)';
    const sw = Math.round(rig.figure * k * 0.34);
    g.fillRect(fx - sw, fy, sw * 2, 2);
    g.fillRect(fx - sw + 2, fy - 1, (sw - 2) * 2, 1);
    const dw = rig.w * k;
    const dh = rig.h * k;
    const dy = fy - lift - dh;
    const flip = (a.face === 1) !== rig.facesRight;
    // (an awakened hero stands in its class's aura: the glow and the parts behind it, then the parts in front)
    const tall = rig.figure * k;
    if (a.step) {
      drawAuraGlow(g, a.kind, a.step, fx, fy, tall);
      drawAura(g, a.aura, fx, fy, tall, this.now, 'back', a.face, this.reduced);
    }
    if (flip) {
      // (a mirrored transform set and put back by hand: save and restore are slow on a phone's canvas)
      g.transform(-1, 0, 0, 1, fx, 0);
      g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, -dw / 2, dy, dw, dh);
      this.reset(s);
    } else g.drawImage(rig.img, i * rig.w, r * rig.h, rig.w, rig.h, fx - dw / 2, dy, dw, dh);
    if (a.step) drawAura(g, a.aura, fx, fy, tall, this.now, 'front', a.face, this.reduced);
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
    g.fillStyle = tok('--s1', '#0b0e12');
    g.fillRect(s, 0, 11 * s, 13 * s);
    g.fillRect(0, s, 13 * s, 11 * s);
    g.fillRect(5 * s, 13 * s, 3 * s, 2 * s);
    g.fillStyle = tok('--s14', '#cfd9e3');
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
    this.ctx.drawImage(this.bubbleArt(a.emote!.name), cx - 6, y, 13, 15);
  }

  // ---- tapping ----

  private tap(e: PointerEvent): void {
    const box = this.canvas.getBoundingClientRect();
    const rx = this.camX + (e.clientX - box.left) / this.scale;
    const ry = this.camY + (e.clientY - box.top) / this.scale;
    // (Duchess first: a tap on her few pixels is hers, and she hops)
    if (this.goat && this.goatArt && Math.abs(rx - this.goat.x) < 12 && ry > Tavern.GOAT.y - 20 && ry < Tavern.GOAT.y + 6) {
      if (tapGoat(this.goat, this.now)) {
        try {
          const raw = localStorage.getItem('legends.meta');
          if (raw) {
            const m = JSON.parse(raw);
            m.duchessTaps = (m.duchessTaps ?? 0) + 1;
            localStorage.setItem('legends.meta', JSON.stringify(m));
          }
        } catch {
          /* ignore */
        }
        this.cycleDuchessHat(e.clientX, box.top + (Tavern.GOAT.y - 24 - this.camY) * this.scale);
      }
      return;
    }
    // (decorative trophy wall plaque in the hearth hall)
    if (rx >= ROOM_W + 120 && rx <= ROOM_W + 264 && ry >= 10 && ry <= 90) {
      if (this.meta) {
        this.trophyModal.open(this.meta);
        return;
      }
    }
    // (generous: the hero whose body is nearest the finger wins, within a reach a little wider and taller than the body, so a
    // thumb that lands beside a hero, or on the seat they sit on, still picks them; on a tie the one in front wins)
    let best: { kind: string; d: number; depth: number } | null = null;
    for (const kind of ALL_HEROES) {
      const spot = SPOTS[kind];
      const a = this.actors.get(kind);
      // (a hero's body, or the empty seat that waits for them)
      const half = Math.max(16, a ? (a.rig.w * a.k) / 4 : 14) + 8;
      const tall = (a ? a.rig.figure * a.k : 34) + 6;
      const cx = a ? a.x : spot.x;
      if (rx < cx - half || rx > cx + half || ry < spot.y - tall || ry > spot.y + 12) continue;
      const d = Math.hypot((rx - cx) / half, (ry - (spot.y - tall / 2)) / (tall / 2));
      if (!best || d < best.d - 0.15 || (Math.abs(d - best.d) <= 0.15 && spot.depth > best.depth)) best = { kind, d, depth: spot.depth };
    }
    if (best) this.onPick(best.kind);
  }

  private cycleDuchessHat(x: number, y: number): void {
    let meta: { duchessTaps?: number; duchessLucky?: boolean; duchessHay?: boolean } = {};
    try {
      const raw = localStorage.getItem('legends.meta');
      if (raw) meta = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    const unlocked = DUCHESS_COSMETICS.filter((c) => c.unlocked(meta));
    if (unlocked.length <= 1) {
      goatSays('tap', { x, y });
      return;
    }
    const currentId = settings().duchessHat;
    const idx = unlocked.findIndex((c) => c.id === currentId);
    const next = unlocked[(idx + 1) % unlocked.length];
    setSetting('duchessHat', next.id);
    if (next.id === 'none') {
      showQuip({ x, y }, 'Mehh! (Costume removed)', { who: 'Duchess', goat: true, hold: 1800 });
    } else {
      showQuip({ x, y }, `Mehh! (Equipped: ${next.name})`, { who: 'Duchess', goat: true, hold: 2000 });
    }
  }
}
