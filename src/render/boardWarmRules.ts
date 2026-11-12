// WAVE-DELAY (docs/notes/wave-delay.md): a board's columns are each painted on a canvas of their own, about ninety a board, and a
// board was painted whole in one go: once for the march at a wave's end, again for the fight, again when it was baked into the
// scenery. On a phone each of those was a stop of one to two seconds. So the painted columns are kept for three boards, and the next
// board's are painted ahead: a tile a frame through the fight, a few a frame once it is won. Pure: the tests read it; `boardView.ts` carries it out.

/** The room for painted columns: entries, and bytes of texture (a column is about 64 px by 70 to 110 px: 20 to 30 KB). Three boards
 *  of 88 to 130 columns, with their set pieces' plinths. It was 256 entries and 4 MB: not two boards' worth, so the second was never
 *  kept. */
export const COLUMN_ROOM = { entries: 640, bytes: 16 * 1024 * 1024 };

export const WARM = {
  /** The work a frame gives to painting ahead once the fight is over, ms: a frame stays a frame. */
  FRAME_MS: 10,
  /** The tiles painted in a frame at least then, however slow the device (so the whole board is done in a second or two of frames). */
  LEAST: 4,
  /** While the fight is still on, painting ahead takes far less: a tile a frame at least, and this much work at most (ms). A fight
   *  lasts hundreds of frames, so the next board is all painted long before the wave ends, and no frame of the fight feels it. */
  FIGHT_MS: 2,
  FIGHT_LEAST: 1,
  /** Or this share of the time since the last frame, when that is more: a device already at a few frames a second has few frames to
   *  paint in, and does not feel a twentieth more. */
  FIGHT_SHARE: 0.05,
  /** A fight is this old before painting ahead begins (ms of the fight's clock): its own first frames are busy enough. */
  FIGHT_FROM: 1500,
};

/** Whether to paint more this frame: `done` tiles painted so far in it, in `spent` ms; `fighting` while the fight is still on.
 *  `gap` the ms since the last frame. Always the least; then more while there is time. */
export const warmMore = (done: number, spent: number, fighting = false, gap = 0): boolean =>
  fighting ? done < WARM.FIGHT_LEAST || spent < Math.max(WARM.FIGHT_MS, Math.min(250, gap) * WARM.FIGHT_SHARE) : done < WARM.LEAST || spent < WARM.FRAME_MS;

/** Whether to begin painting the next board ahead: in a fight old enough, or once it is won. */
export const warmNow = (phase: string, t: number): boolean => phase === 'won' || (phase === 'fight' && t >= WARM.FIGHT_FROM);
