// The Spells tab's picture: a wizard's library chapel seen from the side, a tall stained-glass window between shelves of books
// and, in front of it, the spellbook on its lectern. The spellbook's own page (`spellbookView`, the same one the overlay shows)
// lies open on a parchment panel below, scrolling inside it. The candles flicker and a few motes of light drift off the open
// book; that is all that moves, and only while the tab is showing (battery saver caps it at 30 fps, reduced motion keeps
// the candles still). It reads the Meta through the spellbook and changes nothing itself.

import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { spellbookView } from './spellbook';
import type { Meta } from './sim/meta';
import { spellsOpen } from './sim/castle';
import { CANDLES, LECTERN, LIB_H, LIB_W } from './render/libraryLayout';
import wallUrl from './art/library/wall.png';
import lecternUrl from './art/library/lectern.png';

const ART: Record<string, string> = { wall: wallUrl, lectern: lecternUrl };
let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

const CSS = `
.lbWrap { position: absolute; inset: 0; overflow: hidden; background: var(--s1); }
.lbRoom { position: absolute; top: 0; image-rendering: pixelated; }
.lbPanel { position: absolute; left: 0; right: 0; bottom: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; overscroll-behavior: contain; padding: 0 12px 14px; scrollbar-width: none; }
.lbPanel::-webkit-scrollbar { display: none; }
.lbPage { position: relative; max-width: 440px; margin: 0 auto; padding: 8px 10px 12px; color: var(--text); background: var(--s4); box-shadow: 0 -2px 0 var(--s1), 0 2px 0 var(--s1), -2px 0 0 var(--s1), 2px 0 0 var(--s1), inset 0 0 0 2px var(--s10), inset 0 0 0 4px var(--s4), inset 0 0 0 5px var(--s7); }
.lbHead { position: sticky; top: -1px; z-index: 1; display: flex; align-items: baseline; gap: 8px; padding: 2px 0 6px; margin-bottom: 4px; background: var(--s4); border-bottom: 2px solid var(--s7); }
.lbHead h2 { margin: 0; flex: 1; font: 700 20px var(--display); color: var(--accent-hi); letter-spacing: 1px; text-shadow: 0 2px 0 var(--black); }
.lbHead span { font: 700 13px var(--body); color: var(--text-dim); }
.lbPage .sbMeter { color: var(--text); font-size: 13px; }
.lbPage .sbMeter i { height: 12px; background: var(--s1); border: 2px solid var(--s7); border-radius: 0; }
.lbPage .sbMeter i span { background: var(--accent); }
.lbPage .sbMeter.full i span { background: var(--danger); }
.lbPage .sbSlot { background: var(--s5); border: 2px dashed var(--s10); border-radius: 0; color: var(--text); font-family: var(--body); }
.lbPage .sbSlot.on { border: 2px solid var(--accent); }
.lbPage .sbSlot { padding: 4px; }
.lbPage .sbSlot em { font-size: 10px; }
.lbPage .sbSlot em, .lbPage .sbCard .stats { color: var(--mana); }
.lbPage .sbCard { background: var(--s5); border: 2px solid var(--s9); border-radius: 0; font-size: 13px; }
.lbPage .sbCard.on { border-color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent-lo); }
.lbPage .sbCard.locked { opacity: 1; background: var(--s3); border-style: dashed; color: var(--text-faint); }
.lbPage .sbCard .text { color: var(--text-dim); }
.lbPage .sbNote { color: var(--danger-hi); }
.lbDim { position: absolute; inset: 0; background: rgb(var(--s1-rgb) / 0.68); pointer-events: none; }
.lbLock { text-align: center; padding: 14px 14px 16px; }
.lbLock h2 { margin: 0 0 6px; font: 700 20px var(--display); color: var(--accent-hi); letter-spacing: 1px; text-shadow: 0 2px 0 var(--black); }
.lbLock p { margin: 0 0 12px; font: 400 14px/1.35 var(--body); color: var(--text); }
.lbLock .lbGo { min-height: 40px; padding: 0 16px; font: 700 14px var(--body); color: var(--btn-ink); background: var(--accent); border: 2px solid var(--s1); border-radius: 0; cursor: pointer; }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

interface Mote {
  x: number;
  y: number;
  life: number;
  max: number;
  vx: number;
}

export class Library {
  readonly root = el('div', 'lbWrap');
  private canvas = el('canvas', 'lbRoom');
  private ctx = this.canvas.getContext('2d')!;
  private panel = el('div', 'lbPanel');
  private dim = el('div', 'lbDim');
  private lock = el('div', 'lbPage lbLock');
  private page = el('div', 'lbPage');
  private known = el('span');
  private book = spellbookView(() => (this.known.textContent = this.book?.known() ?? ''));
  private glow: HTMLCanvasElement | null = null;
  private motes: Mote[] = [];
  private scale = 2;
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private watch: ResizeObserver;

  constructor(onCastle: () => void = () => {}) {
    if (!document.getElementById('libraryStyle')) {
      const st = el('style');
      st.id = 'libraryStyle';
      st.textContent = CSS;
      document.head.append(st);
    }
    const page = this.page;
    const go = el('button', 'lbGo', 'To the Castle');
    go.addEventListener('click', onCastle);
    this.lock.append(el('h2', '', 'The spellbook is locked'), el('p', '', 'Build the Chapel in the castle to study spells'), go);
    const head = el('div', 'lbHead');
    head.append(el('h2', '', 'Spellbook'), this.known);
    page.append(head, this.book.root);
    this.panel.append(page, this.lock);
    this.root.append(this.canvas, this.dim, this.panel);
    this.known.textContent = this.book.known();
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Redraw the book from the Meta (spells may have been learnt elsewhere). */
  update(meta: Meta): void {
    // (until the Chapel is built the room is darkened and a locked parchment stands in for the book; the starting spells still work in fights)
    const open = spellsOpen(meta);
    this.dim.hidden = open;
    this.lock.hidden = open;
    this.page.hidden = !open;
    this.book.redraw();
  }

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

  /** Paint one still picture without starting the loop (MENU-GLITCH: the page has its picture before it ever slides into view). */
  paintOnce(): void {
    if (this.raf || document.hidden) return;
    void loadArt().then(() => {
      if (this.raf) return;
      this.fit();
      this.draw();
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

  private fit(): void {
    const w = this.root.clientWidth;
    if (!w || !art) return;
    const s = Math.max(2, Math.min(3, Math.floor(w / LIB_W)));
    this.canvas.style.left = `${Math.round((w - LIB_W * s) / 2)}px`;
    // (the parchment starts just under the lectern's feet)
    this.panel.style.top = `${LIB_H * s - 4 * s}px`;
    if (s === this.scale && this.glow) return;
    this.scale = s;
    this.canvas.width = LIB_W * s;
    this.canvas.height = LIB_H * s;
    this.canvas.style.width = `${LIB_W * s}px`;
    this.canvas.style.height = `${LIB_H * s}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.glow = this.paintGlow(s);
    this.draw();
  }

  /** The candle light, drawn over the room and flickered by opacity. */
  private paintGlow(s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = LIB_W * s;
    c.height = LIB_H * s;
    const g = c.getContext('2d')!;
    for (const k of CANDLES) {
      const rg = g.createRadialGradient(k.x * s, k.y * s, 0, k.x * s, k.y * s, k.r * s);
      rg.addColorStop(0, 'rgba(255, 180, 80, 0.4)');
      rg.addColorStop(1, 'rgba(255, 150, 50, 0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    }
    // (the book's own gold light, over the lectern)
    const bx = LECTERN.x * s;
    const by = (LECTERN.y - 40) * s;
    const bg = g.createRadialGradient(bx, by, 0, bx, by, 34 * s);
    bg.addColorStop(0, 'rgba(255, 224, 140, 0.28)');
    bg.addColorStop(1, 'rgba(255, 200, 90, 0)');
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    if (t - this.last < (this.saver ? 33 : 0)) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    if (!this.reduced) {
      // (a mote of light lifts off the open book now and then)
      if (Math.random() < dt / 260) this.motes.push({ x: LECTERN.x + (Math.random() - 0.5) * 20, y: LECTERN.y - 44, life: 0, max: 1200 + Math.random() * 1200, vx: (Math.random() - 0.5) * 6 });
      for (const m of this.motes) {
        m.life += dt;
        m.y -= 12 * (dt / 1000);
        m.x += m.vx * (dt / 1000);
      }
      this.motes = this.motes.filter((m) => m.life < m.max).slice(-30);
    }
    this.draw();
  }

  private draw(): void {
    const a = art;
    if (!a) return;
    const g = this.ctx;
    const s = this.scale;
    g.globalAlpha = 1;
    g.drawImage(a.wall, 0, 0, LIB_W * s, LIB_H * s);
    const l = a.lectern;
    g.drawImage(l, Math.round(LECTERN.x - l.width / 2) * s, (LECTERN.y - l.height) * s, l.width * s, l.height * s);
    for (const m of this.motes) {
      g.globalAlpha = Math.min(1, (1 - m.life / m.max) * 1.6);
      g.fillStyle = '#ffe9a8';
      g.fillRect(Math.round(m.x) * s, Math.round(m.y) * s, s, s);
    }
    if (this.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = this.reduced ? 0.7 : 0.62 + 0.2 * Math.sin(this.now / 140) * Math.sin(this.now / 380 + 2) + 0.08 * Math.sin(this.now / 53);
      g.drawImage(this.glow, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }
}
