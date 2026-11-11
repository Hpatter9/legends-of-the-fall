// LIVING-FIELDS, step 3: the painted traps sheet (`art-source/living-fields/traps.png`, cut by `tools/living-fields/import-art.py` into
// `src/art/living-fields/traps.png` and `traps.json`). Until the sheet is painted the atlas is empty and the board draws its stand-ins
// (`paintTrap` and `trapProps` in `boardView.ts`); once a cell is in the atlas the board stands it on its tile instead, with no code change.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import sheetUrl from '../art/living-fields/traps.png';
import CELLS from '../art/living-fields/traps.json';

/** A cell: its frame in the atlas, and where its tile's middle lies against its top left. */
type Cell = [x: number, y: number, w: number, h: number, fx: number, fy: number];
const cells = CELLS as Record<string, Cell>;

/** The sheet's tile is 128 px wide; the board's is 64. */
export const TRAP_ART_SCALE = 0.5;

/** Whether the sheet has a cell (the tests and the board's painter ask: a painted cell takes the stand-in's place). */
export const hasTrapArt = (name: string | null): boolean => !!name && name in cells;

let sheet: Texture | null = null;
const made = new Map<string, Texture>();

/** Load the sheet (nothing to load while it is empty). */
export async function loadTrapArt(): Promise<void> {
  if (!Object.keys(cells).length || sheet) return;
  sheet = Texture.from(await loadImage(sheetUrl));
}

/** A cell's texture and where its tile's middle lies on it (as an anchor), or null if the sheet has none or is not loaded. */
export function trapTexture(name: string | null): { tex: Texture; ax: number; ay: number } | null {
  if (!name || !sheet || !(name in cells)) return null;
  const [x, y, w, h, fx, fy] = cells[name];
  let tex = made.get(name);
  if (!tex) made.set(name, (tex = new Texture({ source: sheet.source, frame: new Rectangle(x, y, w, h) })));
  return { tex, ax: fx / w, ay: fy / h };
}
