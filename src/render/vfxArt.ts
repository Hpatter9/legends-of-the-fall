// Small battle effects and status icons, backed by the same painted materials as skills and spells.
// Logical 32px frames preserve the callers' sizes while the artwork is smoothly sampled at higher resolution.

import type { Texture } from 'pixi.js';
import { loadPaintedArt, paintedStrip } from './cinematicArt';
import { VFX_LOOKS } from './cinematicRules';

export type VfxKey = keyof typeof VFX_LOOKS;

/** Each sheet's frames, by key (empty until `loadVfxArt` has run). */
export const VFX = {} as Record<VfxKey, Texture[]>;

export async function loadVfxArt(): Promise<void> {
  await loadPaintedArt();
  for (const [key, [element, family, form]] of Object.entries(VFX_LOOKS)) VFX[key as VfxKey] = paintedStrip(element, family, form);
}
