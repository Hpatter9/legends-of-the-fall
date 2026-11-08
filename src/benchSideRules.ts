// RUNE-BENCH: the pull bar's rules (docs/notes/rune-bench.md). The bench has two sides: the heroes (the bar rests on the bench's right edge)
// and the runes (pulled across, it rests on the left). These are the pure parts the page and the tests share: where a pull lands, how far
// along the slide a finger has it, and whether the rune side is there at all. No DOM, no Pixi.

export type BenchSide = 'heroes' | 'runes';

/** A press that moves less than this (px) is a tap: it flips the side. */
export const GRIP_TAP_PX = 8;
/** A pull past this share of the way across lands on the far side; a shorter one springs back. */
export const GRIP_FLIP_SHARE = 0.35;
/** A flick this fast (px per ms) toward the far side lands there, however short. */
export const GRIP_FLICK = 0.45;
/** How far past either end a pull stretches, as a share of the overshoot (a rubber band, so the end is felt). */
export const GRIP_STRETCH = 0.25;

/** How far along the slide the bar is: 0 resting right (the heroes), 1 resting left (the runes). `dx` is the finger's move since it
 *  pressed (negative is leftward); `travel` is the slide's length in px. Past either end it stretches a little (below 0 or above 1). */
export function gripProgress(from: BenchSide, dx: number, travel: number): number {
  if (travel <= 0) return from === 'runes' ? 1 : 0;
  const p = (from === 'runes' ? 1 : 0) - dx / travel;
  return p < 0 ? p * GRIP_STRETCH : p > 1 ? 1 + (p - 1) * GRIP_STRETCH : p;
}

/** Where the bar lands when the finger lets go: a tap flips it; a pull past `GRIP_FLIP_SHARE`, or a flick toward the far side, lands on
 *  the far side; anything else springs back. `vx` is the finger's speed at the end (px per ms, negative leftward). */
export function gripLanding(from: BenchSide, dx: number, travel: number, vx = 0): BenchSide {
  if (Math.abs(dx) < GRIP_TAP_PX) return otherSide(from);
  const toward = from === 'heroes' ? -1 : 1;
  if (vx * toward >= GRIP_FLICK) return otherSide(from);
  if (vx * toward <= -GRIP_FLICK) return from;
  const share = (dx * toward) / Math.max(1, travel);
  return share >= GRIP_FLIP_SHARE ? otherSide(from) : from;
}

export const otherSide = (s: BenchSide): BenchSide => (s === 'heroes' ? 'runes' : 'heroes');

/** The side the bench shows: the runes only in a run that has runes, on the deploy screen (runes change between waves only); otherwise
 *  the heroes, whatever was chosen (the choice is kept for the next deploy). */
export function shownSide(chosen: BenchSide, hasRunes: boolean, deploy: boolean): BenchSide {
  return chosen === 'runes' && hasRunes && deploy ? 'runes' : 'heroes';
}

/** Whether the pull bar shows: a run with runes, on the deploy screen. */
export const gripShown = (hasRunes: boolean, deploy: boolean): boolean => hasRunes && deploy;

/** The rune Auto's label: "Auto runes", or locked, the stars still to win: "Auto · 4★". */
export const runeAutoLabel = (open: boolean, toGo: number): string => (open ? 'Auto runes' : `Auto · ${toGo}★`);
