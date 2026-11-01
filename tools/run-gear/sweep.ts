// The real-gear batch's mode sweep (docs/notes/run-gear.md): the spire's and the Calamity's floors reached by the greedy player, and the
// daily's clear rate, so a change to a run's gear can be measured against main in one go. `node tools/run-gear/sweep.mjs [--attempts 40]`.

import { newCastle } from '../../src/sim/castle';
import { startedMeta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { HEROES } from '../../src/sim/units';
import { playCalamity, playDaily, playTower } from '../autoplay';
import * as runGear from '../../src/sim/runGear';

// (`--field 1.5,3`: another fresh-from-the-field boost for army runs and bare runs, for tuning; on main the module has none)
const boost = (runGear as { FIELD_BOOST?: { army: number; bare: number } }).FIELD_BOOST;
if (boost && process.argv.includes('--field')) {
  const [a, b] = process.argv[process.argv.indexOf('--field') + 1].split(',').map(Number);
  if (a > 0) boost.army = a;
  if (b > 0) boost.bare = b;
}

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const N = arg('--attempts', 40);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

const spire: number[] = [];
for (let a = 0; a < N; a++) spire.push(playTower(startedMeta(a + 1), mixSeed(a + 1, 0x5b1e), startedMeta(a + 1).party, newCastle(), 90).floors);
console.log(`spire: ${N} climbs, floors mean ${mean(spire).toFixed(2)}`);

const cal: number[] = [];
const maps: number[] = [];
for (let a = 0; a < N; a++) {
  const r = playCalamity(startedMeta(a + 1), mixSeed(a + 1, 0xca1), HEROES[a % HEROES.length], newCastle(), 0);
  cal.push(r.floors);
  maps.push(r.maps);
}
console.log(`calamity: ${N} runs, floors mean ${mean(cal).toFixed(2)}, maps mean ${mean(maps).toFixed(2)}`);

let clears = 0;
const waves: number[] = [];
for (let d = 0; d < N; d++) {
  const r = playDaily(startedMeta(d + 1), 20260101 + d);
  if (r.cleared) clears++;
  waves.push(r.won);
}
console.log(`daily: ${N} dates, cleared ${((100 * clears) / N).toFixed(1)}%, waves mean ${mean(waves).toFixed(2)}`);
