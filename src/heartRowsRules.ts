// HEART-ROWS (the owner's ask: "two rows of five up top, and when one is used, one fades to black"): the run's lives in the top bar
// as a heart each, five to a row. A full heart is a life still held; a spent one is the same heart faded to black, left in its place.
// Lives are spent from the end (the last heart of the last row first), so the full ones stay together from the start. Pure: no DOM.

/** Hearts to a row. */
export const HEARTS_ROW = 5;
/** How long one heart takes to fade from full to black (ms). */
export const HEART_FADE_MS = 520;
/** When several lives go at once (the whole party fell: a life each), each heart starts this long after the one before it (ms). */
export const HEART_STAGGER_MS = 110;

/** How many rows the hearts take: five to a row, as many rows as needed (at least one, so an empty run still has its place). */
export const heartRows = (max: number): number => Math.max(1, Math.ceil(Math.max(0, max) / HEARTS_ROW));

/** Whether heart `i` (0 is the first of the first row) is a life still held. */
export const heartFull = (i: number, left: number): boolean => i < left;

/** The hearts to fade when the lives shown go from `was` to `left`: the last spent first, each `HEART_STAGGER_MS` after the one
 *  before. None when nothing was shown before (the first draw), or when lives came back. */
export function heartFades(was: number, left: number, max: number): { i: number; delay: number }[] {
  if (was < 0 || left >= was) return [];
  const out: { i: number; delay: number }[] = [];
  for (let i = Math.min(was, max) - 1, n = 0; i >= Math.max(0, left); i--, n++) out.push({ i, delay: n * HEART_STAGGER_MS });
  return out;
}

/** The words the hearts carry (their tooltip and their spoken label). */
export const heartsLabel = (left: number, max: number, reviveS: number): string =>
  `${left} of ${max} ${max === 1 ? 'life' : 'lives'} left. A fallen hero rises after ${reviveS} seconds for one life.`;
