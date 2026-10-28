// How often the heroes' ultimates come round (ULT-CHARGE, docs/notes/ult-charge.md): plays each mode as its greedy player does and, for every
// hero whose ultimate is open, records when its meter first fills and how many ultimates it fires in each fight. `run.mjs` bundles this file
// with a small wrapper round `stepBattle` that hands every tick's events to `globalThis.__ultProbe`, so the greedy players run unchanged.
//   node tools/ult-charge/run.mjs [saves]           every mode (armies at their levels and on the top tiers, the daily, the Last Stand, the Calamity)
//   node tools/ult-charge/run.mjs 6 --only stand    one mode (armies, tiers, daily, stand, calamity)

import type { Battle, BattleEvent } from '../../src/sim/battle';
import { ultimateOf } from '../../src/sim/abilities';
import { ULT_FILL } from '../../src/sim/heroKits';
import { ARMIES } from '../../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank, startedMeta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { boostOf, type Owned } from '../../src/sim/run';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { buyLevel, healCost, healKing, levelBlock, newStandRun, startFirstWave, startStand, stepStand, type Stand } from '../../src/sim/stand';
import { gradeBoost } from '../../src/sim/run';
import { xpFor } from '../../src/sim/levels';
import { playArmy, playCalamity, savedAt } from '../autoplay';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { canRetry, finish, isBossRun, retryWave, startStage } from '../../src/sim/run';
import { fight, playOut } from '../../src/sim/battle';
import { dailyRun, dailyScale } from '../../src/sim/modes';
import { dailyTheme } from '../../src/sim/dailyThemes';
import { ratingOf } from '../../src/sim/stars';
import { HEROES } from '../../src/sim/units';

// (`ULT=PER_SEC=1,START=40` tries other meter numbers; a tuning run, nothing is written)
for (const kv of (process.env.ULT ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (ULT_FILL as Record<string, number>)[k] = Number(v);
}
if (process.env.ULT) console.log('meter:', JSON.stringify(ULT_FILL));

interface HeroLog { def: string; fulls: number[]; ults: number[]; start: number }
interface FightLog { t0: number; t1: number; boss: boolean; heroes: Map<number, HeroLog> }

/** The fights being watched (by battle), and the finished ones under the current label. */
const live = new WeakMap<Battle, FightLog>();
let label = '';
const done = new Map<string, FightLog[]>();
/** The Last Stand is one long battle: its waves are cut out of its log by the driver. */
let standLog: FightLog | undefined;

(globalThis as { __ultProbe?: (b: Battle, ev: BattleEvent[]) => void }).__ultProbe = (b, ev) => {
  let f = live.get(b);
  if (!f) {
    f = { t0: b.t - 100, t1: b.t, boss: b.units.some((u) => u.side === 'foe' && (u.size ?? 1) > 1), heroes: new Map() };
    live.set(b, f);
    if (b.stand) standLog = f;
  }
  f.t1 = b.t;
  for (const u of b.units) {
    if (u.side !== 'hero' || u.owner !== undefined) continue;
    const ult = ultimateOf(u);
    if (!ult) continue;
    let h = f.heroes.get(u.id);
    if (!h) {
      h = { def: u.def, fulls: [], ults: [], start: u.charge2 ?? 0 };
      f.heroes.set(u.id, h);
      if ((u.charge2 ?? 0) >= ult.need) h.fulls.push(f.t0);
    }
    for (const e of ev) if (e.kind === 'skill' && e.by === u.id && e.name === ult.name) h.ults.push(b.t);
    const full = (u.charge2 ?? 0) >= ult.need;
    const was = (h as { was?: boolean }).was ?? h.fulls.length > 0;
    if (full && !was) h.fulls.push(b.t);
    (h as { was?: boolean }).was = full;
  }
  if (b.phase !== 'fight' && !b.stand) (done.get(label) ?? done.set(label, []).get(label)!).push(f);
};

function report(name: string, fights: FightLog[]): void {
  let n = 0;
  let secs = 0;
  let firsts: number[] = [];
  let ults = 0;
  let none = 0;
  let two = 0;
  for (const f of fights) {
    const len = (f.t1 - f.t0) / 1000;
    for (const h of f.heroes.values()) {
      n++;
      secs += len;
      const inFight = h.ults.filter((t) => t > f.t0 && t <= f.t1).length;
      ults += inFight;
      if (inFight === 0) none++;
      if (inFight >= 2) two++;
      const first = h.fulls.find((t) => t >= f.t0 && t <= f.t1);
      if (first !== undefined) firsts.push((first - f.t0) / 1000);
    }
  }
  if (!n) return console.log(`${name.padEnd(30)} (no hero with its ultimate open)`);
  firsts = firsts.sort((a, b) => a - b);
  const med = firsts.length ? firsts[Math.floor(firsts.length / 2)].toFixed(1) : '-';
  console.log(
    `${name.padEnd(30)} fights ${String(fights.length).padStart(4)}  mean ${(secs / n).toFixed(1).padStart(5)}s  first full: median ${med.padStart(5)}s (${((100 * firsts.length) / n).toFixed(0).padStart(3)}% fill)  ults/hero ${(ults / n).toFixed(2)}  none ${((100 * none) / n).toFixed(0).padStart(3)}%  2+ ${((100 * two) / n).toFixed(0).padStart(3)}%`,
  );
}
function flush(name: string, filter: (f: FightLog) => boolean = () => true): void {
  report(name, (done.get(label) ?? []).filter(filter));
}

const SAVES = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 6);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const want = (m: string) => !only || only.split(',').includes(m);
const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
const withTalents = (level: number, save: number) => {
  const meta = savedAt(level, party, save);
  for (const k of party) for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const nd of tierNodes(k, t)) learn(meta, k, nd.id);
  return meta;
};

if (want('armies')) {
  console.log('\nArmies, Normal, at their own levels (the greedy player, a maxed castle, gear):');
  for (const a of ARMIES.filter((x) => x.level >= 30)) {
    label = `army:${a.id}`;
    for (let s = 1; s <= SAVES; s++) {
      const meta = savedAt(a.level, party, s);
      for (let n = 1; n <= 3; n++) if (playArmy(meta, a.id, mixSeed(s, 0xd33b, n), party, maxed, true).cleared) break;
    }
    flush(`${a.id} (lv ${a.level}) waves`, (f) => !f.boss);
    flush(`${a.id} (lv ${a.level}) bosses`, (f) => f.boss);
  }
}

if (want('tiers')) {
  console.log('\nArmies on the top tiers at deep levels (talents learnt):');
  for (const [army, tier, level] of [['orcs', 2, 40], ['labyrinth', 3, 60], ['golems', 4, 100]] as const) {
    if (!ARMIES.some((a) => a.id === army)) continue;
    label = `tier:${army}:${tier}`;
    for (let s = 1; s <= Math.max(2, Math.ceil(SAVES / 2)); s++) {
      const meta = withTalents(level, s);
      const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
      for (let n = 1; n <= 3; n++) if (playArmy(meta, army, mixSeed(s, 0xd33b, 1000 + n), party, maxed, true, tier, boostFor).cleared) break;
    }
    flush(`${army} tier ${tier} lv ${level} waves`, (f) => !f.boss);
    flush(`${army} tier ${tier} lv ${level} bosses`, (f) => f.boss);
  }
}

if (want('daily')) {
  console.log("\nThe daily (the starting five at a level, the foes scaled to the save as `startDaily` does, the day's gold, hearts spent):");
  for (const level of [30, 50]) {
    label = `daily:${level}`;
    for (let d = 0; d < SAVES * 2; d++) {
      const meta = startedMeta(d + 1);
      const date = 20260101 + d * 7;
      for (const k of new Set([...meta.unlocked, ...HEROES, ...(dailyTheme(date)?.five ?? [])])) meta.xp[k] = xpFor(level);
      const run = dailyRun(date, false, dailyScale(meta, date));
      while (!run.over) {
        autoRound(run, meta, true);
        const b = startStage(run);
        autoDeploy(b, run, meta);
        fight(b);
        playOut(b);
        const ok = b.phase === 'won';
        if (!ok && canRetry(run)) {
          retryWave(run);
          continue;
        }
        finish(run, ok, ratingOf(b, isBossRun(run)).stars);
      }
    }
    flush(`daily lv ${level} waves`, (f) => !f.boss);
    flush(`daily lv ${level} bosses`, (f) => f.boss);
  }
}

if (want('stand')) {
  console.log('\nThe Last Stand (eight heroes at a level, the greedy buyer; each wave cut from the one long battle):');
  const eight = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
  for (const level of [30, 60]) {
    const waves: FightLog[] = [];
    for (let a = 0; a < SAVES; a++) {
      const run = newStandRun(mixSeed(a + 1, 0x57a0), eight, ARMIES.map((x) => x.id));
      const s: Stand = startStand(run, { boost: () => ({ ...gradeBoost(1, 0, level) }), castle: newCastle() });
      startFirstWave(s);
      standLog = undefined;
      let at = s.b.t;
      let was = s.phase;
      for (let ticks = 0; s.phase !== 'over' && s.run.wave <= 60 && ticks < 36000; ticks++) {
        stepStand(s);
        s.notes.length = 0;
        const log = standLog as FightLog | undefined;
        if (s.phase !== was && log) {
          if (was === 'wave') waves.push({ t0: at, t1: s.b.t, boss: false, heroes: log.heroes });
          if (s.phase === 'wave') at = s.b.t;
          if (s.phase === 'break') {
            for (let g = 0; g < 40; g++) {
              if (s.king.hp < s.king.maxHp * 0.55 && s.run.gold >= healCost(s.run.wave) && healKing(s)) continue;
              if (!levelBlock(s) && buyLevel(s)) continue;
              break;
            }
          }
        }
        was = s.phase;
      }
    }
    report(`stand lv ${level} waves`, waves);
  }
}

if (want('calamity')) {
  console.log('\nThe Calamity (a greedy climb; heroes reach level 30 in the run, a maxed castle):');
  label = 'calamity';
  for (let s = 1; s <= SAVES; s++) playCalamity(startedMeta(s), mixSeed(s, 0xca1a), ['knight', 'wizard', 'archer', 'cleric', 'samurai', 'paladin'][s % 6], maxed);
  flush('calamity fights', (f) => !f.boss);
  flush('calamity bosses', (f) => f.boss);
}
