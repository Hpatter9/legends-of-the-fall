// FX-ALIVE (docs/notes/fx-alive.md): the living ground's painted tile loops, one row of frames an element, each frame an isometric tile (a 2:1
// diamond) that tiles seamlessly with its neighbours. The atlas is empty until the painted sheet lands (`docs/notes/fx-alive-art-prompts.md`,
// cut by `tools/fx-alive/cut.py` into `src/art/fx/alive/`); until then `alivePatch` lays the pack's rune strips. Bundled into game.js, so
// nothing new is fetched (offline play).

import { Rectangle, Texture } from 'pixi.js';
import atlasUrl from '../art/fx/alive/atlas.png';
import manifest from '../art/fx/alive/atlas.json';
import { loadImage } from './loadImage';
import type { Element } from './fxRules';

const M = manifest as { cell: [number, number]; rows: Partial<Record<string, [number, number]>> };
/** A frame's size in the atlas, in px (width, height: a 2:1 diamond's box). */
export const ALIVE_CELL = M.cell;

const ROWS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** An element's living tile loop (empty before the atlas has loaded, or until the painted sheet holds that element). */
export const aliveFrames = (el: Element): Texture[] => ROWS.get(el) ?? [];

/** Load the atlas once and cut each element's row (`rows`: the row's index and its frame count). */
export function loadAliveArt(): Promise<void> {
  loading ??= Object.keys(M.rows).length
    ? loadImage(atlasUrl).then((img) => {
        const base = Texture.from(img);
        const [w, h] = ALIVE_CELL;
        for (const [el, row] of Object.entries(M.rows)) {
          if (!row) continue;
          const frames: Texture[] = [];
          for (let i = 0; i < row[1]; i++) frames.push(new Texture({ source: base.source, frame: new Rectangle(i * w, row[0] * h, w, h) }));
          ROWS.set(el, frames);
        }
      })
    : Promise.resolve();
  return loading;
}
