// BOSS-BIG: `--off` switches the bosses' signature attacks off (and `--nododge` the heroes' stepping out) for the balance tools this folder
// wraps; imported first, so it runs before the tool does.
import { BOSS_BIG, SIG } from '../../src/sim/bossAttacks';

if (process.argv.includes('--off')) BOSS_BIG.on = false;
if (process.argv.includes('--nododge')) BOSS_BIG.dodge = false;
// (`--floor 0.2`, `--hp 0.85`: try another floor or boss health)
const arg = (k: string) => (process.argv.includes(k) ? Number(process.argv[process.argv.indexOf(k) + 1]) : undefined);
if (arg('--floor') !== undefined) SIG.FLOOR = arg('--floor')!;
if (arg('--hp') !== undefined) SIG.HP = arg('--hp')!;
console.log(`(bosses' signature attacks ${BOSS_BIG.on ? 'on' : 'OFF'}${BOSS_BIG.on && !BOSS_BIG.dodge ? ', no dodging' : ''})`);
