// STATS batch 2 (docs/notes/stats-2.md): each hero's power by level (`powerOf`, as the hero sheet reads it: grade 1, nothing worn, no
// talents), the roster's mean and its spread, at ranks 0 and 4.
//
//   node tools/stats/budget.mjs                       levels 1, 4, 8, 10, 12, 16, 20, 25, 30, 40, 50, 60, 80, 100
//   node tools/stats/budget.mjs --levels 1,20,100 --heroes
//
// Read-only: it changes nothing.

import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { powerOf } from '../../src/sim/power';
import { gradeBoost } from '../../src/sim/run';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const levels = (arg('levels') ?? '1,4,8,10,12,16,20,25,30,40,50,60,80,100').split(',').map(Number);
const heroes = process.argv.includes('--heroes');
const pad = (s: string | number, n: number) => String(s).padEnd(n);

console.log(pad('Level', 7) + pad('Mean r0', 10) + pad('Mean r4', 10) + pad('Low r0', 9) + pad('High r0', 9) + 'Spread');
for (const level of levels) {
  const p0 = ALL_HEROES.map((k) => powerOf(k, gradeBoost(1, 0, level)));
  const p4 = ALL_HEROES.map((k) => powerOf(k, gradeBoost(1, 4, level)));
  const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
  const m0 = mean(p0);
  // (each hero's power as a share of the roster's mean at that level: how far the shapes pull heroes apart)
  const rel = p0.map((p) => p / m0);
  console.log(pad(level, 7) + pad(m0.toFixed(1), 10) + pad(mean(p4).toFixed(1), 10) + pad(Math.min(...rel).toFixed(3), 9) + pad(Math.max(...rel).toFixed(3), 9) + (Math.max(...rel) - Math.min(...rel)).toFixed(3));
  if (heroes) for (const [i, k] of ALL_HEROES.entries()) console.log(`  ${pad(UNITS[k].name, 18)}${pad(p0[i], 8)}${rel[i].toFixed(3)}`);
}
