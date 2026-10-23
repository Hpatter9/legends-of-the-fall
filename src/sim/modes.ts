// The modes beside an ordinary run. The daily challenge is one fixed run a day: a seed from the date, the starting five heroes in
// the squad, a land that is fixed for the day, ten waves that end in the boss of the day (`daily.ts`). Clearing the boss wins the
// daily and pays a daily chest; a loss with the hearts spent ends it with a share of the waves' crowns. The first play of a date
// counts; a replay is practice (it pays nothing and does not change the day's record). The endless tower is a map of floors
// (`tower.ts`) that opens once a run has fought stage 10; its floors are the run's own stages. Pure rules: no Pixi, no DOM; the
// date is passed in as yyyymmdd.

import { checkAchievements, type Achievement } from './achievements';
import type { Battle } from './battle';
import { dailyArea, dailySeed, dateKey } from './dailySeed';
import { dailyBossName, dailyChestSeed, dailyWaveCrowns, DAILY_WAVES } from './daily';
import { kindPower, powerOf } from './power';
import { gradeBoost, waveArmyOf, bandFor, isBossRun, isBossStage, recruit, START_GOLD, SUMMON_BASE, type Run } from './run';
import { bonusGold } from './castle';
import { ascRules, ascUnlocked } from './ascension';
import { CAL_MAPS, CAL_ROWS, CAL_SCALE, CAL_START_GOLD } from './calamity';
import { armyUnlocked, ARMIES } from './armies';
import { modeOpen, MODE_NEED, opensAt } from './modeUnlock';
import { HEROES } from './units';
import type { Meta } from './meta';
import { mapFor, newTower } from './tower';
import { noteFoes } from './codex';

/** The stage the endless tower opens at (reached in any run), or once the first army has been beaten. */
export const TOWER_UNLOCK = 10;
export const SCORE_STAGE = 100;
export const SCORE_STAR = 10;

export { dailyArea, dailySeed, dateKey };

/** A date's daily run: the starting five in the squad, the starting gold, no castle upgrades, and the day's land. */
export function dailyRun(date: number, practice = false, scale = 1): Run {
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
    mode: { kind: 'daily', date, practice, ...(scale > 1 ? { scale } : {}) },
    stars: 0,
  };
  for (const kind of HEROES) {
    run.roster.push({ id: run.nextId, kind, grade: 1 });
    run.squad.push(run.nextId++);
  }
  return run;
}

/**
 * How much the daily's foes are scaled up for a save: the starting five's lasting power (level, rank, equipment, talents: `kindPower`) over what a fresh
 * save's is, as a mean, so a late save meets foes as strong as its heroes are and clears the daily about as often as a new one (1 for a fresh save, never less).
 * The daily is tuned for a fresh save (`docs/notes/daily-goal.md`); levels past that would otherwise make it trivial (`docs/notes/difficulty.md`).
 */
/** The share of the power ratio the foes answer with (below 1: a hero's power is not all won in a fight, and the daily is short). */
export const DAILY_ANSWER = { share: 0.75 };
export function dailyScale(m: Meta): number {
  const ratio = HEROES.reduce((n, k) => n + kindPower(m, k) / powerOf(k, gradeBoost(1, 0, 1)), 0) / HEROES.length;
  return Math.max(1, Math.round(ratio ** DAILY_ANSWER.share * 100) / 100);
}

/** Start a date's daily run. The first play of the date counts; a later one is practice. Records the play in the meta. */
export function startDaily(m: Meta, date: number): Run {
  const key = String(date);
  const entry = (m.daily[key] ??= { best: 0, plays: 0 });
  const practice = entry.plays > 0;
  entry.plays++;
  return dailyRun(date, practice, dailyScale(m));
}

/** The daily run saved for a date, if it is still going (so Daily resumes it rather than starting over). */
export const dailyInProgress = (run: Run | null, date: number): Run | null => (run && !run.over && run.mode?.kind === 'daily' && run.mode.date === date ? run : null);

/** The waves of the daily a run has cleared (all of them once the boss of the day has fallen). */
export const dailyCleared = (run: Run): number => (run.cleared ? DAILY_WAVES : Math.max(0, run.stage - 1));

/** A daily run's score as the older saves kept it, the waves cleared x 100 plus the stars x 10 (the record still keeps it; nothing reads it for a goal). */
export const dailyScore = (run: Run): number => dailyCleared(run) * SCORE_STAGE + (run.stars ?? 0) * SCORE_STAR;

/** Battle time that earns the daily chest's time star: 14 s a wave (about half the greedy player's clears come in under it). */
export const DAILY_TIME_MS = DAILY_WAVES * 14_000;
export interface DailyStar {
  text: string;
  earned: boolean;
}
/** The two bonus stars of a cleared daily: no heart spent (a hero lost in the run is common: the greedy player loses six on average, so it is not asked), and under `DAILY_TIME_MS` of battle. They add to the chest. */
export function dailyBonus(run: Run): DailyStar[] {
  const t = run.tally;
  const won = !!run.cleared;
  return [
    { text: 'No heart spent', earned: won && !run.retries },
    { text: `Cleared in ${Math.floor(DAILY_TIME_MS / 60000)}:${String((DAILY_TIME_MS % 60000) / 1000).padStart(2, '0')} of battle`, earned: won && !!t && t.ms <= DAILY_TIME_MS },
  ];
}

export interface DailyPay {
  /** The play counts for rewards (the first of the date). */
  counted: boolean;
  /** Crowns this fight paid (none for a practice run or a lost fight). */
  crowns: number;
  /** The boss of the day fell in this fight. */
  cleared: boolean;
  /** The daily chest this clear put into the stash (once a date). */
  chest: boolean;
  /** The bonus stars the chest earned. */
  bonus: number;
}

/**
 * Settle a fought wave of a daily in the meta: the furthest wave, the crowns the wave pays, and for the boss of the day the clear and
 * its chest. A practice run (a replay of the date) pays nothing and changes no record. Call before `settleRun` (the achievements read
 * the record). `stage` is the wave fought; `run` has been through `finish` already.
 */
export function settleDaily(m: Meta, run: Run, fight: { won: boolean; stage: number }): DailyPay {
  const none: DailyPay = { counted: false, crowns: 0, cleared: false, chest: false, bonus: 0 };
  if (run.mode?.kind !== 'daily' || run.mode.practice) return none;
  const date = run.mode.date;
  const entry = (m.daily[String(date)] ??= { best: 0, plays: 1 });
  entry.wave = Math.max(entry.wave ?? 0, fight.stage);
  let crowns = 0;
  if (fight.won) {
    // (a wave is paid when it is won; a lost one pays nothing, and the counted run never wins one twice)
    crowns = dailyWaveCrowns(fight.stage);
    m.crowns += crowns;
  }
  let chest = false;
  let bonus = 0;
  if (run.cleared && !entry.cleared) {
    entry.cleared = true;
    bonus = dailyBonus(run).filter((r) => r.earned).length;
    entry.stars = bonus;
    m.stash.push({ army: 'daily', at: 3, tier: 0, seed: dailyChestSeed(m.seed, date), daily: date, bonus });
    chest = true;
  }
  if (run.over) {
    entry.over = true;
    entry.best = Math.max(entry.best, dailyScore(run));
  }
  return { counted: true, crowns, cleared: !!run.cleared, chest, bonus };
}

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

export const towerOpen = (m: Meta): boolean => modeOpen(m, 'tower');

/** Floors cleared in the tower by a run (the stage it is on, less one). */
export const floorsCleared = (run: Run): number => run.stage - 1;

/**
 * Keep the lasting records of a settled fight: the furthest stage, the tower's floors, a boss's band, and a daily run's
 * score once it is over. Then check the achievements. `battle` is the finished fight (absent for a check on the run).
 * Returns the achievements earned now (their crowns are paid).
 */
export function settleRun(m: Meta, run: Run, fight: { won: boolean; stage: number; stars: number; battle?: Battle }): Achievement[] {
  // (an army's waves are not stages of the endless climb: they keep their own record, `settleWave`; nor are a daily's, `settleDaily`)
  const fixed = waveArmyOf(run);
  if (!fixed && run.mode?.kind !== 'calamity') m.bestStage = Math.max(m.bestStage, run.best);
  const boss = fixed ? (isBossRun(run, fight.stage) ? fixed.waves[fight.stage - 1].foes[0] : '') : run.tower ? run.tower.lastBoss ?? '' : isBossStage(fight.stage) ? bandFor(fight.stage) : '';
  if (fight.won && boss && !m.bosses.includes(boss)) m.bosses.push(boss);
  if (run.mode?.kind === 'tower') m.tower = Math.max(m.tower, floorsCleared(run));
  // (the codex notes the foes this fight met and felled)
  if (fight.battle) noteFoes(m, fight.battle);
  return checkAchievements({ battle: fight.battle, won: fight.won, stage: fight.stage, stars: fight.stars, run, meta: m });
}

/** The daily's standing for a date, in words: "not tried", "wave 4/10" (a run going), "fell at 6/10" or "cleared ✓". */
export function dailyStatus(m: Meta, date: number): string {
  const e = m.daily[String(date)];
  if (e?.cleared) return 'cleared ✓';
  if (!e || !e.plays) return 'not tried';
  // (a record from before the fixed daily has a score and no wave: the waves it cleared, 100 a wave, say how far it got)
  const old = e.wave === undefined && e.best > 0;
  const wave = Math.max(1, Math.min(DAILY_WAVES, e.wave ?? (old ? Math.floor(e.best / SCORE_STAGE) + 1 : 1)));
  return e.over || old ? `fell at ${wave}/${DAILY_WAVES}` : `wave ${wave}/${DAILY_WAVES}`;
}

/** The camp's line for the daily board: "Today: Orc Warlord · not tried". */
export const dailyLine = (m: Meta, date: number): string => `Today: ${dailyBossName(date)} · ${dailyStatus(m, date)}`;

/** The home screen's line for the endless tower button. */
export const towerLine = (m: Meta): string => (towerOpen(m) ? `Endless tower · best floor ${m.tower}` : `Endless tower · ${opensAt(MODE_NEED.tower).toLowerCase()}`);

/** A line on the result screen for a daily run that has ended ("" for any other run). */
export function modeNote(run: Run): string {
  if (run.mode?.kind !== 'daily' || !run.over) return '';
  return run.cleared ? ` · daily cleared${run.mode.practice ? ' (practice, no reward)' : ''}` : ` · wave ${run.best}/${DAILY_WAVES}${run.mode.practice ? ' (practice, no reward)' : ''}`;
}
