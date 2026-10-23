// The Recruit tab's picture: a summoning hall seen from the side like the tavern, with a glowing circle on the floor, arcane
// pillars, braziers, banners (they are in the wall picture) and a robed summoner. The pull buttons and the odds
// plaques sit over it. A pull is played here first (the circle charges and flares, a beam rises, the heroes step out of it) and
// then the page opens the usual card reveal. It only draws: it reads the Meta, never changes it, and the pull itself is done by
// the gacha. Drawn in the room's own pixels times a whole-number scale, nearest neighbour, only while the tab is showing.

import { ALL_HEROES, UNITS } from './sim/units';
import { pullCost, type Meta, type Pull } from './sim/meta';
import { pityLine } from './gacha';
import { heroRig } from './render/awakenRig';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { beamKind, fanSpots, hallLayout, MIN_H, ROOM_W, WALL_H, type BeamKind, type HallLayout, type Timeline } from './render/hallSpots';
import { cardAt, dimAt, shakeAt, showcaseAt, summonPlan, type ShowPlan } from './render/summonRules';
import { duck, hushSummon, play as playSfx } from './render/sound';
import wallUrl from './art/hall/wall.png';
import floorUrl from './art/hall/floor.png';
import circleUrl from './art/hall/circle.png';
import pillarUrl from './art/hall/pillar.png';
import brazierUrl from './art/hall/brazier.png';
import summoner1Url from './art/hall/summoner1.png';
import summoner2Url from './art/hall/summoner2.png';
import flameUrl from './art/hall/fx_fire-flame.png';
import lightPillarUrl from './art/hall/fx_light-pillar.png';

const ART: Record<string, string> = { wall: wallUrl, floor: floorUrl, circle: circleUrl, pillar: pillarUrl, brazier: brazierUrl, summoner1: summoner1Url, summoner2: summoner2Url, flame: flameUrl, lightPillar: lightPillarUrl };
let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

const CSS = `
.hm-recruit, .hm-spells { padding: 0; overflow: hidden; }
.hlWrap { position: absolute; inset: 0; overflow: hidden; background: #140c1c; }
.hlRoom { position: absolute; top: 0; image-rendering: pixelated; }
.hlCount { position: absolute; left: 8px; top: 8px; padding: 3px 9px 4px; font: 700 12px var(--body); letter-spacing: 0.5px; color: var(--gold-hi); text-shadow: 0 1px 0 var(--black); background: rgb(var(--s2-rgb) / 0.85); box-shadow: 0 0 0 2px var(--p2), 0 0 0 4px var(--p0); pointer-events: none; }
.hlCount small { display: block; font-size: 9px; font-weight: 400; letter-spacing: 0; color: var(--p4); }
.hlOdds { position: absolute; right: 10px; top: 8px; min-height: 36px; padding: 0 8px; font-size: 12px; }
.hlLow { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 12px 10px; pointer-events: none; }
.hlLow > * { pointer-events: auto; }
.hlScroll { width: 100%; max-width: 360px; padding: 6px 10px 7px; text-align: center; color: var(--text); background: var(--s4); box-shadow: 0 -2px 0 var(--s1), 0 2px 0 var(--s1), -2px 0 0 var(--s1), 2px 0 0 var(--s1), inset 0 0 0 2px var(--s10), 0 4px 0 2px rgb(var(--black-rgb) / 0.4); }
.hlScroll b { display: block; font: 700 12px var(--body); letter-spacing: 0.3px; }
.hlScroll b em { font-style: normal; color: var(--accent-hi); }
.hlScroll .odds { display: block; margin-top: 3px; font: 400 10px var(--body); font-style: normal; }
.hlBar { display: flex; gap: 10px; width: 100%; max-width: 360px; }
.hlBar button { flex: 1; font-size: 15px; line-height: 1.15; padding: 4px 0; }
.hlBar button small { display: block; font-size: 11px; font-weight: 400; }
.hlSkip { position: absolute; inset: 0; z-index: 6; display: none; touch-action: manipulation; }
.hlSkip.on { display: block; }
.hlOver { position: absolute; left: 0; right: 0; top: 52px; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; text-align: center; }
.hlRibbon { width: 100%; padding: 5px 0 6px; font: 700 24px var(--display); letter-spacing: 6px; text-indent: 6px; color: var(--btn-ink); text-shadow: 0 1px 0 rgb(var(--white-rgb) / 0.5); background: linear-gradient(var(--e9), var(--e6) 55%, var(--e3)); box-shadow: 0 -3px 0 var(--s3), 0 3px 0 var(--s3), 0 0 22px rgb(var(--e7-rgb) / 0.7); }
.hlBanner { padding: 2px 10px 3px; font: 700 13px var(--display); letter-spacing: 3px; text-indent: 3px; color: var(--g0); background: var(--g5); box-shadow: 0 0 0 2px var(--g0), 0 0 14px rgb(var(--g5-rgb) / 0.7); }
.hlCard { padding: 4px 14px 5px; background: rgb(var(--s1-rgb) / 0.82); box-shadow: 0 0 0 2px var(--p4), 0 0 0 4px var(--s2); }
.hlCard b { display: block; font: 700 18px var(--display); color: var(--white); text-shadow: 0 1px 0 var(--black); }
.hlCard em { display: block; font: 400 11px var(--body); font-style: normal; color: var(--p5); }
.hlCard small { display: block; margin-top: 2px; font: 700 12px var(--body); color: var(--g5); }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** The beam's two colours (the outer haze, the bright core) by kind. */
const BEAM: Record<BeamKind, [string, string]> = {
  star: ['#4a9cff', '#d6ecff'],
  light: ['#f0b44a', '#fff6cc'],
};

interface Spark {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  col: string;
}

/** A pooled bit of the show: a spark or a gold coin, thrown with gravity. */
interface Bit {
  kind: 'spark' | 'coin';
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  col: string;
}

/** The grand show's colours: the main light, the bright core, and the rgb of its glow. */
const ACCENT = { main: '#f0b44a', core: '#fff6cc', rgb: '255, 200, 80' };
/** The ring of light under an arriving hero's feet. */
const RING_LIGHT = '#ffe27a';
/** The most bits alive at once (phones draw them one fillRect each). */
const MAX_BITS = 240;

interface Arrival {
  idx: number;
  /** The figure's height in room pixels in the fan (the showcase draws it larger). */
  fig: number;
  kind: string;
  img: HTMLImageElement;
  w: number;
  h: number;
  row: number;
  frames: number;
  k: number;
  facesRight: boolean;
  x: number;
  y: number;
  face: 1 | -1;
}

interface Show {
  t0: number;
  plan: ShowPlan;
  tl: Timeline;
  arrivals: Arrival[];
  resolve: () => void;
  got: Pull[];
  /** The next of the plan's sounds to play, and whether the flare's burst and the shown card have happened. */
  cueI: number;
  burst: boolean;
  cardKey: string;
}

export interface HallHooks {
  /** A pull button was pressed. */
  onSummon(count: 1 | 10): void;
  /** The "Odds and heroes" button: opens the collection screen. */
  onCollection(): void;
}

export class SummoningHall {
  readonly root = el('div', 'hlWrap');
  private canvas = el('canvas', 'hlRoom');
  private ctx = this.canvas.getContext('2d')!;
  private count = el('div', 'hlCount');
  private scroll = el('div', 'hlScroll');
  private pull1 = el('button', '');
  private pull10 = el('button', 'primary');
  private still: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private lay: HallLayout = hallLayout(MIN_H);
  private scale = 2;
  private meta: Meta | null = null;
  private sparks: Spark[] = [];
  private bits: Bit[] = [];
  private glowTint: HTMLCanvasElement | null = null;
  private skipPad = el('div', 'hlSkip');
  private over = el('div', 'hlOver');
  private shakeOn = settings().shake;
  private shakeCss = '';
  private show: Show | null = null;
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private watch: ResizeObserver;

  constructor(private hooks: HallHooks) {
    if (!document.getElementById('hallStyle')) {
      const st = el('style');
      st.id = 'hallStyle';
      st.textContent = CSS;
      document.head.append(st);
    }
    const odds = el('button', 'small hlOdds', 'Odds · heroes');
    odds.addEventListener('click', () => this.hooks.onCollection());
    const bar = el('div', 'hlBar');
    bar.append(this.pull1, this.pull10);
    const low = el('div', 'hlLow');
    low.append(this.scroll, bar);
    this.root.append(this.canvas, this.count, odds, low, this.over, this.skipPad);
    // (a tap anywhere skips the show straight to the result)
    this.skipPad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.finish(true);
    });
    this.pull1.addEventListener('click', () => this.hooks.onSummon(1));
    this.pull10.addEventListener('click', () => this.hooks.onSummon(10));
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => {
      this.saver = s.saver;
      this.shakeOn = s.shake;
    });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    // (a test page reaches the hall as `window.__hall`, to play a made-up pull)
    (window as unknown as { __hall?: SummoningHall }).__hall = this;
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Redraw the plaques and the buttons for the meta (crowns, odds, heroes recruited). */
  update(meta: Meta): void {
    this.meta = meta;
    const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k)).length;
    this.count.replaceChildren(`${have} of ${ALL_HEROES.length} heroes`, el('small', '', 'the summoning hall'));
    const busy = !!this.show;
    for (const [b, n] of [[this.pull1, 1], [this.pull10, 10]] as const) {
      b.replaceChildren(`Summon ×${n}`, el('small', '', `${pullCost(n)} crowns`));
      b.disabled = busy || meta.crowns < pullCost(n);
    }
    // (a pull is shards of one hero; the line names the hero nearest to joining)
    const line = el('b', '', 'Shards of one hero a pull');
    const odds = el('i', 'odds', pityLine(meta));
    this.scroll.replaceChildren(line, odds);
  }

  /** Play a pull in the hall: resolves when the heroes have stepped out and it is time for the card reveal. */
  play(got: Pull[]): Promise<void> {
    const a = art;
    const meta = this.meta;
    if (!this.running || !a || !this.still || !meta || this.show) return Promise.resolve();
    const plan = summonPlan(got, this.reduced);
    const tl = plan.tl;
    const spots = fanSpots(got.length, this.lay.circle.x, this.lay.circle.y);
    const arrivals: Arrival[] = [];
    got.forEach((p, i) => {
      const def = UNITS[p.kind];
      const rig = heroRig(meta, p.kind);
      if (!rig) return;
      const spot = spots[i];
      const fig = Math.min(46, Math.max(30, rig.figure * def.scale * 0.9));
      arrivals.push({
        idx: i,
        fig,
        kind: p.kind,
        img: rig.img,
        w: rig.w,
        h: rig.h,
        row: Math.max(0, rig.rows.indexOf('idle')),
        frames: rig.counts.idle ?? 1,
        k: fig / rig.figure,
        facesRight: rig.facesRight,
        x: spot.x,
        y: spot.y,
        face: spot.x < this.lay.circle.x ? 1 : -1,
      });
    });
    this.pull1.disabled = this.pull10.disabled = true;
    return new Promise((resolve) => {
      this.show = { t0: this.now, plan, tl, arrivals, resolve, got, cueI: 0, burst: false, cardKey: '' };
      this.skipPad.classList.add('on');
      duck(true, 'summon');
      // (the arrivals are drawn in the order of the pull, so the heroes appear one after another)
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
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  /** Stop drawing (another tab is showing). A pull in flight is finished at once so the reveal is not lost. */
  stop(): void {
    this.running = false;
    this.halt();
    this.finish(true);
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** The show is over (`cut`: skipped by a tap or the tab changing, so its sound is hushed). */
  private finish(cut = false): void {
    const s = this.show;
    if (!s) return;
    this.show = null;
    if (cut) hushSummon();
    duck(false, 'summon');
    this.skipPad.classList.remove('on');
    this.over.replaceChildren();
    this.bits = [];
    this.setShake(0, 0);
    if (this.meta) this.update(this.meta);
    s.resolve();
  }

  private fit(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h || !art) return;
    const s = Math.max(2, Math.min(3, Math.floor(w / ROOM_W)));
    const lay = hallLayout(Math.floor(h / s));
    if (s === this.scale && this.still && this.canvas.height === lay.h * s && this.lay.h === lay.h) {
      this.canvas.style.left = `${Math.round((w - ROOM_W * s) / 2)}px`;
      return;
    }
    this.scale = s;
    this.lay = lay;
    this.canvas.width = ROOM_W * s;
    this.canvas.height = lay.h * s;
    this.canvas.style.width = `${ROOM_W * s}px`;
    this.canvas.style.height = `${lay.h * s}px`;
    this.canvas.style.left = `${Math.round((w - ROOM_W * s) / 2)}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.still = this.paintStill(art, s);
    this.glow = this.paintGlow(s);
    this.glowTint = this.paintGlow(s, '255, 190, 60');
  }

  /** The part that never changes: the wall, the floor with its shade and the circle's base. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const { h, circle } = this.lay;
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#140c1c';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(a.wall, 0, 0, a.wall.width * s, a.wall.height * s);
    const fw = a.floor.width;
    const fh = a.floor.height;
    for (let x = 0; x < ROOM_W; x += fw) for (let y = WALL_H; y < h; y += fh) g.drawImage(a.floor, x * s, y * s, fw * s, fh * s);
    // (the floor is darker where the wall meets it: steps, not a smooth blend, to stay pixel art)
    [0.55, 0.4, 0.28, 0.18, 0.1, 0.04].forEach((al, i) => {
      g.fillStyle = `rgba(10, 4, 20, ${al})`;
      g.fillRect(0, (WALL_H + i * 6) * s, ROOM_W * s, 6 * s);
    });
    g.fillStyle = 'rgba(10, 4, 20, 0.32)';
    g.fillRect(0, WALL_H * s, ROOM_W * s, (h - WALL_H) * s);
    // (the floor fades to black towards the bottom, where the buttons sit)
    const fade = g.createLinearGradient(0, (h - 90) * s, 0, h * s);
    fade.addColorStop(0, 'rgba(10, 4, 20, 0)');
    fade.addColorStop(1, 'rgba(10, 4, 20, 0.7)');
    g.fillStyle = fade;
    g.fillRect(0, (h - 90) * s, ROOM_W * s, 90 * s);
    const ci = a.circle;
    g.drawImage(ci, Math.round(circle.x - ci.width / 2) * s, Math.round(circle.y - ci.height / 2) * s, ci.width * s, ci.height * s);
    const vg = g.createRadialGradient(c.width / 2, c.height * 0.4, c.height * 0.3, c.width / 2, c.height * 0.4, c.width * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,2,16,0.5)');
    g.fillStyle = vg;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** The brazier light and the crystals' glow, drawn over everything and flickered by opacity. */
  private paintGlow(s: number, tint?: string): HTMLCanvasElement {
    const { h, braziers, pillars } = this.lay;
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    const lamp = (x: number, y: number, r: number, rgb: string, al: number) => {
      const rg = g.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      rg.addColorStop(0, `rgba(${rgb}, ${al})`);
      rg.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    };
    for (const b of braziers) lamp(b.x, b.y - 38, tint ? 64 : 46, tint ?? '255, 150, 60', tint ? 0.6 : 0.34);
    for (const p of pillars) lamp(p.x, p.y - 56, tint ? 44 : 30, tint ?? '170, 100, 255', tint ? 0.45 : 0.22);
    return c;
  }

  // ---- drawing ----

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    this.tick(dt);
    this.draw();
    const s = this.show;
    if (!s) return;
    const at = this.now - s.t0;
    // (the show's sounds, the flash and the cards go out as their times pass)
    while (s.cueI < s.plan.cues.length && at >= s.plan.cues[s.cueI].at) playSfx(s.plan.cues[s.cueI++].cue);
    this.syncOverlay(s, at);
    if (at >= s.tl.done) this.finish();
  }

  /** How charged the circle is (0 at rest, up to 1 while a pull builds), and how far into the pull we are. */
  private charge(): { c: number; t: number } {
    const s = this.show;
    if (!s) return { c: 0, t: -1 };
    const t = this.now - s.t0;
    return { c: Math.min(1, t / s.tl.charge) * (t < s.tl.beam ? 1 : Math.max(0, 1 - (t - s.tl.beam) / 600)), t };
  }

  private setShake(dx: number, dy: number): void {
    const css = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
    if (css === this.shakeCss) return;
    this.shakeCss = css;
    this.canvas.style.transform = css;
  }

  private tick(dt: number): void {
    const show = this.show;
    const plan = show?.plan;
    const grand = plan?.tier === 'grand';
    const t = show ? this.now - show.t0 : -1;
    const { c } = this.charge();
    const cx = this.lay.circle.x;
    const cy = this.lay.circle.y;
    // (sparks lift off the circle: a few at rest, a shower while it charges, a bigger one for the grand show)
    if (!this.reduced || (show && !grand)) {
      const rate = (show ? 40 + 60 * c : 5) * (grand ? 2.2 : 1) * (dt / 1000);
      for (let n = rate; n > 0; n--) {
        if (n < 1 && Math.random() > n) break;
        const a = rand(0, Math.PI * 2);
        const r = Math.sqrt(Math.random());
        const col = grand ? (Math.random() < 0.5 ? ACCENT.main : ACCENT.core) : Math.random() < 0.5 ? '#ffd86a' : '#c88aff';
        this.sparks.push({ x: cx + Math.cos(a) * 34 * r, y: cy + Math.sin(a) * 16 * r, vy: rand(14, 34), life: 0, max: rand(700, 1500), col });
      }
    }
    for (const p of this.sparks) {
      p.life += dt;
      p.y -= p.vy * (dt / 1000);
    }
    this.sparks = this.sparks.filter((p) => p.life < p.max).slice(-160);

    if (show && plan && grand && !this.reduced) {
      const k = dt / 1000;
      const spawn = (rate: number, make: () => Bit) => {
        for (let n = rate * k; n > 0; n--) {
          if (n < 1 && Math.random() > n) break;
          this.bits.push(make());
        }
      };
      if (!show.burst && t >= show.tl.flare) {
        show.burst = true;
        this.burst(cx, cy);
      }
      const star = show.arrivals.find((a) => a.idx === plan.star);
      if (t >= show.tl.flare && t < show.tl.done) {
        // (gold coins and sparks keep tumbling down the beam)
        if (t < show.tl.beam + 400) {
          spawn(22, () => ({ kind: Math.random() < 0.5 ? 'coin' : 'spark', x: cx + rand(-16, 16), y: cy - rand(20, 150), vx: rand(-20, 20), vy: rand(-30, 10), g: 110, life: 0, max: rand(700, 1300), col: Math.random() < 0.5 ? '#ffd86a' : '#fff6cc' }));
        }
        // (and the new arrival gives off gold flecks)
        if (star && t >= plan.revealAt) {
          spawn(12, () => ({ kind: 'spark', x: star.x + rand(-8, 8), y: star.y - rand(0, star.fig), vx: rand(-6, 6), vy: -rand(14, 34), g: 0, life: 0, max: rand(700, 1300), col: Math.random() < 0.5 ? ACCENT.main : ACCENT.core }));
        }
      }
    }
    for (const b of this.bits) {
      b.life += dt;
      b.x += b.vx * (dt / 1000);
      b.vy += b.g * (dt / 1000);
      b.y += b.vy * (dt / 1000);
    }
    this.bits = this.bits.filter((b) => b.life < b.max && b.y < this.lay.h + 4).slice(-MAX_BITS);

    // the screen shake: the flare's
    if (show && plan && this.shakeOn && !this.reduced) {
      const amp = shakeAt(plan, t) * plan.shakeAmp;
      if (amp > 0.3) return this.setShake(Math.round(rand(-1, 1) * amp), Math.round(rand(-1, 1) * amp));
    }
    this.setShake(0, 0);
  }

  /** The flare's burst of light, coins and sparks flying up and out of the circle. */
  private burst(cx: number, cy: number): void {
    for (let i = 0; i < 70; i++) {
      const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(40, 150);
      const kind: Bit['kind'] = i % 2 ? 'coin' : 'spark';
      const col = kind === 'coin' ? '#ffd86a' : Math.random() < 0.5 ? ACCENT.main : ACCENT.core;
      this.bits.push({ kind, x: cx + rand(-8, 8), y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 150, life: 0, max: rand(900, 1700), col });
    }
  }

  /** The ribbon, the NEW HERO banner and the hero's card, put up as their times come. */
  private syncOverlay(s: Show, t: number): void {
    const plan = s.plan;
    if (plan.ribbonAt >= 0 && t >= plan.ribbonAt && !this.over.querySelector('.hlRibbon')) {
      const r = el('div', 'hlRibbon', 'SUMMONED');
      this.over.prepend(r);
      this.slam(r);
    }
    const card = cardAt(plan, t);
    const key = card ? `${card.idx}:${card.fresh}` : '';
    if (key === s.cardKey) return;
    s.cardKey = key;
    this.over.querySelectorAll('.hlBanner, .hlCard').forEach((n) => n.remove());
    if (!card) return;
    const p = s.got[card.idx];
    const def = UNITS[p.kind];
    if (card.fresh) {
      const banner = el('div', 'hlBanner', 'NEW HERO');
      this.over.append(banner);
      this.slam(banner);
    }
    const box = el('div', 'hlCard');
    box.append(el('b', '', def.name), el('em', '', def.role));
    if (!card.fresh) box.append(el('small', '', `+${p.shards} shard${p.shards === 1 ? '' : 's'}`));
    this.over.append(box);
    this.slam(box);
  }

  /** An element slamming in (a calm fade under reduced motion). */
  private slam(e: HTMLElement): void {
    if (this.reduced) e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
    else e.animate([{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(0.94)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }

  /** A filled ellipse made of whole-pixel rows (so it keeps hard pixel edges). */
  private ellipse(cx: number, cy: number, rx: number, ry: number): void {
    const g = this.ctx;
    const s = this.scale;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry)));
      g.fillRect((cx - half) * s, (cy + dy) * s, half * 2 * s, s);
    }
  }

  /** The outline of an ellipse, a row at a time. */
  private ring(cx: number, cy: number, rx: number, ry: number): void {
    const g = this.ctx;
    const s = this.scale;
    const half = (dy: number) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
    for (let dy = -ry; dy <= ry; dy++) {
      const h = half(dy);
      const run = Math.max(1, h - half(dy < 0 ? dy - 1 : dy + 1));
      g.fillRect((cx - h) * s, (cy + dy) * s, run * s, s);
      g.fillRect((cx + h - run) * s, (cy + dy) * s, run * s, s);
    }
  }

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    const { circle, pillars, braziers, summoner } = this.lay;
    const { c, t } = this.charge();
    const show = this.show;
    const plan = show?.plan ?? null;
    const grand = plan?.tier === 'grand';
    const W = this.canvas.width;
    const H = this.canvas.height;
    const sc = plan ? showcaseAt(plan, t) : null;
    g.globalAlpha = 1;
    g.drawImage(this.still, 0, 0);

    // the props and the summoner first, so the darkness can fall over them and the lights stay bright over it
    const props: { depth: number; paint: () => void }[] = [];
    for (const p of pillars) props.push({ depth: p.y, paint: () => g.drawImage(a.pillar, Math.round(p.x - a.pillar.width / 2) * s, (p.y - a.pillar.height) * s, a.pillar.width * s, a.pillar.height * s) });
    braziers.forEach((b, i) =>
      props.push({
        depth: b.y,
        paint: () => {
          g.drawImage(a.brazier, Math.round(b.x - a.brazier.width / 2) * s, (b.y - a.brazier.height) * s, a.brazier.width * s, a.brazier.height * s);
          // (the flame is the pack's six-frame 16-pixel fire, one frame every 110 ms; the two braziers are out of step)
          const f = Math.floor(this.now / 110 + i * 3) % 6;
          g.drawImage(a.flame, f * 16, 0, 16, 16, Math.round(b.x - 8) * s, (b.y - a.brazier.height - 8) * s, 16 * s, 16 * s);
        },
      }),
    );
    props.push({
      depth: summoner.y,
      paint: () => {
        const casting = show && t > 80 && t < show.tl.beam + 200;
        const im = casting ? a.summoner2 : a.summoner1;
        const bob = casting ? Math.round(Math.sin(this.now / 90)) : Math.sin(this.now / 700) > 0.4 ? 1 : 0;
        g.fillStyle = 'rgba(8, 3, 16, 0.4)';
        g.fillRect((summoner.x - 11) * s, (summoner.y - 1) * s, 22 * s, 2 * s);
        // (the summoner faces the circle: the picture looks left, so it is turned)
        g.save();
        g.translate(Math.round(summoner.x) * s, 0);
        g.scale(-1, 1);
        g.drawImage(im, -Math.round(im.width / 2) * s, (summoner.y - im.height - bob) * s, im.width * s, im.height * s);
        g.restore();
      },
    });
    props.sort((p, q) => p.depth - q.depth);
    for (const e of props) e.paint();

    // the darkness (a grand show darkens the hall as it builds; a showcase dims it a little too)
    let dim = plan ? dimAt(plan, t) : 0;
    if (sc) dim = Math.max(dim, 0.5 * Math.min(1, (t - sc.at) / 300));
    if (dim > 0.005) {
      g.fillStyle = `rgba(4, 0, 10, ${dim})`;
      g.fillRect(0, 0, W, H);
    }

    // the circle's glow: a slow pulse at rest, ramping up while it charges (gold in the grand show)
    const charged = c;
    g.globalCompositeOperation = 'lighter';
    const breathe = 0.5 + 0.5 * Math.sin(this.now / 600);
    const grow = grand ? 1.6 : 1;
    g.fillStyle = `rgba(${grand ? ACCENT.rgb : '150, 90, 255'}, ${0.1 + 0.08 * breathe + 0.3 * charged})`;
    this.ellipse(circle.x, circle.y, 30 + Math.round(4 * charged * grow), 14 + Math.round(2 * charged * grow));
    g.fillStyle = `rgba(255, 220, 130, ${0.06 + 0.04 * breathe + 0.35 * charged})`;
    this.ellipse(circle.x, circle.y, 14 + Math.round(6 * charged * grow), 6 + Math.round(3 * charged * grow));
    // (runes orbit the rim: slowly at rest, faster as it charges; they race in the grand show)
    const race = grand ? 2.6 : 1;
    const spin = this.reduced && !show ? 0 : this.now / ((show ? 500 - 300 * c : 2600) / race);
    const runes = grand ? 16 : 10;
    g.fillStyle = grand ? `rgba(${ACCENT.rgb}, ${0.7 + 0.3 * c})` : `rgba(255, 224, 140, ${0.55 + 0.4 * c})`;
    for (let i = 0; i < runes; i++) {
      const ang = spin + (i * Math.PI * 2) / runes;
      g.fillRect((Math.round(circle.x + Math.cos(ang) * 36) - 1) * s, (Math.round(circle.y + Math.sin(ang) * 17) - 1) * s, 2 * s, 2 * s);
    }
    g.globalCompositeOperation = 'source-over';

    // the flare: rings of light opening across the floor (one for a plain pull, two for a grand one)
    if (show) {
      const [haze, core] = BEAM[beamKind(grand)];
      const waves = grand ? 2 : 1;
      const reach = grand ? 1.25 : 1;
      for (let k = 0; k < waves; k++) {
        const st = show.tl.charge + k * 220;
        const dur = k ? 800 : 450;
        if (t < st || t >= st + dur) continue;
        const p = (t - st) / dur;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (1 - p) * (k ? 0.7 : 1);
        g.fillStyle = core;
        this.ring(circle.x, circle.y, 20 + Math.round(70 * p * reach), 9 + Math.round(30 * p * reach));
        g.fillStyle = haze;
        this.ring(circle.x, circle.y, 14 + Math.round(60 * p * reach), 6 + Math.round(26 * p * reach));
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }

    // the beam: columns of light stepping out from the circle, reaching the top of the room (the pack's pillar sheet over it in the grand show)
    if (show && t >= show.tl.charge - 40) {
      const rise = Math.min(1, (t - show.tl.charge) / (grand ? 200 : 280));
      const fade = t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 600);
      const top = Math.round(circle.y - (circle.y + 6) * rise);
      const [haze, core] = BEAM[beamKind(grand)];
      const wk = grand ? 1.8 : 1;
      const even = (n: number) => 2 * Math.round(n / 2);
      g.globalCompositeOperation = 'lighter';
      const col = (w: number, color: string, al: number) => {
        g.globalAlpha = al * fade;
        g.fillStyle = color;
        g.fillRect((circle.x - w / 2) * s, top * s, w * s, (circle.y - top) * s);
      };
      col(even(30 * wk), haze, 0.22);
      col(even(20 * wk), haze, 0.35);
      col(even(10 * wk), core, 0.8);
      if (grand && rise > 0.1 && !this.reduced) {
        // (gold rays fanning out of the pillar's foot)
        const n = 12;
        const spinR = this.now / 2400;
        for (let i = 0; i < n; i++) {
          const a0 = spinR + (i * Math.PI * 2) / n;
          g.globalAlpha = 0.14 * fade * rise;
          g.fillStyle = ACCENT.main;
          g.beginPath();
          g.moveTo(circle.x * s, (circle.y - 14) * s);
          g.lineTo((circle.x + Math.cos(a0 - 0.07) * 230) * s, (circle.y - 14 + Math.sin(a0 - 0.07) * 230) * s);
          g.lineTo((circle.x + Math.cos(a0 + 0.07) * 230) * s, (circle.y - 14 + Math.sin(a0 + 0.07) * 230) * s);
          g.fill();
        }
        if (rise >= 0.5) {
          const sp = a.lightPillar;
          const f = rise < 1 ? Math.min(5, Math.floor(rise * 6)) : 3 + (Math.floor(this.now / 90) % 3);
          g.save();
          g.beginPath();
          g.rect(0, top * s, W, (circle.y - top) * s);
          g.clip();
          g.globalAlpha = 0.85 * fade;
          for (let y = circle.y; y > top - 64; y -= 64) g.drawImage(sp, f * 32, 0, 32, 32, (circle.x - 32) * s, (y - 64) * s, 64 * s, 64 * s);
          g.restore();
        }
      }
      // (bright flecks climbing the shaft)
      g.fillStyle = core;
      const flecks = grand ? 24 : 9;
      for (let i = 0; i < flecks; i++) {
        const y = circle.y - ((this.now / 7 + i * 31) % (circle.y + 6));
        if (y < top) continue;
        g.globalAlpha = 0.9 * fade;
        g.fillRect((circle.x - 12 * wk + ((i * 7) % Math.round(24 * wk))) * s, Math.round(y) * s, 2 * s, 3 * s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // the arrivals, back to front (a showcase takes the stage alone and the rest fade away)
    if (show && plan) {
      const list: { depth: number; paint: () => void }[] = [];
      const away = sc ? 1 - Math.min(1, (t - sc.at) / 250) : 1;
      for (const ar of show.arrivals) {
        if (sc && ar.idx === sc.idx) continue;
        if (away < 0.03) continue;
        const rise = plan.rises[ar.idx];
        const star = ar.idx === plan.star && grand;
        list.push({ depth: ar.y, paint: () => this.arrive(ar, t - show.tl.heroAt[ar.idx], rise, { alpha: away, star }) });
      }
      list.sort((p, q) => p.depth - q.depth);
      for (const e of list) e.paint();
      if (sc) {
        const ar = show.arrivals.find((x) => x.idx === sc.idx);
        if (ar) {
          const e = 1 - (1 - Math.min(1, (t - sc.at) / 320)) ** 3;
          const big = (sc.mini ? 74 : 88) / ar.fig;
          const pose: Arrival = { ...ar, x: ar.x + (circle.x - ar.x) * e, y: ar.y + (circle.y + 18 - ar.y) * e, k: ar.k * (1 + (big - 1) * e), fig: ar.fig * (1 + (big - 1) * e) };
          this.arrive(pose, 1e6, 1, { alpha: 1, star: true, grown: 1 + (big - 1) * e });
        }
      }
    }

    // sparks, then the show's coins, sparks and embers, over everything
    for (const p of this.sparks) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.6);
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x) * s, Math.round(p.y) * s, s, s);
    }
    for (const b of this.bits) {
      const k = 1 - b.life / b.max;
      g.globalAlpha = Math.min(1, k * 1.8);
      g.fillStyle = b.col;
      if (b.kind === 'coin') {
        // (a coin spins: it is one to three pixels wide, with a bright middle)
        const w = 1 + (Math.floor(b.life / 90) % 3);
        g.fillRect(Math.round(b.x) * s, Math.round(b.y) * s, w * s, 3 * s);
        g.fillStyle = '#fff6cc';
        g.fillRect(Math.round(b.x) * s, (Math.round(b.y) + 1) * s, s, s);
      } else {
        g.globalCompositeOperation = 'lighter';
        const sz = 2;
        g.fillRect(Math.round(b.x) * s, Math.round(b.y) * s, sz * s, sz * s);
        g.globalCompositeOperation = 'source-over';
      }
    }
    g.globalAlpha = 1;

    // the braziers flicker, and the crystals breathe; in the grand show they flare gold
    if (this.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.6 + 0.22 * Math.sin(this.now / 130) * Math.sin(this.now / 410 + 1) + 0.08 * Math.sin(this.now / 47);
      g.drawImage(this.glow, 0, 0);
      const tint = grand ? this.glowTint : null;
      if (tint && show) {
        const build = Math.min(1, t / show.tl.charge);
        const after = t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 800);
        g.globalAlpha = Math.min(1, 0.9 * build * after * (0.9 + 0.1 * Math.sin(this.now / 700)));
        g.drawImage(tint, 0, 0);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    // the grand show leaves the room in gold
    if (show && plan && grand && t >= show.tl.flare) {
      const k = Math.min(1, (t - show.tl.flare) / 600);
      g.fillStyle = `rgba(200, 140, 20, ${0.07 * k * (t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 800))})`;
      g.fillRect(0, 0, W, H);
    }
    // a soft wash of the beam's light over the room as the circle flares (a slow swell and fade, never a flash)
    if (show && t >= show.tl.charge && t < show.tl.flare + 200) {
      const p = (t - show.tl.charge) / (show.tl.flare + 200 - show.tl.charge);
      g.globalAlpha = 0.08 * (1 - p);
      g.fillStyle = BEAM[beamKind(grand)][1];
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }

  /** One sprite frame, drawn into `g` (turned round when `flip`), its middle at `cx`. */
  private blit(g: CanvasRenderingContext2D, ar: Arrival, i: number, cx: number, dy: number, dw: number, dh: number, flip: boolean): void {
    if (flip) {
      g.save();
      g.translate(cx, 0);
      g.scale(-1, 1);
      g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, -dw / 2, dy, dw, dh);
      g.restore();
    } else g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, cx - dw / 2, dy, dw, dh);
  }

  /** One hero stepping out of the circle: it rises from the floor of the circle into its place, fading in, under a ring of light.
   *  `o.star`: the grand show's star, with its glow and halo;
   *  `o.grown`: how much larger than in the fan it is drawn (a showcase). */
  private arrive(ar: Arrival, since: number, rise: number, o: { alpha: number; star: boolean; grown?: number }): void {
    if (since < 0) return;
    const g = this.ctx;
    const s = this.scale;
    const p = Math.min(1, since / rise);
    const e = 1 - (1 - p) * (1 - p);
    const x = Math.round(ar.x);
    const y = ar.y;
    const gf = o.grown ?? 1;
    const dw = ar.w * ar.k * s;
    const dh = ar.h * ar.k * s;
    // (the grand show's star: a glow around the hero, and a halo ring over its head once it is in view)
    if (o.star) {
      const mid = (y - ar.fig / 2) * s;
      const rad = Math.max(ar.fig * 0.95, 30) * s;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(x * s, mid, 0, x * s, mid, rad);
      const al = 0.4 * e * o.alpha * (0.9 + 0.1 * Math.sin(this.now / 800));
      rg.addColorStop(0, `rgba(${ACCENT.rgb}, ${al})`);
      rg.addColorStop(1, `rgba(${ACCENT.rgb}, 0)`);
      g.fillStyle = rg;
      g.fillRect(x * s - rad, mid - rad, rad * 2, rad * 2);
      if (e > 0.8) {
        g.globalAlpha = o.alpha;
        g.fillStyle = ACCENT.core;
        this.ring(x, Math.round(y - ar.fig - 4), Math.round(8 * gf), Math.round(2 * gf) + 1);
        g.fillStyle = ACCENT.main;
        this.ring(x, Math.round(y - ar.fig - 4), Math.round(10 * gf), Math.round(3 * gf) + 1);
      }
      g.restore();
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * e * o.alpha;
    g.fillStyle = RING_LIGHT;
    this.ellipse(x, y, Math.round((o.star ? 13 : 11) * gf), Math.max(3, Math.round(3 * gf)));
    g.restore();
    g.fillStyle = `rgba(8, 3, 16, ${0.4 * o.alpha})`;
    g.fillRect((x - Math.round(6 * gf)) * s, y * s, Math.round(12 * gf) * s, 2 * s);
    const i = Math.floor(since / 150) % ar.frames;
    const lift = Math.round((1 - e) * 14);
    g.save();
    g.globalAlpha = e * o.alpha;
    const flip = (ar.face === 1) !== ar.facesRight;
    const dy = (y + lift) * s - dh;
    // (while it rises the part below the circle's floor line is cut off, so it comes up out of the ground)
    g.beginPath();
    g.rect(0, 0, this.canvas.width, y * s + 2 * s);
    g.clip();
    this.blit(g, ar, i, x * s, dy, dw, dh, flip);
    g.restore();
  }
}
