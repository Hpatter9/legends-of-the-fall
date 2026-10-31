// The kill-XP split (`KILL_KEEP` in `src/sim/levels.ts`), measured. Two tables, each for the old rule (keep 1: every kill to the killer)
// and the split ones:
//  1. A weak hero beside a carry: a party with one hero at level 30 (the carry), one at level 5 (the weak one) and three at 15 plays
//     army runs on Normal, the XP added after every fight as the game does. It reports what the weak hero and the carry earned over
//     one run, the weak hero's level after one and after three runs, and the party's total.
//  2. How even the pay is in a party of equals (the recruits' party at level 100, a maxed castle, every talent: the pace tool's
//     measuring party): each hero's share of the party mean, and the best's (the pace tool's favourite takes `--fav` times the mean).
//
//   node tools/xp-split/split.mjs [--seeds 8] [--keeps 1,0.5,0.4]

import { ARMIES } from '../../src/sim/armies';
import { fight, playOut } from '../../src/sim/battle';
import { maxLevel, newCastle, xpRate } from '../../src/sim/castle';
import { fightXp, gainXp, levelOfKind, xpFor } from '../../src/sim/levels';
import { mixSeed } from '../../src/sim/rng';
import { armyRun, boostOf, recruit, finish, isBossRun, noteFight, startStage, type Owned } from '../../src/sim/run';
import { heroRank, type Meta } from '../../src/sim/meta';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { savedAt } from '../autoplay';

const argOf = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? fallback : fallback;
};
const SEEDS = Number(argOf('--seeds', '8'));
const KEEPS = argOf('--keeps', '1,0.5').split(',').map(Number);
const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const CARRY = 'warlock';
const WEAK = 'archer';

/** Plays one army run, adding each fight's XP to the meta. Returns the XP each kind earned, by kind. */
function playRun(meta: Meta, seed: number, army: number, tier: number, keep: number, castle = newCastle(), talents = false): Record<string, number> {
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), talents ? heroStats(meta, h.kind) : undefined);
  const run = armyRun(seed, ARMIES[army].id, PARTY, castle, tier);
  // (the whole party hired from the start, so every one of the five fights every wave: the pool is the party, one of each on the field)
  for (const k of PARTY) recruit(run, k, 0);
  const got: Record<string, number> = {};
  while (!run.over) {
    autoRound(run, meta, true);
    const b = startStage(run);
    autoDeploy(b, run, meta, boostFor);
    fight(b);
    playOut(b);
    noteFight(run, b);
    finish(run, b.phase === 'won', ratingOf(b, isBossRun(run)).stars);
    const gains = fightXp(b, xpRate(castle), keep);
    for (const [k, n] of Object.entries(gains)) got[k] = (got[k] ?? 0) + n;
    gainXp(meta, gains);
  }
  return got;
}

const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
const f1 = (x: number) => x.toFixed(1);

console.log(`1. A level-5 ${WEAK} beside a level-30 ${CARRY} (and three at 15), army runs on Normal, ${SEEDS} seeds\n`);
for (const army of [0, 1]) {
  console.log(`  ${ARMIES[army].name}`);
  console.log('  keep   weak XP/run   carry XP/run   weak share   party XP/run   weak level after 1 run / 3 runs');
  for (const keep of KEEPS) {
    const weak: number[] = [], carry: number[] = [], party: number[] = [], lv1: number[] = [], lv3: number[] = [];
    for (let s = 1; s <= SEEDS; s++) {
      const meta = savedAt(15, PARTY, s);
      meta.xp[CARRY] = xpFor(30);
      meta.xp[WEAK] = xpFor(5);
      for (let r = 0; r < 3; r++) {
        const got = playRun(meta, mixSeed(s, 0x5911, army * 10 + r), army, 0, keep);
        if (r === 0) {
          weak.push(got[WEAK] ?? 0);
          carry.push(got[CARRY] ?? 0);
          party.push(Object.values(got).reduce((n, x) => n + x, 0));
          lv1.push(levelOfKind(meta, WEAK));
        }
      }
      lv3.push(levelOfKind(meta, WEAK));
    }
    const sh = mean(weak) / mean(party);
    console.log(`  ${String(keep).padEnd(5)}  ${String(Math.round(mean(weak))).padStart(11)}   ${String(Math.round(mean(carry))).padStart(12)}   ${(sh * 100).toFixed(1).padStart(9)}%   ${String(Math.round(mean(party))).padStart(12)}   ${f1(mean(lv1))} / ${f1(mean(lv3))}`);
  }
  console.log('');
}

console.log(`2. A party of equals (level 100, every talent, a maxed castle): each hero's XP over the party mean, a run of each army on Normal and Elite, ${SEEDS} seeds\n`);
const castle = newCastle();
for (const id of Object.keys(castle) as (keyof typeof castle)[]) castle[id] = maxLevel(id);
console.log(`  keep   ${PARTY.map((k) => k.padStart(8)).join(' ')}    best   party XP/run`);
for (const keep of KEEPS) {
  const tot: Record<string, number> = {};
  let runs = 0;
  for (let s = 1; s <= SEEDS; s++)
    for (let a = 0; a < ARMIES.length; a++)
      for (const t of [0, 2]) {
        const meta = savedAt(100, PARTY, s);
        for (const k of PARTY) {
          if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
          for (const tr of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, tr)) learn(meta, k, n.id);
        }
        const got = playRun(meta, mixSeed(s, 0x1e7e1, a * 10 + t), a, t, keep, castle, true);
        for (const [k, n] of Object.entries(got)) tot[k] = (tot[k] ?? 0) + n;
        runs++;
      }
  const m = mean(PARTY.map((k) => tot[k] ?? 0));
  const ratios = PARTY.map((k) => (tot[k] ?? 0) / m);
  console.log(`  ${String(keep).padEnd(5)}  ${ratios.map((r) => r.toFixed(2).padStart(8)).join(' ')}    ${Math.max(...ratios).toFixed(2)}   ${Math.round((m * PARTY.length) / runs)}`);
}
