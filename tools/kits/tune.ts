// The hero kits' balance tuner (COMBAT-002): plays the hero sweep (`tools/heroSweep.ts`, the same seeded fights `test/hero-balance*.test.ts` hold)
// with a set of per-hero knobs, in several processes at once, prints each hero's lift, and suggests the next knobs (a damped step toward the average).
//   node tools/kits/tune.mjs <state.json> <level> <stage> [games] [--apply]     state: { "<hero>": { "t1": 0.5, "t2": 1, "t3": 0.8, "up": 0.5, "ur": 1 } }
// COMING=1 in the environment tunes the coming heroes (and KEY=p their passives' strength) (docs/notes/twenty-heroes.md) against the roster's average, the roster's knobs untouched.
// --skill-level <1-5> fights every hero's skills at that level (`tools/heroSweep.ts`; the children inherit it). t1, t2 and t3 are the skills' `tune`, up and ur the ultimate's `tuned.power` and `.rate`. With --apply the suggestion is written back to the file:
// at level 1 to t1 (only skill 1 is open), at 10 to t2, at 20 to t3 (the skills overhaul's batch 4), at level 30 to up (the ultimate is the late lever).

import '../joint/off';
import { fork } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES, COMING_HEROES } from '../../src/sim/units';
import { KITS } from '../../src/sim/abilities';
import { HERO_KITS } from '../../src/sim/heroKits';
import { twentyHeroKits as comingHeroKits, twentyKits as comingKits, COMING_PASSIVE } from '../../src/sim/kits/coming';
import { fieldBoost, pickTeam, play } from '../heroSweep';
import { applyKnobs, type Knobs } from './knobs';
/** The knobs the tuner steps (every one but skill 3's class). */
type NumKey = Exclude<keyof Knobs, 'k3'>;
import { LV5_TUNE } from '../../src/sim/kits/lv5Tune';

/** Each ultimate's strength before the hero kits (0.170.0's `TUNE`): the floor the tuner keeps to. */
const OLD_POWER: Record<string, number> = { knight: 0.25, samurai: 1.24, kunoichi: 0.08, archer: 0.07, wizard: 0.89, peasant: 0.05, ninjaMonk: 0.07, wanderer: 0.07, lightningMage: 0.07, kitsune: 0.07, karasu: 0.07, yamabushi: 1.42, werewolf: 0.07, minotaur: 0.92, satyr: 0.1, gorgon: 0.07, samuraiCommander: 1.05, paladin: 0.07, cleric: 0.07, druid: 0.07, barbarian: 0.07, ranger: 0.07, warlock: 0.05, illusionist: 0.05, gunslinger: 0.07, shambler: 0.07, rifleBot: 0.13, mercenary: 0.07, mummy: 0.07, buccaneer: 0.07, wolfBard: 0.05, beastmaster: 0.05, kraken: 0.07, lancer: 0.07, reaper: 0.09, timeWitch: 0.05, arcBlade: 0.07, dreadPirate: 0.07, siegeBot: 0.5, priestess: 0.05, dragoon: 0.07, juggernaut: 0.97, sage: 0.13, demonSwordsman: 1.05, tyrant: 0.89 };

const args = process.argv.slice(2);
if (args[0] === '--child') {
  // a share of the fights: [from, to) of the sweep's numbering, so the bands are the sweep's own
  const [, file, level, stage, from, to] = args;
  applyKnobs(JSON.parse(readFileSync(file, 'utf8')));
  const inN: Record<string, number> = {};
  const inW: Record<string, number> = {};
  for (let g = Number(from); g < Number(to); g++) {
    const seed = g + 1;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const won = play(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(Number(stage)), team, 1, Number(level)).won;
    for (const h of team) {
      inN[h] = (inN[h] ?? 0) + 1;
      if (won) inW[h] = (inW[h] ?? 0) + 1;
    }
  }
  process.send!({ inN, inW });
} else {
  const [file, level, stage, games = '12000'] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--skill-level');
  const n = Number(games);
  const parts = Number(process.env.PARTS ?? 3);
  const state: Record<string, Knobs> = JSON.parse(readFileSync(file, 'utf8'));
  const runs = [...Array(parts)].map((_, i) => {
    const from = Math.floor((n * i) / parts);
    const to = Math.floor((n * (i + 1)) / parts);
    return new Promise<{ inN: Record<string, number>; inW: Record<string, number> }>((done) => {
      const c = fork(process.argv[1], ['--child', file, level, stage, String(from), String(to)]);
      c.on('message', (m) => done(m as never));
    });
  });
  void Promise.all(runs).then((rs) => {
    // (COMING=1: the coming heroes are in the teams too, docs/notes/twenty-heroes.md; they are measured against the roster's average and only
    // their knobs are stepped, so the roster's own tuning is left as it is)
    const coming = process.env.COMING === '1';
    const pool = coming ? [...ALL_HEROES, ...COMING_HEROES] : [...ALL_HEROES];
    const winOf = new Map(pool.map((h) => {
      const N = rs.reduce((a, r) => a + (r.inN[h] ?? 0), 0);
      const W = rs.reduce((a, r) => a + (r.inW[h] ?? 0), 0);
      return [h, (100 * W) / Math.max(1, N)];
    }));
    const win = ALL_HEROES.map((h) => winOf.get(h)!);
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    const lifts = (coming ? [...COMING_HEROES] : [...ALL_HEROES]).map((h) => ({ h, lift: winOf.get(h)! - avg }));
    console.log(`level ${level} stage ${stage}, ${n} fights: average ${avg.toFixed(1)}%, spread ${(Math.max(...win) - Math.min(...win)).toFixed(1)}, beyond 6: ${lifts.filter((x) => Math.abs(x.lift) > 6).map((x) => x.h).join(' ') || 'none'}, beyond 4: ${lifts.filter((x) => Math.abs(x.lift) > 4).length}`);
    console.log(lifts.map((x) => `${x.h} ${x.lift.toFixed(1)}`).join(', '));
    if (!process.argv.includes('--apply')) return;
    const key = ((process.env.KEY as NumKey | undefined) ?? (Number(level) >= 30 ? 'up' : Number(level) >= 20 ? 't3' : Number(level) >= 10 ? 't2' : 't1')) as NumKey;
    const step = Number(process.env.STEP ?? 0.035);
    const prev: Record<string, number> = {};
    // (with TARGET set, every hero is stepped toward that win rate rather than the roster's average: the roster's overall strength moves too)
    const target = process.env.TARGET ? Number(process.env.TARGET) : undefined;
    if (target !== undefined) for (const x of lifts) x.lift = x.lift + avg - target;
    for (const { h, lift } of lifts) {
      const k = (state[h] ??= {});
      // (a coming hero's kit is in `comingKits()`, docs/notes/twenty-heroes.md)
      const kit = KITS[h] ?? comingKits()[h];
      const hk = HERO_KITS()[h] ?? comingHeroKits()[h];
      const now = k[key] ?? (key === 'p' ? COMING_PASSIVE[h] ?? 1 : key === 'up' ? kit.ultimate!.tuned!.power : key === 'ur' ? kit.ultimate!.tuned!.rate : key === 't1' ? hk.s1.tune : key === 't3' ? hk.s3!.tune : key === 'l5' ? (LV5_TUNE[h] ?? 1) : hk.s2.tune);
      prev[h] = now;
      // (a damped multiplicative step: a hero 4 points over the average loses about 13% of its strength)
      // (a passive is never more than as written: its knob stays at 1 or under)
      const next = Math.max(0.05, Math.min(key === 'p' ? 1 : 10, now * Math.exp(-step * Math.max(-8, Math.min(8, lift)))));
      k[key] = Math.round(next * 1000) / 1000;
    }
    // (the step moves heroes against each other, not the roster as a whole: the knob's geometric mean is held where it was)
    if (process.env.NORM !== '0' && target === undefined && !coming) {
      const before = lifts.map(({ h }) => Math.log(prev[h]));
      const after = lifts.map(({ h }) => Math.log(state[h][key]!));
      const drift = after.reduce((a, x) => a + x, 0) / after.length - before.reduce((a, x) => a + x, 0) / before.length;
      for (const { h } of lifts) state[h][key] = Math.round(state[h][key]! * Math.exp(-drift) * 1000) / 1000;
    }
    // (an ultimate is never weaker than it was before the hero kits, the owner's call: a hero still too strong at that floor has its meter slowed instead)
    if (key === 'up')
      for (const { h, lift } of lifts) {
        const k = state[h];
        if (OLD_POWER[h] === undefined || k.up! >= OLD_POWER[h]) continue;
        k.up = OLD_POWER[h];
        if (lift > 0) k.ur = Math.round((k.ur ?? (KITS[h] ?? comingKits()[h]).ultimate!.tuned!.rate) * Math.exp(-step * Math.min(8, lift)) * 1000) / 1000;
      }
    writeFileSync(file, JSON.stringify(state, null, 1));
  });
}
