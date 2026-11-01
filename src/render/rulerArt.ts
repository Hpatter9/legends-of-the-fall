// One atlas per ruler, shared by Canvas and Pixi. Bundled data URLs work offline.
import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { BREATH_PX, RULERS, RULER_ACTIONS, SEAT_BREATH, rulerFrame, seatFrame, type RulerAction, type RulerId } from '../rulerRules';
import { RULER_URLS } from '../rulerUrls';
import thronesUrl from '../art/rulers/thrones.png';
/** Each ruler's cell in thrones.png (four by two, in the eight rulers' order). The King had no empty throne in the old art, so he
 *  stands before the Iron Stag's (red velvet, gold and fur, the nearest to his own) when he rises from it. */
const THRONE_CELL: Record<RulerId, number> = { sun_viper: 0, frost_witch: 1, ash_empress: 2, rose_duchess: 3, moon_oracle: 4, iron_stag: 5, storm_corsair: 6, gilded_necromancer: 7, the_king: 5 };
const images = new Map<RulerId, HTMLImageElement>();
const frames = new Map<string, Texture[]>();
const thrones = new Map<RulerId, Texture>();
/** Each painted ruler's breath: the first seated frame with the head box drawn BREATH_PX higher (the throne untouched). */
const breaths = new Map<RulerId, { canvas: HTMLCanvasElement; texture: Texture }>();
let ready: Promise<void> | undefined;
export function loadRulers(): Promise<void> {
  return ready ??= Promise.all([loadImage(thronesUrl).then((img) => {
    const base = Texture.from(img);
    for (const ruler of RULERS) {
      const i = THRONE_CELL[ruler.id];
      thrones.set(ruler.id, new Texture({ source: base.source, frame: new Rectangle((i % 4) * img.width / 4, Math.floor(i / 4) * img.height / 2, img.width / 4, img.height / 2) }));
    }
  }), ...Object.entries(RULER_URLS).map(async ([key, url]) => {
    const id = key as RulerId;
    const img = await loadImage(url);
    images.set(id, img);
    const base = Texture.from(img);
    const w = img.width / 4, h = img.height / 8;
    RULER_ACTIONS.forEach((action, row) => frames.set(`${id}:${action}`, Array.from({ length: 4 }, (_, col) => new Texture({ source: base.source, frame: new Rectangle(col * w, row * h, w, h) }))));
    const box = SEAT_BREATH[id];
    if (box) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      const top = RULER_ACTIONS.indexOf('seated') * h;
      g.drawImage(img, 0, top, w, h, 0, 0, w, h);
      // (the head drawn again a little higher, over the frame: it rises, and nothing is cut out of the throne behind it)
      const [x0, y0, x1, y1] = box;
      g.drawImage(img, x0, top + y0, x1 - x0, y1 - y0, x0, y0 - BREATH_PX, x1 - x0, y1 - y0);
      breaths.set(id, { canvas, texture: Texture.from(canvas) });
    }
  })]).then(() => undefined);
}
/** A ruler's portrait for a talking head: the head and shoulders of the first idle frame (the top of the figure, found from the
 *  frame's own pixels, so a tall crown or a short one is whole). */
const portraits = new Map<RulerId, Texture>();
export function rulerPortraitTexture(id: RulerId): Texture {
  let t = portraits.get(id);
  if (t) return t;
  const img = images.get(id)!;
  const w = img.width / 4, h = img.height / 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  let top = -1, left = w, right = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 20) { if (top < 0) top = y; left = Math.min(left, x); right = Math.max(right, x); }
  top = Math.max(top, 0);
  const side = Math.min(w, Math.max(right - left + 1, 1), h - top);
  const cx = Math.round((left + right) / 2);
  const x0 = Math.max(0, Math.min(w - side, cx - Math.floor(side / 2)));
  t = new Texture({ source: Texture.from(img).source, frame: new Rectangle(x0, top, side, Math.min(Math.round(side * 0.95), h - top)) });
  portraits.set(id, t);
  return t;
}
export const rulerThrone = (id: RulerId): Texture => thrones.get(id)!;
export const rulerTextures = (id: RulerId, action: RulerAction): Texture[] => frames.get(`${id}:${action}`)!;
/** The texture of a ruler on the throne (seated, or commanding from it): the throne stays put whatever the time (`seatFrame`). */
export function rulerSeatTexture(id: RulerId, action: 'seated' | 'command', elapsed: number, still: boolean): Texture {
  const f = seatFrame(id, action, elapsed, still);
  return (f.breath && breaths.get(id)?.texture) || rulerTextures(id, f.action)[f.col];
}
export function drawRuler(g: CanvasRenderingContext2D, id: RulerId, action: RulerAction, elapsed: number, still: boolean, x: number, y: number, size: number): void {
  const img = images.get(id);
  if (!img) return;
  const w = img.width / 4, h = img.height / 8;
  const dx = Math.round(x - size / 2), dy = Math.round(y - size);
  if (action === 'seated' || action === 'command') {
    // (on the throne: the throne stays put; only the ruler breathes)
    const f = seatFrame(id, action, elapsed, still);
    const breath = f.breath && breaths.get(id)?.canvas;
    if (breath) g.drawImage(breath, 0, 0, w, h, dx, dy, size, size);
    else g.drawImage(img, f.col * w, RULER_ACTIONS.indexOf(f.action) * h, w, h, dx, dy, size, size);
    return;
  }
  g.drawImage(img, rulerFrame(action, elapsed, still) * w, RULER_ACTIONS.indexOf(action) * h, w, h, dx, dy, size, size);
}
