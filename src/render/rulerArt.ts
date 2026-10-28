// One atlas per ruler, shared by Canvas and Pixi. Bundled data URLs work offline.
import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { RULERS, RULER_ACTIONS, rulerFrame, type RulerAction, type RulerId } from '../rulerRules';
import { RULER_URLS } from '../rulerUrls';
import thronesUrl from '../art/rulers/thrones.png';
const images = new Map<RulerId, HTMLImageElement>();
const frames = new Map<string, Texture[]>();
const thrones = new Map<RulerId, Texture>();
let ready: Promise<void> | undefined;
export function loadRulers(): Promise<void> {
  return ready ??= Promise.all([loadImage(thronesUrl).then((img) => {
    const base = Texture.from(img);
    RULERS.forEach((ruler, i) => thrones.set(ruler.id, new Texture({ source: base.source, frame: new Rectangle((i % 4) * img.width / 4, Math.floor(i / 4) * img.height / 2, img.width / 4, img.height / 2) })));
  }), ...Object.entries(RULER_URLS).map(async ([key, url]) => {
    const id = key as RulerId;
    const img = await loadImage(url);
    images.set(id, img);
    const base = Texture.from(img);
    const w = img.width / 4, h = img.height / 8;
    RULER_ACTIONS.forEach((action, row) => frames.set(`${id}:${action}`, Array.from({ length: 4 }, (_, col) => new Texture({ source: base.source, frame: new Rectangle(col * w, row * h, w, h) }))));
  })]).then(() => undefined);
}
export const rulerThrone = (id: RulerId): Texture => thrones.get(id)!;
export const rulerTextures = (id: RulerId, action: RulerAction): Texture[] => frames.get(`${id}:${action}`)!;
export function drawRuler(g: CanvasRenderingContext2D, id: RulerId, action: RulerAction, elapsed: number, still: boolean, x: number, y: number, size: number): void {
  const img = images.get(id);
  if (!img) return;
  const w = img.width / 4, h = img.height / 8;
  g.drawImage(img, rulerFrame(action, elapsed, still) * w, RULER_ACTIONS.indexOf(action) * h, w, h, Math.round(x - size / 2), Math.round(y - size), size, size);
}
