// A fresh party's first wave of the first army (the armies test's `playArmy(startedMeta(seed), 'orcs', seed * 7, HEROES)`, its first fight
// only): how many of `saves` (500) are lost. The watch item of STATS batches 5 and 6 (about 1 in 100; 1 in 400 before). `JOINT_OFF` as the
// other tools.
import './off';
import { startedMeta } from '../../src/sim/meta';
import { armyRun, startStage } from '../../src/sim/run';
import { fight, playOut } from '../../src/sim/battle';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { newCastle } from '../../src/sim/castle';
import { HEROES } from '../../src/sim/units';
import { maybeSpells } from '../autoplay';

const N = Number(process.argv[2] ?? 500);
const lost: number[] = [];
for (let seed = 1; seed <= N; seed++) {
  const meta = startedMeta(seed);
  const castle = newCastle();
  const run = armyRun(seed * 7, 'orcs', HEROES, castle, 0);
  autoRound(run, meta, false);
  const b = startStage(run);
  autoDeploy(b, run, meta);
  fight(b);
  maybeSpells(b, meta, castle);
  playOut(b);
  if (b.phase !== 'won') lost.push(seed);
}
console.log(`first wave: ${lost.length} of ${N} lost (${lost.join(' ')})`);
