// The road that leaves the village's open front: from the south street down to the bottom of the screen, with a signpost beside it (the Armies place).
// Plain data on the village's tile lattice (no Pixi, no DOM): tiles are (u, v) as in castleSpots.ts.

import type { Block } from './castleSpots';

export interface Land {
  /** The road, as one-tile blocks, from the village's south street to the bottom of the scene. */
  road: Block[];
  /** The signpost's tile, by the road, and the road tile its door opens onto. */
  sign: { u: number; v: number; door: { u: number; v: number } };
}

/** The rows of tiles (`s = u + v`) the road runs down to: more than the tallest phone shows. */
export const LAND_ROWS = 36;
/** The signpost stands by the first road tile at or below this row. */
const SIGN_ROW = 15;

export function buildLand(): Land {
  // a zigzag of one-tile steps (`u`, then `v`) from the village's south street, two tiles wide
  const road: Block[] = [];
  const seen = new Set<string>();
  const add = (u: number, v: number): void => {
    if (seen.has(`${u},${v}`)) return;
    seen.add(`${u},${v}`);
    road.push({ u0: u, v0: v, u1: u, v1: v });
  };
  let [u, v] = [3, 6];
  add(u, v);
  add(u + 1, v);
  for (let i = 0; u + v < LAND_ROWS; i++) {
    if (i % 2 === 0) u++;
    else v++;
    add(u, v);
    add(u + 1, v);
  }
  // (the road's right-hand tile in a row has `u - v = -1`; the sign stands on the tile up and to the right of one, so its door looks down the left onto the road)
  const at = road.find((r) => r.u0 - r.v0 === -1 && r.u0 + r.v0 >= SIGN_ROW);
  if (!at) throw new Error('no place for the signpost');
  const door = { u: at.u0, v: at.v0 };
  return { road, sign: { u: door.u, v: door.v - 1, door } };
}
