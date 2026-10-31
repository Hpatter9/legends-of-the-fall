// ONE-OF-EACH's yardstick (`docs/notes/one-of-each.md`): a new save's starter pack (three heroes, so three kinds to field once each)
// fights the first armies on Normal, single tries, no talents, castle or gear, as `tools/merge-two`'s `early` cells do for the starting
// five. Run on two trees (before and after the rule) to compare.
//
//   node tools/one-of-each/run.mjs orcs:1 orcs:5 undead:10        SAVES (default 48) tries a cell, both starter packs
//   node tools/one-of-each/run.mjs --mythic                         the difficulty test's Mythic check at level 100, more saves (`mythic.ts`)
import { playArmy, savedAt } from '../autoplay';
import { FIXED_PACKS } from '../../src/sim/starter';

const SAVES = Number(process.env.SAVES ?? 48);
if (process.argv.includes('--mythic')) require('./mythic');
for (const cell of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const [army, levelS] = cell.split(':');
  for (const pack of FIXED_PACKS) {
    let won = 0;
    let waves = 0;
    for (let i = 0; i < SAVES; i++) {
      const r = playArmy(savedAt(Number(levelS), pack.heroes, i + 1), army, 700 + i, pack.heroes);
      if (r.cleared) won++;
      waves += r.won;
    }
    console.log(`${cell}\t${pack.id}\tclear ${Math.round((100 * won) / SAVES)}%\twaves ${(waves / SAVES).toFixed(1)}`);
  }
}
