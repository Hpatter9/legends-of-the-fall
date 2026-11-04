// Shared helpers for the tests.

import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle, type Stage } from '../src/sim/battle';
import { HEROES } from '../src/sim/units';
import type { Run } from '../src/sim/run';
import { allRunes } from '../src/sim/runes';

/** A fight on the seed's board, against `band`, with all five heroes placed on the first free tiles of their rows, front row first. */
export function readyBattle(seed: number, band?: string | readonly string[], stage?: Stage): Battle {
  const b = startBattle(seed, band, stage);
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  // (spread across the front row, then the rows behind)
  HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
  return b;
}

/** What a run has found, by id: its pieces (a run from before runes) and its runes, worn or in the bag (SEVEN-SLOT GEAR batch 4). */
export const foundOf = (run: Run): number[] => [...(run.pack ?? []).map((x) => x.id), ...(run.runes ? allRunes(run.runes).map((r) => r.id) : [])];
