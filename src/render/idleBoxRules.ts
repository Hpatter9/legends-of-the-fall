// SUMMON-SMOOTH (docs/notes/summon-smooth.md): a unit sheet's idle box from the table made when the game is built (`idleBoxData.ts`,
// by tools/summon-smooth/idle-boxes.py), in place of reading the sheet's pixels back on the phone. Pure: no Pixi, no DOM.
import { IDLE_BOX } from './idleBoxData';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The idle box of `sheet`, whose picture is `imgW` x `imgH` px and whose frames are `fw` x `fh`; undefined where the table has none,
 *  or its box cannot be this picture's (it does not fit the frame, or the picture is too small to hold the idle row it was read from:
 *  a dressed or swapped picture under the same name), when the caller reads the pixels itself as before. */
export function idleBoxOf(sheet: string, imgW: number, imgH: number, fw: number, fh: number): Box | undefined {
  const b = IDLE_BOX[sheet];
  if (!b) return undefined;
  const [x, y, w, h] = b;
  if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > fw || y + h > fh || imgW < fw || imgH < fh) return undefined;
  return { x, y, w, h };
}
