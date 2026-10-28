// The pace of unlocking heroes for a typical daily player, 30 to 45 minutes a day: the daily challenge, ten auto-replays and a few
// manual army runs on the best army and tier cleared so far, a tower climb, the star and first-clear chests, and the milestones
// reached at a plausible pace. It plays the real rules (`buyChest`, `useStones`, `openChest`, `grantContent`) on a real Meta and reports the day
// each hero count is reached (the starter's three count). Every assumption is a constant below; change one and run it again.
//
//   node tools/unlockPace.mjs [--seeds 20] [--share 0.9] [--days 365] [--awaken]
//
// `--awaken` adds the awakening pace (AWAKEN-MATS): the day heroes first have the shards for awakening I and II, and with the rift
// ores (`awakenMats.ts`: the armies' boss waves and first clears, the chests, the Calamity's bosses, mini-bosses and Rift Cache) the day
// they are taken by the real `awaken`, the player awakening greedily (the most-sharded hero first) and opening each cache on the hero
// nearest its next step.

import { payClear } from '../src/sim/calReward';
import { ARMIES, armyFoes, replayTotal, firstClearTotal } from '../src/sim/armies';
import { chestSeed, firstClearSeed, FIRST_CLEAR_CHEST, openChest } from '../src/sim/armyStars';
import { grantContent, CONTENT_HEROES } from '../src/sim/contentHeroes';
import { newMeta, pickStarter, stageCrowns, stonesOf, useStones, type Meta } from '../src/sim/meta';
import { TOME_SIZES, TOMES, tomesOf } from '../src/sim/tomes';
import { buyChest, SHOP, shopPrice, stockLeft } from '../src/sim/chestShop';
import { ALL_HEROES } from '../src/sim/units';
import { AWAKEN_ORES, FINAL_CHANCE, MID_CHANCE, bossOres, cachesOf, eliteOres, grantOres, openCache, oreOf, settleArmyOres, type OreDrop } from '../src/sim/awakenMats';
import { awaken, awakenedOf } from '../src/sim/awaken';
import { canRankUp, rankUp } from '../src/sim/rankUp';
import { bossesOf } from '../src/sim/armies';
import { AWAKEN_SHARDS } from '../src/sim/awakenRules';
import { ownedWeight, PULL_HEROES, unlockNeed } from '../src/sim/unlockRules';
import { mixSeed, Rng } from '../src/sim/rng';
import { dailyChestSeed, dailyCrowns, DAILY_WAVES } from '../src/sim/daily';
import { MAP_CROWNS } from '../src/sim/tower';
import { BUILDINGS } from '../src/sim/castle';
import { claimEntries, crownsTotal, FOE_ENTRIES, stonesTotal } from '../src/sim/codex';
import { ACHIEVEMENTS, stonesOfAchievement } from '../src/sim/achievements';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const SEEDS = arg('--seeds', 20);
// `--shop "500:2:2,1800:1:6,6000:1:20"`: try other shop chests (price:stock:stones for bronze, silver, gold) without editing the rules.
const shopArg = process.argv[process.argv.indexOf('--shop') + 1];
if (process.argv.includes('--shop') && shopArg)
  shopArg.split(',').forEach((t, i) => {
    const [price, stock, stones] = t.split(':').map(Number);
    Object.assign(SHOP[i], { price, stock, stones });
  });
/** `--noshop 1`: the player buys no chests (only the stones that come free). */
const NO_SHOP = arg('--noshop', 0) > 0;
const DAYS = arg('--days', 365);
/** The share of crowns that goes to chests once the castle is built (the rest buys other things: spells, rebuilds, rerolls). */
const PULL_SHARE = arg('--share', 0.9);
/** While the castle is unbuilt, this share of the day's crowns goes to it first (it costs about 13000 in all). */
const CASTLE_SHARE = 0.3;
const CASTLE_TOTAL = Object.values(BUILDINGS).reduce((n, b) => n + b.costs.reduce((s, c) => s + c, 0), 0);

// ---- the player ----
/** The army runs a day on the best tier cleared: ten auto-replays and three by hand. */
const FARM_RUNS = arg('--runs', 13);
/** The daily challenge (`daily.ts`): the player clears it this share of days (the greedy player's 69% with the hearts, `npm run daily-rate`; a stronger player later does better, so this is a floor), and a fall comes at about wave 8. A clear pays the waves' crowns and a daily chest (about one bonus star in two), a fall the waves' crowns before it. */
const DAILY_CLEAR = 0.7;
const DAILY_FALL_WAVES = 7;
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
/** `--awaken`: calamities tried before the first clear (from this day, one a week, beating a map more each fortnight from two), and runs a week once clearing (`--calweek`). Losses keep their bosses' ores. */
const CAL_TRY_DAY = arg('--caltry', 35);
const CAL_WEEK = arg('--calweek', 1);
// `--ores "6,14"`: try other ore costs for awakening I and II without editing the rules.
const oresArg = process.argv[process.argv.indexOf('--ores') + 1];
// `--armyrate 0.5`: the armies' boss-wave chances times this (first clears unchanged).
const ARMY_RATE = arg('--armyrate', 1);
for (const t of [MID_CHANCE, FINAL_CHANCE] as number[][]) t.forEach((c, i) => (t[i] = c * ARMY_RATE));
if (process.argv.includes('--ores') && oresArg) oresArg.split(',').forEach((n, i) => ((AWAKEN_ORES as number[])[i] = Number(n)));
/** Achievements and the codex pay about this many crowns in all over the first 150 days. */
const EXTRA_CROWNS = 900;
/** And the stones they pay beside those crowns: the same share of every achievement's and codex reward's stones as `EXTRA_CROWNS` is of their crowns. `--nobadges 1` leaves them out. */
const BADGE_CROWNS = ACHIEVEMENTS.reduce((n, a) => n + a.crowns, 0) + crownsTotal('bestiary') + crownsTotal('heroes');
const BADGE_STONES = ACHIEVEMENTS.reduce((n, a) => n + stonesOfAchievement(a), 0) + stonesTotal('bestiary') + stonesTotal('heroes');
/** `--noentries 1`: the codex entries pay no stone (the player is otherwise paid one for each foe entry met and each hero owned, claimed every day). */
const NO_ENTRIES = arg('--noentries', 0) > 0;
const EXTRA_STONES = arg('--nobadges', 0) > 0 ? 0 : Math.round((BADGE_STONES * Math.min(1, EXTRA_CROWNS / BADGE_CROWNS)));

interface Report { aw: { shards1: number; shards2: number; ore1: number; ore2: number; all1: number; all2: number; n1: Record<number, number>; n2: Record<number, number>; s1: Record<number, number>; s2: Record<number, number>; src: { army: number; chest: number; calamity: number; cache: number } }; tomeXp: Record<number, number>; pdays: Record<number, number>; by: Record<number, number>; pullable: number; days: Record<number, number>; at: Record<string, number>; pulls: number; crowns: number; entryStones: number }
const MARKS = [5, 10, 15, 20, 30, 40, 45];
/** The pullable heroes owned (the starter's three count): the 4th is the first after the starter. */
const PULL_MARKS = [4, 5, 6, 10, 15, 20, 30, 35];
const CHECKS = [1, 2, 3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365];

function simulate(seed: number): Report {
  const m: Meta = newMeta(seed);
  pickStarter(m, 0);
  const at: Record<string, number> = {};
  const days: Record<number, number> = {};
  const pdays: Record<number, number> = {};
  const tomeXp: Record<number, number> = {};
  let spent = 0;
  let income = 0;
  let castleLeft = CASTLE_TOTAL;
  let pulls = 0;
  let entryStones = 0;
  // (the best army and tier cleared, which the farm replays; and its crowns a run)
  const bestPick = (): { crowns: number; army?: string; tier: number } => {
    let best: { crowns: number; army?: string; tier: number } = { crowns: 0, tier: 0 };
    ARMIES.forEach((a) => {
      for (let t = 0; t < 3; t++) {
        const done = t === 0 ? m.armies[a.id]?.clears : m.armies[a.id]?.hard?.[String(t)]?.clears;
        if (done && replayTotal(a, t) > best.crowns) best = { crowns: replayTotal(a, t), army: a.id, tier: t };
      }
    });
    return best;
  };
  const bestFarm = (): number => bestPick().crowns;
  let asc = -1;
  // (the awakening model: the ores go into the meta by the real rules; the sources are counted for the report)
  const aw = { shards1: Infinity, shards2: Infinity, ore1: Infinity, ore2: Infinity, all1: Infinity, all2: Infinity, n1: {} as Record<number, number>, n2: {} as Record<number, number>, s1: {} as Record<number, number>, s2: {} as Record<number, number>, src: { army: 0, chest: 0, calamity: 0, cache: 0 } };
  const held = (): number => Object.values(m.ores ?? {}).reduce((n, x) => n + x, 0);
  const gain = (d: OreDrop) => {
    grantOres(m, [d]);
    aw.src.calamity += d.n;
  };
  const armyGain = (r: { drops: OreDrop[] }) => (aw.src.army += r.drops.reduce((n, d) => n + d.n, 0));
  // (a Rift Cache is opened on the hero with the most shards that still has a step to take)
  const openCaches = () => {
    while (cachesOf(m) > 0) {
      const near = [...m.unlocked].filter((k) => awakenedOf(m, k) < 2 && oreOf(k)).sort((a, b) => (m.shards[b] ?? 0) - (m.shards[a] ?? 0))[0];
      if (!near || !openCache(m, near)) break;
      aw.src.cache += 8;
    }
  };
  let pullable = Infinity;
  const by: Record<number, number> = {};
  for (let day = 1; day <= DAYS; day++) {
    // the daily: a clear pays its ten waves and puts a daily chest in the stash; a fall pays the waves before it
    const clears = new Rng(mixSeed(seed, 0xda1c, day)).chance(DAILY_CLEAR);
    let today = dailyCrowns(clears ? DAILY_WAVES : DAILY_FALL_WAVES);
    if (clears) m.stash.push({ army: 'daily', at: 3, tier: 0, seed: dailyChestSeed(m.seed, 20260000 + day), daily: 20260000 + day, bonus: new Rng(mixSeed(seed, 0xda1d, day)).int(0, 2) });
    // the armies' first clears and their chests
    ARMIES.forEach((a, i) => {
      if (NORMAL_DAY[i] === day) {
        const rec = (m.armies[a.id] ??= { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 0, stars: {} });
        rec.clears = 1;
        today += firstClearTotal(a, 0);
        m.stash.push({ army: a.id, at: FIRST_CLEAR_CHEST[0], tier: 0, seed: firstClearSeed(m.seed, a, 0), first: true });
        armyGain(settleArmyOres(m, a.id, 'final', 0, true, true, mixSeed(seed, 0x0e55, day, i), a.waves.length));
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
      armyGain(settleArmyOres(m, a.id, 'final', t, true, true, mixSeed(seed, 0x0e56, day, i), a.waves.length));
      if (t === 1) m.stash.push({ army: a.id, at: 5, tier: t, seed: chestSeed(m.seed, a, 5) });
    }
    // the farm: the best tier cleared, thirteen runs
    today += FARM_RUNS * bestFarm();
    // (the farm's boss waves now and then drop the army's ores)
    const pick = bestPick();
    const farmed = pick.army ? ARMIES.find((a) => a.id === pick.army)! : undefined;
    if (farmed)
      for (let r = 0; r < FARM_RUNS; r++)
        for (const b of bossesOf(farmed)) armyGain(settleArmyOres(m, farmed.id, farmed.waves[b.wave - 1].boss, pick.tier, true, false, mixSeed(seed, 0x0e54, day, r), b.wave));
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
      // (the finishing reward: crowns, shards, a title; `calReward.ts`)
      payClear(m, mixSeed(seed, 0xca1d, day), asc, Math.min(ARMIES.length - 1, Math.floor(day / 12)));
      // (the ores: six bosses and three mini-bosses of their maps' kinds; the clear's Rift Cache came with payClear)
      const rs = mixSeed(seed, 0x0e51, day);
      for (let map = 1; map <= 6; map++) gain(bossOres(rs, map, asc));
      for (const map of [2, 4, 6]) gain(eliteOres(rs, map, map * 7, asc));
    }
    if (day <= 150) {
      today += EXTRA_CROWNS / 150;
      m.stones = (m.stones ?? 0) + Math.floor((EXTRA_STONES * day) / 150) - Math.floor((EXTRA_STONES * (day - 1)) / 150);
    }
    m.crowns += Math.round(today);
    income += Math.round(today);
    // the chests are opened the day they come
    const before = held();
    while (m.stash.length) openChest(m, 0);
    aw.src.chest += held() - before;
    for (const k of grantContent(m)) at[k] = at[k] ?? day;
    // the castle first, then the pulls
    const toCastle = Math.min(castleLeft, Math.floor(m.crowns * CASTLE_SHARE));
    castleLeft -= toCastle;
    m.crowns -= toCastle;
    const budget = Math.floor(m.crowns * PULL_SHARE);
    let left = budget;
    // the codex: a stone for each entry discovered since yesterday (the foes of the armies cleared, the heroes that joined)
    if (!NO_ENTRIES) entryStones += claimEntries(m);
    // the chest shop: the dearest chest the budget reaches, again and again; every stone is then used (ten at a time, then singles)
    for (;;) {
      const c = [...SHOP].reverse().find((x) => shopPrice(m, x.kind) <= left && stockLeft(m, x.kind, 20260000 + day) > 0);
      if (NO_SHOP || !c || !buyChest(m, c.kind, 20260000 + day)) break;
      left -= shopPrice(m, c.kind);
    }
    while (stonesOf(m) > 0) {
      const n = stonesOf(m) >= 10 ? 10 : 1;
      pulls += useStones(m, n)!.length;
    }
    for (const k of grantContent(m)) at[k] = at[k] ?? day;
    // (awakening: shards alone, then greedily with the ores, the most-sharded hero first)
    const byShards = [...m.unlocked].sort((a, b) => (m.shards[b] ?? 0) - (m.shards[a] ?? 0));
    if ((m.shards[byShards[0]] ?? 0) >= AWAKEN_SHARDS[0]) aw.shards1 = Math.min(aw.shards1, day);
    if ((m.shards[byShards[0]] ?? 0) >= AWAKEN_SHARDS[1]) aw.shards2 = Math.min(aw.shards2, day);
    openCaches();
    for (const k of byShards) {
      // (the ranks the shards earned are taken first: an awakening needs the top rank taken)
      while (canRankUp(m, k)) rankUp(m, k);
      while (awaken(m, k)) {
        if (awakenedOf(m, k) === 1) aw.ore1 = Math.min(aw.ore1, day);
        if (awakenedOf(m, k) === 2) aw.ore2 = Math.min(aw.ore2, day);
      }
    }
    const owned = m.unlocked.filter((k) => oreOf(k));
    if (owned.length >= ALL_HEROES.length && owned.every((k) => awakenedOf(m, k) >= 1)) aw.all1 = Math.min(aw.all1, day);
    if (owned.length >= ALL_HEROES.length && owned.every((k) => awakenedOf(m, k) >= 2)) aw.all2 = Math.min(aw.all2, day);
    if (CHECKS.includes(day)) {
      aw.s1[day] = m.unlocked.filter((k) => (m.shards[k] ?? 0) >= AWAKEN_SHARDS[0]).length;
      aw.s2[day] = m.unlocked.filter((k) => (m.shards[k] ?? 0) >= AWAKEN_SHARDS[1]).length;
      aw.n1[day] = m.unlocked.filter((k) => awakenedOf(m, k) >= 1).length;
      aw.n2[day] = m.unlocked.filter((k) => awakenedOf(m, k) >= 2).length;
    }
    // (the tries before the first clear: the bosses beaten pay their ores; and extra clears a week with `--calweek`)
    if (day >= CAL_TRY_DAY && day < CALAMITY_DAY && (day - CAL_TRY_DAY) % 7 === 0) {
      const beaten = Math.min(5, 2 + Math.floor((day - CAL_TRY_DAY) / 14));
      for (let map = 1; map <= beaten; map++) gain(bossOres(mixSeed(seed, 0x0e52, day), map, 0));
      gain(eliteOres(mixSeed(seed, 0x0e52, day), 2, 14, 0));
    }
    if (day >= CALAMITY_DAY && [3, 5, 1, 2, 4, 6].slice(0, CAL_WEEK - 1).includes((day - CALAMITY_DAY) % 7)) {
      const rs = mixSeed(seed, 0x0e53, day);
      for (let map = 1; map <= 6; map++) gain(bossOres(rs, map, Math.max(0, asc)));
      for (const map of [2, 4, 6]) gain(eliteOres(rs, map, map * 7, Math.max(0, asc)));
      m.caches = cachesOf(m) + 1;
    }
    if (CHECKS.includes(day)) by[day] = m.unlocked.length;
    // (the XP tomes are kept, not read: what they would give in all, for `npm run level-pace -- --tomes`)
    if (CHECKS.includes(day)) tomeXp[day] = TOME_SIZES.reduce((n, size) => n + tomesOf(m, size) * TOMES[size].xp, 0);
    if (pullable === Infinity && PULL_HEROES.every((k) => m.unlocked.includes(k))) pullable = day;
    const ownedPull = PULL_HEROES.filter((k) => m.unlocked.includes(k)).length;
    for (const n of PULL_MARKS) if (pdays[n] === undefined && ownedPull >= n) pdays[n] = day;
    for (const n of MARKS) if (days[n] === undefined && m.unlocked.length >= n) days[n] = day;
    spent += 0;
  }
  void spent;
  return { aw, tomeXp, pdays, by, pullable, days, at, pulls, crowns: income, entryStones };
}

const reports = Array.from({ length: SEEDS }, (_, i) => simulate(i * 7919 + 13));
const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`Unlock pace for a daily player (${SEEDS} seeds, ${DAYS} days; ${Math.round(PULL_SHARE * 100)}% of crowns to pulls after the castle; ${FOE_ENTRIES.length} bestiary entries, ${ACHIEVEMENTS.length} achievements)`);
console.log(`Crowns earned: ${Math.round(mean(reports.map((r) => r.crowns)))} in ${DAYS} days; stones used: ${Math.round(mean(reports.map((r) => r.pulls)))} (${EXTRA_STONES} of them from achievements and the codex's milestones, ${Math.round(mean(reports.map((r) => r.entryStones)))} from its entries)`);
console.log('\nheroes  day reached (median, earliest, latest)');
for (const n of MARKS) {
  const ds = reports.map((r) => r.days[n] ?? Infinity);
  const fmt = (x: number) => (Number.isFinite(x) ? String(x) : `>${DAYS}`);
  console.log(`${String(n).padStart(6)}  ${fmt(med(ds)).padStart(5)}  (${fmt(Math.min(...ds))} to ${fmt(Math.max(...ds))})`);
}
console.log('\npullable heroes owned  day reached (median, earliest, latest)');
for (const n of PULL_MARKS) {
  const ds = reports.map((r) => r.pdays[n] ?? Infinity);
  const fmt = (x: number) => (Number.isFinite(x) ? String(x) : `>${DAYS}`);
  console.log(`${String(n).padStart(8)}  ${fmt(med(ds)).padStart(5)}  (${fmt(Math.min(...ds))} to ${fmt(Math.max(...ds))})`);
}
console.log('\nday   heroes owned (median)');
for (const d of CHECKS) console.log(`${String(d).padStart(3)}   ${med(reports.map((r) => r.by[d] ?? 0))}`);
console.log(`\nevery pullable hero (${PULL_HEROES.length}) owned by day ${med(reports.map((r) => r.pullable))}`);
console.log('\ncontent hero          day it joins (median)');
for (const c of CONTENT_HEROES) {
  const ds = reports.map((r) => r.at[c.kind] ?? Infinity);
  console.log(`${c.kind.padEnd(20)}  ${Number.isFinite(med(ds)) ? med(ds) : `>${DAYS}`}`);
}
console.log('\nowned (pullable)  shards to unlock the next  odds that a pull is a new hero shard (nothing begun)');
for (const n of [3, 4, 5, 6, 8, 10, 14, 18, 22, 26, 30, 34]) console.log(`${String(n).padStart(8)}  ${String(unlockNeed(n)).padStart(8)}  ${(((PULL_HEROES.length - n) / (PULL_HEROES.length - n + n * ownedWeight(n))) * 100).toFixed(1).padStart(8)}%`);
console.log('\nday   XP tomes collected, as XP (median; `npm run level-pace -- --tomes "<day>:<xp>,..."` reads this line)');
for (const d of CHECKS) if (d <= DAYS) console.log(`${String(d).padStart(3)}   ${med(reports.map((r) => r.tomeXp[d] ?? 0))}`);
console.log(`--tomes "${CHECKS.filter((d) => d <= DAYS).map((d) => `${d}:${med(reports.map((r) => r.tomeXp[d] ?? 0))}`).join(',')}"`);
void ALL_HEROES;

if (process.argv.includes('--awaken')) {
  const fmt = (x: number) => (Number.isFinite(x) ? String(x) : `>${DAYS}`);
  const first = (f: (r: Report) => number) => fmt(med(reports.map(f)));
  console.log('\nawakening (median day)               shards only (today)   with the ores');
  console.log(`first hero ready for awakening I     ${first((r) => r.aw.shards1).padStart(8)}             ${first((r) => r.aw.ore1).padStart(8)}`);
  console.log(`first hero ready for awakening II    ${first((r) => r.aw.shards2).padStart(8)}             ${first((r) => r.aw.ore2).padStart(8)}`);
  console.log('\nday   heroes with the shards for I / II   awakened I / II with the ores (median)');
  for (const d of CHECKS) if (d <= DAYS) console.log(`${String(d).padStart(3)}   ${String(med(reports.map((r) => r.aw.s1[d] ?? 0))).padStart(8)} / ${String(med(reports.map((r) => r.aw.s2[d] ?? 0))).padEnd(8)}                ${String(med(reports.map((r) => r.aw.n1[d] ?? 0))).padStart(4)} / ${med(reports.map((r) => r.aw.n2[d] ?? 0))}`);
  console.log(`every hero awakened I / II         ${first((r) => r.aw.all1).padStart(8)} / ${first((r) => r.aw.all2)}  (all ${ALL_HEROES.length} owned)`);
  const src = (k: 'army' | 'chest' | 'calamity' | 'cache') => Math.round(mean(reports.map((r) => r.aw.src[k])));
  console.log(`ores earned in ${DAYS} days (mean): armies ${src('army')}, chests ${src('chest')}, the Calamity's bosses and mini-bosses ${src('calamity')}, Rift Caches ${src('cache')}`);
}
