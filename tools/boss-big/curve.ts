// The armies test's curve check (`test/armies.test.ts`, the starting five, no castle) with the signatures on or `--off`, and per boss wave:
//   node tools/boss-big/run.mjs curve [--off] [--army undead] [--level 22] [--n 16]
import './switch';
import { playArmy, savedAt } from '../autoplay';
import { HEROES } from '../../src/sim/units';
import { armyById } from '../../src/sim/armies';
const f = (k: string, d: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const army = f('--army', 'undead');
const level = Number(f('--level', '22'));
const n = Number(f('--n', '16'));
let wins = 0;
const fell: number[] = [];
for (let i = 0; i < n; i++) {
  const r = playArmy(savedAt(level, HEROES, i + 1), army, 900 + i, HEROES);
  if (r.cleared) wins++;
  else fell.push(r.won + 1);
}
console.log(`${army} at ${level}: ${wins}/${n} cleared; lost runs fell at waves ${fell.join(' ')} (bosses at ${armyById(army)!.waves.map((w, i) => (w.boss ? i + 1 : 0)).filter(Boolean).join(', ')})`);
