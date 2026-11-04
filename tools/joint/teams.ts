// The new-hero teams against the starting five (`test/new-heroes.test.ts`'s fights, level 1, the default skeletons), over seeds 1 to N (180):
// each team's wins as a share of the five's. STATS batch 4's watch item: the lightest team (Mummy, Karasu, Wizard, Kraken, Satyr).
import './off';
import { fight, place, playOut, startBattle } from '../../src/sim/battle';
import { D, DEPLOY_ROWS, standable, tileAt } from '../../src/sim/board';
import { HEROES } from '../../src/sim/units';

const N = Number(process.argv[2] ?? 180);
const wins = (ids: readonly string[]) => {
  let w = 0;
  for (let seed = 1; seed <= N; seed++) {
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
console.log(`the five ${base} of ${N}; teams ${r.join(', ')}; mean ${(r.reduce((a, b) => a + b, 0) / r.length / base).toFixed(2)} of the five's, the lightest (Mummy...) ${(r[2] / base).toFixed(2)}`);
