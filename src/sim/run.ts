// A run, King God Castle style: gold, a stage number and a roster of owned heroes. Gold buys a random grade-1 hero
// (`summon`); three of a kind and grade merge into one of the next grade at once; at most five fight, the rest wait on
// the bench. Stage n meets a band of foes made tougher by n, and every fifth stage a boss (its own band, led by the boss). A win pays gold; a lost
// fight ends the run. Pure rules: no Pixi, no DOM; the summon draws from a side stream of the run's seed.

import { startBattle, type Battle, type Boost, type Stage } from './battle';
import { AREAS, type Area } from './board';
import { BOSS_BANDS, FIELD_BANDS } from './foes';
import { bonusGold, heroBoost, manaRate, newCastle, type Castle } from './castle';
import { rankMult } from './meta';
import { levelBoost } from './levels';
import { starGold } from './stars';
import { mixSeed, Rng } from './rng';
import { drawEvent, eventAfter, type EventCard } from './events';
import { dropGear, gearBoost, gearText, type Gear, type Slot } from './gear';
import { relicEffects } from './relics';
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
/** A boss is drawn half as big again; its kind (`foes.ts`) carries its own stats and skill. */
export const BOSS: Boost = { size: 1.5 };

export interface Owned {
  /** Never reused, so a placed hero stays itself when others merge away. */
  id: number;
  kind: string;
  grade: number;
  /** The gear worn, one piece a slot; it stays for the run (a merge hands it back to the pack). */
  gear?: Partial<Record<Slot, Gear>>;
  /** Lasting bumps from a training ground, added to the hero's multipliers. */
  bump?: { hp: number; atk: number };
}

/** What the next fight carries over from an event: heroes' multipliers, foes' multiplier, a prize for a win. */
export interface Buff {
  hp?: number;
  atk?: number;
  foes?: number;
  gold?: number;
  gear?: Gear;
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
  /** The castle's levels when the run began (the fights keep them); none when unset. */
  castle?: Castle;
  /** Relic ids held (`relics.ts`). */
  relics?: string[];
  /** Gear in the pack, not worn by anyone. */
  items?: Gear[];
  /** The next gear id. */
  nextGear?: number;
  /** An event waiting between two fights (`events.ts`). */
  event?: EventCard;
  /** The next fight's boons and curses; cleared when it ends. */
  buff?: Buff;
  /** Lines about what the last win dropped, for the result screen. */
  found?: string[];
}

export function newRun(seed: number, pool: readonly string[] = HEROES, castle: Castle = newCastle()): Run {
  const run: Run = { seed, gold: START_GOLD + bonusGold(castle), stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...pool], castle: { ...castle } };
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
    for (const h of same.slice(0, 3)) for (const g of Object.values(h.gear ?? {})) (run.items ??= []).push(g);
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

/** Hp and attack multipliers of a grade, times the hero kind's rank (from its shards) and its level (from its XP). */
export const gradeBoost = (grade: number, rank = 0, level = 1): Boost => {
  const k = GRADE_MULT ** (grade - 1) * rankMult(rank);
  const lv = levelBoost(level);
  return { hp: k * lv.hp, atk: k * lv.atk, grade };
};
/** A roster hero's whole boost: grade and rank, its gear, its training bumps. */
export function boostOf(h: Owned, rank = 0, level = 1): Boost {
  const base = gradeBoost(h.grade, rank, level);
  const g = gearBoost(h.gear);
  return { ...base, hp: base.hp! * g.hp! + (h.bump?.hp ?? 0), atk: base.atk! * g.atk! + (h.bump?.atk ?? 0) };
}

/** Give a hero a piece of gear from the pack (the piece it replaces goes back). False when it isn't in the pack. */
export function equip(run: Run, heroId: number, gearId: number): boolean {
  const h = heroOf(run, heroId);
  const i = run.items?.findIndex((g) => g.id === gearId) ?? -1;
  if (!h || i < 0) return false;
  const [g] = run.items!.splice(i, 1);
  const old = h.gear?.[g.slot];
  if (old) run.items!.push(old);
  h.gear = { ...h.gear, [g.slot]: g };
  return true;
}

/** Take a hero's gear in a slot back to the pack. */
export function unequip(run: Run, heroId: number, slot: Slot): boolean {
  const h = heroOf(run, heroId);
  const g = h?.gear?.[slot];
  if (!h || !g) return false;
  (run.items ??= []).push(g);
  delete h.gear![slot];
  return true;
}

export const isBossStage = (stage: number) => stage % BOSS_EVERY === 0;
/** The band stage n meets: a boss band on a boss stage, else the next field band in turn (boss stages skipped). */
export const bandFor = (stage: number) => {
  if (isBossStage(stage)) return BOSS_BANDS[(stage / BOSS_EVERY - 1) % BOSS_BANDS.length];
  const fieldsBefore = stage - 1 - Math.floor((stage - 1) / BOSS_EVERY);
  return FIELD_BANDS[fieldsBefore % FIELD_BANDS.length];
};
/** The land stage n is fought in: each area for `AREA_STAGES` stages in turn, then round again. */
export const AREA_STAGES = 5;
export const areaFor = (stage: number): Area => AREAS[Math.floor((stage - 1) / AREA_STAGES) % AREAS.length];
/** How the foes of stage n are boosted. */
export function stageBoost(stage: number): Stage {
  const k = 1 + STAGE_GROWTH * (stage - 1);
  return { foes: { hp: k, atk: k }, boss: isBossStage(stage) ? BOSS : undefined };
}
/** Gold a win on stage n pays. */
export const reward = (stage: number) => 20 + 6 * stage + (isBossStage(stage) ? 30 : 0);

/** A fresh fight for the run's current stage (a different board each stage). */
export function startStage(run: Run): Battle {
  const rl = relicEffects(run.relics);
  const base = stageBoost(run.stage);
  const castle = heroBoost(run.castle);
  const foes = run.buff?.foes ?? 1;
  const { atk, hp, mana, first, revive, gold: _gold, ...team } = rl;
  return startBattle(mixSeed(run.seed, 0x57a6e, run.stage), bandFor(run.stage), {
    ...base,
    area: areaFor(run.stage),
    foes: { hp: base.foes!.hp! * foes, atk: base.foes!.atk! * foes },
    heroes: { hp: castle.hp! * (hp ?? 1) * (run.buff?.hp ?? 1), atk: castle.atk! * (atk ?? 1) * (run.buff?.atk ?? 1) },
    mana: manaRate(run.castle) * (mana ?? 1),
    relics: Object.keys(team).length || first || revive ? { team, first, revive } : undefined,
  });
}

/** Settle a finished fight: a win pays (and its stars pay gold) and moves on to the next stage; a loss ends the run. */
export function finish(run: Run, won: boolean, stars = 0): void {
  run.best = Math.max(run.best, run.stage);
  run.found = [];
  if (won) {
    const boss = isBossStage(run.stage);
    const bonus = (relicEffects(run.relics).gold ?? 0) + (run.buff?.gold ?? 0);
    run.gold += reward(run.stage) + starGold(stars) + bonus;
    // a prize for a cursed path, and a sure piece of gear from a boss (one tier up, from its own stream)
    const prizes: Gear[] = run.buff?.gear ? [run.buff.gear] : [];
    if (boss) prizes.push(dropGear(new Rng(mixSeed(run.seed, 0x6ea2, run.stage)), (run.nextGear = (run.nextGear ?? 1) + 1) - 1, run.stage, 1));
    for (const g of prizes) {
      (run.items ??= []).push(g);
      run.found.push(`${g.name} (${g.slot}, ${gearText(g)})`);
    }
    if (run.buff?.gold) run.found.push(`${run.buff.gold} gold from the cursed path`);
    run.stage++;
    run.event = eventAfter(run.stage - 1, boss) ? drawEvent(run, run.stage - 1) : undefined;
  } else run.over = true;
  run.buff = undefined;
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
