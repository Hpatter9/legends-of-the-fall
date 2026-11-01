// STATS batch 1 (docs/notes/stats-1.md): every hero's six scores, its body fitted to today's level-1 numbers, and its derived numbers at a level.
//
//   node tools/stats/fit.mjs                  level 1, rank 1
//   node tools/stats/fit.mjs --level 20 --rank 4 --grade 2
//
// Read-only: it changes nothing. A fight reads the scores through `statPower.ts` (STATS batch 2).

import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { ABILITIES, ABILITY_SHORT, bodyOf, derivedOf, STAT_PROFILES } from '../../src/sim/stats';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const at = { level: arg('level', 1), rank: arg('rank', 1), grade: arg('grade', 1) };
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const pad = (s: string | number, n: number) => String(s).padEnd(n);

console.log(`Level ${at.level}, rank ${at.rank}, grade ${at.grade}`);
console.log(pad('Hero', 18) + ABILITIES.map((a) => pad(ABILITY_SHORT[a], 7)).join('') + 'AC  Hit DC  Crit Init Body hp/atk/ms      Saves');
for (const kind of ALL_HEROES) {
  const p = STAT_PROFILES[kind];
  const d = derivedOf(p, at);
  const body = bodyOf(UNITS[kind], p);
  const scores = ABILITIES.map((a) => pad(`${d.scores[a]}${sign(d.mods[a])}`, 7)).join('');
  const saves = ABILITIES.map((a) => `${sign(d.saves[a])}${p.saves.includes(a) ? '*' : ''}`).join(' ');
  console.log(
    pad(UNITS[kind].name, 18) + scores + pad(d.ac, 4) + pad(sign(d.toHit), 4) + pad(d.dc, 4) + pad(`${Math.round(d.crit * 100)}%`, 5) + pad(sign(d.initiative), 5) +
      pad(`${body.hp.toFixed(1)}/${body.atk.toFixed(2)}/${Math.round(body.atkMs)}`, 19) + saves,
  );
}
