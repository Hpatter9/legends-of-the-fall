// ARMIES-SWIPE (docs/notes/armies-swipe.md): the rules of the Armies page's swipe, kept free of the DOM so a test can read them; the
// page's side is `armiesView.ts`. The owner: "in the armies tab, just the army card should swipe and the info changes under it after
// it moves."
//
// - Only the army's card follows the finger. The information under it stays where it is, and still shows the army it showed.
// - Let go past half-way (or flicked), the card settles on the army beside it; let go short of that, it springs back.
// - The information changes only once the card has settled, and only if it settled on another army.
// - With reduced motion nothing slides: a swipe swaps the card and the information at once.

/** How far a finger must travel before the page takes the touch for a swipe (and not a tap, or a scroll of the information). */
export const SWIPE_START = 8;
/** A flick: at least this fast (px a millisecond) and this far (px) turns the card though it is short of half-way. */
export const FLICK_SPEED = 0.5;
export const FLICK_FAR = 24;
/** With reduced motion the card does not follow the finger, so there is no half-way to see: a swipe this long (px) turns it. */
export const STILL_FAR = 40;
/** How much of the finger's travel the card keeps when pulled past the first or last army (there is nothing there to show). */
export const END_DRAG = 0.3;
/** How long the card takes to settle, and the information to fade across (ms). */
export const SLIDE_MS = 260;
export const FADE_MS = 160;

/** Which way a touch is going once it has moved: 'x' a swipe of the card, 'y' a scroll (left to the page), null not yet known. */
export function swipeAxis(dx: number, dy: number): 'x' | 'y' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < SWIPE_START && ay < SWIPE_START) return null;
  return ax > ay ? 'x' : 'y';
}

/** How far the card is drawn from its place for a drag of `dx` (a finger going left, `dx` below zero, brings the next army in): the
 *  finger's own travel, never more than one card's width, and only a part of it when there is no army that way. */
export function dragShift(index: number, count: number, dx: number, width: number): number {
  const to = dx < 0 ? index + 1 : index - 1;
  const none = to < 0 || to >= count;
  const shift = Math.max(-width, Math.min(width, dx));
  return none ? shift * END_DRAG : shift;
}

/** The army a drag settles on when the finger lifts: the one beside it when the drag went past half-way or was flicked that way (with
 *  reduced motion, `still`, a plain swipe is enough), else the one it started on. Never off either end. */
export function settleOn(index: number, count: number, dx: number, width: number, speed = 0, still = false): number {
  const far = Math.abs(dx);
  const flick = Math.abs(speed) >= FLICK_SPEED && far >= FLICK_FAR && Math.sign(speed) === Math.sign(dx);
  const turned = still ? far >= STILL_FAR : far > width / 2 || flick;
  if (!turned || !count) return index;
  const to = index + (dx < 0 ? 1 : -1);
  return to < 0 || to >= count ? index : to;
}

/** The army an arrow (or a dot, or a call to open on one) leads to, kept on the list. */
export function stepTo(to: number, count: number): number {
  return Math.max(0, Math.min(count - 1, to));
}

/** The army the information shows: the one it showed while the card is still moving, the card's own once it has settled. */
export function infoArmy(shown: number, card: number, moving: boolean): number {
  return moving ? shown : card;
}

/** What each arrow does at this army: the left one is dimmed (and does nothing) at the first, the right one at the last. */
export function arrowsAt(index: number, count: number): { prev: boolean; next: boolean } {
  return { prev: index > 0, next: index < count - 1 };
}
