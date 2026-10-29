// Each hero's tier 4 step: how much more often a grade-4 party wins when this one hero casts its tier 4 skill rather than its tier 3 (the other
// four, random, cast their tier 4 both times; the same fights, seeds and places both ways). The rank-4 skills' own check
// (`docs/notes/rank4-skills.md`); the roster's parity at grade 4 is `npm run balance -- --heroes-only --hero-grade 4 --hero-stage N`.
//
//   node tools/rank4/run.mjs --stage 44 --games 400            every hero
//   node tools/rank4/run.mjs --stage 44 --games 400 --only samurai,archer

import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { mixSeed, Rng } from '../../src/sim/rng';
import { FIELD_BANDS } from '../../src/sim/foes';
import { fieldBoost, play } from '../heroSweep';
import { capTiers, uncapTiers } from './cap';
import { writeFileSync } from 'node:fs';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 400);
const STAGE = arg('--stage', 44);
const GRADE = arg('--grade', 4);
const LEVEL = arg('--level', 1);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : ALL_HEROES;

/** A team of five with `hero` in it, the other four drawn from the rest by the side stream. */
function teamWith(hero: string, rng: Rng): string[] {
  const pool = ALL_HEROES.filter((h) => h !== hero);
  const team = [hero];
  while (team.length < 5) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  // (the hero's place in the team is drawn too, so it does not always take the first deploy tile)
  const at = rng.int(0, 4);
  [team[0], team[at]] = [team[at], team[0]];
  return team;
}

const rows: { hero: string; t3: number; t4: number; dealt3: number; dealt4: number }[] = [];
for (const hero of only) {
  const hi = ALL_HEROES.indexOf(hero);
  let w3 = 0;
  let w4 = 0;
  // (the damage the hero itself dealt, a fight: a finer measure of its own skill than the party's wins)
  let d3 = 0;
  let d4 = 0;
  for (let g = 0; g < GAMES; g++) {
    const seed = 50_000 + hi * 10_000 + g;
    const team = teamWith(hero, new Rng(mixSeed(seed, 0x7a4)));
    const band = FIELD_BANDS[g % FIELD_BANDS.length];
    const four = play(seed, band, fieldBoost(STAGE), team, GRADE, LEVEL);
    if (four.won) w4++;
    d4 += four.dealt.get(hero) ?? 0;
    capTiers([hero], 3);
    const three = play(seed, band, fieldBoost(STAGE), team, GRADE, LEVEL);
    if (three.won) w3++;
    d3 += three.dealt.get(hero) ?? 0;
    uncapTiers();
  }
  rows.push({ hero, t3: (100 * w3) / GAMES, t4: (100 * w4) / GAMES, dealt3: d3 / GAMES, dealt4: d4 / GAMES });
  const r = rows[rows.length - 1];
  const dealt = r.dealt3 ? `${r.dealt4 >= r.dealt3 ? '+' : ''}${((100 * (r.dealt4 - r.dealt3)) / r.dealt3).toFixed(0)}%` : '-';
  console.log(`${UNITS[hero].name.padEnd(18)} tier 3 ${r.t3.toFixed(1).padStart(5)}%   tier 4 ${r.t4.toFixed(1).padStart(5)}%   step ${(r.t4 - r.t3 >= 0 ? '+' : '') + (r.t4 - r.t3).toFixed(1)}   its damage ${dealt}`);
}
const steps = rows.map((r) => r.t4 - r.t3);
console.log(`\n${GAMES} fights a hero each way, stage ${STAGE}, grade ${GRADE}, level ${LEVEL}: step ${Math.min(...steps).toFixed(1)} to ${Math.max(...steps).toFixed(1)}, mean ${(steps.reduce((a, b) => a + b, 0) / steps.length).toFixed(1)}`);
if (process.argv.includes('--json')) writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(rows, null, 1));
