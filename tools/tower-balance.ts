// The endless tower's balance: a greedy player climbs the map (`playTower`) with parties at several levels and the report says how
// far each gets. `npm run balance -- --tower` runs it through tools/balance.mjs's bundle; `--attempts n` sets the climbs per row.

import { BUILDINGS, CASTLE_ANSWER, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { CAL_MAPS, CAL_SCALE, CAL_TIER } from '../src/sim/calamity';
import { startedMeta } from '../src/sim/meta';
import { HEROES } from '../src/sim/units';
import { mixSeed } from '../src/sim/rng';
import { explore, fightLog, playCalamity, starterEnd, starterLevels, tierShares } from './autoplay';
import { CAL_BOSSES } from '../src/sim/calamityBosses';
import { UNITS } from '../src/sim/units';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};

/** The castle the tower and Calamity tables play with: none, or with `--castle maxed` every building at its top (a player at the level cap). */
// (`--answer 0.6` tries another share of the castle's hp and attack that the foes answer with; a tuning run, nothing is written)
if (process.argv.includes('--answer')) CASTLE_ANSWER.share = Number(process.argv[process.argv.indexOf('--answer') + 1]);
const castleFor = (): ReturnType<typeof newCastle> => {
  const c = newCastle();
  const which = process.argv.includes('--castle') ? process.argv[process.argv.indexOf('--castle') + 1] : '';
  if (which === 'maxed' || which === 'half') for (const id of Object.keys(BUILDINGS) as BuildingId[]) c[id] = which === 'half' ? Math.floor(maxLevel(id) / 2) : maxLevel(id);
  return c;
};

/** Calamity: a greedy player per starting hero kind and seed; the maps cleared (each a boss), full clears, and the heroes held at the end. */
export function calamityTable(): void {
  const attempts = arg('--attempts', 30);
  const asc = arg('--asc', 0);
  // (`--bossk a,b,c,d,e,f`: try the six bosses' hp scaled by these, their attack by half as much; a tuning run, nothing is written)
  const k = process.argv.includes('--bossk') ? process.argv[process.argv.indexOf('--bossk') + 1].split(',').map(Number) : [];
  k.forEach((x, i) => {
    UNITS[CAL_BOSSES[i]].hp *= x;
    UNITS[CAL_BOSSES[i]].atk *= 1 - (1 - x) / 2;
  });
  // (`--cal start=0.2,growth=0.06,step=0.3`: try other foe scales; a tuning run, nothing is written)
  if (process.argv.includes('--cal'))
    for (const kv of process.argv[process.argv.indexOf('--cal') + 1].split(',')) {
      const [key, val] = kv.split('=');
      (CAL_SCALE as Record<string, number>)[key] = Number(val);
    }
  // (`--tier 12,22,1.2`: the levels of tiers 2 and 3, and what a tier multiplies by)
  if (process.argv.includes('--tier')) {
    const [a, b, m] = process.argv[process.argv.indexOf('--tier') + 1].split(',').map(Number);
    CAL_TIER.levels = [a, b];
    CAL_TIER.mult = m;
  }
  // (`--rush 4`: a careless party, that faces each map's boss after clearing only this many spots)
  if (process.argv.includes('--rush')) explore.limit = Number(process.argv[process.argv.indexOf('--rush') + 1]);
  console.log(`\nCalamity${asc ? ` at ascension ${asc}` : ''}: ${attempts} greedy runs (a random starting hero of the five, no castle); maps cleared, of ${CAL_MAPS}`);
  console.log(`median  mean  ${Array.from({ length: CAL_MAPS }, (_, i) => `map${i + 1}`.padStart(5)).join(' ')}  cleared  heroes(mean)  floors(median)`);
  const maps: number[] = [];
  const floors: number[] = [];
  let cleared = 0;
  let heroes = 0;
  let lv = 0;
  const past = Array.from({ length: CAL_MAPS }, () => 0);
  // (the starting hero's level after each boss, over the runs that got that far; and at the end of the runs, all and cleared whole)
  const byMap: number[][] = Array.from({ length: CAL_MAPS }, () => []);
  const ends: number[] = [];
  const tiers: (typeof tierShares)[] = [];
  fightLog.length = 0;
  const fullEnds: number[] = [];
  for (let a = 0; a < attempts; a++) {
    const r = playCalamity(startedMeta(a + 1), mixSeed(a + 1, 0xca1), HEROES[a % HEROES.length], castleFor(), asc);
    maps.push(r.maps);
    floors.push(r.floors);
    heroes += r.heroes;
    lv += r.level;
    if (r.cleared) cleared++;
    starterLevels.forEach((l, i) => byMap[i]?.push(l));
    ends.push(starterEnd);
    tiers.push([...tierShares]);
    if (r.cleared) fullEnds.push(starterEnd);
    for (let k = 0; k < CAL_MAPS; k++) if (r.maps > k) past[k]++;
  }
  maps.sort((x, y) => x - y);
  floors.sort((x, y) => x - y);
  const pct = (n: number) => `${((100 * n) / attempts).toFixed(0)}%`.padStart(5);
  console.log(`(mean hero level at the end: ${(lv / attempts).toFixed(1)})`);
  const mean = maps.reduce((n, x) => n + x, 0) / maps.length;
  console.log(`${String(maps[Math.floor(maps.length / 2)]).padStart(6)} ${mean.toFixed(2).padStart(5)}  ${past.map(pct).join(' ')}  ${pct(cleared).padStart(7)}  ${(heroes / attempts).toFixed(1).padStart(12)}  ${String(floors[Math.floor(floors.length / 2)]).padStart(14)}`);
  const med = (xs: number[]) => (xs.length ? [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)] : 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : 0);
  console.log(`starting hero's level after each boss (median / mean, runs): ${byMap.map((xs, i) => `map${i + 1} ${med(xs)}/${avg(xs).toFixed(1)} (${xs.length})`).join('  ')}`);
  console.log(`starting hero's level at the end: median ${med(ends)} mean ${avg(ends).toFixed(1)} max ${Math.max(...ends)}; cleared whole (${fullEnds.length} runs): median ${med(fullEnds)} mean ${avg(fullEnds).toFixed(1)} max ${fullEnds.length ? Math.max(...fullEnds) : 0}`);

  // damage taken, by map: the mean share of the squad's hp each fight took, and how often a fight left someone down or the squad hurt
  const rows = (kind: 'plain' | 'boss') => Array.from({ length: CAL_MAPS }, (_, i) => fightLog.filter((f) => f.map === i + 1 && (f.kind === 'boss') === (kind === 'boss')));
  const line = (label: string, lists: (typeof fightLog)[]) => {
    const f = (xs: typeof fightLog, g: (x: (typeof fightLog)[number]) => number) => (xs.length ? xs.reduce((n, x) => n + g(x), 0) / xs.length : 0);
    const cell = (xs: typeof fightLog) => (xs.length ? `${(100 * f(xs, (x) => x.lost)).toFixed(0).padStart(3)}% lost, ${(100 * f(xs, (x) => (x.fell ? 1 : 0))).toFixed(0).padStart(3)}% lose a hero, ${(100 * f(xs, (x) => (x.left < 0.85 ? 1 : 0))).toFixed(0).padStart(3)}% end <85% (${String(xs.length).padStart(4)})` : '-');
    console.log(`${label}\n${lists.map((xs, i) => `  map${i + 1}: ${cell(xs)}`).join('\n')}`);
  };
  line('damage taken per ordinary fight (mean share of the squad hp lost; fights with a hero down; fights ending under 85% mean hp):', rows('plain'));
  line('damage taken per boss fight:', rows('boss'));
  const lost = fightLog.filter((x) => !x.won).length;
  console.log(`(fights lost: ${lost} of ${fightLog.length})`);
  const share = (k: 't2' | 't3' | 'starter', i: number) => {
    const xs = tiers.filter((t) => t[i]).map((t) => t[i][k]);
    return xs.length ? (xs.reduce((n, x) => n + x, 0) / xs.length).toFixed(2) : '-';
  };
  console.log(`tier shares after each boss (roster at tier 2+ / at tier 3 / the starter's tier): ${Array.from({ length: CAL_MAPS }, (_, i) => `map${i + 1} ${share('t2', i)}/${share('t3', i)}/${share('starter', i)}`).join('  ')}`);
}
