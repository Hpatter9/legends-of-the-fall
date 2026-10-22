// The Recruit tab's picture: a summoning hall seen from the side like the tavern, with a glowing circle on the floor, arcane
// pillars, braziers, banners (they are in the wall picture) and a robed summoner. The pull buttons and the pity and odds
// plaques sit over it. A pull is played here first (the circle charges and flares, a beam rises, the heroes step out of it) and
// then the page opens the usual card reveal. It only draws: it reads the Meta, never changes it, and the pull itself is done by
// the gacha. Drawn in the room's own pixels times a whole-number scale, nearest neighbour, only while the tab is showing.

import { ALL_HEROES, formOf, UNITS } from './sim/units';
import { MYTHIC_PITY, PITY, pullCost, rankOf, RARITY_NAMES, RATES, type Meta, type Pull } from './sim/meta';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { RARITY_LIGHT } from './render/uiFx';
import { onSettings, settings } from './settings';
import { gradeOfRank } from './render/tavernSpots';
import { beamKind, fanSpots, hallLayout, MIN_H, pullTimeline, ROOM_W, WALL_H, type BeamKind, type HallLayout, type Timeline } from './render/hallSpots';
import wallUrl from './art/hall/wall.png';
import floorUrl from './art/hall/floor.png';
import circleUrl from './art/hall/circle.png';
import pillarUrl from './art/hall/pillar.png';
import brazierUrl from './art/hall/brazier.png';
import summoner1Url from './art/hall/summoner1.png';
import summoner2Url from './art/hall/summoner2.png';
import flameUrl from './art/hall/fx_fire-flame.png';

const ART: Record<string, string> = { wall: wallUrl, floor: floorUrl, circle: circleUrl, pillar: pillarUrl, brazier: brazierUrl, summoner1: summoner1Url, summoner2: summoner2Url, flame: flameUrl };
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
.hlCount { position: absolute; left: 8px; top: 8px; padding: 3px 9px 4px; font: 700 12px var(--body); letter-spacing: 0.5px; color: var(--gold-hi); text-shadow: 0 1px 0 #000; background: rgba(20, 10, 30, 0.85); box-shadow: 0 0 0 2px #6a4a9a, 0 0 0 4px #1a0d2a; pointer-events: none; }
.hlCount small { display: block; font-size: 9px; font-weight: 400; letter-spacing: 0; color: #b9a8d8; }
.hlOdds { position: absolute; right: 10px; top: 8px; min-height: 36px; padding: 0 8px; font-size: 12px; }
.hlLow { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 12px 10px; pointer-events: none; }
.hlLow > * { pointer-events: auto; }
.hlScroll { width: 100%; max-width: 360px; padding: 6px 10px 7px; text-align: center; color: #3a2210; background: #e6d2a0; box-shadow: 0 -2px 0 #3a2210, 0 2px 0 #3a2210, -2px 0 0 #3a2210, 2px 0 0 #3a2210, inset 0 0 0 2px #c4a468, 0 4px 0 2px rgba(0, 0, 0, 0.4); }
.hlScroll b { display: block; font: 700 12px var(--body); letter-spacing: 0.3px; }
.hlScroll b em { font-style: normal; color: #7a2a1c; }
.hlScroll .rates { display: flex; justify-content: center; flex-wrap: wrap; gap: 2px 8px; margin-top: 3px; font: 400 10px var(--body); }
.hlScroll .rates i { font-style: normal; }
.hlScroll .rates i::before { content: ''; display: inline-block; width: 6px; height: 6px; margin-right: 3px; background: var(--c); box-shadow: 0 0 0 1px #3a2210; }
.hlBar { display: flex; gap: 10px; width: 100%; max-width: 360px; }
.hlBar button { flex: 1; font-size: 15px; line-height: 1.15; padding: 4px 0; }
.hlBar button small { display: block; font-size: 11px; font-weight: 400; }
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
  crystal: ['#b06aff', '#f0deff'],
  light: ['#f0b44a', '#fff6cc'],
  fire: ['#ff3a4a', '#ffe0a0'],
};

interface Spark {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  col: string;
}

interface Arrival {
  kind: string;
  rarity: number;
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
  tl: Timeline;
  best: number;
  arrivals: Arrival[];
  resolve: () => void;
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
    this.root.append(this.canvas, this.count, odds, low);
    this.pull1.addEventListener('click', () => this.hooks.onSummon(1));
    this.pull10.addEventListener('click', () => this.hooks.onSummon(10));
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Redraw the plaques and the buttons for the meta (crowns, pity, heroes recruited). */
  update(meta: Meta): void {
    this.meta = meta;
    const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k)).length;
    this.count.replaceChildren(`${have} of ${ALL_HEROES.length} heroes`, el('small', '', 'the summoning hall'));
    const busy = !!this.show;
    for (const [b, n] of [[this.pull1, 1], [this.pull10, 10]] as const) {
      b.replaceChildren(`Summon ×${n}`, el('small', '', `${pullCost(n)} crowns`));
      b.disabled = busy || meta.crowns < pullCost(n);
    }
    const line = el('b');
    line.append('Legendary in at most ', el('em', '', String(Math.max(0, PITY - meta.dry))), ' pulls · Mythic in ', el('em', '', String(Math.max(0, MYTHIC_PITY - meta.dryMythic))));
    const rates = el('div', 'rates');
    for (const r of [1, 2, 3, 4, 5] as const) {
      const i = el('i', '', `${RARITY_NAMES[r]} ${RATES[r]}%`);
      i.style.setProperty('--c', RARITY_LIGHT[r]);
      rates.append(i);
    }
    this.scroll.replaceChildren(line, rates);
  }

  /** Play a pull in the hall: resolves when the heroes have stepped out and it is time for the card reveal. */
  play(got: Pull[]): Promise<void> {
    const a = art;
    const meta = this.meta;
    if (!this.running || !a || !this.still || !meta || this.show) return Promise.resolve();
    const best = Math.max(...got.map((p) => p.rarity));
    const tl = pullTimeline(got.length, best, this.reduced);
    const spots = fanSpots(got.length, this.lay.circle.x, this.lay.circle.y);
    const arrivals: Arrival[] = [];
    got.forEach((p, i) => {
      const def = UNITS[p.kind];
      const rig = sheetInfo(formOf(def, gradeOfRank(rankOf(meta, p.kind))));
      if (!rig) return;
      const spot = spots[i];
      arrivals.push({
        kind: p.kind,
        rarity: p.rarity,
        img: rig.img,
        w: rig.w,
        h: rig.h,
        row: Math.max(0, rig.rows.indexOf('idle')),
        frames: rig.counts.idle ?? 1,
        k: Math.min(46, Math.max(30, rig.figure * def.scale * 0.9)) / rig.figure,
        facesRight: rig.facesRight,
        x: spot.x,
        y: spot.y,
        face: spot.x < this.lay.circle.x ? 1 : -1,
      });
    });
    this.pull1.disabled = this.pull10.disabled = true;
    return new Promise((resolve) => {
      this.show = { t0: this.now, tl, best, arrivals, resolve };
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
    this.finish();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private finish(): void {
    const s = this.show;
    if (!s) return;
    this.show = null;
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
  private paintGlow(s: number): HTMLCanvasElement {
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
    for (const b of braziers) lamp(b.x, b.y - 38, 46, '255, 150, 60', 0.34);
    for (const p of pillars) lamp(p.x, p.y - 56, 30, '170, 100, 255', 0.22);
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
    if (s && this.now - s.t0 >= s.tl.done) this.finish();
  }

  /** How charged the circle is (0 at rest, up to 1 while a pull builds), and how far into the pull we are. */
  private charge(): { c: number; t: number } {
    const s = this.show;
    if (!s) return { c: 0, t: -1 };
    const t = this.now - s.t0;
    return { c: Math.min(1, t / s.tl.charge) * (t < s.tl.beam ? 1 : Math.max(0, 1 - (t - s.tl.beam) / 600)), t };
  }

  private tick(dt: number): void {
    const { c } = this.charge();
    const cx = this.lay.circle.x;
    const cy = this.lay.circle.y;
    // (sparks lift off the circle: a few at rest, a shower while it charges)
    if (!this.reduced || this.show) {
      const rate = (this.show ? 40 + 60 * c : 5) * (dt / 1000);
      for (let n = rate; n > 0; n--) {
        if (n < 1 && Math.random() > n) break;
        const a = rand(0, Math.PI * 2);
        const r = Math.sqrt(Math.random());
        this.sparks.push({ x: cx + Math.cos(a) * 34 * r, y: cy + Math.sin(a) * 16 * r, vy: rand(14, 34), life: 0, max: rand(700, 1500), col: Math.random() < 0.5 ? '#ffd86a' : '#c88aff' });
      }
    }
    for (const p of this.sparks) {
      p.life += dt;
      p.y -= p.vy * (dt / 1000);
    }
    this.sparks = this.sparks.filter((p) => p.life < p.max).slice(-160);
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
    g.globalAlpha = 1;
    g.drawImage(this.still, 0, 0);

    // the circle's glow: a slow pulse at rest, ramping up while it charges
    g.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(this.now / 600);
    g.fillStyle = `rgba(150, 90, 255, ${0.1 + 0.08 * pulse + 0.3 * c})`;
    this.ellipse(circle.x, circle.y, 30 + Math.round(4 * c), 14 + Math.round(2 * c));
    g.fillStyle = `rgba(255, 220, 130, ${0.06 + 0.04 * pulse + 0.35 * c})`;
    this.ellipse(circle.x, circle.y, 14 + Math.round(6 * c), 6 + Math.round(3 * c));
    // (runes orbit the rim: slowly at rest, faster as it charges)
    const spin = this.reduced && !show ? 0 : this.now / (show ? 500 - 300 * c : 2600);
    g.fillStyle = `rgba(255, 224, 140, ${0.55 + 0.4 * c})`;
    for (let i = 0; i < 10; i++) {
      const ang = spin + (i * Math.PI * 2) / 10;
      g.fillRect((Math.round(circle.x + Math.cos(ang) * 36) - 1) * s, (Math.round(circle.y + Math.sin(ang) * 17) - 1) * s, 2 * s, 2 * s);
    }
    g.globalCompositeOperation = 'source-over';

    // the flare: a ring of light opening across the floor, and a flash of the beam's colour
    if (show && t >= show.tl.charge && t < show.tl.flare + 250) {
      const p = Math.min(1, (t - show.tl.charge) / 450);
      const [haze, core] = BEAM[beamKind(show.best)];
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1 - p;
      g.fillStyle = core;
      this.ring(circle.x, circle.y, 20 + Math.round(70 * p), 9 + Math.round(30 * p));
      g.fillStyle = haze;
      this.ring(circle.x, circle.y, 14 + Math.round(60 * p), 6 + Math.round(26 * p));
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // the beam: columns of light stepping out from the circle, reaching the top of the room
    if (show && t >= show.tl.charge - 40) {
      const grow = Math.min(1, (t - show.tl.charge) / 280);
      const fade = t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 600);
      const top = Math.round(circle.y - (circle.y + 6) * grow);
      const [haze, core] = BEAM[beamKind(show.best)];
      g.globalCompositeOperation = 'lighter';
      const col = (w: number, color: string, al: number) => {
        g.globalAlpha = al * fade;
        g.fillStyle = color;
        g.fillRect((circle.x - w / 2) * s, top * s, w * s, (circle.y - top) * s);
      };
      col(30 + 2 * Math.round(Math.sin(this.now / 90)), haze, 0.22);
      col(20, haze, 0.35);
      col(10, core, 0.8);
      // (bright flecks climbing the shaft)
      g.fillStyle = core;
      for (let i = 0; i < 9; i++) {
        const y = circle.y - ((this.now / 7 + i * 31) % (circle.y + 6));
        if (y < top) continue;
        g.globalAlpha = 0.9 * fade;
        g.fillRect((circle.x - 12 + ((i * 7) % 24)) * s, Math.round(y) * s, 2 * s, 3 * s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // props, the summoner and the arrivals, back to front
    const list: { depth: number; paint: () => void }[] = [];
    for (const p of pillars) list.push({ depth: p.y, paint: () => g.drawImage(a.pillar, Math.round(p.x - a.pillar.width / 2) * s, (p.y - a.pillar.height) * s, a.pillar.width * s, a.pillar.height * s) });
    braziers.forEach((b, i) =>
      list.push({
        depth: b.y,
        paint: () => {
          g.drawImage(a.brazier, Math.round(b.x - a.brazier.width / 2) * s, (b.y - a.brazier.height) * s, a.brazier.width * s, a.brazier.height * s);
          // (the flame is the pack's six-frame 16-pixel fire, one frame every 110 ms; the two braziers are out of step)
          const f = Math.floor(this.now / 110 + i * 3) % 6;
          g.drawImage(a.flame, f * 16, 0, 16, 16, Math.round(b.x - 8) * s, (b.y - a.brazier.height - 8) * s, 16 * s, 16 * s);
        },
      }),
    );
    list.push({
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
    if (show) show.arrivals.forEach((ar, i) => list.push({ depth: ar.y, paint: () => this.arrive(ar, t - show.tl.heroAt[i], show.tl.rise) }));
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();

    // sparks over everything
    for (const p of this.sparks) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.6);
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x) * s, Math.round(p.y) * s, s, s);
    }
    g.globalAlpha = 1;

    // the braziers flicker, and the crystals breathe
    if (this.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.6 + 0.22 * Math.sin(this.now / 130) * Math.sin(this.now / 410 + 1) + 0.08 * Math.sin(this.now / 47);
      g.drawImage(this.glow, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    // the white of the flare over the whole room
    if (show && t >= show.tl.charge && t < show.tl.flare + 200) {
      const p = (t - show.tl.charge) / (show.tl.flare + 200 - show.tl.charge);
      g.globalAlpha = 0.32 * (1 - p);
      g.fillStyle = BEAM[beamKind(show.best)][1];
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      g.globalAlpha = 1;
    }
  }

  /** One hero stepping out of the circle: it rises from the floor of the circle into its place, fading in, under a ring in its tier's colour. */
  private arrive(ar: Arrival, since: number, rise: number): void {
    if (since < 0) return;
    const g = this.ctx;
    const s = this.scale;
    const p = Math.min(1, since / rise);
    const e = 1 - (1 - p) * (1 - p);
    const x = Math.round(ar.x);
    const y = ar.y;
    // (the ring under the feet pulses; a Mythic's alternates crimson and gold)
    const light = ar.rarity === 5 && Math.floor(this.now / 300) % 2 ? '#ffd24a' : RARITY_LIGHT[ar.rarity];
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * e;
    g.fillStyle = light;
    this.ellipse(x, y, 11 + (ar.rarity >= 4 ? 2 : 0), 3);
    g.restore();
    g.fillStyle = 'rgba(8, 3, 16, 0.4)';
    g.fillRect((x - 6) * s, y * s, 12 * s, 2 * s);
    const dw = ar.w * ar.k * s;
    const dh = ar.h * ar.k * s;
    const i = Math.floor(since / 150) % ar.frames;
    const lift = Math.round((1 - e) * 14);
    g.save();
    g.globalAlpha = e;
    const flip = (ar.face === 1) !== ar.facesRight;
    const dy = (y + lift) * s - dh;
    // (while it rises the part below the circle's floor line is cut off, so it comes up out of the ground)
    g.beginPath();
    g.rect(0, 0, this.canvas.width, y * s + 2 * s);
    g.clip();
    if (flip) {
      g.translate(x * s, 0);
      g.scale(-1, 1);
      g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, -dw / 2, dy, dw, dh);
    } else g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, x * s - dw / 2, dy, dw, dh);
    g.restore();
  }
}
