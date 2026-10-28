// The aura atlas: one picture of square cells, and `atlas.json` giving its cell size and, for each part key of
// `auraStyles.ts` (`<class>.<step>.<part>`), where its strip starts (column and row, in cells) and how many frames run
// along the row from there. The pack's strips are in it today
// (`tools/awaken/aura-sheets.py`); a painted atlas with the same keys and its own cell size drops in with no code change.
// Loaded once; the fight's Pixi aura and the menus' canvas aura both read it.

import atlasUrl from '../art/fx/aura/atlas.png';
import manifest from '../art/fx/aura/atlas.json';
import { loadImage } from './loadImage';

/** A frame's side in the atlas, in px. */
export const AURA_CELL: number = (manifest as { cell: number }).cell;
/** Pixel art (the pack's 32px strips) is drawn sharp; a painted atlas, larger, is sampled smoothly. */
export const AURA_PIXEL = AURA_CELL <= 32;
const PARTS = (manifest as { parts: Record<string, number[]> }).parts;

/** A part's strip in the atlas: [column, row, frames] in cells (undefined for a key the atlas lacks). */
export function auraStrip(key: string): readonly number[] | undefined {
  return PARTS[key];
}

let img: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement> | null = null;

/** The atlas picture, once loaded (null before). */
export const auraImage = (): HTMLImageElement | null => img;

/** Load the atlas (once). */
export function loadAuraImage(): Promise<HTMLImageElement> {
  loading ??= loadImage(atlasUrl).then((im) => (img = im));
  return loading;
}
