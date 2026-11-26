// COSMETICS (docs/notes/cosmetics.md): Duchess in the costume she wears. A bought costume is whole sheets of her wearing it, swapped in for
// hers (`DRESSED` in `render/duchessRules.ts`: her walking strip, her battle sheet, her Crown Terrace poses), never laid over her; a sheet
// not yet painted falls back to her plain one. The free costumes (the tin crown, the wizard hat, the quiver) are still drawn over her
// walking strip as the camp draws them. Looks only: nothing here touches a fight's rules.

import { dressedOf, dressedTerrace, drawDuchessCosmetic, FRAME, wornCostume, type DuchessCosmeticId } from './render/duchessRules';
import { loadImage } from './render/loadImage';
import { terraceArtUrl } from './crownTerrace';
import { settings } from './settings';

/** The costume she wears now (the one chosen, while it is hers). */
export const costumeNow = (): DuchessCosmeticId => wornCostume(settings().duchessHat);

/** Dressed sheets as they load, by URL (a failed one is remembered as null: her plain sheet then). */
const loaded = new Map<string, HTMLImageElement | null>();
const asked = new Set<string>();
function imageOf(url: string): HTMLImageElement | null {
  if (!asked.has(url)) {
    asked.add(url);
    loadImage(url).then((im) => loaded.set(url, im), () => loaded.set(url, null));
  }
  return loaded.get(url) ?? null;
}
const halves = new Map<HTMLImageElement, HTMLCanvasElement>();
/** A walking strip at half size (24 px frames), as `goat-half.png` is cut from `goat.png`. */
function halfOf(im: HTMLImageElement): HTMLCanvasElement {
  let c = halves.get(im);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth / 2);
    c.height = Math.round(im.naturalHeight / 2);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0, c.width, c.height);
    halves.set(im, c);
  }
  return c;
}

/** The walking strip to draw her from now: her dressed strip when the costume she wears has one and it has loaded, else `plain` (the
 *  places that draw her each frame: the camp, the tavern with `half`, her fight card). */
export function walkArt(plain: HTMLImageElement, half = false): HTMLImageElement | HTMLCanvasElement {
  const url = dressedOf(costumeNow(), 'walk');
  const im = url ? imageOf(url) : null;
  return im ? (half ? halfOf(im) : im) : plain;
}

/** The Crown Terrace's eight poses in the costume she wears, once all have loaded; null for her plain poses. */
export function terracePoses(): (HTMLImageElement | null)[] | null {
  const c = costumeNow();
  if (!dressedTerrace(c)) return null;
  const poses = Array.from({ length: 8 }, (_, i) => imageOf(terraceArtUrl(`duchess-${c}-${i}`)));
  return poses.every((p) => p) ? poses : null;
}

/** Her walking strip for the cutscenes, as a whole: the dressed strip when there is one, else hers with a free costume drawn over each frame. */
export async function dressWalk(img: HTMLImageElement, costume: DuchessCosmeticId = costumeNow()): Promise<HTMLImageElement | HTMLCanvasElement> {
  const url = dressedOf(costume, 'walk');
  if (url) return loadImage(url).catch(() => img);
  if (costume === 'none') return img;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  for (let i = 0; i < Math.floor(c.width / FRAME); i++) drawDuchessCosmetic(g, costume, i * FRAME, 0, 1, i < 3 ? -1 : 1, 0);
  return c;
}

/** Her battle sheet in the costume she wears: the dressed sheet when there is one (and it loads), else `img`, hers. */
export async function dressBattle(img: HTMLImageElement, costume: DuchessCosmeticId = costumeNow()): Promise<HTMLImageElement> {
  const url = dressedOf(costume, 'battle');
  return url ? loadImage(url).catch(() => img) : img;
}
