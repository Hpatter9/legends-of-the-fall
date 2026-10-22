// The endless tower's balance: a greedy player climbs the map (`playTower`) with parties at several levels and the report says how
// far each gets. `npm run balance -- --tower` runs it through tools/balance.mjs's bundle; `--attempts n` sets the climbs per row.

import { newCastle } from '../src/sim/castle';
import { ACT_ROWS } from '../src/sim/tower';
import { HEROES } from '../src/sim/units';
import { mixSeed } from '../src/sim/rng';
import { playTower, savedAt } from './autoplay';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};

export function towerTable(): void {
  const attempts = arg('--attempts', 30);
  const levels = process.argv.includes('--levels') ? process.argv[process.argv.indexOf('--levels') + 1].split(',').map(Number) : [1, 3, 5, 8, 11, 14, 17, 20];
  console.log(`\nEndless tower: ${attempts} greedy climbs per row (starting five, no castle); the floors cleared, and the share of climbs that felled each act's boss (floor ${ACT_ROWS}, ${ACT_ROWS * 2}, ...)`);
  console.log('Level  median  mean  min  max   boss1  boss2  boss3');
  for (const L of levels) {
    const floors: number[] = [];
    const past = [0, 0, 0];
    for (let a = 0; a < attempts; a++) {
      const r = playTower(savedAt(L, HEROES, a + 1), mixSeed(a + 1, 0x70c1, L), HEROES, newCastle(), 80);
      floors.push(r.floors);
      for (let k = 0; k < 3; k++) if (r.bosses > k) past[k]++;
    }
    floors.sort((x, y) => x - y);
    const mean = floors.reduce((n, x) => n + x, 0) / floors.length;
    const pct = (n: number) => `${((100 * n) / attempts).toFixed(0)}%`.padStart(5);
    console.log(`${String(L).padEnd(6)} ${String(floors[Math.floor(floors.length / 2)]).padStart(6)} ${mean.toFixed(1).padStart(5)} ${String(floors[0]).padStart(4)} ${String(floors[floors.length - 1]).padStart(4)}  ${pct(past[0])}  ${pct(past[1])}  ${pct(past[2])}`);
  }
}
