// The pace of unlocking heroes for a typical daily player, 30 to 45 minutes a day: the daily challenge, ten auto-replays and a few
// manual army runs on the best army and tier cleared so far, a tower climb, the star and first-clear chests, and the milestones
// reached at a plausible pace. It plays the real rules (`recruit`, `openChest`, `grantContent`) on a real Meta and reports the day
// each hero count is reached (the starter's three count). Every assumption is a constant below; change one and run it again.
//
//   node tools/unlockPace.mjs [--seeds 20] [--share 0.9] [--days 365]

import { ARMIES, armyFoes, replayTotal, firstClearTotal } from '../src/sim/armies';
import { chestSeed, firstClearSeed, FIRST_CLEAR_CHEST, openChest } from '../src/sim/armyStars';
import { grantContent, CONTENT_HEROES } from '../src/sim/contentHeroes';
import { newMeta, pickStarter, pullCost, recruit, stageCrowns, type Meta } from '../src/sim/meta';
import { ALL_HEROES } from '../src/sim/units';
import { MODES, PULL_HEROES, setUnlockMode, unlockMode, unlockNeed, type UnlockMode } from '../src/sim/unlockRules';
import { mixSeed } from '../src/sim/rng';
import { MAP_CROWNS } from '../src/sim/tower';
import { BUILDINGS } from '../src/sim/castle';
import { FOE_ENTRIES } from '../src/sim/codex';
import { ACHIEVEMENTS } from '../src/sim/achievements';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const modeArg = process.argv[process.argv.indexOf('--mode') + 1] as UnlockMode;
if (process.argv.includes('--mode')) setUnlockMode(modeArg);
// (--set needLast=80,priceLast=100 changes the mode's numbers for one run, to tune them)
const setArg = process.argv[process.argv.indexOf('--set') + 1];
if (process.argv.includes('--set')) for (const kv of setArg.split(',')) Object.assign(MODES[unlockMode()], { [kv.split('=')[0]]: Number(kv.split('=')[1]) });
const SEEDS = arg('--seeds', 20);
const DAYS = arg('--days', 365);
/** The share of crowns that goes to pulls once the castle is built (the rest buys other things: spells, rebuilds, rerolls). */
const PULL_SHARE = arg('--share', 0.9);
/** While the castle is unbuilt, this share of the day's crowns goes to it first (it costs about 13000 in all). */
const CASTLE_SHARE = 0.3;
const CASTLE_TOTAL = Object.values(BUILDINGS).reduce((n, b) => n + b.costs.reduce((s, c) => s + c, 0), 0);

// ---- the player ----
/** The army runs a day on the best tier cleared: ten auto-replays and three by hand. */
const FARM_RUNS = arg('--runs', 13);
/** The daily challenge pays about this a day (a dozen stages at 3 stars). */
const DAILY_CROWNS = 300;
/** A tower climb a day: floors reached grow from `TOWER_START` with the days, at `TOWER_GROWTH` floors a day, to a ceiling. */
const TOWER_START = 6;
const TOWER_GROWTH = 0.18;
const TOWER_CEIL = 45;
/** The day each army is first cleared on Normal. */
const NORMAL_DAY = [1, 4, 8, 13, 19, 26, 34, 43, 53];
/** The day an army's Hard, Elite tier is first cleared ([army index, tier, day]); only the armies a daily player gets to. */
const HARDER: [number, number, number][] = [
  [0, 1, 12], [1, 1, 24], [2, 1, 34], [3, 1, 46], [4, 1, 58], [5, 1, 70], [6, 1, 84], [7, 1, 98], [8, 1, 112],
  [0, 2, 40], [1, 2, 62], [2, 2, 80], [3, 2, 96], [4, 2, 112], [5, 2, 130], [6, 2, 150], [7, 2, 170], [8, 2, 190],
];
/** A calamity is cleared at this day, then a level higher after each gap of days; one is tried a week. */
const CALAMITY_DAY = 70;
const ASCENSION_GAP = 28;
/** Achievements and the codex pay about this many crowns in all over the first 150 days. */
const EXTRA_CROWNS = 900;

interface Report { by: Record<number, number>; pullable: number; days: Record<number, number>; at: Record<string, number>; pulls: number; crowns: number }
const MARKS = [5, 10, 15, 20, 30, 40, 45];
const CHECKS = [1, 2, 3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365];

function simulate(seed: number): Report {
  const m: Meta = newMeta(seed);
  pickStarter(m, 0);
  const at: Record<string, number> = {};
  const days: Record<number, number> = {};
  let spent = 0;
  let income = 0;
  let castleLeft = CASTLE_TOTAL;
  let pulls = 0;
  const bestFarm = (): number => {
    let best = 0;
    ARMIES.forEach((a) => {
      for (let t = 0; t < 3; t++) {
        const done = t === 0 ? m.armies[a.id]?.clears : m.armies[a.id]?.hard?.[String(t)]?.clears;
        if (done) best = Math.max(best, replayTotal(a, t));
      }
    });
    return best;
  };
  let asc = -1;
  let pullable = Infinity;
  const by: Record<number, number> = {};
  for (let day = 1; day <= DAYS; day++) {
    let today = DAILY_CROWNS;
    // the armies' first clears and their chests
    ARMIES.forEach((a, i) => {
      if (NORMAL_DAY[i] === day) {
        const rec = (m.armies[a.id] ??= { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 0, stars: {} });
        rec.clears = 1;
        today += firstClearTotal(a, 0);
        m.stash.push({ army: a.id, at: FIRST_CLEAR_CHEST[0], tier: 0, seed: firstClearSeed(m.seed, a, 0), first: true });
        m.stash.push({ army: a.id, at: 3, tier: 0, seed: chestSeed(m.seed, a, 3) });
        ((m.codex ??= { met: [], kills: {} }).met).push(...armyFoes(a));
      }
    });
    for (const [i, t, d] of HARDER) {
      if (d !== day) continue;
      const a = ARMIES[i];
      const rec = m.armies[a.id]!;
      ((rec.hard ??= {})[String(t)] ??= { won: a.waves.length, clears: 0 }).clears = 1;
      today += firstClearTotal(a, t);
      m.stash.push({ army: a.id, at: FIRST_CLEAR_CHEST[t], tier: t, seed: firstClearSeed(m.seed, a, t), first: true });
      if (t === 1) m.stash.push({ army: a.id, at: 5, tier: t, seed: chestSeed(m.seed, a, 5) });
    }
    // the farm: the best tier cleared, thirteen runs
    today += FARM_RUNS * bestFarm();
    // the tower: one climb, its crowns, its chests
    if (m.bestStage >= 1 || m.armies[ARMIES[0].id]?.clears) {
      const floors = Math.min(TOWER_CEIL, Math.floor(TOWER_START + TOWER_GROWTH * day));
      let crowns = 0;
      for (let f = 1; f <= floors; f++) crowns += stageCrowns(f);
      today += crowns;
      m.tower = Math.max(m.tower, floors + (day % 3 === 0 ? 1 : 0));
      for (let k = 0; k < Math.floor(floors / 8); k++) m.stash.push({ army: ARMIES[Math.min(ARMIES.length - 1, Math.floor(day / 12))].id, at: 3, tier: 0, seed: mixSeed(seed, 0x70e7, day, k), tower: true });
      for (let k = 0; k < Math.floor(floors / 15); k++) m.stash.push({ army: ARMIES[Math.min(ARMIES.length - 1, Math.floor(day / 12))].id, at: 5, tier: 0, seed: mixSeed(seed, 0x70e8, day, k), tower: true });
    }
    // the calamity: from CALAMITY_DAY, one a week; each full clear a level higher
    if (day >= CALAMITY_DAY && (day - CALAMITY_DAY) % 7 === 0) {
      const level = Math.min(10, asc + 1);
      if (day === CALAMITY_DAY || (day - CALAMITY_DAY) % ASCENSION_GAP === 0) asc = level;
      today += MAP_CROWNS.reduce((n, c) => n + c, 0) * (1 + 0.2 * Math.max(0, asc));
      m.calamity = { best: 6, clears: 1 + Math.floor((day - CALAMITY_DAY) / 7), asc };
      m.stash.push({ army: ARMIES[Math.min(ARMIES.length - 1, Math.floor(day / 12))].id, at: 10, tier: 0, seed: mixSeed(seed, 0xca1c, day), tower: true });
    }
    if (day <= 150) today += EXTRA_CROWNS / 150;
    m.crowns += Math.round(today);
    income += Math.round(today);
    // the chests are opened the day they come
    while (m.stash.length) openChest(m, 0);
    for (const k of grantContent(m)) at[k] = at[k] ?? day;
    // the castle first, then the pulls
    const toCastle = Math.min(castleLeft, Math.floor(m.crowns * CASTLE_SHARE));
    castleLeft -= toCastle;
    m.crowns -= toCastle;
    const budget = Math.floor(m.crowns * PULL_SHARE);
    let left = budget;
    // (the owner's first session: the day-one crowns are all spent at once)
    // (ten at a time while the budget allows, then singles; the price follows the roster)
    for (;;) {
      const n = left >= pullCost(10, m) ? 10 : left >= pullCost(1, m) ? 1 : 0;
      if (!n) break;
      const cost = pullCost(n, m);
      const got = recruit(m, n, day) ?? (n === 10 ? recruit(m, 1, day) : null);
      if (!got) break;
      left -= got.length === 10 ? cost : pullCost(1, m) * got.length;
      pulls += got.length;
    }
    for (const k of grantContent(m)) at[k] = at[k] ?? day;
    if (CHECKS.includes(day)) by[day] = m.unlocked.length;
    if (pullable === Infinity && PULL_HEROES.every((k) => m.unlocked.includes(k))) pullable = day;
    for (const n of MARKS) if (days[n] === undefined && m.unlocked.length >= n) days[n] = day;
    spent += 0;
  }
  void spent;
  return { by, pullable, days, at, pulls, crowns: income };
}

const reports = Array.from({ length: SEEDS }, (_, i) => simulate(i * 7919 + 13));
const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`Mode ${unlockMode()}: ${JSON.stringify(MODES[unlockMode()])}\nUnlock pace for a daily player (${SEEDS} seeds, ${DAYS} days; ${Math.round(PULL_SHARE * 100)}% of crowns to pulls after the castle; ${FOE_ENTRIES.length} bestiary entries, ${ACHIEVEMENTS.length} achievements)`);
console.log(`Crowns earned: ${Math.round(mean(reports.map((r) => r.crowns)))} in ${DAYS} days; pulls made: ${Math.round(mean(reports.map((r) => r.pulls)))}`);
console.log('\nheroes  day reached (median, earliest, latest)');
for (const n of MARKS) {
  const ds = reports.map((r) => r.days[n] ?? Infinity);
  const fmt = (x: number) => (Number.isFinite(x) ? String(x) : `>${DAYS}`);
  console.log(`${String(n).padStart(6)}  ${fmt(med(ds)).padStart(5)}  (${fmt(Math.min(...ds))} to ${fmt(Math.max(...ds))})`);
}
console.log('\nday   heroes owned (median)');
for (const d of CHECKS) console.log(`${String(d).padStart(3)}   ${med(reports.map((r) => r.by[d] ?? 0))}`);
console.log(`\nevery pullable hero (${PULL_HEROES.length}) owned by day ${med(reports.map((r) => r.pullable))}`);
console.log('\ncontent hero          day it joins (median)');
for (const c of CONTENT_HEROES) {
  const ds = reports.map((r) => r.at[c.kind] ?? Infinity);
  console.log(`${c.kind.padEnd(20)}  ${Number.isFinite(med(ds)) ? med(ds) : `>${DAYS}`}`);
}
console.log('\nowned (pullable)  shards to unlock the next  price of 1 / 10 pulls');
for (const n of [3, 4, 5, 6, 8, 10, 14, 18, 22, 26, 30, 34]) console.log(`${String(n).padStart(8)}  ${String(unlockNeed(n)).padStart(8)}  ${String(pullCost(1, { unlocked: PULL_HEROES.slice(0, n) })).padStart(18)} / ${pullCost(10, { unlocked: PULL_HEROES.slice(0, n) })}`);
void ALL_HEROES;
