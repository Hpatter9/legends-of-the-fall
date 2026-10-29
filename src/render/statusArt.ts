// STATUS-FX: the ailments' atlas: one picture of square cells, and `atlas.json` giving its cell size and, for each part
// key of `statusStyles.ts` (`<ailment>.<place>`), where its strip starts (column and row, in cells) and how many frames
// run along the row. The pack's strips are in it today (tools/status-fx/status-sheets.py); a painted atlas with the same
// keys and its own cell size drops in with no code change (tools/status-fx/import-status-art.py). Bundled into game.js,
// so nothing new is fetched (offline play).

import { Rectangle, Texture } from 'pixi.js';
import atlasUrl from '../art/fx/status/atlas.png';
import manifest from '../art/fx/status/atlas.json';
import { loadImage } from './loadImage';
import { STATUS_KEYS } from './statusStyles';

/** A frame's side in the atlas, in px. */
export const STATUS_CELL: number = (manifest as { cell: number }).cell;
/** Pixel art (the pack's 32px strips) is drawn sharp; a painted atlas, larger, is sampled smoothly. */
export const STATUS_PIXEL = STATUS_CELL <= 32;
const PARTS = (manifest as { parts: Record<string, number[]> }).parts;

const STRIPS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** A part's frames (empty before the atlas has loaded, or for a key it lacks). */
export const statusFrames = (key: string): Texture[] => STRIPS.get(key) ?? [];

/** Load the atlas once and cut every part's frames. */
export function loadStatusArt(): Promise<void> {
  loading ??= loadImage(atlasUrl).then((img) => {
    const base = Texture.from(img);
    base.source.style.scaleMode = STATUS_PIXEL ? 'nearest' : 'linear';
    for (const key of STATUS_KEYS) {
      const s = PARTS[key];
      if (!s) continue;
      const frames: Texture[] = [];
      for (let i = 0; i < s[2]; i++) frames.push(new Texture({ source: base.source, frame: new Rectangle((s[0] + i) * STATUS_CELL, s[1] * STATUS_CELL, STATUS_CELL, STATUS_CELL) }));
      STRIPS.set(key, frames);
    }
  });
  return loading;
}
