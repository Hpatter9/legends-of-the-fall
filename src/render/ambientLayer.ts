// ALIVE: a painted page brought to life. Two canvases laid over a painting (an <img> or a backdrop) draw its life (`ambientPaint.ts`):
// the first, the parts of the painting that move (the hearth's flame licks, the herbs and banners sway), redrawn over the picture
// where they are; the second, at a css pixel a pixel, the light (the candles gutter, the hearth breathes, embers and dust drift),
// screened over everything under it so it brightens as light does. The painting itself is never redrawn: only what moves is.
//
// Every layer shares one loop, which runs only while a layer is on the screen and the page is in sight: a layer scrolled away,
// on a page that is shut, or in a hidden tab costs nothing. With reduced motion asked for, a layer is drawn once, its lights lit at
// rest, and nothing moves; on a battery saver it draws at most thirty frames a second, with half the particles.

import { motionPlan, placeIn, type Fit, type MotionPlan } from './ambient';
import { LifePainter, type Place } from './ambientPaint';
import type { SceneLife } from './ambientScenes';
import { loadImage } from './loadImage';
import { onSettings, settings } from '../settings';

export type { Fit };

const reducedQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const layers = new Set<AmbientLayer>();
let raf = 0;
let last = 0;
let saver = false;
let hooked = false;
/** Listen to the settings, the device and the page (once, when the first layer is made: the settings module may still be loading
 *  while this one is first read). */
function hook(): void {
  if (hooked) return;
  hooked = true;
  saver = settings().saver;
  onSettings((s) => {
    saver = s.saver;
    wake();
  });
  reducedQuery?.addEventListener?.('change', () => {
    for (const l of layers) l.paintStill();
    wake();
  });
  document.addEventListener('visibilitychange', () => wake());
}

const plan = (): MotionPlan => motionPlan({ reduced: !!reducedQuery?.matches, saver, hidden: typeof document !== 'undefined' && document.hidden });

/** Start the shared loop if a layer is showing and things may move; it stops itself when none is. */
function wake(): void {
  if (raf || !plan().run || ![...layers].some((l) => l.showing)) return;
  last = 0;
  raf = requestAnimationFrame(tick);
}
function tick(now: number): void {
  raf = 0;
  const p = plan();
  const live = [...layers].filter((l) => l.showing);
  if (!p.run || !live.length) return;
  raf = requestAnimationFrame(tick);
  if (last && now - last < p.gap) return;
  last = now;
  for (const l of live) l.paint(now / 1000, p);
}

export class AmbientLayer {
  /** The layer: lay it just over the painting, under whatever stands in the scene. */
  readonly root = document.createElement('div');
  private base = document.createElement('canvas');
  private light = document.createElement('canvas');
  private g = this.base.getContext('2d')!;
  private gl = this.light.getContext('2d')!;
  private painter: LifePainter;
  private lit: LifePainter;
  private img: HTMLImageElement | null = null;
  private place: Place | null = null;
  /** On the screen (and laid out), as the page's observer last said. */
  showing = false;
  private inView = false;
  private seen = new IntersectionObserver((e) => {
    this.inView = e.some((x) => x.isIntersecting);
    this.showing = this.inView && !!this.place;
    if (this.inView) this.paintStill();
    wake();
  });
  private sized = new ResizeObserver(() => this.layout());

  constructor(
    life: SceneLife,
    url: string,
    private fit: Fit = { fit: 'fill' },
    cls = '',
  ) {
    hook();
    this.painter = new LifePainter(life);
    this.lit = new LifePainter(life, false, true);
    this.root.className = `ambLayer${cls ? ` ${cls}` : ''}`;
    this.root.setAttribute('aria-hidden', 'true');
    this.base.className = 'ambBase';
    this.light.className = 'ambLight';
    this.root.append(this.base, this.light);
    void loadImage(url).then((im) => {
      this.img = im;
      this.layout();
    }).catch(() => undefined);
    this.seen.observe(this.root);
    this.sized.observe(this.root);
    layers.add(this);
  }

  /** Stop for good (the page that held it is gone). */
  dispose(): void {
    this.seen.disconnect();
    this.sized.disconnect();
    layers.delete(this);
    this.root.remove();
  }

  private layout(): void {
    const im = this.img;
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!im || !w || !h) return;
    // (the moving parts at up to two device pixels a css pixel, sharp as the painting under them; the soft light at one)
    const k = Math.min(2, window.devicePixelRatio || 1);
    const size = (c: HTMLCanvasElement, k: number) => {
      const cw = Math.round(w * k);
      const ch = Math.round(h * k);
      if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
      }
    };
    size(this.base, k);
    size(this.light, 1);
    this.place = placeIn(this.base.width, this.base.height, im.naturalWidth, im.naturalHeight, this.fit);
    this.painter.layout(im, im.naturalWidth, im.naturalHeight, this.place);
    this.lit.layout(im, im.naturalWidth, im.naturalHeight, placeIn(w, h, im.naturalWidth, im.naturalHeight, this.fit));
    this.showing = this.inView;
    this.paintStill();
    wake();
  }

  /** One frame (the shared loop calls it). */
  paint(t: number, p: MotionPlan): void {
    if (!this.img || !this.place) return;
    const g = this.g;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = true;
    g.clearRect(0, 0, this.base.width, this.base.height);
    this.painter.regions(g, t, p);
    this.painter.smoke(g, t, p);
    const gl = this.gl;
    gl.globalCompositeOperation = 'source-over';
    gl.globalAlpha = 1;
    gl.clearRect(0, 0, this.light.width, this.light.height);
    this.lit.lights(gl, t, p);
  }

  /** The picture as it stands (lit, at rest): drawn whenever the layer is laid out or comes into view, and the only frame with
   *  reduced motion. */
  paintStill(): void {
    const p = plan();
    this.paint(performance.now() / 1000, p.run ? p : { ...p, run: false });
  }
}
