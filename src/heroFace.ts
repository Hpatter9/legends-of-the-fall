// HUD-FACES (docs/notes/hud-faces.md): a hero's painted face for the fight's stat views. The painting (`heroes/...webp`, already in the
// service worker's list) is loaded once a picture, each face is cut and scaled down once a size into a small canvas, and every row after
// that copies the cached crop. Until the painting has come (or if it never does) the canvas shows the pixel sprite portrait it was given.

import { faceBox, faceRect, faceUrl, hasFace } from './heroFaceRules';

/** The paintings, one image each, shared by every face cut from them. */
const pictures = new Map<string, HTMLImageElement>();
/** The finished crops, by painting and size. */
const crops = new Map<string, HTMLCanvasElement>();
/** Faces waiting on their painting. */
const waiting = new Map<string, Array<{ canvas: HTMLCanvasElement; key: string }>>();

function crop(img: HTMLImageElement, kind: string, awakened: number, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const r = faceRect(faceBox(kind, awakened)!, img.naturalWidth, img.naturalHeight);
  const g = c.getContext('2d');
  if (g) {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, r.x, r.y, r.side, r.side, 0, 0, px, px);
  }
  return c;
}

function paint(canvas: HTMLCanvasElement, from: CanvasImageSource, smooth: boolean): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingEnabled = smooth;
  g.drawImage(from, 0, 0, canvas.width, canvas.height);
}

/**
 * The face of hero `kind` (its awakened form's when `awakened` is above 0), as a canvas `px` pixels square (draw it at about half that
 * size, for sharp edges on a phone). Not a hero with a painting (a summon, a guest, a foe): the sprite portrait `fallback` itself.
 */
export function heroFace(kind: string, awakened: number, px: number, fallback: HTMLCanvasElement): HTMLCanvasElement {
  if (!hasFace(kind)) return fallback;
  const url = faceUrl(kind, awakened);
  const key = `${url}@${px}`;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
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
      if (!c) crops.set(w.key, (c = crop(img!, kind, awakened, Number(w.key.split('@')[1]))));
      paint(w.canvas, c, true);
    }
  };
  if (!waiting.has(url)) waiting.set(url, []);
  waiting.get(url)!.push({ canvas, key });
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
