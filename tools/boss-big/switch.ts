// BOSS-BIG: `--off` switches the bosses' signature attacks off (and `--nododge` the heroes' stepping out) for the balance tools this folder
// wraps; imported first, so it runs before the tool does.
import { BOSS_BIG } from '../../src/sim/bossAttacks';

if (process.argv.includes('--off')) BOSS_BIG.on = false;
if (process.argv.includes('--nododge')) BOSS_BIG.dodge = false;
console.log(`(bosses' signature attacks ${BOSS_BIG.on ? 'on' : 'OFF'}${BOSS_BIG.on && !BOSS_BIG.dodge ? ', no dodging' : ''})`);
