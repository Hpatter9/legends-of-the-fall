// EIDOLON-SMOOTH 2 (docs/notes/eidolon-smooth.md): the canvases of an Eidolon's call. Every strip of the call that used to be a page
// element stepped by a CSS animation (the pack strips, the painted strike's strips, the staged sheets, and the motes, debris and embers
// that carried them) is a piece drawn here each frame from its sheet, already decoded, by the call's own clock (`callPieceRules.ts` has
// the sums). A canvas lies in the call's layer where its pieces' elements lay, among the few elements that stay (the lights that are
// blended with the board, the gradients, the words), so what covers what is as it was; a piece that must be covered ends a canvas and
// the next takes a new one. The page works out no style for a piece, and lays out nothing.
import { canvasScale, sameCanvas, tintMatrix, tintPixels } from './callPieceRules';

/* ------------------------------------------------------------------ the pictures, held decoded */

const IMAGES = new Map<string, HTMLImageElement>();

/** Fetch and decode a picture ahead and hold it (once for each address). */
export function holdImage(src: string): HTMLImageElement {
  let i = IMAGES.get(src);
  if (!i) {
    i = new Image();
    i.decoding = 'async';
    i.src = src;
    // (a picture that will not decode is no fault of the fight's: a piece drawn from it is left out)
    if (typeof i.decode === 'function') i.decode().catch(() => undefined);
    IMAGES.set(src, i);
  }
  return i;
}

/** A held picture, once it can be drawn from (null until then: the piece waits, unseen). */
const ready = (src: string): HTMLImageElement | null => {
  const i = holdImage(src);
  return i.complete && i.naturalWidth > 0 ? i : null;
};

const TINTED = new Map<string, HTMLCanvasElement | null>();

/** A small strip with a CSS colour filter worked into its pixels, once (`tintMatrix`); the strip itself where it cannot be read. */
function tinted(src: string, filter: string): CanvasImageSource | null {
  const img = ready(src);
  if (!img || !filter) return img;
  const key = `${filter}|${src}`;
  let c = TINTED.get(key);
  if (c === undefined) {
    c = null;
    try {
      const made = document.createElement('canvas');
      made.width = img.naturalWidth;
      made.height = img.naturalHeight;
      const g = made.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, made.width, made.height);
      tintPixels(d.data, tintMatrix(filter));
      g.putImageData(d, 0, 0);
      c = made;
    } catch {
      c = null;
    }
    TINTED.set(key, c);
  }
  return c ?? img;
}

/** A glow under a strip (a CSS `drop-shadow`): how far it spreads on the page (px), its colour, and how far down it is set. */
export interface Glow {
  blur: number;
  color: string;
  dy?: number;
}

interface Atlas {
  c: HTMLCanvasElement;
  /** Atlas px to a sheet px, and the room round each frame (sheet px). */
  k: number;
  pad: number;
}
const ATLASES = new Map<string, Atlas | null>();
const atlasKey = (src: string, g: Glow, scale: number) => `${src}|${g.color}|${g.blur}|${g.dy ?? 0}|${scale.toFixed(2)}`;

/** The glows of every frame of a sheet, made once (each frame's shadow alone, soft, at half the sheet's size, with room round it): a
 *  glow is then one more picture drawn under its strip, where a filter was worked out anew at every step of every strip. `scale` is
 *  the page px a sheet px is shown at, about. Made ahead by `bakeGlow`; a strip drawn before its glows are made goes without. */
function makeAtlas(img: HTMLImageElement, cols: number, rows: number, g: Glow, scale: number): Atlas | null {
  try {
    const fw = img.naturalWidth / cols, fh = img.naturalHeight / rows;
    const k = 0.5;
    const blur = g.blur / scale;
    const dy = (g.dy ?? 0) / scale;
    const pad = Math.ceil(blur * 2.5 + Math.abs(dy)) + 1;
    const cw = Math.ceil((fw + 2 * pad) * k), ch = Math.ceil((fh + 2 * pad) * k);
    const c = document.createElement('canvas');
    c.width = cw * cols;
    c.height = ch * rows;
    const x = c.getContext('2d')!;
    const FAR = c.width + fw + 64;
    x.shadowColor = g.color;
    x.shadowBlur = blur * k;
    x.shadowOffsetX = FAR;
    x.shadowOffsetY = dy * k;
    for (let r = 0; r < rows; r++)
      for (let q = 0; q < cols; q++) {
        x.save();
        x.beginPath();
        x.rect(q * cw, r * ch, cw, ch);
        x.clip();
        // (the frame itself is drawn far off to the left: only its shadow, set back by as much, falls in its place)
        x.drawImage(img, q * fw, r * fh, fw, fh, q * cw + pad * k - FAR, r * ch + pad * k, fw * k, fh * k);
        x.restore();
      }
    return { c, k, pad };
  } catch {
    return null;
  }
}

/** Make a sheet's glows ahead (as the Eidolon is warmed, while the heroes are placed). */
export function bakeGlow(src: string, cols: number, rows: number, g: Glow, scale: number): void {
  const key = atlasKey(src, g, scale);
  if (ATLASES.has(key)) return;
  const img = ready(src);
  if (!img) return;
  ATLASES.set(key, makeAtlas(img, cols, rows, g, scale));
}

const BRIGHT = new Map<string, HTMLCanvasElement | null>();
/** A staged sheet's glow sheet, a fifth brighter (the stylesheet's `brightness(1.2)`), made once. */
function brightened(src: string): CanvasImageSource | null {
  const img = ready(src);
  if (!img) return null;
  let c = BRIGHT.get(src);
  if (c === undefined) {
    c = null;
    try {
      const made = document.createElement('canvas');
      made.width = img.naturalWidth;
      made.height = img.naturalHeight;
      const g = made.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, made.width, made.height);
      tintPixels(d.data, tintMatrix('brightness(1.2)'));
      g.putImageData(d, 0, 0);
      c = made;
    } catch {
      c = null;
    }
    BRIGHT.set(src, c);
  }
  return c ?? img;
}

/** Make a glow sheet's brighter copy ahead. */
export const bakeBright = (src: string): void => void brightened(src);

/* ------------------------------------------------------------------ a piece and its canvas */

/** Where a piece stands this frame (page px; the canvas works out its own pixels). */
export interface Pose {
  /** Its anchor on the page. */
  x: number;
  y: number;
  alpha: number;
  /** Its frame in the sheet: column and row. */
  col: number;
  row?: number;
  /** Scaled about its anchor; `flip` mirrors it there; `rot` turns it (radians). */
  scale?: number;
  flip?: boolean;
  rot?: number;
}

/** What a piece is drawn from: its sheet's frames (`cols` by `rows`), its box on the page (w, h) and where in the box its anchor is. */
export interface Look {
  src: string;
  cols: number;
  rows?: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  /** Pixel art is drawn unsmoothed. */
  crisp?: boolean;
  /** A colour filter worked into the strip (small strips only). */
  tint?: string;
  /** Its glow under it, and the page px to a sheet px it was made for (`bakeGlow`). */
  glow?: Glow;
  glowScale?: number;
  /** The staged glow sheets are shown a fifth brighter. */
  bright?: boolean;
}

/** A piece: its look, and where it stands at a time of the call's clock (null: it is over, and is taken away). */
export interface Piece {
  look: Look;
  pose: (now: number) => Pose | null;
}

interface Layer {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pieces: Piece[];
  host: HTMLElement;
  shown: boolean;
}

/** The elements that end a canvas when the page has put them after it: what must cover the strips before it and be covered by those
 *  after (the runs; the great burst and the aftershocks' bursts, which a later detonation's fire stands in front of; the Eidolon's
 *  sprite and its breath). Everything else the page puts in the layer is a soft light or gradient, and stays over the strips. */
const BREAKERS = '.ecRun, .ecBurst, .ecExtra, .ecMon, .ecBreath';

export class CallCanvas {
  private layers: Layer[] = [];
  private spare: HTMLCanvasElement[] = [];
  private scale = 1;
  private w = 0;
  private h = 0;

  /** Begin a call: the canvases of the last are taken back, and the page's size and the canvases' sharpness read. */
  begin(saver: boolean): void {
    this.drop();
    this.w = innerWidth;
    this.h = innerHeight;
    this.scale = canvasScale(devicePixelRatio, saver);
  }

  /** Take every canvas away (their elements are kept, to be used again). */
  drop(): void {
    for (const l of this.layers) {
      l.el.remove();
      // (its pixels are given back: a canvas the page's size at twice its sharpness is some 5 MB)
      l.el.width = l.el.height = 0;
      this.spare.push(l.el);
    }
    this.layers = [];
  }

  /** How many pieces are being drawn, and on how many canvases (for the tools). */
  count(): { pieces: number; canvases: number } {
    return { pieces: this.layers.reduce((a, l) => a + l.pieces.length, 0), canvases: this.layers.filter((l) => l.shown).length };
  }

  private make(host: HTMLElement): Layer {
    const el = this.spare.pop() ?? document.createElement('canvas');
    el.className = 'ecCanvas';
    // (it takes its pixels when it first has a piece to show, and gives them back when it has none: `draw`)
    el.width = el.height = 0;
    el.style.display = 'none';
    const l: Layer = { el, ctx: el.getContext('2d')!, pieces: [], host, shown: false };
    this.layers.push(l);
    return l;
  }

  /** Put a piece at the end of a host (over what is there): on the host's last canvas when only lights lie after it, else on a new one. */
  add(host: HTMLElement, ...pieces: Piece[]): void {
    let last: Layer | null = null;
    for (const l of this.layers) if (l.host === host && l.el.parentElement === host && (!last || (last.el.compareDocumentPosition(l.el) & Node.DOCUMENT_POSITION_FOLLOWING))) last = l;
    if (last) {
      const after: { light: boolean }[] = [];
      for (let n = last.el.nextElementSibling; n; n = n.nextElementSibling) after.push({ light: !n.matches(BREAKERS) });
      if (!sameCanvas(after)) last = null;
    }
    if (!last) {
      last = this.make(host);
      host.append(last.el);
    }
    last.pieces.push(...pieces);
  }

  /** Put a piece at the start of a host (under what is there): under the pieces of the canvas that is first in it, or on a new one. */
  under(host: HTMLElement, ...pieces: Piece[]): void {
    let first = this.layers.find((l) => l.host === host && l.el === host.firstElementChild);
    if (!first) {
      first = this.make(host);
      host.prepend(first.el);
    }
    first.pieces.unshift(...pieces);
  }

  /** Draw every canvas at the call's clock: a canvas with nothing left on it is hidden. */
  draw(now: number): void {
    const S = this.scale;
    for (const l of this.layers) {
      if (!l.pieces.length) {
        if (l.shown) {
          l.shown = false;
          l.el.style.display = 'none';
          l.el.width = l.el.height = 0;
        }
        continue;
      }
      const c = l.ctx;
      if (!l.el.width) {
        l.el.width = Math.round(this.w * S);
        l.el.height = Math.round(this.h * S);
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, l.el.width, l.el.height);
      let kept = 0;
      for (const p of l.pieces) {
        const at = p.pose(now);
        if (!at) continue;
        l.pieces[kept++] = p;
        if (at.alpha <= 0.004) continue;
        const k = p.look;
        const img = k.bright ? brightened(k.src) : k.tint ? tinted(k.src, k.tint) : ready(k.src);
        if (!img) continue;
        const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
        const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
        const fw = iw / k.cols, fh = ih / (k.rows ?? 1);
        c.setTransform(S, 0, 0, S, at.x * S, at.y * S);
        if (at.rot) c.rotate(at.rot);
        const sc = at.scale ?? 1;
        if (sc !== 1 || at.flip) c.scale(at.flip ? -sc : sc, sc);
        c.globalAlpha = Math.min(1, at.alpha);
        const row = at.row ?? 0;
        if (k.glow) {
          // (made ahead as the Eidolon is warmed; one that was not is made now, once, rather than go without)
          const key = atlasKey(k.src, k.glow, k.glowScale ?? 1);
          if (!ATLASES.has(key)) bakeGlow(k.src, k.cols, k.rows ?? 1, k.glow, k.glowScale ?? 1);
          const a = ATLASES.get(key);
          if (a) {
            // (the glow's frame is the strip's with room round it: drawn that much wider, soft)
            const cw = a.c.width / k.cols, ch = a.c.height / (k.rows ?? 1);
            const px = (a.pad * k.w) / fw, py = (a.pad * k.h) / fh;
            c.imageSmoothingEnabled = true;
            c.drawImage(a.c, at.col * cw, row * ch, cw, ch, -k.w * k.ox - px, -k.h * k.oy - py, (cw / a.k) * (k.w / fw), (ch / a.k) * (k.h / fh));
          }
        }
        c.imageSmoothingEnabled = !k.crisp;
        c.drawImage(img, at.col * fw, row * fh, fw, fh, -k.w * k.ox, -k.h * k.oy, k.w, k.h);
      }
      l.pieces.length = kept;
      if (!l.shown && kept) {
        l.shown = true;
        l.el.style.display = '';
      }
    }
  }
}
