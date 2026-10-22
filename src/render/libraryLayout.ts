// The library's floor plan (the Spells tab): plain data, so a test can check it. Room pixels.

/** The room is the wall picture's size (192 x 128 pixels); the lectern stands in front of the window, its feet at `LECTERN.y`. */
export const LIB_W = 192;
export const LIB_H = 128;
export const LECTERN = { x: 96, y: 126 };
/** The candle flames in the wall picture: where the glow goes (room pixels). */
export const CANDLES: readonly { x: number; y: number; r: number }[] = [
  { x: 11, y: 62, r: 30 },
  { x: 179, y: 62, r: 30 },
  { x: 47, y: 80, r: 22 },
  { x: 143, y: 80, r: 22 },
];
