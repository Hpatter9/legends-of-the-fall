// The Calamity cleared by the greedy player (`tools/autoplay.ts`'s `playCalamity`, a fresh save, the starters in turn), with the bosses'
// signature attacks on or `--off`: how many of `--seeds` (40) runs clear it, and the map each lost run fell on.
//   node tools/boss-big/run.mjs calamity [--off] [--seeds 40]
import './switch';
import { playCalamity } from '../autoplay';
import { startedMeta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { HEROES } from '../../src/sim/units';

const i = process.argv.indexOf('--seeds');
import { SIG } from '../../src/sim/bossAttacks';
const c = process.argv.indexOf('--cal');
if (c >= 0) SIG.CALAMITY = Number(process.argv[c + 1]);
const N = i >= 0 ? Number(process.argv[i + 1]) : 40;
let cleared = 0;
const fell: string[] = [];
for (let a = 1; a <= N; a++) {
  const r = playCalamity(startedMeta(a), mixSeed(a, 0xca1), HEROES[a % HEROES.length]) as { cleared: boolean } & Record<string, unknown>;
  if (r.cleared) cleared++;
  else fell.push(String(r.map ?? r.maps ?? r.won ?? '?'));
}
console.log(`cleared ${cleared}/${N}; the lost runs fell at ${fell.join(' ')}`);
