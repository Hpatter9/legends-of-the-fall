// Shared helpers for the tests.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle } from '../src/sim/battle';
import { HEROES } from '../src/sim/units';

/** A fight on the seed's board, against `band`, with all five heroes placed on the first free tiles of their rows, front row first. */
export function readyBattle(seed: number, band?: string): Battle {
  const b = startBattle(seed, band);
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  // (spread across the front row, then the rows behind)
  HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
  return b;
}
