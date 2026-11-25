// WEEKLY-TRIAL (docs/notes/weekly-trial.md): how often a greedy player clears each week of the trial's rotation, for three rosters: a new
// save's first five (level 1), each starter pack alone (its three heroes, level 1), and a broad collection (21 heroes, every class, level 30).
// A week's seed is its own, so each of the twelve weeks is played at its place in `cycles` turns of the rotation (weeks i, i + 12, i + 24...),
// each a different seed under the same rules. With the run's lives, as the page plays it. Prints the clear rate, the mean waves cleared and
// how often each reward tier (3, 5, 7 waves) is reached; "no entrants" when the roster has no hero the week admits.
//
//   npm run trial-rate
//   npm run trial-rate -- --cycles 20

import './joint/off';
import './trait-perks/env';
import './living-fields/switch';
import { startedMeta, type Meta } from '../src/sim/meta';
import { TRIAL_WAVES, TRIAL_WEEKS, mergedRule } from '../src/sim/trialRules';
import { TRIAL_TIERS } from '../src/sim/trial';
import { newSaveMeta, playTrial, savedAt } from './autoplay';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const CYCLES = arg('cycles', 8);
/** The first week measured (a whole number of rotations, so place i is week i mod 12). */
const FIRST = 2904;

export const COLLECTION = ['knight', 'paladin', 'sage', 'priestess', 'wolfBard', 'samurai', 'barbarian', 'kunoichi', 'illusionist', 'archer', 'ranger', 'wizard', 'warlock', 'werewolf', 'minotaur', 'cleric', 'druid', 'rifleBot', 'bombardier', 'mercenary', 'juggernaut', 'lancer'];
const ROSTERS: { name: string; meta: (seed: number) => Meta }[] = [
  { name: 'first five, Lv 1', meta: (s) => startedMeta(s) },
  { name: 'pack: sword+shield', meta: (s) => newSaveMeta(s, 0) },
  { name: 'pack: blade+spell', meta: (s) => newSaveMeta(s, 1) },
  {
    name: 'collection, Lv 30',
    meta: (s) => {
      const m = savedAt(30, COLLECTION, s);
      m.unlocked = [...COLLECTION];
      m.party = [...COLLECTION];
      return m;
    },
  },
];

const pct = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))}%`.padStart(4);
console.log(`Weekly Trial clear rates · ${CYCLES} seeds a week · with the lives · ${TRIAL_WAVES} waves`);
for (const roster of ROSTERS) {
  console.log(`\n${roster.name}`);
  let allRuns = 0;
  let allClears = 0;
  TRIAL_WEEKS.forEach((w, i) => {
    let runs = 0;
    let clears = 0;
    let waves = 0;
    const tiers = TRIAL_TIERS.map(() => 0);
    let five: string[] = [];
    for (let k = 0; k < CYCLES; k++) {
      const week = FIRST + i + TRIAL_WEEKS.length * k;
      const r = playTrial(roster.meta(k + 1), week);
      if (!r) continue;
      five = r.five;
      runs++;
      if (r.cleared) clears++;
      waves += r.won;
      TRIAL_TIERS.forEach((t, j) => (tiers[j] += r.won >= t.waves ? 1 : 0));
    }
    allRuns += runs;
    allClears += clears;
    const name = `${String(i).padStart(2)} ${mergedRule(FIRST + i).name} vs ${w.army}`.padEnd(46);
    if (!runs) return console.log(`${name} no entrants`);
    console.log(`${name} cleared ${pct(clears, runs)}  waves ${(waves / runs).toFixed(1)}/${TRIAL_WAVES}  tiers ${tiers.map((n) => pct(n, runs)).join(' ')}  five: ${five.join(', ')}`);
  });
  console.log(`${'all weeks entered'.padEnd(46)} cleared ${pct(allClears, allRuns)}`);
}
