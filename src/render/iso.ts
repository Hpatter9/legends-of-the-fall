// The board's isometric projection, as Chronos's raid board draws it (tacticsView.ts): a tile's top is a diamond
// `TW` wide and `TH` tall, and each step of height lifts it `HH` pixels.

/** A tile top's width. */
export const TW = 64;
/** A tile top's height. */
export const TH = 32;
/** Pixels per step of height. */
export const HH = 12;
/** How far every column reaches below the lowest ground. */
export const FOOT = 10;

/** The centre of a tile's top, in world pixels. */
export const at = (u: number, v: number, h: number): [number, number] => [(u - v) * (TW / 2), (u + v) * (TH / 2) - h * HH];

/** Draw order: tiles further down the screen's diagonal are nearer. A tile is drawn at `depth * 10`, whatever stands on
 *  it a little over (so a tall column in front still hides a fighter behind it). */
export const depth = (u: number, v: number) => (u + v) * 10;
