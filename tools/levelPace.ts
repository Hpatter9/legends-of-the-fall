// The pace of levelling a favourite hero for a typical daily player (the same player as `tools/unlockPace.ts`): thirteen army runs
// a day (ten auto-replays and three by hand) on the best army and tier cleared so far, with the favourite fighting in most of them,
// and the castle's Library raising what each fight pays. The XP of a run is measured, not guessed: the tool plays real runs of every
// army on every tier (the recruits' party at level 100, a maxed castle, so every run is a won one) and keeps what each hero earned. It reports the day the
// favourite reaches each level (20, 30, 40, 50, 60, 80, 100).
//
//   node tools/levelPace.mjs [--seeds 20] [--days 365] [--samples 6] [--fav 1.3] [--runs 13]
//
// Every assumption is a constant below; change one and run it again. `docs/notes/level-100.md` has the table.

import { ARMIES, replayTotal } from '../src/sim/armies';
import { fight, playOut } from '../src/sim/battle';
import { maxLevel, newCastle, xpRate } from '../src/sim/castle';
import { fightXp, levelOf, MAX_LEVEL, xpFor } from '../src/sim/levels';
import { Rng, mixSeed } from '../src/sim/rng';
import { armyRun, finish, isBossRun, noteFight, startStage } from '../src/sim/run';
import { autoDeploy, autoRound } from '../src/sim/autoplay';
import { ratingOf } from '../src/sim/stars';
import { TIERS } from '../src/sim/tiers';
import { savedAt } from './autoplay';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const SEEDS = arg('--seeds', 20);
const DAYS = arg('--days', 365);
/** Real runs played for each army and tier, for the table of what a run pays. */
const SAMPLES = arg('--samples', 6);
/** The runs a day on the best tier cleared (as in `unlockPace.ts`: ten auto-replays and three by hand). */
const FARM_RUNS = arg('--runs', 13);
/** The favourite earns this many times the party's mean XP in a run (it is a striker or a front-liner, and takes more kills than most). */
const FAV = arg('--fav', 1.3);
/** The share of the runs the favourite is in the party. */
const FAV_PLAYS = 0.9;
/** The extra runs (tries) on the day an army or tier is first cleared. */
const FIRST_CLEAR_TRIES = 4;
/** The level of the party the runs are measured with (and a maxed castle): strong enough to clear every army on every tier, so a run pays what a won run pays (kill XP follows the foes' hp, not how fast they fall). */
const MEASURE_LEVEL = 100;
/** The party the XP is measured with (the recruits' party of the balance report). */
const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
/** The day each army is first cleared on Normal, and the day a Hard / Elite tier is (the same schedule as `unlockPace.ts`; a daily player does not get to Legendary in the first year). */
const NORMAL_DAY = [1, 4, 8, 13, 19, 26, 34, 43, 53];
const HARDER: [number, number, number][] = [
  [0, 1, 12], [1, 1, 24], [2, 1, 34], [3, 1, 46], [4, 1, 58], [5, 1, 70], [6, 1, 84], [7, 1, 98], [8, 1, 112],
  [0, 2, 40], [1, 2, 62], [2, 2, 80], [3, 2, 96], [4, 2, 112], [5, 2, 130], [6, 2, 150], [7, 2, 170], [8, 2, 190],
];
/** The Library: the castle is built over the first weeks, and the Library level follows (one level every five days to its top). */
const libraryAt = (day: number): number => Math.min(5, Math.floor(day / 5));
/** The levels the report gives the day of. */
const MARKS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** What a run of an army on a tier pays a hero of the party, on average (one entry per sample run), before the tier's and the Library's multipliers. */
function measure(): number[][][] {
  const castle = newCastle();
  for (const id of Object.keys(castle) as (keyof typeof castle)[]) castle[id] = maxLevel(id);
  return ARMIES.map((a, ai) =>
    TIERS.map((_, t) => {
      const out: number[] = [];
      for (let s = 1; s <= SAMPLES; s++) {
        const meta = savedAt(MEASURE_LEVEL, PARTY, s);
        const run = armyRun(mixSeed(s, 0x1e7e1, ai * 10 + t), a.id, PARTY, castle, t);
        let sum = 0;
        while (!run.over) {
          autoRound(run, meta, true);
          const b = startStage(run);
          autoDeploy(b, run, meta);
          fight(b);
          playOut(b);
          const ok = b.phase === 'won';
          noteFight(run, b);
          finish(run, ok, ratingOf(b, isBossRun(run)).stars);
          sum += Object.values(fightXp(b, 1)).reduce((n, x) => n + x, 0) / PARTY.length;
        }
        out.push(sum);
      }
      return out;
    }),
  );
}

interface Report { day: Record<number, number>; xp: Record<number, number> }

function simulate(seed: number, table: number[][][]): Report {
  const rng = new Rng(mixSeed(seed, 0x9ace));
  const cleared: boolean[][] = ARMIES.map(() => TIERS.map(() => false));
  let xp = 0;
  const day: Record<number, number> = {};
  const xpAt: Record<number, number> = {};
  const runXp = (ai: number, t: number, day: number): number => {
    const samples = table[ai][t];
    const lib = newCastle();
    lib.library = libraryAt(day);
    return samples[rng.int(0, samples.length - 1)] * FAV * TIERS[t].xp * xpRate(lib);
  };
  for (let d = 1; d <= DAYS; d++) {
    let fresh: [number, number][] = [];
    ARMIES.forEach((_, i) => {
      if (NORMAL_DAY[i] === d) fresh.push([i, 0]);
    });
    for (const [i, t, when] of HARDER) if (when === d) fresh.push([i, t]);
    for (const [i, t] of fresh) {
      cleared[i][t] = true;
      for (let k = 0; k < FIRST_CLEAR_TRIES; k++) xp += FAV_PLAYS * runXp(i, t, d);
    }
    // (the best army and tier cleared pays the most crowns, and that is where the player farms)
    let best: [number, number] | null = null;
    let bestPay = 0;
    ARMIES.forEach((a, i) => TIERS.forEach((_, t) => cleared[i][t] && replayTotal(a, t) > bestPay && ((bestPay = replayTotal(a, t)), (best = [i, t]))));
    if (best) for (let k = 0; k < FARM_RUNS; k++) xp += FAV_PLAYS * runXp(best[0], best[1], d);
    const lv = levelOf(xp);
    for (const m of MARKS) if (day[m] === undefined && lv >= m) day[m] = d;
    if (d % 30 === 0 || d === 7) xpAt[d] = Math.round(xp);
    fresh = [];
  }
  return { day, xp: xpAt };
}

const table = measure();
console.log(`Level pace for a daily player's favourite hero (${SEEDS} seeds, ${DAYS} days; ${FARM_RUNS} army runs a day on the best tier cleared; the favourite takes ${FAV}x the party mean and is in ${FAV_PLAYS * 100}% of the runs; Library by the day)`);
console.log('\nXP a run pays the party mean, before the tier and Library multipliers (mean of the sample runs; Normal / Hard / Elite / Legendary):');
ARMIES.forEach((a, i) => console.log(`  ${a.name.padEnd(20)} ${table[i].map((s) => String(Math.round(s.reduce((n, x) => n + x, 0) / s.length)).padStart(7)).join(' ')}`));
const reports = Array.from({ length: SEEDS }, (_, i) => simulate(i * 7919 + 13, table));
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`\nlevel  XP needed   day reached (median, earliest, latest)`);
for (const m of MARKS) {
  const ds = reports.map((r) => r.day[m] ?? Infinity);
  const fmt = (x: number) => (Number.isFinite(x) ? String(x) : `>${DAYS}`);
  console.log(`${String(m).padStart(5)}  ${String(xpFor(m)).padStart(9)}   ${fmt(med(ds)).padStart(5)}  (${fmt(Math.min(...ds))} to ${fmt(Math.max(...ds))})`);
}
console.log('\nday   favourite XP so far (median)');
for (const d of [7, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]) if (d <= DAYS) console.log(`${String(d).padStart(3)}   ${String(med(reports.map((r) => r.xp[d] ?? 0))).padStart(9)}`);
void MAX_LEVEL;
