// The balance report: plays many headless fights with the sim and prints how strong each hero, foe band and stage is,
// and how a greedy player fares over whole runs. Run it with `npm run balance` (tools/balance.mjs bundles this file with
// esbuild, as test.mjs does for the tests).
//
//   npm run balance                    the default number of fights (4000 for the heroes; a quarter of that per cell)
//   npm run balance -- --games 800     fewer fights, quicker and noisier
//   npm run balance -- --hero-stage 1  play the hero table at another stage (default 5)
//   npm run balance -- --saves 200     fresh saves in the whole-run table (default 400)
//   npm run balance -- --runs-only     only the whole-run table (quicker when tuning the levels)
//   npm run balance -- --armies-only   only the armies' tables (win rate per wave at given hero levels, and the climb through them)
//   npm run balance -- --only orcs,undead --levels 1,5,10 --party starters   a few armies, levels or one party
//   npm run balance -- --attempts 40   attempts a cell plays in the armies' first table (default 30)
//
// Four tables: each hero's value (its win rate in random five-hero teams with it, against the same teams without it),
// each foe band at four stage strengths, the stage curve from 1 to 15 with grade-1, grade-2 and grade-3 teams, and whole
// runs (a greedy player on fresh saves, carrying the hero levels from run to run). Every fight is seeded, so the same
// numbers come out again on the same code.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, startBattle, stepBattle, type Battle, type Stage } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { chooseOption, leaveEvent } from '../src/sim/events';
import { fightXp, gainXp, levelOfKind } from '../src/sim/levels';
import { maxLevel, newCastle, xpRate, type Castle } from '../src/sim/castle';
import { newMeta, rankOf, rarityOf, RARITY_NAMES, type Meta } from '../src/sim/meta';
import { boostOf, bandFor, finish, gradeBoost, isBossStage, newRun, type Owned, type Run, SQUAD, stageBoost, startStage, summon } from '../src/sim/run';
import { ARMIES, armyById, settleWave } from '../src/sim/armies';
import { playArmy, savedAt } from './autoplay';
import { ratingOf } from '../src/sim/stars';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES, HEROES, UNITS } from '../src/sim/units';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 4000);
const CELL_GAMES = Math.max(200, Math.round(GAMES / 4));
const SAVES = arg('--saves', 400);
const TEAM = 5;
/** The stage the hero table is played at. */
const HERO_STAGE = arg('--hero-stage', 5);
const RUNS_ONLY = process.argv.includes('--runs-only');
const ARMIES_ONLY = process.argv.includes('--armies-only');
const BANDS = FIELD_BANDS;

/** The boost of a field band at stage s: a field band has no boss, even on a boss stage. */
const fieldBoost = (s: number): Stage => ({ ...stageBoost(s), boss: undefined });

/** A random team of `TEAM` different hero kinds (from every hero there is). */
function pickTeam(rng: Rng): string[] {
  const pool = [...ALL_HEROES];
  const team: string[] = [];
  for (let i = 0; i < TEAM; i++) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return team;
}

/** The deploy tiles (the heroes' rows), shuffled by the side stream `rng`, so a team lands at random. */
function deploySpots(b: Battle, rng: Rng): [number, number][] {
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots;
}

interface Played {
  won: boolean;
  /** Damage each hero kind dealt, and took, in this fight. */
  dealt: Map<string, number>;
  taken: Map<string, number>;
}

/**
 * One fight: the foes of `band` (boosted by `foes`) against `team`, placed at random on the heroes' rows, every hero at
 * `grade` (1 = plain, 2 = merged once). The placing draws from a side stream of the seed, so it is the same every time.
 */
function play(seed: number, band: string, foes: Stage, team: string[], grade = 1): Played {
  const b = startBattle(seed, band, foes);
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  // (each hero carries its tier's multiplier, so the hero values spread by tier on purpose)
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(grade, 0, 1, id)));
  const out: Played = { won: false, dealt: new Map(), taken: new Map() };
  // (the events name fighters by id; a fighter can be added mid-fight, so look each one up as it comes)
  const unitOf = (id: number) => b.units.find((x) => x.id === id)!;
  fight(b);
  while (b.phase === 'fight') {
    for (const e of stepBattle(b)) {
      if (e.kind !== 'hit') continue;
      const by = unitOf(e.by);
      const to = unitOf(e.to);
      if (UNITS[by.def].side === 'hero' && UNITS[to.def].side === 'foe') out.dealt.set(by.def, (out.dealt.get(by.def) ?? 0) + e.dmg);
      if (UNITS[to.def].side === 'hero' && UNITS[by.def].side === 'foe') out.taken.set(to.def, (out.taken.get(to.def) ?? 0) + e.dmg);
    }
  }
  out.won = b.phase === 'won';
  return out;
}

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
    const seed = g + 1;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const r = play(seed, BANDS[g % BANDS.length], fieldBoost(HERO_STAGE), team);
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

  console.log(`\n1. HERO VALUE  (${GAMES} random five-hero teams, six bands in turn, stage ${HERO_STAGE} foes)\n`);
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
  console.log('  by tier (mean win % with a hero of it):');
  for (const r of [1, 2, 3, 4, 5] as const) {
    const at = ALL_HEROES.map((h, i) => [h, withRates[i]] as const).filter(([h]) => rarityOf(h) === r);
    if (at.length) console.log(`    ${pad(RARITY_NAMES[r], 10)} ${f1(at.reduce((n, [, w]) => n + w, 0) / at.length)}  (${at.length} heroes)`);
  }
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
  const boost = boostOf(h, rankOf(meta, h.kind), levelOfKind(meta, h.kind));
  return def.hp * def.atk * (boost.hp ?? 1) * (boost.atk ?? 1);
}

/** One whole run for a save: returns the furthest stage fought. The XP of every fight goes into the save's meta. */
function playRun(meta: Meta, seed: number): number {
  const run: Run = newRun(seed, HEROES, { ...CASTLE });
  while (!run.over && run.stage <= MAX_STAGE) {
    while (run.event) if (chooseOption(run, 0) === null) leaveEvent(run);
    while (summon(run)) {
      // (summons while the gold lasts)
    }
    const squad = [...run.roster].sort((a, b) => strengthOf(meta, b) - strengthOf(meta, a)).slice(0, SQUAD);
    run.squad = squad.map((h) => h.id);
    const b = startStage(run);
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a, run.stage)));
    squad.forEach((h, i) => place(b, h.kind, spots[i][0], spots[i][1], h.id, boostOf(h, rankOf(meta, h.kind), levelOfKind(meta, h.kind))));
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
    const meta = newMeta(save);
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
const ONLY = process.argv.includes('--only') ? flag('--only')!.split(',') : null;
const SKIP_PARTY = process.argv.includes('--party') ? flag('--party') : null;
const MAX_TRIES = 25;
/** A party of recruits (rarer kinds in the mix), the other of the five starting heroes. */
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
          const r = playArmy(savedAt(L, party, a + 1), army.id, mixSeed(a + 1, 0xa44e, ARMIES.indexOf(army)), party);
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
    const meta = newMeta(save);
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

if (ARMIES_ONLY) {
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
console.log('');
