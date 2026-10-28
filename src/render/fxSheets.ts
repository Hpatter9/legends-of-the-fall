// The combat effect names retain the pack's vocabulary, but now resolve to shared painted materials.
// The old atlas metadata remains the name catalogue for signatures, rules and existing audits.

import type { Texture } from 'pixi.js';
import atlasMeta from '../art/fx/pack/atlas.json';
import type { Family, PackKey } from './fxRules';
import type { PaintedElement } from './cinematicRules';
import { loadPaintedArt, paintedStrip } from './cinematicArt';

/** Each strip's frames by name (empty until `loadPackArt` has run). Strips outside the atlas give no frames. */
export const PACK = {} as Record<PackKey, Texture[]>;

/** The names the atlas holds (for the tests and the audit). */
export const PACK_NAMES = Object.keys(atlasMeta);

export async function loadPackArt(): Promise<void> {
  await loadPaintedArt();
  for (const name of PACK_NAMES) {
    const [element, family] = name.split('-') as [PaintedElement, Family];
    PACK[name as PackKey] = paintedStrip(element, family);
  }
}
