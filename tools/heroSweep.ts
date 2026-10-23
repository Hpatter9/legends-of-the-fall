// The hero sweep: random five-hero teams on the field bands, played headless with the sim. `tools/balance.ts` prints it as
// table 1 (hero value) and `test/hero-balance.test.ts` holds every hero to the roster average. Every fight is seeded, so the
// same numbers come out again on the same code.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, stepBattle, type Battle, type Stage } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { gradeBoost, stageBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES, UNITS } from '../src/sim/units';

export const TEAM = 5;

/** The boost of a field band at stage s: a field band has no boss, even on a boss stage. */
export const fieldBoost = (s: number): Stage => ({ ...stageBoost(s), boss: undefined });

/** A random team of `TEAM` different hero kinds (from every hero there is). */
export function pickTeam(rng: Rng): string[] {
  const pool = [...ALL_HEROES];
  const team: string[] = [];
  for (let i = 0; i < TEAM; i++) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return team;
}

/** The deploy tiles (the heroes' rows), shuffled by the side stream `rng`, so a team lands at random. */
export function deploySpots(b: Battle, rng: Rng): [number, number][] {
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots;
}

export interface Played {
  won: boolean;
  /** Damage each hero kind dealt, and took, in this fight. */
  dealt: Map<string, number>;
  taken: Map<string, number>;
}

/**
 * One fight: the foes of `band` (boosted by `foes`) against `team`, placed at random on the heroes' rows, every hero at
 * `grade` (1 = plain, 2 = merged once) and `level` (a hero's ultimate unlocks at `ULT_LEVEL`). The placing draws from a side stream of the seed, so it is the same every time.
 */
export function play(seed: number, band: string, foes: Stage, team: string[], grade = 1, level = 1): Played {
  const b = startBattle(seed, band, foes);
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(grade, 0, level)));
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

/** How many of the random teams (over `games` fights at `stage`, from seed `seedOffset` + 1) each hero was in, and how many of those won. */
export function heroTally(games: number, stage: number, seedOffset = 0, level = 1): { inN: Map<string, number>; inW: Map<string, number> } {
  const inN = new Map<string, number>(ALL_HEROES.map((h) => [h, 0]));
  const inW = new Map<string, number>(ALL_HEROES.map((h) => [h, 0]));
  for (let g = 0; g < games; g++) {
    const seed = g + 1 + seedOffset;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const won = play(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(stage), team, 1, level).won;
    for (const h of team) {
      inN.set(h, inN.get(h)! + 1);
      if (won) inW.set(h, inW.get(h)! + 1);
    }
  }
  return { inN, inW };
}

/** Each hero's win rate (percent) in the random teams it was in, over `games` fights at `stage` (every hero at `level`), and its lift over the roster average. */
export function heroLifts(games: number, stage: number, seedOffset = 0, level = 1): { kind: string; win: number; lift: number }[] {
  const { inN, inW } = heroTally(games, stage, seedOffset, level);
  const win = ALL_HEROES.map((h) => (100 * inW.get(h)!) / Math.max(1, inN.get(h)!));
  const average = win.reduce((a, b) => a + b, 0) / win.length;
  return ALL_HEROES.map((kind, i) => ({ kind, win: win[i], lift: win[i] - average }));
}
