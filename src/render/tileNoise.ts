// A tile's hash and a smooth noise over a board, for looks only (the floors, the rims, the battlefield's life). They were the Assault's
// field's (`fieldLooks.ts`, gone with the Assault, RELEASE-TRIM); the same numbers, so every board looks as it did. No Pixi, no DOM.

/** A hash of a tile and a salt, 0 to 1 (looks only). */
export function hash(u: number, v: number, salt = 0): number {
  let x = Math.imul(u * 374761393 + v * 668265263 + salt * 2246822519, 0x27d4eb2d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}

/** A smooth noise over the field (patches `cell` tiles across), 0 to 1. */
export function noise(u: number, v: number, cell: number, salt = 0): number {
  const x = u / cell;
  const y = v / cell;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, salt);
  const b = hash(x0 + 1, y0, salt);
  const c = hash(x0, y0 + 1, salt);
  const d = hash(x0 + 1, y0 + 1, salt);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
}

