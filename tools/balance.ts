// The balance report: plays many headless fights with the sim and prints how strong each hero, foe band and stage is.
// Run it with `npm run balance` (tools/balance.mjs bundles this file with esbuild, as test.mjs does for the tests).
//
//   npm run balance                  the default number of fights (4000 for the heroes; a quarter of that per cell)
//   npm run balance -- --games 800   fewer fights, quicker and noisier
//   npm run balance -- --hero-stage 1  play the hero table at another stage (default 5)
//
// Three tables: each hero's value (its win rate in random five-hero teams with it, against the same teams without it),
// each foe band at four stage strengths, and the stage curve from 1 to 15 with grade-1, grade-2 and grade-3 teams. Every fight
// is seeded, so the same numbers come out again on the same code.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, stepBattle, type Boost, type Stage } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { bandFor, gradeBoost, isBossStage, stageBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES, UNITS } from '../src/sim/units';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 4000);
const CELL_GAMES = Math.max(200, Math.round(GAMES / 4));
const TEAM = 5;
/** The stage the hero table is played at. */
const HERO_STAGE = arg('--hero-stage', 5);
const BANDS = FIELD_BANDS;

/** A random team of `TEAM` different hero kinds (from every hero there is). */
function pickTeam(rng: Rng): string[] {
  const pool = [...ALL_HEROES];
  const team: string[] = [];
  for (let i = 0; i < TEAM; i++) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return team;
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
  const rng = new Rng(mixSeed(seed, 0xba1a));
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const boost: Boost | undefined = grade > 1 ? gradeBoost(grade) : undefined;
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, boost));
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
  const r = play(seed, BANDS[g % BANDS.length], stageBoost(HERO_STAGE), team);
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

// ---- 2. Foe bands ----------------------------------------------------------------------------------------------------
// Each band at four stage strengths (stage 1, 5, 10, 15: the same band, boosted as that stage's foes are), against
// grade-1 teams drawn as above.

const STAGES = [1, 5, 10, 15];
console.log(`\n2. FOE BANDS  (heroes' win % with random grade-1 teams, ${CELL_GAMES} fights a cell)\n`);
console.log([pad('band', 12), ...STAGES.map((s) => rpad(`stage ${s}`, 10))].join(''));
for (const band of BANDS) {
  const cells = STAGES.map((s) => {
    let w = 0;
    for (let g = 0; g < CELL_GAMES; g++) {
      const seed = g + 1;
      const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
      if (play(mixSeed(seed, 0x57a6e, s), band, stageBoost(s), team).won) w++;
    }
    return rpad(f1(pct(w, CELL_GAMES)), 10);
  });
  console.log([pad(band, 12), ...cells].join(''));
}

// ---- 3. Stage curve ------------------------------------------------------------------------------------------------
// Stages 1 to 15, as a run meets them: the band in turn, boss stages marked. Grade 1 is a fresh team; grade 2 is the
// same team merged once, grade 3 merged twice (every hero's hp and attack x1.6 for each grade above the first).

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
console.log('');
