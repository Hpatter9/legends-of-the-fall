// FEWER-RUNES: how many runes reach the player over a run, by source, and how strong the runes the heroes wear are, for an army's
// waves (at a party level that goes deep), the daily and a quest battle. Played by the greedy bot (`tools/autoplay.ts`), Auto runes
// before every wave. `docs/notes/fewer-runes.md` has the before and after.
//
//   node tools/fewer-runes/count.mjs                 30 runs a row
//   node tools/fewer-runes/count.mjs --runs 60

import '../joint/off';
import '../living-fields/switch';
import { fight, playOut } from '../../src/sim/battle';
import { newCastle, xpRate } from '../../src/sim/castle';
import { dateKey } from '../../src/sim/dailySeed';
import { fightXp, gainXp } from '../../src/sim/levels';
import { startedMeta, type Meta } from '../../src/sim/meta';
import { dailyRun } from '../../src/sim/modes';
import { questStartGold } from '../../src/sim/questRun';
import { questBattleById, QUEST_BATTLES } from '../../src/sim/questBattles';
import { armyRun, finish, isBossRun, newRun, noteFight, startStage, type Run } from '../../src/sim/run';
import { RUNE_LEVEL, RUNE_SCALE, RUNE_STATS, RUNE_TALLY, allRunes } from '../../src/sim/runes';
import { SOURCE } from '../../src/sim/runGear';
import { ratingOf } from '../../src/sim/stars';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { maybeSpells, playCalamity, savedAt } from '../autoplay';
import { mixSeed } from '../../src/sim/rng';
import { HEROES } from '../../src/sim/units';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const RUNS = arg('runs', 30);
const NAMES: Record<number, string> = Object.fromEntries([...Object.entries(SOURCE).map(([k, v]) => [v, k]), [20, 'wave']]);

interface Tally {
  runs: number;
  waves: number;
  cleared: number;
  got: Record<string, number>;
  lvSum: number;
  worn: number;
  fights: number;
  kept: number;
  offered: Record<string, number>;
}
const blank = (): Tally => ({ runs: 0, waves: 0, cleared: 0, got: {}, lvSum: 0, worn: 0, fights: 0, kept: 0, offered: {} });

/** Level I's numbers before FEWER-RUNES (0.7 x the old table), the yardstick a rune's strength is told in. */
const OLD: Record<string, Record<string, number>> = {
  ember: { atk: 0.028 }, bulwark: { def: 0.7, hp: 0.035 }, arcana: { pow: 0.035 }, gale: { atkSpeed: 0.028, moveSpeed: 0.028 },
  hawk: { crit: 0.0315 }, wellspring: { regen: 0.0021 }, warding: { resist: 0.035 },
};
/** How many old level-I runes of its kind a level-I rune is worth now (the mean of its stats' ratios). */
const worth = (kind: string): number => {
  const old = OLD[kind];
  if (!old) return 0;
  const ks = Object.keys(old);
  return ks.reduce((n, k) => n + ((RUNE_STATS[kind as keyof typeof RUNE_STATS] as Record<string, number>)[k] ?? 0) * RUNE_SCALE.k / old[k], 0) / ks.length;
};
/** The strength of what a run's heroes wear now, in old level-I runes (the signatures and flourishes not counted). */
const wornPower = (run: Run): number =>
  Object.values(run.runes?.worn ?? {}).flat().reduce((n, r) => n + RUNE_LEVEL[r.lv] * worth(r.kind), 0);

/** Plays a run to its end as the bot does, noting the runes. */
function play(meta: Meta, run: Run, t: Tally): void {
  RUNE_TALLY.on = true;
  RUNE_TALLY.made.clear();
  RUNE_TALLY.got = [];
  while (!run.over) {
    autoRound(run, meta, true);
    const b = startStage(run);
    t.worn += wornPower(run);
    t.fights++;
    autoDeploy(b, run, meta);
    fight(b);
    maybeSpells(b, meta);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) t.waves++;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(newCastle())));
  }
  t.runs++;
  if (run.cleared) t.cleared++;
  for (const g of RUNE_TALLY.got) {
    const name = NAMES[g.source] ?? String(g.source);
    t.got[name] = (t.got[name] ?? 0) + 1;
    // (a find of level II is two level-I runes' worth of merging)
    t.lvSum += 2 ** (g.lv - 1);
  }
  t.kept += allRunes(run.runes!).length;
  // (what the road put in front of the player, taken or not: the merchant's wares, the chest's and the cursed path's prizes)
  for (const source of RUNE_TALLY.made.values()) {
    const name = NAMES[source] ?? String(source);
    t.offered[name] = (t.offered[name] ?? 0) + 1;
  }
  RUNE_TALLY.on = false;
}

function report(name: string, t: Tally): void {
  const n = Math.max(1, t.runs);
  const total = Object.values(t.got).reduce((a, b) => a + b, 0);
  const by = Object.entries(t.got).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / n).toFixed(2)}`).join(', ');
  console.log(
    `${name.padEnd(30)} runs ${String(t.runs).padStart(3)}  cleared ${String(Math.round((100 * t.cleared) / n)).padStart(3)}%  waves won ${(t.waves / n).toFixed(1).padStart(5)}  ` +
      `runes ${(total / n).toFixed(2).padStart(5)} (${by})  level-I worth ${(t.lvSum / n).toFixed(1)}  worn power a fight ${(t.worn / Math.max(1, t.fights)).toFixed(2)}\n${''.padEnd(30)} offered: ${Object.entries(t.offered).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / n).toFixed(2)}`).join(', ')}`,
  );
}

// ---- an army, at a level that goes deep (the recruits' five) ----
for (const [army, level] of [['orcs', 12], ['undead', 18], ['wildwood', 28]] as const) {
  const t = blank();
  for (let i = 1; i <= RUNS; i++) {
    const meta = savedAt(level, HEROES, i);
    play(meta, armyRun(i * 7919, army, HEROES, newCastle()), t);
  }
  report(`army ${army} (Lv ${level})`, t);
}

// ---- the daily, a fresh save's power (as daily-rate plays it) ----
{
  const t = blank();
  for (let d = 0; d < RUNS; d++) {
    const date = dateKey(2026, 1 + Math.floor(d / 28), 1 + (d % 28));
    play(startedMeta(d + 1), dailyRun(date), t);
  }
  report('daily', t);
}

// ---- a quest battle (the first few of the book, at level 20; the checks of `startQuestBattle` skipped) ----
{
  const t = blank();
  const ids = QUEST_BATTLES.slice(0, 6).map((q) => q.id);
  for (let i = 1; i <= RUNS; i++) {
    const id = ids[i % ids.length];
    const qb = questBattleById(id)!;
    const meta = savedAt(20, HEROES, i);
    const run = newRun(i * 104729, [...HEROES], meta.castle, 0, questStartGold(qb));
    run.mode = { kind: 'quest', quest: id, cast: [] };
    run.area = qb.land;
    play(meta, run, t);
  }
  report('quest battles', t);
}

// ---- the Calamity (ascension 0; the hero the balance tool's calamity table starts with) ----
{
  const t = blank();
  let maps = 0;
  for (let i = 1; i <= RUNS; i++) {
    RUNE_TALLY.on = true;
    RUNE_TALLY.made.clear();
    RUNE_TALLY.got = [];
    const r = playCalamity(startedMeta(i), mixSeed(i, 0xca1a), 'knight', newCastle(), 0);
    RUNE_TALLY.on = false;
    maps += r.maps;
    t.runs++;
    t.waves += r.floors;
    if (r.cleared) t.cleared++;
    for (const g of RUNE_TALLY.got) {
      const name = NAMES[g.source] ?? String(g.source);
      t.got[name] = (t.got[name] ?? 0) + 1;
      t.lvSum += 2 ** (g.lv - 1);
    }
    for (const source of RUNE_TALLY.made.values()) {
      const name = NAMES[source] ?? String(source);
      t.offered[name] = (t.offered[name] ?? 0) + 1;
    }
  }
  report(`calamity (floors as waves)`, t);
  console.log(`${''.padEnd(30)} maps cleared ${(maps / RUNS).toFixed(2)}`);
}
