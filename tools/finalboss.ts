// The armies' final bosses alone: the share of attempts that win the last wave with a party at each level (the starting five, a castle
// as set by tools/balance.ts's defaults is not used here: none). For tuning a boss's hp and attack (`armies.ts` `last`) without the
// fourteen waves before it.
//   node tools/finalboss.mjs [--attempts n] [--levels 8,14,20] [--only orcs,undead] [--hp 0.9] [--atk 0.95] [--castle 0.5]
// `--hp` and `--atk` try the final bosses' stats scaled (a tuning run; nothing is written).
import { ARMIES } from '../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { mixSeed } from '../src/sim/rng';
import { HEROES } from '../src/sim/units';
import { playFinal, savedAt } from './autoplay';

const flag = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const attempts = Number(flag('--attempts') ?? 40);
const levels = (flag('--levels') ?? '8,14,20,26').split(',').map(Number);
const only = flag('--only')?.split(',');
// (`--castle f`: every building at that share of its top, for the late armies a bare party cannot reach)
const castle = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) castle[id] = Math.round(maxLevel(id) * Number(flag('--castle') ?? 0));
const hp = Number(flag('--hp') ?? 1);
const atk = Number(flag('--atk') ?? 1);
if (hp !== 1 || atk !== 1) for (const a of ARMIES.filter((x) => !only || only.includes(x.id))) (a as { last: { hp: number; atk: number } }).last = { hp: a.last.hp * hp, atk: a.last.atk * atk };
console.log(`Final waves alone, ${attempts} attempts a cell, the starting five at the level shown${flag('--castle') ? `, castle at ${flag('--castle')} of its top` : ''}: % won${hp !== 1 || atk !== 1 ? ` (boss hp x${hp}, attack x${atk})` : ''}`);
console.log(['army'.padEnd(20), ...levels.map((l) => `L${l}`.padStart(6))].join(''));
for (const army of ARMIES.filter((a) => !only || only.includes(a.id))) {
  const cells = levels.map((L) => {
    let won = 0;
    for (let a = 0; a < attempts; a++) if (playFinal(savedAt(L, HEROES, a + 1), army.id, mixSeed(a + 1, 0xf1a1, ARMIES.indexOf(army)), HEROES, castle)) won++;
    return `${((100 * won) / attempts).toFixed(0)}`.padStart(6);
  });
  console.log([army.id.padEnd(20), ...cells].join(''));
}
