// ROUND4-WIRE: Duchess's free cosmetics painted at last (art-source/round4/), each a strip of six 48 px frames laid over her own walking
// frames (`art/duchess/goat.png`'s layout): the Wizard Hat, and (ART-FINAL, its redo) the Tiny Tin Crown. The Archery Quiver's redo, a thin
// red-flecked stick across her neck, still did not read as a quiver in the camp, so its hand-drawn quiver stays (`drawDuchessCosmetic`).
// Bundled for offline play; loaded once, on the page only.
import { HAT_ART, type DuchessCosmeticId } from './render/duchessRules';
import wizardUrl from './art/duchess/hat-wizard.png';
import crownUrl from './art/duchess/hat-crown.png';

const URLS: Partial<Record<DuchessCosmeticId, string>> = { wizard: wizardUrl, crown: crownUrl };
const FRAME = 48;
const strips = new Map<DuchessCosmeticId, HTMLImageElement>();

function strip(id: DuchessCosmeticId): HTMLImageElement | undefined {
  const url = URLS[id];
  if (!url) return undefined;
  let img = strips.get(id);
  if (!img) {
    img = new Image();
    img.src = url;
    strips.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : undefined;
}

HAT_ART.draw = (ctx, id, frame, left, top, scale) => {
  const img = strip(id);
  if (!img) return false;
  ctx.drawImage(img, frame * FRAME, 0, FRAME, FRAME, left, top, FRAME * scale, FRAME * scale);
  return true;
};
