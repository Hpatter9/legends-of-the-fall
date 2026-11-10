// BATTLE-FEEL: the daily test's own measure (`test/daily.test.ts`, "clears the daily most days but not all"): a fresh save, casting its
// spells, over dates 113 to 168; prints how many it clears and each date that fell.
//   node tools/battle-feel/dailyBand.mjs
import { dateKey } from '../../src/sim/dailySeed';
import { startedMeta } from '../../src/sim/meta';
import { playDaily } from '../autoplay';
const days = (n: number): number[] => Array.from({ length: n }, (_, d) => dateKey(2026, 1 + Math.floor(d / 28), 1 + (d % 28)));
const dates = days(168).slice(112);
let cleared = 0;
const fell: number[] = [];
for (const [i, date] of dates.entries()) {
  if (playDaily(startedMeta(i + 113), date, true).cleared) cleared++;
  else fell.push(date);
}
console.log(`cleared ${cleared} of ${dates.length} (${Math.round((100 * cleared) / dates.length)}%); fell on ${fell.join(' ')}`);
