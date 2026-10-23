// How often a greedy player clears the daily: the starting five with a fresh save's power (every hero level 1, no castle), over a run of
// dates, with and without the two hearts. Prints the clear rate overall and by boss of the day, the furthest wave of the runs that
// fell, and how often the bonus stars come. For tuning `daily.ts`.
//
//   npm run daily-rate                 60 dates
//   npm run daily-rate -- --days 200   more dates

import { dailyArmy, dailyBossName, DAILY_WAVES } from '../src/sim/daily';
import { dateKey } from '../src/sim/dailySeed';
import { startedMeta } from '../src/sim/meta';
import { playDaily } from './autoplay';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const DAYS = arg('days', 60);

interface Tally {
  runs: number;
  cleared: number;
  fellAt: number[];
  hearts: number;
  bonus: number[];
  star: number[];
  ms: number;
}
const blank = (): Tally => ({ runs: 0, cleared: 0, fellAt: [], hearts: 0, bonus: [0, 0, 0], star: [0, 0], ms: 0 });

for (const hearts of [true, false]) {
  const all = blank();
  const by = new Map<string, Tally>();
  for (let d = 0; d < DAYS; d++) {
    // (consecutive calendar days; a month is long enough to cycle every boss)
    const date = dateKey(2026, 1 + Math.floor(d / 28), 1 + (d % 28));
    const meta = startedMeta(d + 1);
    const r = playDaily(meta, date, hearts);
    const boss = dailyBossName(date);
    for (const t of [all, by.get(boss) ?? by.set(boss, blank()).get(boss)!]) {
      t.runs++;
      if (r.cleared && hearts && process.argv.includes('--debug')) console.log('lost', r.lost, 'bossFell', r.bossFell, 'bossLost', r.bossLost, 'hearts', r.hearts);
      if (r.cleared) {
        t.cleared++;
        t.bonus[r.bonus]++;
        r.stars.forEach((e, i) => (t.star[i] += Number(e)));
        t.ms += r.ms;
      } else t.fellAt.push(r.won + 1);
      t.hearts += r.hearts;
    }
  }
  const pct = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))}%`;
  const line = (name: string, t: Tally) =>
    `${name.padEnd(22)} ${String(t.runs).padStart(3)} runs  cleared ${pct(t.cleared, t.runs).padStart(4)}  hearts/run ${(t.hearts / t.runs).toFixed(2)}  fell at ${t.fellAt.length ? (t.fellAt.reduce((n, x) => n + x, 0) / t.fellAt.length).toFixed(1) : '-'}/${DAILY_WAVES}  bonus 0/1/2 ${t.bonus.join('/')} (no heart ${t.star[0]}, time ${t.star[1]})  avg battle ${t.cleared ? Math.round(t.ms / t.cleared / 1000) : '-'} s`;
  console.log(`\n${hearts ? 'With the two hearts' : 'No hearts (first loss ends it)'} · ${DAYS} dates · fresh save power`);
  console.log(line('all', all));
  for (const [name, t] of [...by].sort()) console.log(line(name, t));
}
void dailyArmy;
