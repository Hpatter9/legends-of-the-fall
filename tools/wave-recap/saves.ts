// Saved runs for the wave-recap shots (`shots.mjs` bundles this with esbuild): a spire climb and a calamity, fresh, made with the
// sim's own functions. Nothing here is played.
import { startedMeta } from '../../src/sim/meta';
import { towerRun } from '../../src/sim/modes';
import { fresh } from '../calmap/saves';
import type { Run } from '../../src/sim/run';

/** A fresh spire climb of `seed` with the party `party`. */
export function spire(seed: number, party: string[]): Run {
  const m = startedMeta(5);
  m.unlocked = [...new Set([...m.unlocked, ...party])];
  m.party = [...party];
  return towerRun(seed, m);
}

/** A fresh calamity of `seed`: the samurai and four hired. */
export const calamity = (seed: number): Run => fresh(seed, 'samurai', 4);
