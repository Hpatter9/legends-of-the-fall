// HUD-FACES (docs/notes/hud-faces.md): a hero's painted face for the fight's stat views. The painting (`heroes/...webp`, already in the
// service worker's list) is loaded once a picture, each face is cut and scaled down once a size into a small canvas, and every row after
// that copies the cached crop. Until the painting has come (or if it never does) the canvas shows the pixel sprite portrait it was given.

import { bustRect, faceBox, faceRect, faceUrl, hasFace } from './heroFaceRules';

/** The paintings, one image each, shared by every face cut from them. */
const pictures = new Map<string, HTMLImageElement>();
/** The finished crops, by painting and size. */
const crops = new Map<string, HTMLCanvasElement>();
/** Faces waiting on their painting. */
const waiting = new Map<string, Array<{ canvas: HTMLCanvasElement; key: string; shape: Shape }>>();

/** A canvas's shape: `w` x `h` pixels; a bust (`bust`) takes a wider cut round the face, from just above it down to the chest. */
interface Shape {
  w: number;
  h: number;
  bust: boolean;
}

function crop(img: HTMLImageElement, kind: string, awakened: number, shape: Shape): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = shape.w;
  c.height = shape.h;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const r = shape.bust ? bustRect(faceBox(kind, awakened)!, W, H, shape.w / shape.h) : (({ x, y, side }) => ({ x, y, w: side, h: side }))(faceRect(faceBox(kind, awakened)!, W, H));
  const g = c.getContext('2d');
  if (g) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, shape.w, shape.h);
  }
  return c;
}

function paint(canvas: HTMLCanvasElement, from: CanvasImageSource, smooth: boolean): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingEnabled = smooth;
  if (smooth) return void g.drawImage(from, 0, 0, canvas.width, canvas.height);
  // (the square sprite portrait, centred and unstretched in a bust's taller canvas)
  const side = Math.min(canvas.width, canvas.height);
  g.drawImage(from, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side);
}

/**
 * The face of hero `kind` (its awakened form's when `awakened` is above 0), as a canvas `px` pixels square (draw it at about half that
 * size, for sharp edges on a phone). Not a hero with a painting (a summon, a guest, a foe): the sprite portrait `fallback` itself.
 */
export function heroFace(kind: string, awakened: number, px: number, fallback: HTMLCanvasElement): HTMLCanvasElement {
  return cut(kind, awakened, { w: px, h: px, bust: false }, fallback);
}

/** The bigger piece of a hero's art (the results screen's MVP, RECAP-SPOILS): head and shoulders, `w` x `h` pixels. */
export function heroBust(kind: string, awakened: number, w: number, h: number, fallback: HTMLCanvasElement): HTMLCanvasElement {
  return cut(kind, awakened, { w, h, bust: true }, fallback);
}

function cut(kind: string, awakened: number, shape: Shape, fallback: HTMLCanvasElement): HTMLCanvasElement {
  if (!hasFace(kind)) return fallback;
  const url = faceUrl(kind, awakened);
  const key = `${url}@${shape.w}x${shape.h}${shape.bust ? 'b' : ''}`;
  const canvas = document.createElement('canvas');
  canvas.width = shape.w;
  canvas.height = shape.h;
  canvas.className = 'heroFace';
  canvas.dataset.face = kind;
  const done = crops.get(key);
  if (done) {
    paint(canvas, done, true);
    return canvas;
  }
  // (the sprite stands in until the painting has loaded)
  paint(canvas, fallback, false);
  let img = pictures.get(url);
  const finish = (): void => {
    const list = waiting.get(url) ?? [];
    waiting.delete(url);
    if (!img!.naturalWidth) return;
    for (const w of list) {
      let c = crops.get(w.key);
      if (!c) crops.set(w.key, (c = crop(img!, kind, awakened, w.shape)));
      paint(w.canvas, c, true);
    }
  };
  if (!waiting.has(url)) waiting.set(url, []);
  waiting.get(url)!.push({ canvas, key, shape });
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    pictures.set(url, img);
    img.addEventListener('load', finish);
    img.addEventListener('error', () => waiting.delete(url));
    img.src = url;
  } else if (img.complete) {
    if (img.naturalWidth) finish();
    else waiting.delete(url);
  }
  return canvas;
}
