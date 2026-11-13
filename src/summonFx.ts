// SUMMON-SHOW: the summoning's show, rendered in Blender (tools/blender-fx/summon/, docs/notes/summon-show.md) and played here: a new
// hero's charge, rift, arrival burst and aftermath under its reveal (`firstReveal`), and a small flourish as each shard card turns.
// The sheets load by URL when the sanctum opens, decoded off the page's own thread (`createImageBitmap`, as `blenderFxArt.ts` does),
// and the service worker keeps them for offline play (build.mjs). Until they are in (or if they fail), the reveal plays its older
// look. Each show draws into two small canvases of its own: the hard pixels, and the soft glow under them, smoothed.

import { SUMMON_FX, type SummonPiece, type SummonPieceId } from './render/summonFxData';
import { decodedBytes, flourishAt, heroShowAt, skipShowTo, type ShowFrame } from './render/summonRules';

type Pic = ImageBitmap | HTMLImageElement;
const pics = new Map<string, Pic>();
let loading: Promise<boolean> | null = null;
/** What the sheets cost: decoded bytes and how long they took to load (for Settings' diagnostics and the notes). */
export const summonFxStats = { bytes: 0, loadMs: 0, ready: false };

const TIMEOUT_MS = 15000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((done, fail) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => fail(new Error(`${url} did not load`));
    img.src = url;
  });
}

/** A sheet, fetched and decoded off the page's own thread where the browser can. */
async function picture(url: string): Promise<Pic> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return loadImage(url);
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: stop.signal });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return await createImageBitmap(await res.blob());
  } finally {
    clearTimeout(timer);
  }
}

/** Load every sheet of the show (once; later calls share the first). Resolves true when all are in. */
export function loadSummonFx(): Promise<boolean> {
  if (loading) return loading;
  const t0 = performance.now();
  const files = Object.values(SUMMON_FX).flatMap((p) => (p.glow ? [p.file, p.glow] : [p.file]));
  loading = Promise.all(files.map((f) => picture(`fx/summon/${f}`).then((pic) => pics.set(f, pic)))).then(
    () => {
      summonFxStats.bytes = decodedBytes([...pics.values()].map((p) => ({ w: p.width, h: p.height })));
      summonFxStats.loadMs = Math.round(performance.now() - t0);
      summonFxStats.ready = true;
      return true;
    },
    (err) => {
      console.warn('summon show sheets did not load', err);
      loading = null;
      return false;
    },
  );
  return loading;
}

export const summonFxReady = (): boolean => summonFxStats.ready;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

/** A pair of canvases a piece's frames are drawn into: the pixels (`fw` x `fh`, scaled up hard) and the glow (a quarter, smoothed). */
class Pair {
  readonly el = el('div', 'sfxPair');
  private px = el('canvas', 'sfxPx');
  private glow = el('canvas', 'sfxGlow');
  private g: CanvasRenderingContext2D;
  private gg: CanvasRenderingContext2D;
  private key = '';
  constructor(fw: number, fh: number) {
    this.px.width = fw;
    this.px.height = fh;
    this.glow.width = Math.ceil(fw / 4);
    this.glow.height = Math.ceil(fh / 4);
    this.g = this.px.getContext('2d')!;
    this.gg = this.glow.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    this.el.setAttribute('aria-hidden', 'true');
    this.el.append(this.glow, this.px);
  }

  /** Draw these frames (under first); nothing is drawn again while they are the same. */
  draw(frames: readonly { piece: SummonPieceId; frame: number; alpha: number }[]): void {
    const key = frames.map((f) => `${f.piece}${f.frame}:${f.alpha.toFixed(2)}`).join(',');
    if (key === this.key) return;
    this.key = key;
    this.g.clearRect(0, 0, this.px.width, this.px.height);
    this.gg.clearRect(0, 0, this.glow.width, this.glow.height);
    for (const f of frames) {
      const p: SummonPiece = SUMMON_FX[f.piece];
      const sheet = pics.get(p.file);
      if (!sheet) continue;
      const sx = (f.frame % p.cols) * p.w;
      const sy = Math.floor(f.frame / p.cols) * p.h;
      this.g.globalAlpha = f.alpha;
      this.g.drawImage(sheet, sx, sy, p.w, p.h, p.x, p.y, p.w, p.h);
      const glow = p.glow ? pics.get(p.glow) : undefined;
      if (glow) {
        const gw = Math.ceil(p.w / 4);
        const gh = Math.ceil(p.h / 4);
        this.gg.globalAlpha = f.alpha;
        this.gg.drawImage(glow, (f.frame % p.cols) * gw, Math.floor(f.frame / p.cols) * gh, gw, gh, p.x / 4, p.y / 4, gw, gh);
      }
    }
  }
}

// (every show on the page is drawn from one loop, which stops when none is playing)
const playing = new Set<{ tick(now: number): boolean }>();
let raf = 0;
function loop(now: number): void {
  for (const s of [...playing]) if (!s.tick(now)) playing.delete(s);
  raf = playing.size ? requestAnimationFrame(loop) : 0;
}
function run(s: { tick(now: number): boolean }): void {
  playing.add(s);
  if (!raf) raf = requestAnimationFrame(loop);
}

/** The full frame's floor point (the circle's heart), in its pixels from the top left: where the hero's feet go. */
const FLOOR = { x: 88, y: 194 } as const;

/** A new hero's show: the charge, the rift, the burst and the aftermath, on the reveal's clock. Put `el` in the reveal's stage. */
export class HeroShow {
  readonly el: HTMLDivElement;
  private pair: Pair;
  private t0 = 0;
  private on = false;
  constructor() {
    const p = SUMMON_FX.charge;
    this.pair = new Pair(p.fw, p.fh);
    this.el = this.pair.el;
    this.el.classList.add('sfxHero');
  }

  /** Size the show to the stage it stands in: the circle's heart at the hero's feet, the frame as wide as the stage allows. */
  fit(stageW: number, stageH: number): void {
    const p = SUMMON_FX.charge;
    const k = Math.max(1, Math.min(stageW / p.fw, stageH / (FLOOR.y + 10)));
    this.el.style.cssText = `width:${p.fw * k}px;height:${p.fh * k}px;left:calc(50% - ${FLOOR.x * k}px);bottom:${-(p.fh - FLOOR.y) * k + 6}px`;
  }

  start(): void {
    this.t0 = performance.now();
    this.on = true;
    run(this);
  }

  /** A tap that skips the build-up: the arrival's burst still plays. */
  skip(): void {
    const t = performance.now() - this.t0;
    this.t0 -= skipShowTo(t) - t;
  }

  stop(): void {
    this.on = false;
  }

  tick(now: number): boolean {
    if (!this.on || !this.el.isConnected) return false;
    this.pair.draw(heroShowAt(now - this.t0, SUMMON_FX) as ShowFrame[]);
    return true;
  }
}

/** A shard card's flourish as it turns: a canvas laid over `card`, played once and taken away. */
export function cardFlourish(card: HTMLElement): void {
  if (!summonFxStats.ready) return;
  const p = SUMMON_FX.flourish;
  const pair = new Pair(p.fw, p.fh);
  pair.el.classList.add('sfxCard');
  card.append(pair.el);
  const t0 = performance.now();
  run({
    tick(now: number): boolean {
      const f = flourishAt(now - t0, p);
      if (f < 0 || !pair.el.isConnected) {
        pair.el.remove();
        return false;
      }
      pair.draw([{ piece: 'flourish', frame: f, alpha: 1 }]);
      return true;
    },
  });
}

const style = document.createElement('style');
style.textContent = `
.sfxPair { position: absolute; pointer-events: none; }
.sfxPair canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.sfxPair .sfxPx { image-rendering: pixelated; }
.sfxPair .sfxGlow { mix-blend-mode: screen; opacity: .9; filter: blur(2px); }
/* (a card's flourish: centred on the card, a little wider than it, over it) */
.sfxCard { left: -30%; top: -18.5%; width: 160%; height: 137%; z-index: 3; }
`;
document.head.append(style);

// (the screenshot and timing tools read the costs here)
(window as unknown as { __summonFx?: object }).__summonFx = { stats: summonFxStats, load: loadSummonFx };
