// ROUND4-WIRE: two of Duchess's free cosmetics painted at last (art-source/round4/): the Wizard Hat and the Archery Quiver, each a strip of
// six 48 px frames laid over her own walking frames (`art/duchess/goat.png`'s layout). The Tiny Tin Crown's painting did not read as a crown
// at her size, so it is still drawn by hand (`drawDuchessCosmetic`). Bundled for offline play; loaded once, on the page only.
import { HAT_ART, type DuchessCosmeticId } from './render/duchessRules';
import wizardUrl from './art/duchess/hat-wizard.png';
import quiverUrl from './art/duchess/hat-quiver.png';

const URLS: Partial<Record<DuchessCosmeticId, string>> = { wizard: wizardUrl, quiver: quiverUrl };
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
