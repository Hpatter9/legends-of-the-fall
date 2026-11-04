// `test/new-heroes.test.ts`'s own check (seeds 21 to 50, the default skeletons) with FOE-STYLES' knobs: each team's wins against the five's
// (the test asks each at least 0.35 of the five's, and their mean at least 0.5).
import './knobs';
import { fight, place, playOut, startBattle } from '../../src/sim/battle';
import { D, DEPLOY_ROWS, standable, tileAt } from '../../src/sim/board';
import { HEROES } from '../../src/sim/units';

const [from, to] = [Number(process.argv[2] ?? 21), Number(process.argv[3] ?? 50)];
const wins = (ids: readonly string[]) => {
  let w = 0;
  for (let seed = from; seed <= to; seed++) {
    const b = startBattle(seed);
    const spots: [number, number][] = [];
    for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    ids.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
    fight(b);
    if (playOut(b).phase === 'won') w++;
  }
  return w;
};
const teams = [
  ['peasant', 'kitsune', 'wolfBard', 'kraken', 'gorgon'],
  ['peasant', 'illusionist', 'archer', 'paladin', 'warlock'],
  ['mummy', 'karasu', 'wizard', 'kraken', 'satyr'],
  ['shambler', 'kitsune', 'druid', 'mummy', 'siegeBot'],
  ['yamabushi', 'lancer', 'wolfBard', 'shambler', 'wizard'],
  ['paladin', 'samurai', 'druid', 'peasant', 'satyr'],
];
const base = wins(HEROES);
const r = teams.map(wins);
const mean = r.reduce((x, y) => x + y, 0) / r.length;
console.log(`five ${base}; teams ${r.join(', ')}; lowest ${(Math.min(...r) / base).toFixed(2)}, mean ${(mean / base).toFixed(2)}`);
