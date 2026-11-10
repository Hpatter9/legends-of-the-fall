// BATTLE-FEEL: the hero balance tests' table (`heroLifts`, `test/hero-balance*.test.ts`), each hero's lift printed, the worst first.
//   node tools/battle-feel/lifts.mjs <games> <stage> [level]       FEEL=walk,swap,floor (or none) for only some of BATTLE-FEEL's sim rules
import { heroLifts } from '../heroSweep';
import { FEEL } from '../../src/sim/feel';
// (FEEL=walk,floor: only those of the feel rules on; FEEL=none: none)
if (process.env.FEEL) for (const k of ['walk', 'swap', 'floor'] as const) FEEL[k] = process.env.FEEL.split(',').includes(k);
const [games, stage, level] = process.argv.slice(2).map(Number);
const lifts = heroLifts(games, stage, 0, level || 1);
const avg = lifts.reduce((n, h) => n + h.win, 0) / lifts.length;
console.log(`average ${avg.toFixed(2)}`);
for (const h of [...lifts].sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))) console.log(`${h.kind.padEnd(18)} ${h.lift.toFixed(2)}`);
