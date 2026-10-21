// The combat effects' strips, cut from one atlas (`src/art/fx/pack/atlas.png`, from the Pixel Effects pack by
// `tools/fx-atlas.py`): `PACK['fire-orb']` is the frames of that strip. Loaded once by `loadPackArt`.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import atlasUrl from '../art/fx/pack/atlas.png';
import atlasMeta from '../art/fx/pack/atlas.json';
import type { PackKey } from './fxRules';

/** Each strip's frames by name (empty until `loadPackArt` has run). Strips outside the atlas give no frames. */
export const PACK = {} as Record<PackKey, Texture[]>;

/** The names the atlas holds (for the tests and the audit). */
export const PACK_NAMES = Object.keys(atlasMeta);

export async function loadPackArt(): Promise<void> {
  const base = Texture.from(await loadImage(atlasUrl));
  const meta = atlasMeta as unknown as Record<string, [number, number, number]>;
  for (const [name, [x, y, n]] of Object.entries(meta))
    (PACK as Record<string, Texture[]>)[name] = Array.from({ length: n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(x + i * 32, y, 32, 32) }));
}
