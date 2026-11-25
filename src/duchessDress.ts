// COSMETICS (docs/notes/cosmetics.md): Duchess dressed in the costume she wears, for the places that draw her from a texture rather than
// over a canvas of their own: the cutscenes (her walking strip) and the fight (her battle sheet). Each is her own sheet with the costume
// laid over every frame: a bought costume from its overlay sheet (`tools/cosmetics/costumes.py`), a free one (the tin crown, the wizard
// hat, the quiver) drawn as the camp draws it. Looks only: nothing here touches a fight's rules.

import costumesBattleUrl from './art/duchess/costumes-battle.png';
import { drawDuchessCosmetic, FRAME, hasOverlay, OVERLAY_COSTUMES, wornCostume, type DuchessCosmeticId } from './render/duchessRules';
import { loadImage } from './render/loadImage';
import { settings } from './settings';
import { goatSheet } from './duchess';
import { toolHook } from './toolHooks';
import duchessGoatUrl from './art/units/duchess_goat.png';

/** The costume she wears now (the one chosen, while it is hers). */
export const costumeNow = (): DuchessCosmeticId => wornCostume(settings().duchessHat);

/** Her walking strip (`goat.png`, three frames facing left then three facing right) with `costume` drawn over each frame. */
export function dressWalk(img: HTMLImageElement, costume: DuchessCosmeticId = costumeNow()): HTMLImageElement | HTMLCanvasElement {
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

let battleOverlay: Promise<HTMLImageElement> | null = null;

/** Her battle sheet (`duchess_goat.png`) with a painted costume laid over each frame (its block of the battle overlay); the code-drawn
 *  free costumes are not drawn in the fight until their painted overlays land. The sheet itself when she wears none. */
export async function dressBattle(img: HTMLImageElement, costume: DuchessCosmeticId = costumeNow()): Promise<HTMLImageElement | HTMLCanvasElement> {
  if (!hasOverlay(costume)) return img;
  const over = await (battleOverlay ??= loadImage(costumesBattleUrl));
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  const row = OVERLAY_COSTUMES.indexOf(costume);
  g.drawImage(over, 0, row * c.height, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

// (the screenshot tool, `tools/cosmetics/shots.mjs`, draws her dressed sheets side by side under automation only)
toolHook('__duchessDress', { dressWalk, dressBattle, walkSheet: goatSheet, battleSheet: () => loadImage(duchessGoatUrl) });
