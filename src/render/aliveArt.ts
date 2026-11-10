// FX-ALIVE (docs/notes/fx-alive.md): the living ground's painted tile loops, one row of frames an element, each frame an isometric tile (a 2:1
// diamond). The owner's sheet frames each diamond with its effect, so `alivePatch` lays only the quarters on a patch's outer edges
// (`aliveQuarters`, FX-ALIVE-ART: docs/notes/fx-alive-art.md). The atlas is empty until the painted sheet lands (`docs/notes/fx-alive-art-prompts.md`,
// cut by `tools/fx-alive/cut.py` into `src/art/fx/alive/`); until then `alivePatch` lays the pack's rune strips. Bundled into game.js, so
// nothing new is fetched (offline play).

import { Rectangle, Texture } from 'pixi.js';
import atlasUrl from '../art/fx/alive/atlas.png';
import manifest from '../art/fx/alive/atlas.json';
import { loadImage } from './loadImage';
import type { Element } from './fxRules';

const M = manifest as unknown as { cell: [number, number]; rows: Partial<Record<string, [number, number]>> };
/** A frame's size in the atlas, in px (width, height: a 2:1 diamond's box). */
export const ALIVE_CELL = M.cell;

const ROWS = new Map<string, Texture[]>();
// (each frame's four quarters, `[frame][row * 2 + column]`: the painted edge on each side of the diamond, `edgeQuarter`)
const QUARTERS = new Map<string, Texture[][]>();
let loading: Promise<void> | null = null;

/** An element's living tile loop (empty before the atlas has loaded, or until the painted sheet holds that element). */
export const aliveFrames = (el: Element): Texture[] => ROWS.get(el) ?? [];
/** An element's loop cut into quarters, `[frame][row * 2 + column]` (empty as `aliveFrames` is). */
export const aliveQuarters = (el: Element): Texture[][] => QUARTERS.get(el) ?? [];

/** Load the atlas once and cut each element's row (`rows`: the row's index and its frame count). */
export function loadAliveArt(): Promise<void> {
  loading ??= Object.keys(M.rows).length
    ? loadImage(atlasUrl).then((img) => {
        const base = Texture.from(img);
        const [w, h] = ALIVE_CELL;
        for (const [el, row] of Object.entries(M.rows)) {
          if (!row) continue;
          const frames: Texture[] = [];
          const quarters: Texture[][] = [];
          for (let i = 0; i < row[1]; i++) {
            const x = i * w;
            const y = row[0] * h;
            frames.push(new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) }));
            quarters.push([0, 1, 2, 3].map((q) => new Texture({ source: base.source, frame: new Rectangle(x + (q % 2) * (w / 2), y + Math.floor(q / 2) * (h / 2), w / 2, h / 2) })));
          }
          ROWS.set(el, frames);
          QUARTERS.set(el, quarters);
        }
      })
    : Promise.resolve();
  return loading;
}
