// FIRST-HOUR: how a truly new save fares on the first army. The balance tools start from `startedMeta` (five heroes owned); a new save
// has the three of its starter pack and nothing else. This plays the Orc Warband on Normal again and again as the greedy bot (the
// best placing the page's Auto would give, spells cast when BOT_SPELLS is not 0), levels kept between tries as the page keeps them,
// and prints the wave each try ended on and the tries to the first clear.
//
//   node tools/first-hour/pace.mjs [--saves 40] [--tries 12]
import { FIXED_PACKS } from '../../src/sim/starter';
import { levelOfKind } from '../../src/sim/levels';
import { newSaveMeta, playArmy } from '../autoplay';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const SAVES = arg('saves', 40);
const TRIES = arg('tries', 12);

FIXED_PACKS.forEach((pack, packIndex) => {
  const ends: number[][] = Array.from({ length: TRIES }, () => []);
  const clearAt: number[] = [];
  const lvAtClear: number[] = [];
  for (let s = 0; s < SAVES; s++) {
    const m = newSaveMeta(1000 + s, packIndex);
    let cleared = 0;
    for (let t = 0; t < TRIES; t++) {
      const r = playArmy(m, 'orcs', 77 * s + t + 1, pack.heroes);
      ends[t].push(r.won);
      if (r.cleared) {
        cleared = t + 1;
        lvAtClear.push(Math.max(...pack.heroes.map((k) => levelOfKind(m, k))));
        break;
      }
    }
    clearAt.push(cleared);
  }
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  console.log(`\n${pack.name} (${pack.heroes.join(', ')}) · ${SAVES} new saves, Orc Warband on Normal`);
  console.log('try | saves still trying | mean last wave won | lost on wave 1 | reached wave 8 (mid-boss)');
  for (let t = 0; t < TRIES; t++) {
    const e = ends[t];
    if (!e.length) break;
    console.log(`${String(t + 1).padStart(3)} | ${String(e.length).padStart(18)} | ${mean(e).toFixed(1).padStart(18)} | ${String(e.filter((w) => w === 0).length).padStart(14)} | ${e.filter((w) => w >= 7).length}`);
  }
  const done = clearAt.filter((c) => c > 0);
  console.log(`cleared within ${TRIES} tries: ${done.length}/${SAVES}; mean tries to clear ${mean(done).toFixed(1)}; top hero level at the clear ${mean(lvAtClear).toFixed(1)}`);
});
