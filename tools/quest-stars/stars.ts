// The quests' stars (QUESTS-3, Q1): the estimate beside the authored stars for every quest, the spread of stars by length, and (with
// `table`) the table to paste into `src/sim/questStars.ts`. `npm run quest-stars [table]`.
import { QUESTS } from '../../src/sim/questData';
import { LENGTHS, STAR_TABLE, lengthOf, partsOf, starEstimate, starsOf, storyParts } from '../../src/sim/questStars';

if (process.argv[2] === 'table') {
  const rows = QUESTS.map((q) => {
    const parts = storyParts(q);
    const est = starEstimate(q);
    const len = parts >= 5 ? 'campaign' : parts >= 2 ? 'chain' : q.goal.n >= 30 || q.goal.kind === 'clearDaily' ? 'long' : 'short';
    return `  ${q.id}: [${STAR_TABLE[q.id]?.[0] ?? est}, '${STAR_TABLE[q.id]?.[1] ?? len}'],`;
  });
  console.log(rows.join('\n'));
} else {
  const grid = new Map<string, number>();
  for (const q of QUESTS) grid.set(`${starsOf(q)}${lengthOf(q)}`, (grid.get(`${starsOf(q)}${lengthOf(q)}`) ?? 0) + 1);
  console.log(['stars', ...LENGTHS, 'all'].join('\t'));
  for (let s = 1; s <= 5; s++) {
    const row = LENGTHS.map((l) => grid.get(`${s}${l}`) ?? 0);
    console.log([`★${s}`, ...row, row.reduce((a, b) => a + b, 0)].join('\t'));
  }
  const off = QUESTS.filter((q) => Math.abs(starsOf(q) - starEstimate(q)) > 1);
  console.log(`${QUESTS.length} quests; ${off.length} authored more than one star from the estimate${off.length ? ': ' + off.map((q) => q.id).join(', ') : ''}`);
  void partsOf;
}
