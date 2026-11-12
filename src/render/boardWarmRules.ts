// WAVE-DELAY (docs/notes/wave-delay.md): a board's columns are each painted on a canvas of their own, about ninety a board, and a
// board was painted whole in one go: once for the march at a wave's end, again for the fight, again when it was baked into the
// scenery. On a phone each of those was a stop of one to two seconds. So the painted columns are kept for three boards, and the next
// board's are painted ahead a few a frame while the last fight's falls play out. Pure: the tests read it; `boardView.ts` carries it out.

/** The room for painted columns: entries, and bytes of texture (a column is about 64 px by 70 to 110 px: 20 to 30 KB). Three boards
 *  of 88 to 130 columns, with their set pieces' plinths. It was 256 entries and 4 MB: not two boards' worth, so the second was never
 *  kept. */
export const COLUMN_ROOM = { entries: 640, bytes: 16 * 1024 * 1024 };

export const WARM = {
  /** The work a frame gives to painting ahead, ms: a frame stays a frame. */
  FRAME_MS: 10,
  /** The tiles painted in a frame at least, however slow the device (so the whole board is done in a second or two of frames). */
  LEAST: 4,
};

/** Whether to paint more this frame: `done` tiles painted so far in it, in `spent` ms. Always the least; then more while there is time. */
export const warmMore = (done: number, spent: number): boolean => done < WARM.LEAST || spent < WARM.FRAME_MS;
