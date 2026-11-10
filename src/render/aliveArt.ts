// FX-ALIVE (docs/notes/fx-alive.md): the living ground's painted tile loops, one row of frames an element, each frame an isometric tile (a 2:1
// diamond). The owner's sheet frames each diamond with its effect, so `alivePatch` lays only the quarters on a patch's outer edges
// (`aliveQuarters`, FX-ALIVE-ART: docs/notes/fx-alive-art.md). The atlas is empty until the painted sheet lands (`docs/notes/fx-alive-art-prompts.md`,
// cut by `tools/fx-alive/cut.py` into `src/art/fx/alive/`); until then `alivePatch` lays the pack's rune strips. REPAINTS-2
// (docs/notes/repaints-2.md): the owner's borderless fill (`fill.png`, the same grid) lies on every tile of a patch, under its painted edge
// (`aliveFill`). Both are bundled into game.js, so nothing new is fetched (offline play).

import { Rectangle, Texture } from 'pixi.js';
import atlasUrl from '../art/fx/alive/atlas.png';
import manifest from '../art/fx/alive/atlas.json';
import fillUrl from '../art/fx/alive/fill.png';
import fillManifest from '../art/fx/alive/fill.json';
import { loadImage } from './loadImage';
import type { Element } from './fxRules';

type Manifest = { cell: [number, number]; rows: Partial<Record<string, [number, number]>> };
const M = manifest as unknown as Manifest;
const FM = fillManifest as unknown as Manifest;
/** A frame's size in the atlas, in px (width, height: a 2:1 diamond's box). */
export const ALIVE_CELL = M.cell;

const ROWS = new Map<string, Texture[]>();
// (each frame's four quarters, `[frame][row * 2 + column]`: the painted edge on each side of the diamond, `edgeQuarter`)
const QUARTERS = new Map<string, Texture[][]>();
const FILLS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** An element's living tile loop (empty before the atlas has loaded, or until the painted sheet holds that element). */
export const aliveFrames = (el: Element): Texture[] => ROWS.get(el) ?? [];
/** An element's loop cut into quarters, `[frame][row * 2 + column]` (empty as `aliveFrames` is). */
export const aliveQuarters = (el: Element): Texture[][] => QUARTERS.get(el) ?? [];
/** An element's borderless fill loop, a whole tile a frame (empty before it has loaded, or for an element the fill sheet lacks). */
export const aliveFill = (el: Element): Texture[] => FILLS.get(el) ?? [];

/** Load the atlases once and cut each element's row (`rows`: the row's index and its frame count). */
export function loadAliveArt(): Promise<void> {
  loading ??= Promise.all([
    Object.keys(M.rows).length
      ? loadImage(atlasUrl).then((img) => {
          const base = Texture.from(img);
          const [w, h] = M.cell;
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
      : Promise.resolve(),
    Object.keys(FM.rows).length
      ? loadImage(fillUrl).then((img) => {
          const base = Texture.from(img);
          const [w, h] = FM.cell;
          for (const [el, row] of Object.entries(FM.rows)) {
            if (!row) continue;
            FILLS.set(el, Array.from({ length: row[1] }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * w, row[0] * h, w, h) })));
          }
        })
      : Promise.resolve(),
  ]).then(() => undefined);
  return loading;
}
