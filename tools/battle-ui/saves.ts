// A saved calamity with a roster of ten (a werewolf among them), for the battle-ui shots.
import { fresh } from '../calmap/saves';
import { hireHero } from '../../src/sim/climb';
import type { Run } from '../../src/sim/run';

export function big(seed: number): Run {
  const run = fresh(seed, 'samurai', 6);
  for (const k of ['werewolf', 'knight', 'archer']) hireHero(run, k, 0);
  return run;
}
