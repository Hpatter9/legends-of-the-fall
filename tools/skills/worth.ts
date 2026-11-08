// What each of a hero's skills is worth to its team (SKILLS-10, docs/notes/skills-10.md): the hero sweep's seeded fights (`tools/heroSweep.ts`,
// a team of the hero and four others at random, on the field bands), played with the hero's kit whole and then with each of its skills shut
// (its cost out of reach, so the pool goes to the others), on the same seeds and teams. A skill's worth is the points of wins its team loses
// without it. The ultimate is left as it is.
//
//   node tools/skills/worth.mjs <level> <stage> [games] [hero,hero,...] [--knobs state.json]     PARTS processes (default 4)
//   --skill-level <1-5> fights every skill at that level (`tools/heroSweep.ts`). Prints each hero's wins whole and each skill's worth.

import '../joint/off';
import { fork } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { HERO_KITS } from '../../src/sim/heroKits';
import { fieldBoost, play, TEAM } from '../heroSweep';
import { applyKnobs } from '../kits/knobs';

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const plain = args.filter((a, i) => !a.startsWith('--') && !['--knobs', '--skill-level'].includes(args[i - 1]));
const SHUT = 1e9;

/** The hero's team on this seed: the hero and four others drawn from the side stream (as the lost techniques' measure draws them). */
function teamOf(seed: number, hero: string): string[] {
  const rng = new Rng(mixSeed(seed, 0x7ea4));
  const pool = ALL_HEROES.filter((h) => h !== hero);
  const team = [hero];
  while (team.length < TEAM) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return team;
}

function measure(hero: string, level: number, stage: number, games: number): number[] {
  const hk = HERO_KITS()[hero];
  const slots = hk.slots;
  const wins = [0, 0, 0, 0];
  for (let g = 1; g <= games; g++) {
    const team = teamOf(g, hero);
    for (let k = 0; k <= 3; k++) {
      const s = k > 0 ? slots[k - 1] : undefined;
      if (k > 0 && !s) continue;
      const cost = s?.cost ?? 0;
      if (s) s.cost = SHUT;
      try {
        if (play(g, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(stage), team, 1, level).won) wins[k]++;
      } finally {
        if (s) s.cost = cost;
      }
    }
  }
  return wins.map((w) => (100 * w) / games);
}

if (args[0] === '--child') {
  const [, level, stage, games, list, knobs] = args;
  if (knobs) applyKnobs(JSON.parse(readFileSync(knobs, 'utf8')));
  const out: Record<string, number[]> = {};
  for (const h of list.split(',')) out[h] = measure(h, Number(level), Number(stage), Number(games));
  process.send!(out);
} else {
  const [level, stage, games = '400', only] = plain;
  const heroes = only ? only.split(',') : [...ALL_HEROES];
  const parts = Math.min(heroes.length, Number(process.env.PARTS ?? 4));
  const knobs = opt('--knobs') ?? '';
  const shares = [...Array(parts)].map((_, i) => heroes.filter((_, j) => j % parts === i));
  void Promise.all(
    shares.map((share) => new Promise<Record<string, number[]>>((done) => fork(process.argv[1], ['--child', level, stage, games, share.join(','), knobs]).on('message', (m) => done(m as never)))),
  ).then((rs) => {
    const all = Object.assign({}, ...rs) as Record<string, number[]>;
    const rows = heroes.map((h) => ({ h, w: all[h], d: [1, 2, 3].map((k) => all[h][0] - all[h][k]) }));
    console.log(`level ${level} stage ${stage}, ${games} fights a hero: whole, then each skill's worth (wins lost when it is shut)`);
    for (const r of rows) {
      const best12 = Math.max(r.d[0], r.d[1]);
      console.log(`${UNITS[r.h].name.padEnd(20)} ${r.w[0].toFixed(1).padStart(5)}%  s1 ${r.d[0].toFixed(1).padStart(5)}  s2 ${r.d[1].toFixed(1).padStart(5)}  s3 ${r.d[2].toFixed(1).padStart(5)}  ${r.d[2] > best12 ? 's3 leads' : 'S3 BEHIND'} (${(r.d[2] - best12).toFixed(1)})`);
    }
    const mean = (k: number) => rows.reduce((a, r) => a + r.d[k], 0) / rows.length;
    console.log(`mean worth s1 ${mean(0).toFixed(2)}, s2 ${mean(1).toFixed(2)}, s3 ${mean(2).toFixed(2)}; s3 leads both for ${rows.filter((r) => r.d[2] > Math.max(r.d[0], r.d[1])).length} of ${rows.length}`);
  });
}
