// Turning a board: a section of the long map is fought in its own board coordinates (`u` across, `v` from the foes' edge
// at 0 to the heroes' edge at D - 1, whatever way it lies), and laid in the world turned a quarter turn at a time. These are
// the pure turns between the two. A turned board keeps its footprint's top left corner at (0, 0), so its tiles run over
// U in [0, footprint width) and V in [0, footprint depth).

import { D, W } from './board';

export type Rot = 0 | 1 | 2 | 3;

/** The world tile (within the section's footprint) of the board tile (u, v) when the board is turned `rot` quarter turns. */
export function turnTile(rot: Rot, u: number, v: number): [number, number] {
  switch (rot) {
    case 0: return [u, v];
    case 1: return [D - 1 - v, u];
    case 2: return [W - 1 - u, D - 1 - v];
    default: return [v, W - 1 - u];
  }
}

/** The board tile of the footprint tile (a, b) of a board turned `rot`: the inverse of `turnTile` (outside the board for a tile it does not cover). */
export function unturnTile(rot: Rot, a: number, b: number): [number, number] {
  switch (rot) {
    case 0: return [a, b];
    case 1: return [b, D - 1 - a];
    case 2: return [W - 1 - a, D - 1 - b];
    default: return [W - 1 - b, a];
  }
}

/** A footprint's width (along U) and depth (along V). */
export const footDims = (rot: Rot): [number, number] => (rot % 2 ? [D, W] : [W, D]);

/** Whether a section lying `rot` with its footprint's corner at (ou, ov) against the host's (which lies `hostRot`) is further
 *  from the screen than the host, so it is drawn behind the host's tiles and fighters. Footprints never overlap, so a
 *  section lies wholly to one side of the host's along U, along V, or both: along one axis only, that side says (-U or -V is
 *  further off); along both, the same sign on each says, and opposite signs (straight left or right of the host on the
 *  screen, never over it) go by U. */
export function liesBehind(rot: Rot, ou: number, ov: number, hostRot: Rot): boolean {
  const [w, d] = footDims(rot);
  const [hw, hd] = footDims(hostRot);
  const u = ou + w <= 0 ? -1 : ou >= hw ? 1 : 0;
  const v = ov + d <= 0 ? -1 : ov >= hd ? 1 : 0;
  return (u || v) < 0;
}

/** Where a step in the board's own direction (du, dv) goes in the world, turned. */
export function turnDir(rot: Rot, du: number, dv: number): [number, number] {
  const [a, b] = turnTile(rot, du, dv);
  const [o, p] = turnTile(rot, 0, 0);
  return [a - o, b - p];
}
