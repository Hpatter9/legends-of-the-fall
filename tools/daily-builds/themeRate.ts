// The daily's build themes, measured (DAILY-BUILDS): for each theme, the greedy player of `npm run daily-rate` (the five strongest,
// summoning with all its gold) and a themed player (the same, but it fields the featured trait's heroes first, up to the goal) play the
// theme's dates from a fresh save, with the two hearts. Prints the clear rate and how often the goal's star came.
//
//   node tools/daily-builds/themeRate.mjs [--runs 12]

import { fight, playOut } from '../../src/sim/battle';
import { autoDeploy, autoRound, dressSquad, strengthOf } from '../../src/sim/autoplay';
import { DAILY_THEMES, DAILY_THEMES_FROM, dailyTheme, dayNumber, featuredCount, type DailyTheme } from '../../src/sim/dailyThemes';
import { dailyBonus, dailyRun } from '../../src/sim/modes';
import { startedMeta, type Meta } from '../../src/sim/meta';
import { canRetry, finish, isBossRun, noteFight, retryWave, startStage, type Run } from '../../src/sim/run';
import { ratingOf } from '../../src/sim/stars';
import { fightXp, gainXp } from '../../src/sim/levels';
import { newCastle, xpRate } from '../../src/sim/castle';
import { traitsOf } from '../../src/sim/traits';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const RUNS = arg('runs', 12);

/** The date `k` cycles on of theme `i` (the themes go round one a day from `DAILY_THEMES_FROM`). */
function dateOf(i: number, k: number): number {
  const day = dayNumber(DAILY_THEMES_FROM) + i + k * DAILY_THEMES.length;
  const d = new Date(Date.UTC(2000, 0, 1) + day * 86_400_000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** The themed player's squad: the featured heroes first (the strongest of each kind), then the strongest of the rest. */
function themedSquad(run: Run, meta: Meta, t: DailyTheme): void {
  const by = [...run.roster].sort((a, b) => strengthOf(meta, b, run) - strengthOf(meta, a, run) || a.id - b.id);
  const pick: typeof by = [];
  for (const h of by) if (traitsOf(h.kind).includes(t.trait) && !pick.some((p) => p.kind === h.kind) && pick.length < t.need) pick.push(h);
  for (const h of by) if (!pick.includes(h) && pick.length < 5) pick.push(h);
  run.squad = pick.map((h) => h.id);
  dressSquad(run);
}

function play(date: number, seed: number, themed: boolean) {
  const t = dailyTheme(date)!;
  const meta = startedMeta(seed);
  const run = dailyRun(date);
  let won = 0;
  let featured = 0;
  while (!run.over) {
    autoRound(run, meta, true);
    if (themed) themedSquad(run, meta, t);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (!ok && canRetry(run)) {
      retryWave(run);
      continue;
    }
    if (ok) won = run.stage;
    if (isBossRun(run) && run.stage === 10) featured = featuredCount(t, b.units.filter((u) => u.side === 'hero').map((u) => u.def));
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(newCastle())));
  }
  return { cleared: !!run.cleared, won, goal: !!run.themeMet, featured, hearts: run.retries ?? 0, stars: dailyBonus(run).filter((s) => s.earned).length };
}

const pct = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))}%`.padStart(4);
console.log(`theme                  host        greedy: clear goal  fell  | themed: clear goal  hearts  (${RUNS} dates each, fresh save)`);
const all = { g: 0, t: 0, gg: 0, tg: 0, n: 0 };
DAILY_THEMES.forEach((t, i) => {
  const g = Array.from({ length: RUNS }, (_, k) => play(dateOf(i, k), k + 1, false));
  const th = Array.from({ length: RUNS }, (_, k) => play(dateOf(i, k), k + 1, true));
  const c = (r: typeof g) => r.filter((x) => x.cleared).length;
  const goal = (r: typeof g) => r.filter((x) => x.goal).length;
  const fell = g.filter((x) => !x.cleared);
  all.g += c(g); all.t += c(th); all.gg += goal(g); all.tg += goal(th); all.n += RUNS;
  console.log(`${t.name.padEnd(22)} ${t.host.padEnd(10)}  ${pct(c(g), RUNS)} ${pct(goal(g), RUNS)}  ${fell.length ? (fell.reduce((n, x) => n + x.won + 1, 0) / fell.length).toFixed(1).padStart(4) : '   -'}  |  ${pct(c(th), RUNS)} ${pct(goal(th), RUNS)}  ${(th.reduce((n, x) => n + x.hearts, 0) / RUNS).toFixed(2)}`);
});
console.log(`${'all'.padEnd(22)} ${''.padEnd(10)}  ${pct(all.g, all.n)} ${pct(all.gg, all.n)}        |  ${pct(all.t, all.n)} ${pct(all.tg, all.n)}`);
