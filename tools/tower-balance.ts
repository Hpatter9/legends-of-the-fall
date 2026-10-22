// The endless tower's balance: a greedy player climbs the map (`playTower`) with parties at several levels and the report says how
// far each gets. `npm run balance -- --tower` runs it through tools/balance.mjs's bundle; `--attempts n` sets the climbs per row.

import { newCastle } from '../src/sim/castle';
import { ACT_ROWS } from '../src/sim/tower';
import { CAL_MAPS } from '../src/sim/calamity';
import { newMeta } from '../src/sim/meta';
import { HEROES } from '../src/sim/units';
import { mixSeed } from '../src/sim/rng';
import { playCalamity, playTower } from './autoplay';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};

export function towerTable(): void {
  const attempts = arg('--attempts', 30);
  console.log(`\nTower climb: ${attempts} greedy climbs (the starting five, all back at level 1 with nothing worn, no castle); the floors cleared, and the share of climbs that felled each act's boss (floor ${ACT_ROWS}, ${ACT_ROWS * 2}, ...)`);
  console.log('median  mean  min  max   boss1  boss2  boss3');
  const floors: number[] = [];
  const past = [0, 0, 0];
  let lv = 0;
  for (let a = 0; a < attempts; a++) {
    const r = playTower(newMeta(a + 1), mixSeed(a + 1, 0x70c1), HEROES, newCastle(), 80);
    floors.push(r.floors);
    lv += r.level;
    for (let k = 0; k < 3; k++) if (r.bosses > k) past[k]++;
  }
  floors.sort((x, y) => x - y);
  const mean = floors.reduce((n, x) => n + x, 0) / floors.length;
  const pct = (n: number) => `${((100 * n) / attempts).toFixed(0)}%`.padStart(5);
  console.log(`(mean hero level at the end: ${(lv / attempts).toFixed(1)})`);
  console.log(`${String(floors[Math.floor(floors.length / 2)]).padStart(6)} ${mean.toFixed(1).padStart(5)} ${String(floors[0]).padStart(4)} ${String(floors[floors.length - 1]).padStart(4)}  ${pct(past[0])}  ${pct(past[1])}  ${pct(past[2])}`);
}

/** Calamity: a greedy player per starting hero kind and seed; the maps cleared (each a boss), full clears, and the heroes held at the end. */
export function calamityTable(): void {
  const attempts = arg('--attempts', 30);
  console.log(`\nCalamity: ${attempts} greedy runs (a random starting hero of the five, no castle); maps cleared, of ${CAL_MAPS}`);
  console.log('median  mean  map1  map2  map3  map4  cleared  heroes(mean)  floors(median)');
  const maps: number[] = [];
  const floors: number[] = [];
  let cleared = 0;
  let heroes = 0;
  let lv = 0;
  const past = Array.from({ length: CAL_MAPS }, () => 0);
  for (let a = 0; a < attempts; a++) {
    const r = playCalamity(newMeta(a + 1), mixSeed(a + 1, 0xca1), HEROES[a % HEROES.length], newCastle());
    maps.push(r.maps);
    floors.push(r.floors);
    heroes += r.heroes;
    lv += r.level;
    if (r.cleared) cleared++;
    for (let k = 0; k < CAL_MAPS; k++) if (r.maps > k) past[k]++;
  }
  maps.sort((x, y) => x - y);
  floors.sort((x, y) => x - y);
  const pct = (n: number) => `${((100 * n) / attempts).toFixed(0)}%`.padStart(5);
  console.log(`(mean hero level at the end: ${(lv / attempts).toFixed(1)})`);
  const mean = maps.reduce((n, x) => n + x, 0) / maps.length;
  console.log(`${String(maps[Math.floor(maps.length / 2)]).padStart(6)} ${mean.toFixed(2).padStart(5)}  ${past.map(pct).join(' ')}  ${pct(cleared).padStart(7)}  ${(heroes / attempts).toFixed(1).padStart(12)}  ${String(floors[Math.floor(floors.length / 2)]).padStart(14)}`);
}
