// A run, King God Castle style: gold, a stage number and a roster of owned heroes. Gold buys a random grade-1 hero
// (`summon`); three of a kind and grade merge into one of the next grade at once; at most five fight, the rest wait on
// the bench. Stage n meets a band of foes made tougher by n, and every fifth stage a boss. A win pays gold; a lost
// fight ends the run. Pure rules: no Pixi, no DOM; the summon draws from a side stream of the run's seed.

import { startBattle, type Battle, type Boost, type Stage } from './battle';
import { FOE_BANDS } from './foes';
import { rankMult } from './meta';
import { mixSeed, Rng } from './rng';
import { HEROES } from './units';

export const MAX_GRADE = 3;
export const SQUAD = 5;
export const START_GOLD = 70;
export const SUMMON_BASE = 30;
export const SUMMON_STEP = 5;
/** Hp and attack grow by this for each grade above the first. */
export const GRADE_MULT = 1.6;
/** Foes' hp and attack grow by this share for each stage after the first. */
export const STAGE_GROWTH = 0.12;
export const BOSS_EVERY = 5;
export const BOSS: Boost = { hp: 3, atk: 1.6, size: 1.4 };

export interface Owned {
  /** Never reused, so a placed hero stays itself when others merge away. */
  id: number;
  kind: string;
  grade: number;
}

export interface Run {
  seed: number;
  gold: number;
  stage: number;
  /** Summons so far: the price and the draw both follow it. */
  summons: number;
  roster: Owned[];
  nextId: number;
  /** Heroes chosen to fight (roster ids), at most `SQUAD`. */
  squad: number[];
  over: boolean;
  /** The stage reached when it ended. */
  best: number;
  /** The hero kinds summons draw from (the unlocked ones); the starting five when unset. */
  pool?: string[];
}

export function newRun(seed: number, pool: readonly string[] = HEROES): Run {
  const run: Run = { seed, gold: START_GOLD, stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...pool] };
  // two grade-1 heroes, drawn from the same stream as every summon but free
  for (let i = 0; i < 2; i++) run.squad.push(add(run, draw(run)).id);
  return run;
}

const draw = (run: Run): string => {
  const pool = run.pool?.length ? run.pool : HEROES;
  return pool[new Rng(mixSeed(run.seed, 0x5033, run.nextId)).int(0, pool.length - 1)];
};
export const summonCost = (run: Run) => SUMMON_BASE + SUMMON_STEP * run.summons;

/** Buy a random grade-1 hero. Returns it (or what it merged into), or null when too poor or the run is over. */
export function summon(run: Run): Owned | null {
  const cost = summonCost(run);
  if (run.over || run.gold < cost) return null;
  run.gold -= cost;
  run.summons++;
  return add(run, draw(run));
}

/** Add a grade-1 hero, then merge threes of a kind and grade, upward. Returns the hero that ends up holding the new one's place. */
function add(run: Run, kind: string): Owned {
  let made: Owned = { id: run.nextId++, kind, grade: 1 };
  run.roster.push(made);
  for (;;) {
    const same = run.roster.filter((h) => h.kind === made.kind && h.grade === made.grade);
    if (same.length < 3 || made.grade >= MAX_GRADE) return made;
    // (the new one stays in the squad's place of the oldest: the first three leave, one of the next grade arrives)
    const gone = new Set(same.slice(0, 3).map((h) => h.id));
    const slot = run.squad.findIndex((id) => gone.has(id));
    run.roster = run.roster.filter((h) => !gone.has(h.id));
    run.squad = run.squad.filter((id) => !gone.has(id));
    made = { id: run.nextId++, kind: made.kind, grade: made.grade + 1 };
    run.roster.push(made);
    if (slot >= 0 && run.squad.length < SQUAD) run.squad.splice(Math.min(slot, run.squad.length), 0, made.id);
  }
}

export const heroOf = (run: Run, id: number) => run.roster.find((h) => h.id === id);
export const benched = (run: Run) => run.roster.filter((h) => !run.squad.includes(h.id));

/** Hp and attack multipliers of a grade, times the hero kind's rank (from its shards). */
export const gradeBoost = (grade: number, rank = 0): Boost => {
  const k = GRADE_MULT ** (grade - 1) * rankMult(rank);
  return { hp: k, atk: k, grade };
};

export const isBossStage = (stage: number) => stage % BOSS_EVERY === 0;
/** The band stage n meets, in turn. */
export const bandFor = (stage: number) => {
  const names = Object.keys(FOE_BANDS);
  return names[(stage - 1) % names.length];
};
/** How the foes of stage n are boosted. */
export function stageBoost(stage: number): Stage {
  const k = 1 + STAGE_GROWTH * (stage - 1);
  return { foes: { hp: k, atk: k }, boss: isBossStage(stage) ? BOSS : undefined };
}
/** Gold a win on stage n pays. */
export const reward = (stage: number) => 20 + 6 * stage + (isBossStage(stage) ? 30 : 0);

/** A fresh fight for the run's current stage (a different board each stage). */
export const startStage = (run: Run): Battle => startBattle(mixSeed(run.seed, 0x57a6e, run.stage), bandFor(run.stage), stageBoost(run.stage));

/** Settle a finished fight: a win pays and moves on to the next stage; a loss ends the run. */
export function finish(run: Run, won: boolean): void {
  run.best = Math.max(run.best, run.stage);
  if (won) {
    run.gold += reward(run.stage);
    run.stage++;
  } else run.over = true;
}

/** Choose or release a hero for the fight. Returns whether the squad changed. */
export function setSquad(run: Run, id: number, on: boolean): boolean {
  const has = run.squad.includes(id);
  if (on === has || !heroOf(run, id)) return false;
  if (on) {
    if (run.squad.length >= SQUAD) return false;
    run.squad.push(id);
  } else run.squad = run.squad.filter((x) => x !== id);
  return true;
}

const KEY = 'legends.run';
export const saveRun = (run: Run, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(KEY, JSON.stringify(run));
export function loadRun(store: Pick<Storage, 'getItem'> = localStorage): Run | null {
  try {
    const r = JSON.parse(store.getItem(KEY) ?? 'null') as Run | null;
    return r && Array.isArray(r.roster) && typeof r.gold === 'number' ? r : null;
  } catch {
    return null;
  }
}
