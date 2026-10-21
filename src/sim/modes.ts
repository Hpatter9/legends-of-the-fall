// The modes beside an ordinary run. The daily challenge is one run a day: a seed from the date, the starting five heroes
// in the squad, a land that is fixed for the day, played until defeat; its score is the stages cleared x 100 plus the
// stars x 10. The first play of a date counts, and a replay is practice (it does not change the day's best). The endless
// tower is a run with no events that opens once a run has fought stage 10; its floors are the run's own stages. Pure
// rules: no Pixi, no DOM; the date is passed in as yyyymmdd.

import { AREAS, type Area } from './board';
import { checkAchievements, type Achievement } from './achievements';
import { Rng, mixSeed } from './rng';
import type { Battle } from './battle';
import { isBossStage, bandFor, newRun, START_GOLD, type Run } from './run';
import { HEROES } from './units';
import type { Meta } from './meta';

/** The stage the endless tower opens at (reached in any run). */
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

/** A tower run from a seed: the unlocked heroes at their lasting levels, the castle as it stands, and no events. */
export function towerRun(seed: number, m: Meta): Run {
  const run = newRun(seed, m.unlocked, m.castle);
  run.mode = { kind: 'tower' };
  return run;
}

export const towerOpen = (m: Meta): boolean => m.bestStage >= TOWER_UNLOCK;

/** Floors cleared in the tower by a run (the stage it is on, less one). */
export const floorsCleared = (run: Run): number => run.stage - 1;

/**
 * Keep the lasting records of a settled fight: the furthest stage, the tower's floors, a boss's band, and a daily run's
 * score once it is over. Then check the achievements. `battle` is the finished fight (absent for a check on the run).
 * Returns the achievements earned now (their crowns are paid).
 */
export function settleRun(m: Meta, run: Run, fight: { won: boolean; stage: number; stars: number; battle?: Battle }): Achievement[] {
  m.bestStage = Math.max(m.bestStage, run.best);
  if (fight.won && isBossStage(fight.stage) && !m.bosses.includes(bandFor(fight.stage))) m.bosses.push(bandFor(fight.stage));
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
export const towerLine = (m: Meta): string => (towerOpen(m) ? `Endless tower · best floor ${m.tower}` : `Endless tower · reach stage ${TOWER_UNLOCK}`);

/** A line on the result screen for a daily run that has ended ("" for any other run). */
export function modeNote(run: Run): string {
  if (run.mode?.kind !== 'daily' || !run.over) return '';
  return ` · score ${dailyScore(run)}${run.mode.practice ? ' (practice, not counted)' : ''}`;
}
