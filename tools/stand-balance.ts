// The Last Stand's balance: a greedy player holds the keep (`playStand`) with parties at several hero levels, and the report says
// how many waves each gets through. `npm run balance -- --no-tables --stand` runs it through tools/balance.mjs's bundle;
// `npm run stand-balance` runs it alone. Options: `--levels 1,10,20` `--attempts 30` `--castle maxed` `--party mixed` `--waves 150`.

import { BUILDINGS, maxLevel, newCastle, type BuildingId, type Castle } from '../src/sim/castle';
import { TICK_MS } from '../src/sim/battle';
import { gradeBoost } from '../src/sim/run';
import { mixSeed } from '../src/sim/rng';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { buyLevel, buyRelic, healCost, healKing, hire, hireBlock, levelBlock, levelCost, newStandRun, offerCost, startFirstWave, startStand, stepStand, type Stand, type StandSetup } from '../src/sim/stand';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};

const castleFor = (): Castle => {
  const c = newCastle();
  const which = process.argv.includes('--castle') ? process.argv[process.argv.indexOf('--castle') + 1] : '';
  if (which === 'maxed' || which === 'half') for (const id of Object.keys(BUILDINGS) as BuildingId[]) c[id] = which === 'half' ? Math.floor(maxLevel(id) / 2) : maxLevel(id);
  return c;
};

/** A party of the starting five (or, with `--party mixed`, a spread of kinds from every class) with every hero at one level and nothing worn. */
export const PARTIES: Record<string, string[]> = {
  starters: [...HEROES],
  mixed: ['knight', 'paladin', 'archer', 'ranger', 'cleric'],
};

export function setupAtLevel(level: number, castle: Castle = newCastle()): StandSetup {
  return { boost: () => ({ ...gradeBoost(1, 0, level) }), castle, pool: ALL_HEROES };
}

export interface Played {
  /** The wave reached (the wave the king fell in). */
  wave: number;
  kills: number;
  hires: number;
  /** The greatest foes alive at once, and the sim's time per tick (ms of real time). */
  peak: number;
  msPerTick: number;
  ticks: number;
  reason: 'fell' | 'cap';
}

/** What a greedy player does with the break's gold: heal a hurt king, hire up to seven heroes, then a relic when one is cheap, else level the weakest. */
export function spend(s: Stand): void {
  for (let guard = 0; guard < 40; guard++) {
    const k = s.king;
    if (k.hp < k.maxHp * 0.55 && s.run.gold >= healCost(s.run.wave) && healKing(s)) continue;
    if (s.run.heroes.length < 7 && !hireBlock(s) && hire(s)) continue;
    if (s.run.offer.length && s.run.gold >= offerCost(s) && buyRelic(s, 0)) continue;
    if (!levelBlock(s) && buyLevel(s)) continue;
    break;
  }
}

/** One run from a seed: the waves the party holds, until the king falls or `maxWave` is passed. */
export function playStand(setup: StandSetup, seed: number, party: readonly string[] = HEROES, maxWave = 150): Played {
  const run = newStandRun(seed, party, ARMIES.map((a) => a.id));
  const s = startStand(run, setup);
  startFirstWave(s);
  let ticks = 0;
  let peak = 0;
  let was = s.phase;
  const t0 = performance.now();
  while (s.phase !== 'over' && s.run.wave <= maxWave) {
    stepStand(s);
    ticks++;
    s.notes.length = 0;
    if (s.phase === 'break' && was !== 'break') spend(s);
    // (and gold earned in a wave is spent at the next chance; a break is the only time the greedy player looks)
    was = s.phase;
    if (ticks % 10 === 0) peak = Math.max(peak, s.b.units.filter((u) => u.alive && u.side === 'foe').length);
    if (ticks > 60 * 60 * 10) break;
  }
  const ms = performance.now() - t0;
  return { wave: s.run.wave, kills: s.run.kills, hires: s.run.hires, peak, msPerTick: ms / Math.max(1, ticks), ticks, reason: s.phase === 'over' ? 'fell' : 'cap' };
}

export function standTable(): void {
  const attempts = arg('--attempts', 30);
  const maxWave = arg('--waves', 150);
  const levels = process.argv.includes('--levels') ? process.argv[process.argv.indexOf('--levels') + 1].split(',').map(Number) : [1, 10, 20, 40, 60, 80, 100];
  const party = PARTIES[process.argv.includes('--party') ? process.argv[process.argv.indexOf('--party') + 1] : 'starters'] ?? PARTIES.starters;
  console.log(`\nThe Last Stand: ${attempts} greedy runs a row (${party.join(', ')}, every hero at the level, nothing worn, ${process.argv.includes('--castle') ? `a castle at ${process.argv[process.argv.indexOf('--castle') + 1]}` : 'no castle'}); the wave the king fell in (a run past wave ${maxWave} is stopped there)`);
  console.log('level  median  mean   min   max   kills(mean)  peak foes  ms/tick');
  for (const level of levels) {
    const waves: number[] = [];
    let kills = 0;
    let peak = 0;
    let ms = 0;
    for (let a = 0; a < attempts; a++) {
      const r = playStand(setupAtLevel(level, castleFor()), mixSeed(a + 1, 0x57a0), party, maxWave);
      waves.push(r.wave);
      kills += r.kills;
      peak = Math.max(peak, r.peak);
      ms += r.msPerTick;
    }
    waves.sort((x, y) => x - y);
    const mean = waves.reduce((n, x) => n + x, 0) / waves.length;
    console.log(`${String(level).padStart(5)}  ${String(waves[Math.floor(waves.length / 2)]).padStart(6)}  ${mean.toFixed(1).padStart(5)}  ${String(waves[0]).padStart(4)}  ${String(waves[waves.length - 1]).padStart(4)}  ${(kills / attempts).toFixed(0).padStart(11)}  ${String(peak).padStart(9)}  ${(ms / attempts).toFixed(2).padStart(7)}`);
  }
  void TICK_MS;
  void levelCost;
}

if (process.argv[1]?.includes('stand-balance')) standTable();
