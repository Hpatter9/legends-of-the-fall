// The balance report: plays many headless fights with the sim and prints how strong each hero, foe band and stage is,
// and how a greedy player fares over whole runs. Run it with `npm run balance` (tools/balance.mjs bundles this file with
// esbuild, as test.mjs does for the tests).
//
//   npm run balance                    the default number of fights (4000 for the heroes; a quarter of that per cell)
//   npm run balance -- --games 800     fewer fights, quicker and noisier
//   npm run balance -- --hero-stage 1  play the hero table at another stage (default 5)
//   npm run balance -- --heroes-only --hero-level 100 --hero-stage 60   the same with every hero at a level (pick a stage where the average team wins about half)
//   npm run balance -- --heroes-only --hero-grade 3 --hero-stage 14   the same with every hero merged up (grade 2, 3 or 4: the tier skills, `tierSkills.ts`)
//   npm run balance -- --heroes-only --hero-grade 4 --tier-cap 3 ...   the same, every hero casting no higher than its tier 3 skill (to set tier 4 against it; `tools/rank4/` measures each hero's step)
//   npm run balance -- --saves 200     fresh saves in the whole-run table (default 400)
//   npm run balance -- --heroes-only  only the hero value table (table 1); --json file.json also writes each hero's win rate and lift; --seed-offset n plays other fights
//   npm run balance -- --runs-only     only the whole-run table (quicker when tuning the levels)
//   npm run balance -- --armies-only   only the armies' tables (win rate per wave at given hero levels, and the climb through them)
//   npm run balance -- --only orcs,undead --levels 1,5,10 --party starters   a few armies, levels or one party
//   npm run balance -- --attempts 40   attempts a cell plays in the armies' first table (default 30)
//   npm run balance -- --no-tables --tiers --levels 8,14,20   table 5e: each army on each difficulty tier (recruits, maxed castle, gear)
//   npm run balance -- --no-tables --deep --levels 30,40,60,100 --attempts 10 [--talents] [--tiers-at 2,3]   table 5f: mean tries to clear each army on the top tiers at deep hero levels
//   npm run balance -- --no-tables --stand --levels 1,10,20 --attempts 30   the Last Stand held by a greedy player (`tools/stand-balance.ts`; `--tower` is the same, the Tower's old name)
//   npm run balance -- --no-tables --climb --saves 60   the realistic climb (recruits, castle, gear), table 5c; `--maxed` plays 5d, a full castle
//
// Four tables: each hero's value (its win rate in random five-hero teams with it, against the same teams without it),
// each foe band at four stage strengths, the stage curve from 1 to 15 with grade-1, grade-2 and grade-3 teams, and whole
// runs (a greedy player on fresh saves, carrying the hero levels from run to run). Every fight is seeded, so the same
// numbers come out again on the same code.

import { fight, place, playOut } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { chooseOption, leaveEvent } from '../src/sim/events';
import { fightXp, gainXp, levelOfKind } from '../src/sim/levels';
import { BUILDINGS, maxLevel, newCastle, nextCost, upgrade, xpRate, type BuildingId, type Castle } from '../src/sim/castle';
import { startedMeta, heroRank, rankMult, stonesOf, useStones, type Meta } from '../src/sim/meta';
import { boostOf, bandFor, finish, isBossStage, newRun, type Owned, type Run, SQUAD, stageBoost, startStage, summon } from '../src/sim/run';
import { autoMerge } from '../src/sim/merge';
import { awakenStats, awaken } from '../src/sim/awaken';
import { ARMIES, armyById, settleWave } from '../src/sim/armies';
import { TIERS } from '../src/sim/tiers';
import { playArmy, savedAt } from './autoplay';
import { calamityTable } from './tower-balance';
import { standTable } from './stand-balance';
import { ratingOf } from '../src/sim/stars';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES, HEROES, UNITS } from '../src/sim/units';
import { deploySpots, fieldBoost, pickTeam, play } from './heroSweep';
import { CLASS_NAMES, CLASS_OF, type StarterClass } from '../src/sim/starter';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { writeFileSync } from 'node:fs';
import { capTiers } from './rank4/cap';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 4000);
/** Added to every seed of the hero table, to check a tuning on fights it was not tuned on (`--seed-offset 100000`). */
const SEED_OFFSET = process.argv.includes('--seed-offset') ? Number(process.argv[process.argv.indexOf('--seed-offset') + 1]) | 0 : 0;
const CELL_GAMES = Math.max(200, Math.round(GAMES / 4));
const SAVES = arg('--saves', 400);
/** The stage the hero table is played at. */
const HERO_STAGE = arg('--hero-stage', 5);
/** The level every hero fights at in the hero table (`--hero-level 60`; a stage that suits it is picked with `--hero-stage`). */
const HERO_LEVEL = arg('--hero-level', 1);
const HERO_GRADE = arg('--hero-grade', 1);
// (`--tier-cap 3`: every hero casts its tier 3 skill at grade 4, as it did before tier 4 was added)
if (process.argv.includes('--tier-cap')) capTiers(ALL_HEROES, arg('--tier-cap', 4));
const RUNS_ONLY = process.argv.includes('--runs-only');
const ARMIES_ONLY = process.argv.includes('--armies-only');
const HEROES_ONLY = process.argv.includes('--heroes-only');
const BANDS = FIELD_BANDS;

const pct = (w: number, n: number) => (n ? (100 * w) / n : 0);
const f1 = (x: number) => x.toFixed(1).padStart(6);
const pad = (s: string, n: number) => s.padEnd(n);
const rpad = (s: string, n: number) => s.padStart(n);

// ---- 1. Hero value -------------------------------------------------------------------------------------------------
// Each game is a random team on one of the six bands (the stage-1 strength, so the bands are even). Each hero is scored
// on every game: its win rate in the teams that had it, against the teams that did not.

function heroValue(): void {
  interface HeroTally {
    inN: number;
    inW: number;
    outN: number;
    outW: number;
    dealt: number;
    taken: number;
    fights: number;
  }
  const tally = new Map<string, HeroTally>(ALL_HEROES.map((h) => [h, { inN: 0, inW: 0, outN: 0, outW: 0, dealt: 0, taken: 0, fights: 0 }]));
  for (let g = 0; g < GAMES; g++) {
    const seed = g + 1 + SEED_OFFSET;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const r = play(seed, BANDS[g % BANDS.length], fieldBoost(HERO_STAGE), team, HERO_GRADE, HERO_LEVEL);
    for (const h of ALL_HEROES) {
      const t = tally.get(h)!;
      if (team.includes(h)) {
        t.inN++;
        t.inW += r.won ? 1 : 0;
        t.dealt += r.dealt.get(h) ?? 0;
        t.taken += r.taken.get(h) ?? 0;
        t.fights++;
      } else {
        t.outN++;
        t.outW += r.won ? 1 : 0;
      }
    }
  }
  const withRates = ALL_HEROES.map((h) => pct(tally.get(h)!.inW, tally.get(h)!.inN));
  const average = withRates.reduce((a, b) => a + b, 0) / withRates.length;

  console.log(`\n1. HERO VALUE  (${GAMES} random five-hero teams, six bands in turn, stage ${HERO_STAGE} foes, every hero at level ${HERO_LEVEL}, grade ${HERO_GRADE})\n`);
  console.log(
    [pad('hero', 16), rpad('with %', 8), rpad('without %', 11), rpad('value', 8), rpad('vs avg', 8), rpad('dealt', 8), rpad('taken', 8)].join(''),
  );
  ALL_HEROES.forEach((h, i) => {
    const t = tally.get(h)!;
    const w = withRates[i];
    const flag = Math.abs(w - average) > 8 ? '  <- off' : '';
    console.log(
      [
        pad(UNITS[h].name, 16),
        rpad(f1(w), 8),
        rpad(f1(pct(t.outW, t.outN)), 11),
        rpad(f1(w - pct(t.outW, t.outN)), 8),
        rpad(f1(w - average), 8),
        rpad((t.dealt / Math.max(1, t.fights)).toFixed(0), 8),
        rpad((t.taken / Math.max(1, t.fights)).toFixed(0), 8),
      ].join('') + flag,
    );
  });
  console.log(`  average win rate with a hero: ${average.toFixed(1)}%  (value: with minus without; dealt and taken: hp per fight)`);
  console.log('  lift against the roster average (points of win rate; every hero is held to within 6), by role:');
  const over = ALL_HEROES.filter((_, i) => Math.abs(withRates[i] - average) > 6);
  for (const c of Object.keys(CLASS_NAMES) as StarterClass[]) {
    const line = ALL_HEROES.map((h, i) => [h, withRates[i]] as const)
      .filter(([h]) => CLASS_OF[h] === c)
      .map(([h, w]) => `${UNITS[h].name} ${w - average >= 0 ? '+' : ''}${(w - average).toFixed(1)}`);
    if (line.length) console.log(`    ${pad(CLASS_NAMES[c], 12)} ${line.join(', ')}`);
  }
  console.log(`  heroes beyond 6 points of the average: ${over.length ? over.map((h) => UNITS[h].name).join(', ') : 'none'}`);
  const best = Math.max(...withRates);
  const worst = Math.min(...withRates);
  console.log(`  spread: ${worst.toFixed(1)}% to ${best.toFixed(1)}%  (${(best - worst).toFixed(1)} points between the best and the worst)`);
  const json = process.argv.indexOf('--json');
  if (json >= 0) writeFileSync(process.argv[json + 1], JSON.stringify({ games: GAMES, stage: HERO_STAGE, average, heroes: ALL_HEROES.map((h, i) => ({ kind: h, name: UNITS[h].name, with: withRates[i], lift: withRates[i] - average })) }, null, 1));
}

// ---- 2. Foe bands ----------------------------------------------------------------------------------------------------
// Each band at four stage strengths (stage 1, 5, 10, 15: the same band, boosted as that stage's foes are), against
// grade-1 teams drawn as above.

function foeBands(): void {
  const STAGES = [1, 5, 10, 15];
  console.log(`\n2. FOE BANDS  (heroes' win % with random grade-1 teams, ${CELL_GAMES} fights a cell)\n`);
  console.log([pad('band', 12), ...STAGES.map((s) => rpad(`stage ${s}`, 10))].join(''));
  for (const band of BANDS) {
    const cells = STAGES.map((s) => {
      let w = 0;
      for (let g = 0; g < CELL_GAMES; g++) {
        const seed = g + 1;
        const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
        if (play(mixSeed(seed, 0x57a6e, s), band, fieldBoost(s), team).won) w++;
      }
      return rpad(f1(pct(w, CELL_GAMES)), 10);
    });
    console.log([pad(band, 12), ...cells].join(''));
  }
}

// ---- 3. Stage curve ------------------------------------------------------------------------------------------------
// Stages 1 to 15, as a run meets them: the band in turn, boss stages marked. Grade 1 is a fresh team; grade 2 is the
// same team merged once, grade 3 merged twice (every hero's hp and attack x1.6 for each grade above the first).

function stageCurve(): void {
  const GRADES = [1, 2, 3];
  console.log(`\n3. STAGE CURVE  (heroes' win %, ${CELL_GAMES} fights a stage, the same random teams at each grade)\n`);
  console.log([pad('stage', 7), pad('band', 12), pad('', 6), ...GRADES.map((g) => rpad(`grade ${g}`, 9))].join(''));
  for (let s = 1; s <= 15; s++) {
    const wins = GRADES.map(() => 0);
    for (let g = 0; g < CELL_GAMES; g++) {
      const seed = mixSeed(g + 1, 0x57a6e, s);
      const team = pickTeam(new Rng(mixSeed(g + 1, 0x7ea4)));
      GRADES.forEach((grade, i) => {
        if (play(seed, bandFor(s), stageBoost(s), team, grade).won) wins[i]++;
      });
    }
    console.log([pad(String(s), 7), pad(bandFor(s), 12), pad(isBossStage(s) ? 'boss' : '', 6), ...wins.map((w) => rpad(f1(pct(w, CELL_GAMES)), 9))].join(''));
  }
}

// ---- 4. Whole runs -------------------------------------------------------------------------------------------------
// A greedy player on a fresh save plays runs in a row, carrying the hero levels (and XP) from each to the next, as the
// game does. Each stage: the first option of an event (leaving when it can't be taken), a summon whenever one is
// affordable, the five strongest heroes fielded on the deploy rows, then the fight (the run's own stage, boost, castle and
// event buffs, as `startStage` makes it). It buys no castle upgrades, recruits nothing (so a run's pool is the five starting
// heroes) and equips no gear. A run ends on a lost fight; `run.best` is the furthest stage fought.

const RUNS = arg('--runs', 12);
// (`--castle stable=5,library=5` plays the whole-run table with those castle levels, to see what an upgrade does to the climb)
const CASTLE: Castle = newCastle();
if (process.argv.includes('--castle'))
  for (const kv of process.argv[process.argv.indexOf('--castle') + 1].split(',')) {
    const [id, n] = kv.split('=');
    if (id in CASTLE) CASTLE[id as keyof Castle] = Math.max(0, Math.min(maxLevel(id as keyof Castle), Number(n)));
  }
const MAX_STAGE = 60;

/** How strong a hero is for the squad: its base hp times attack, times its boosts (grade, rank, level, gear, bumps). */
function strengthOf(meta: Meta, h: Owned): number {
  const def = UNITS[h.kind];
  const boost = boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), awakenStats(meta, h.kind));
  return def.hp * def.atk * (boost.hp ?? 1) * (boost.atk ?? 1);
}

/** One whole run for a save: returns the furthest stage fought. The XP of every fight goes into the save's meta. */
function playRun(meta: Meta, seed: number): number {
  const run: Run = newRun(seed, HEROES, { ...CASTLE });
  while (!run.over && run.stage <= MAX_STAGE) {
    while (run.event) if (chooseOption(run, 0) === null) leaveEvent(run);
    // (summons while the gold lasts, merging every pair as the Auto merge button does)
    autoMerge(run);
    while (summon(run)) autoMerge(run);
    const squad = [...run.roster].sort((a, b) => strengthOf(meta, b) - strengthOf(meta, a)).slice(0, SQUAD);
    run.squad = squad.map((h) => h.id);
    const b = startStage(run);
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a, run.stage)));
    squad.forEach((h, i) => place(b, h.kind, spots[i][0], spots[i][1], h.id, boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), awakenStats(meta, h.kind))));
    fight(b);
    playOut(b);
    finish(run, b.phase === 'won', ratingOf(b, isBossStage(run.stage)).stars);
    gainXp(meta, fightXp(b, xpRate(CASTLE)));
  }
  return run.best;
}

/** The bosses the table reports on: each boss stage's furthest-stage threshold (a save that won the boss fought beyond it). */
const BOSS_STAGES = [5, 10, 15, 20, 25, 30];

function wholeRuns(): void {
  // per run number: the furthest stage of each save, and the sum of each kind's level after it
  const best: number[][] = Array.from({ length: RUNS }, () => []);
  const levelSum: Record<string, number>[] = Array.from({ length: RUNS }, () => Object.fromEntries(HEROES.map((k) => [k, 0])));
  for (let save = 1; save <= SAVES; save++) {
    const meta = startedMeta(save);
    for (let r = 0; r < RUNS; r++) {
      best[r].push(playRun(meta, mixSeed(save, 0x7a0c, r)));
      for (const k of HEROES) levelSum[r][k] += levelOfKind(meta, k);
    }
  }
  console.log(`\n4. WHOLE RUNS  (a greedy player on ${SAVES} fresh saves, ${RUNS} runs in a row, levels carried between them)\n`);
  console.log([pad('run', 5), rpad('median', 8), rpad('mean', 8), ...BOSS_STAGES.map((b) => rpad(`beat ${b}`, 9))].join('') + '   (% of runs that fought past the stage)');
  for (let r = 0; r < RUNS; r++) {
    const n = best[r].length;
    const sorted = [...best[r]].sort((a, b) => a - b);
    const median = sorted[Math.floor(n / 2)];
    const mean = best[r].reduce((a, b) => a + b, 0) / n;
    console.log(
      [pad(`${r + 1}`, 5), rpad(String(median), 8), rpad(mean.toFixed(1), 8), ...BOSS_STAGES.map((b) => rpad(f1(pct(best[r].filter((s) => s > b).length, n)), 9))].join(''),
    );
  }
  console.log(`\n  mean level of each starting kind after each run (all saves; a kind not summoned stays at its level)\n`);
  console.log([pad('run', 5), ...HEROES.map((k) => rpad(UNITS[k].name.split(' ').pop()!, 10))].join(''));
  for (let r = 0; r < RUNS; r++) console.log([pad(`${r + 1}`, 5), ...HEROES.map((k) => rpad((levelSum[r][k] / best[r].length).toFixed(1), 10))].join(''));
}

// ---- 5. Armies -----------------------------------------------------------------------------------------------------
// An army is a campaign of waves, fought by a run: the greedy player of table 4, from wave 1, on the party's kinds. A lost
// fight sends the army back to wave 1 (the XP stays). Table 5a: the party's heroes all at one level, how many attempts
// win each wave (as a share of the attempts, so each column is the chance of getting that far). Table 5b: a fresh save
// fights the armies in order, trying each until it falls (at most `MAX_TRIES`), levels carried from try to try; it shows
// how many tries each took and the levels it had.

const ATTEMPTS = arg('--attempts', 30);
const flag = (name: string): string | undefined => process.argv[process.argv.indexOf(name) + 1];
const LEVELS = process.argv.includes('--levels') ? flag('--levels')!.split(',').map(Number) : [1, 3, 5, 8, 11, 14, 17, 20];
// (`--set orcs.last.hp=4000,orcs.growth=0.2` overrides an army's numbers for this run only, for tuning)
if (process.argv.includes('--set'))
  for (const kv of flag('--set')!.split(',')) {
    const [path, val] = kv.split('=');
    const [id, ...keys] = path.split('.');
    let o: any = armyById(id)!;
    for (const k of keys.slice(0, -1)) o = o[k];
    o[keys[keys.length - 1]] = Number(val);
  }
// (`--tier 3:hp=4,atk=3` overrides a difficulty tier's foe multipliers for this run only, to try a harder tier: 0 Normal to 3 Legendary)
if (process.argv.includes('--tier'))
  for (const spec of flag('--tier')!.split(';')) {
    const [i, kvs] = spec.split(':');
    for (const kv of kvs.split(',')) {
      const [k, v] = kv.split('=');
      (TIERS[Number(i)] as unknown as Record<string, number>)[k] = Number(v);
    }
  }
const ONLY = process.argv.includes('--only') ? flag('--only')!.split(',') : null;
const SKIP_PARTY = process.argv.includes('--party') ? flag('--party') : null;
const MAX_TRIES = 25;
/** A party of recruits (drawn by the recruiting), the other of the five starting heroes. */
const PARTIES: Record<string, readonly string[]> = { starters: HEROES, recruits: ['knight', 'paladin', 'archer', 'warlock', 'cleric'] };

function armies(): void {
  for (const [name, party] of Object.entries(PARTIES).filter(([n]) => !SKIP_PARTY || n === SKIP_PARTY)) {
    console.log(`\n5a. ARMIES BY WAVE  (${name}: ${party.map((k) => UNITS[k].name).join(', ')}; every hero at the level shown; ${ATTEMPTS} attempts a cell; % of attempts that won each wave)\n`);
    for (const army of ARMIES.filter((a) => !ONLY || ONLY.includes(a.id))) {
      const n = army.waves.length;
      const bosses = army.waves.map((w, i) => (w.boss ? i + 1 : 0)).filter(Boolean);
      console.log(`${army.name}  (${n} waves; bosses at ${bosses.join(', ')})`);
      console.log([pad('  level', 8), ...army.waves.map((_, i) => rpad(`w${i + 1}${army.waves[i].boss ? '*' : ''}`, 6)), rpad('clear', 7)].join(''));
      for (const L of LEVELS) {
        const wins = army.waves.map(() => 0);
        let clears = 0;
        for (let a = 0; a < ATTEMPTS; a++) {
          const r = playArmy(savedAt(L, party, a + 1), army.id, mixSeed(a + 1, 0xa44e, ARMIES.indexOf(army)), party, CASTLE);
          for (let w = 0; w < r.won; w++) wins[w]++;
          if (r.cleared) clears++;
        }
        console.log([pad(`  ${L}`, 8), ...wins.map((w) => rpad(f1(pct(w, ATTEMPTS)).trim(), 6)), rpad(f1(pct(clears, ATTEMPTS)).trim(), 7)].join(''));
      }
    }
  }
  console.log(`\n5b. THE CLIMB THROUGH THE ARMIES  (${SAVES} fresh saves on the starting five, each army tried until it falls, at most ${MAX_TRIES} tries; no castle, no recruits)\n`);
  console.log([pad('army', 16), rpad('cleared %', 11), rpad('tries (mean)', 14), rpad('tries (median)', 16), rpad('first try: wave', 17), rpad('level on first try', 20), rpad('crowns (1st clear)', 20)].join(''));
  const stats = ARMIES.map(() => ({ tries: [] as number[], clear: 0, first: 0, lv: 0, seen: 0, crowns: 0 }));
  for (let save = 1; save <= SAVES; save++) {
    const meta = startedMeta(save);
    for (let i = 0; i < ARMIES.length; i++) {
      const army = ARMIES[i];
      let tries = 0;
      let cleared = false;
      const st = stats[i];
      const pay = { crowns: 0 };
      while (tries < MAX_TRIES && !cleared) {
        const lv = HEROES.reduce((n, k) => n + levelOfKind(meta, k), 0) / HEROES.length;
        const r = playArmy(meta, army.id, mixSeed(save, 0xc11b, i * 100 + tries), HEROES);
        // (the rewards a first clear pays, as the page settles them)
        for (let w = 1; w <= r.won; w++) pay.crowns += settleWave(meta, army.id, w, true, 0).crowns;
        if (tries === 0) {
          st.first += r.won;
          st.lv += lv;
          st.seen++;
        }
        tries++;
        cleared = r.cleared;
      }
      if (!cleared) break;
      st.clear++;
      st.tries.push(tries);
      st.crowns += pay.crowns;
    }
  }
  ARMIES.forEach((army, i) => {
    const st = stats[i];
    const sorted = [...st.tries].sort((a, b) => a - b);
    console.log(
      [
        pad(army.name, 16),
        rpad(f1(pct(st.clear, SAVES)).trim(), 11),
        rpad(st.tries.length ? (st.tries.reduce((a, b) => a + b, 0) / st.tries.length).toFixed(1) : '-', 14),
        rpad(st.tries.length ? String(sorted[Math.floor(sorted.length / 2)]) : '-', 16),
        rpad(st.seen ? (st.first / st.seen).toFixed(1) : '-', 17),
        rpad(st.seen ? (st.lv / st.seen).toFixed(1) : '-', 20),
        rpad(st.clear ? String(Math.round(st.crowns / st.clear)) : '-', 20),
      ].join(''),
    );
  });
}

// ---- 6. The realistic climb -------------------------------------------------------------------------------------------
// (`--climb`, with `--saves 60` or so.) A player who plays as the page lets them: a fresh save fights the armies in order, trying
// each until it falls. Between tries it spends the crowns it has: `CASTLE_SHARE` on the castle (barracks, armoury, library,
// treasury and stable, the lowest building first) and the rest on single recruits; it fields the five best heroes it owns (higher
// ranks and levels first), dresses them with the gear its runs find, and the XP and levels carry over.
const CASTLE_SHARE = 0.5;
const SPEND: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable'];

/** The five heroes a player would take out: the kinds ranked by hp x attack x their rank and level (a little extra for a shooter). */
function bestParty(meta: Meta): string[] {
  const score = (k: string) => UNITS[k].hp * UNITS[k].atk * rankMult(heroRank(meta, k)) * (1 + 0.1 * levelOfKind(meta, k)) * (UNITS[k].range > 1 ? 1.15 : 1);
  return [...meta.unlocked].sort((a, b) => score(b) - score(a) || a.localeCompare(b)).slice(0, 5);
}

/** Whether the castle is still shut to the climb: fewer than five armies cleared (the star unlock, `modeUnlock.ts`). */
const castleShut = (meta: Meta): boolean => !process.argv.includes('--castle-open') && ARMIES.filter((a) => (meta.armies[a.id]?.clears ?? 0) > 0).length < 5;

/** Spends the crowns: the castle's share on upgrades (the lowest of the five buildings first), the rest on recruits. */
function spendCrowns(meta: Meta): void {
  // (the castle is shut until 10 army stars: about two a cleared army, so after the fifth; `--castle-open` plays it open from the start, as before)
  let castleBudget = castleShut(meta) ? 0 : Math.floor(meta.crowns * CASTLE_SHARE);
  for (;;) {
    const id = [...SPEND].sort((a, b) => meta.castle[a] - meta.castle[b])[0];
    const cost = nextCost(meta.castle, id);
    if (cost === null || cost > castleBudget || cost > meta.crowns) break;
    castleBudget -= cost;
    upgrade(meta, id);
  }
  // (the sweeps turn spare crowns into stones at the old pull price and use them at once: they measure fights, not the pace of the shop)
  const bought = Math.floor(meta.crowns / 100);
  meta.crowns -= bought * 100;
  meta.stones = stonesOf(meta) + bought;
  while (stonesOf(meta) > 0) useStones(meta, 1);
  // (a player awakens a hero as soon as its shards allow; `--no-awaken` plays the climb as it was before awakening, to compare)
  // (`--force-awaken` is the worst case for the check: the five best heroes are at both steps from the start of the climb; `--force-rank4` is its control, the same heroes at the top shard rank only)
  if (process.argv.includes('--force-rank4')) for (const k of bestParty(meta)) meta.shards[k] = Math.max(meta.shards[k] ?? 0, 10);
  else if (process.argv.includes('--force-awaken')) for (const k of bestParty(meta)) ((meta.shards[k] = Math.max(meta.shards[k] ?? 0, 26)), ((meta.awakened ??= {})[k] = 2));
  else if (!process.argv.includes('--no-awaken')) for (const k of meta.unlocked) while (awaken(meta, k)) { /* every step it can pay */ }
}

function realClimb(): void {
  console.log(`\n5c. THE REALISTIC CLIMB  (${SAVES} fresh saves; recruits, a castle grown from the crowns each try pays (${CASTLE_SHARE * 100}% of what it has), gear, levels carried; at most ${MAX_TRIES} tries an army)\n`);
  console.log([pad('army', 20), rpad('cleared %', 11), rpad('tries (mean)', 14), rpad('median', 8), rpad('90th', 6), rpad('party level', 13), rpad('castle lvls', 13), rpad('heroes owned', 14)].join(''));
  const stats = ARMIES.map(() => ({ tries: [] as number[], clear: 0, lv: 0, castle: 0, owned: 0, seen: 0 }));
  for (let save = 1; save <= SAVES; save++) {
    const meta = startedMeta(save);
    for (let i = 0; i < ARMIES.length; i++) {
      const army = ARMIES[i];
      let tries = 0;
      let cleared = false;
      const st = stats[i];
      while (tries < MAX_TRIES && !cleared) {
        spendCrowns(meta);
        const party = bestParty(meta);
        if (tries === 0) {
          st.lv += party.reduce((n, k) => n + levelOfKind(meta, k), 0) / party.length;
          st.castle += Object.values(meta.castle).reduce((n, v) => n + v, 0);
          st.owned += meta.unlocked.length;
          st.seen++;
        }
        const r = playArmy(meta, army.id, mixSeed(save, 0xc11c, i * 100 + tries), party, { ...meta.castle }, true);
        for (let w = 1; w <= r.won; w++) settleWave(meta, army.id, w, true, 0);
        tries++;
        cleared = r.cleared;
      }
      if (!cleared) break;
      st.clear++;
      st.tries.push(tries);
    }
  }
  ARMIES.forEach((army, i) => {
    const st = stats[i];
    const sorted = [...st.tries].sort((a, b) => a - b);
    const n = Math.max(1, st.seen);
    console.log(
      [
        pad(army.name, 20),
        rpad(f1(pct(st.clear, SAVES)).trim(), 11),
        rpad(st.tries.length ? (st.tries.reduce((a, b) => a + b, 0) / st.tries.length).toFixed(1) : '-', 14),
        rpad(st.tries.length ? String(sorted[Math.floor(sorted.length / 2)]) : '-', 8),
        rpad(st.tries.length ? String(sorted[Math.floor(sorted.length * 0.9)]) : '-', 6),
        rpad((st.lv / n).toFixed(1), 13),
        rpad((st.castle / n).toFixed(1), 13),
        rpad((st.owned / n).toFixed(1), 14),
      ].join(''),
    );
  });
}

/** The maxed castle (every building at its top) at the party levels in `--levels`: no army may fall to it trivially. */
function maxedCastle(): void {
  const maxed = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
  console.log(`\n5d. A MAXED CASTLE  (the starting five, every hero at the level shown, every building at its top; ${ATTEMPTS} attempts a cell; % of attempts that cleared the army)\n`);
  console.log([pad('level', 8), ...ARMIES.map((a) => rpad(a.id, 11))].join(''));
  for (const L of LEVELS) {
    const row = ARMIES.map((army, i) => {
      let clears = 0;
      for (let a = 0; a < ATTEMPTS; a++) if (playArmy(savedAt(L, HEROES, a + 1), army.id, mixSeed(a + 1, 0xa44f, i), HEROES, maxed).cleared) clears++;
      return rpad(f1(pct(clears, ATTEMPTS)).trim(), 11);
    });
    console.log([pad(`${L}`, 8), ...row].join(''));
  }
}

/**
 * 5e. THE TIERS: the recruits' party with a maxed castle and the gear its runs find, at the levels in `--levels`, against each army on each tier:
 * the % of attempts that cleared, and the mean stars of a clear (Normal 3 at most). Legendary should need a strong, levelled, evolved team.
 */
function tiers(): void {
  const maxed = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
  const party = PARTIES.recruits;
  console.log(`\n5e. THE DIFFICULTY TIERS  (${party.map((k) => UNITS[k].name).join(', ')}; every hero at the level shown, a maxed castle, gear dressed; ${ATTEMPTS} attempts a cell; clear % / mean stars of a clear)\n`);
  for (const army of ARMIES.filter((a) => !ONLY || ONLY.includes(a.id))) {
    console.log(`${army.name}`);
    console.log([pad('  level', 8), ...TIERS.map((t) => rpad(t.name, 16))].join(''));
    for (const L of LEVELS) {
      const cells = TIERS.map((_, t) => {
        let clears = 0;
        let stars = 0;
        for (let a = 0; a < ATTEMPTS; a++) {
          const r = playArmy(savedAt(L, party, a + 1), army.id, mixSeed(a + 1, 0xa450, ARMIES.indexOf(army) * 10 + t), party, maxed, true, t);
          if (r.cleared) {
            clears++;
            stars += r.stars;
          }
        }
        return rpad(`${f1(pct(clears, ATTEMPTS)).trim()} / ${clears ? (stars / clears).toFixed(1) : '-'}`, 16);
      });
      console.log([pad(`  ${L}`, 8), ...cells].join(''));
    }
  }
}

/**
 * 5f. THE DEEP LEVELS: the recruits' party at the levels in `--levels` (say 30,40,60,100), a maxed castle, the gear its runs find and (with `--talents`) every
 * talent row its level opens (the first of each pair), against each army on `--tiers-at` (default Elite and Legendary): the mean tries to clear it (a fresh save
 * each time, at most `MAX_TRIES`) and the share that cleared. Heroes at 100 should find the top tiers easier, but not trivial.
 */
function deepLevels(): void {
  const maxed = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
  const party = PARTIES.recruits;
  const tiersAt = process.argv.includes('--tiers-at') ? flag('--tiers-at')!.split(',').map(Number) : [2, 3];
  const talents = process.argv.includes('--talents');
  const dress = (meta: Meta): void => {
    if (!talents) return;
    for (const k of party) {
      if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
      // (the points are the level's own, no shards, so the hero's rank is not raised by the test; the first of each pair that opens, and a row the level has not opened stays shut)
      for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
    }
  };
  console.log(`\n5f. THE DEEP LEVELS  (${party.map((k) => UNITS[k].name).join(', ')}; every hero at the level shown, a maxed castle, gear dressed${talents ? ', talents learned' : ', no talents'}; ${ATTEMPTS} fresh saves a cell, at most ${MAX_TRIES} tries; mean tries (clear %))\n`);
  for (const t of tiersAt) {
    console.log(`${TIERS[t].name}`);
    console.log([pad('  army', 22), ...LEVELS.map((L) => rpad(`Lv ${L}`, 16))].join(''));
    for (const army of ARMIES.filter((a) => !ONLY || ONLY.includes(a.id))) {
      const cells = LEVELS.map((L) => {
        let tries = 0;
        let cleared = 0;
        for (let save = 1; save <= ATTEMPTS; save++) {
          const meta = savedAt(L, party, save);
          dress(meta);
          const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
          let n = 0;
          let ok = false;
          while (n < MAX_TRIES && !ok) {
            ok = playArmy(meta, army.id, mixSeed(save, 0xd33b, ARMIES.indexOf(army) * 100 + t * 10 + n), party, maxed, true, t, talents ? boostFor : undefined).cleared;
            n++;
          }
          tries += n;
          if (ok) cleared++;
        }
        return rpad(`${(tries / ATTEMPTS).toFixed(1)} (${f1(pct(cleared, ATTEMPTS)).trim()}%)`, 16);
      });
      console.log([pad(`  ${army.name}`, 22), ...cells].join(''));
    }
  }
}

if (process.argv.includes('--no-tables')) {
  // (only the climbs asked for below)
} else if (HEROES_ONLY) {
  heroValue();
} else if (ARMIES_ONLY) {
  armies();
} else {
  if (!RUNS_ONLY) {
    heroValue();
    foeBands();
    stageCurve();
  }
  wholeRuns();
  armies();
}
if (process.argv.includes('--stand') || process.argv.includes('--tower')) standTable();
if (process.argv.includes('--calamity')) calamityTable();
if (process.argv.includes('--climb')) realClimb();
if (process.argv.includes('--maxed')) maxedCastle();
if (process.argv.includes('--tiers')) tiers();
if (process.argv.includes('--deep')) deepLevels();
console.log('');
