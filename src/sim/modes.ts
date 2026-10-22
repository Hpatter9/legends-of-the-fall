// The modes beside an ordinary run. The daily challenge is one run a day: a seed from the date, the starting five heroes
// in the squad, a land that is fixed for the day, played until defeat; its score is the stages cleared x 100 plus the
// stars x 10. The first play of a date counts, and a replay is practice (it does not change the day's best). The endless
// tower is a map of floors (`tower.ts`) that opens once a run has fought stage 10; its floors are the run's own stages. Pure
// rules: no Pixi, no DOM; the date is passed in as yyyymmdd.

import { AREAS, type Area } from './board';
import { checkAchievements, type Achievement } from './achievements';
import { Rng, mixSeed } from './rng';
import type { Battle } from './battle';
import { armyOfRun, bandFor, isBossRun, isBossStage, recruit, START_GOLD, SUMMON_BASE, type Run } from './run';
import { bonusGold } from './castle';
import { ascRules, ascUnlocked } from './ascension';
import { CAL_MAPS, CAL_ROWS, CAL_SCALE, CAL_START_GOLD } from './calamity';
import { armyCleared, armyUnlocked, ARMIES } from './armies';
import { HEROES } from './units';
import type { Meta } from './meta';
import { mapFor, newTower } from './tower';

/** The stage the endless tower opens at (reached in any run), or once the first army has been beaten. */
export const TOWER_UNLOCK = 10;
export const SCORE_STAGE = 100;
export const SCORE_STAR = 10;

/** yyyymmdd for a calendar date (the page passes today's). */
export const dateKey = (year: number, month: number, day: number): number => year * 10000 + month * 100 + day;

/** The seed of a date's daily challenge. */
export const dailySeed = (date: number): number => mixSeed(date, 0xda11);

/** The land a date's daily challenge is fought in (the same all day). */
export const dailyArea = (date: number): Area => AREAS[new Rng(mixSeed(date, 0xa4ea)).int(0, AREAS.length - 1)];

/** A date's daily run: the starting five in the squad, the starting gold, no castle upgrades, and the day's land. */
export function dailyRun(date: number, practice = false): Run {
  const run: Run = {
    seed: dailySeed(date),
    gold: START_GOLD,
    stage: 1,
    summons: 0,
    roster: [],
    nextId: 1,
    squad: [],
    over: false,
    best: 1,
    pool: [...HEROES],
    area: dailyArea(date),
    mode: { kind: 'daily', date, practice },
    stars: 0,
  };
  for (const kind of HEROES) {
    run.roster.push({ id: run.nextId, kind, grade: 1 });
    run.squad.push(run.nextId++);
  }
  return run;
}

/** Start a date's daily run. The first play of the date counts; a later one is practice. Records the play in the meta. */
export function startDaily(m: Meta, date: number): Run {
  const key = String(date);
  const entry = (m.daily[key] ??= { best: 0, plays: 0 });
  const practice = entry.plays > 0;
  entry.plays++;
  return dailyRun(date, practice);
}

/** The daily run saved for a date, if it is still going (so Daily resumes it rather than starting over). */
export const dailyInProgress = (run: Run | null, date: number): Run | null => (run && !run.over && run.mode?.kind === 'daily' && run.mode.date === date ? run : null);

/** A daily run's score: the stages cleared x 100 plus the stars x 10. */
export const dailyScore = (run: Run): number => (run.stage - 1) * SCORE_STAGE + (run.stars ?? 0) * SCORE_STAR;

/**
 * A tower run from a seed: the whole party, every hero back at level 1 with no equipment and no talents for the climb (the meta's
 * levels, gear and talents are not read and not changed: the heroes level and find gear in the run, `climb.ts`), the castle as
 * it stands, and the first act's map (`tower.ts`).
 */
export function towerRun(seed: number, m: Meta): Run {
  const run: Run = { seed, gold: START_GOLD + bonusGold(m.castle), stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...m.party], castle: { ...m.castle }, local: true };
  for (const kind of m.party) run.squad.push(recruit(run, kind, SUMMON_BASE).id);
  run.mode = { kind: 'tower' };
  run.tower = newTower(seed, ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id), m.tower);
  return run;
}

/** A calamity from a seed: one starting hero (a kind the player owns) at level 1, the castle as it stands, and the first small map. Heroes are hired along the way. */
export function calamityRun(seed: number, m: Meta, hero: string, ascension = 0): Run {
  const level = Math.max(0, Math.min(Math.floor(ascension) || 0, ascUnlocked(m)));
  const kind = m.unlocked.includes(hero) ? hero : m.party[0];
  const run: Run = { seed, gold: Math.max(0, CAL_START_GOLD - ascRules(level).startGold) + bonusGold(m.castle), stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...m.unlocked], castle: { ...m.castle }, local: true };
  run.squad.push(recruit(run, kind, 0).id);
  run.mode = level ? { kind: 'calamity', ascension: level } : { kind: 'calamity' };
  const t = newTower(seed, ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id), m.tower);
  t.rows = [...CAL_ROWS];
  t.maps = CAL_MAPS;
  t.scale = { start: CAL_SCALE.start, growth: CAL_SCALE.growth, step: CAL_SCALE.step };
  run.tower = t;
  t.map = mapFor(run, 1);
  return run;
}

export const towerOpen = (m: Meta): boolean => m.bestStage >= TOWER_UNLOCK || armyCleared(m, ARMIES[0].id);

/** Floors cleared in the tower by a run (the stage it is on, less one). */
export const floorsCleared = (run: Run): number => run.stage - 1;

/**
 * Keep the lasting records of a settled fight: the furthest stage, the tower's floors, a boss's band, and a daily run's
 * score once it is over. Then check the achievements. `battle` is the finished fight (absent for a check on the run).
 * Returns the achievements earned now (their crowns are paid).
 */
export function settleRun(m: Meta, run: Run, fight: { won: boolean; stage: number; stars: number; battle?: Battle }): Achievement[] {
  const army = armyOfRun(run);
  // (an army's waves are not stages of the endless climb: they keep their own record, `settleWave`)
  if (!army && run.mode?.kind !== 'calamity') m.bestStage = Math.max(m.bestStage, run.best);
  const boss = army ? (isBossRun(run, fight.stage) ? army.waves[fight.stage - 1].foes[0] : '') : run.tower ? run.tower.lastBoss ?? '' : isBossStage(fight.stage) ? bandFor(fight.stage) : '';
  if (fight.won && boss && !m.bosses.includes(boss)) m.bosses.push(boss);
  if (run.mode?.kind === 'tower') m.tower = Math.max(m.tower, floorsCleared(run));
  if (run.mode?.kind === 'daily' && run.over && !run.mode.practice) {
    const entry = (m.daily[String(run.mode.date)] ??= { best: 0, plays: 1 });
    entry.best = Math.max(entry.best, dailyScore(run));
  }
  return checkAchievements({ battle: fight.battle, won: fight.won, stage: fight.stage, stars: fight.stars, run, meta: m });
}

/** The home screen's line for the daily challenge button. */
export function dailyLine(m: Meta, date: number): string {
  const e = m.daily[String(date)];
  if (!e) return 'Daily challenge · one run today';
  return e.best ? `Daily challenge · today's best ${e.best}` : 'Daily challenge · today played';
}

/** The home screen's line for the endless tower button. */
export const towerLine = (m: Meta): string => (towerOpen(m) ? `Endless tower · best floor ${m.tower}` : 'Endless tower · beat the Orc Warband');

/** A line on the result screen for a daily run that has ended ("" for any other run). */
export function modeNote(run: Run): string {
  if (run.mode?.kind !== 'daily' || !run.over) return '';
  return ` · score ${dailyScore(run)}${run.mode.practice ? ' (practice, not counted)' : ''}`;
}
