// A run, King God Castle style: gold, a stage number and a roster of owned heroes. Gold buys a random grade-1 hero
// (`summon`); three of a kind and grade merge into one of the next grade at once; at most five fight, the rest wait on
// the bench. Stage n meets a band of foes made tougher by n, and every fifth stage a boss (its own band, led by the boss). A win pays gold; a lost
// fight ends the run. Pure rules: no Pixi, no DOM; the summon draws from a side stream of the run's seed.

import { startBattle, type Battle, type Boost, type Stage } from './battle';
import { AREAS, type Area } from './board';
import { BOSS_BANDS, FIELD_BANDS } from './foes';
import { armyById, armyIndex, waveBoost, type Army } from './armies';
import { bonusGold, heroBoost, manaRate, moveRate, newCastle, type Castle } from './castle';
import { MYTHIC_SIZE, rankMult, rarityOf, tierMult } from './meta';
import { levelBoost } from './levels';
import { starGold } from './stars';
import { mixSeed, Rng } from './rng';
import { drawEvent, eventAfter, type EventCard } from './events';
import { dropGear, gearBoost, gearText, type Gear, type Slot } from './gear';
import type { EquipStats } from './equipment';
import { relicEffects } from './relics';
import { HEROES, UNITS } from './units';

export const MAX_GRADE = 3;
export const SQUAD = 5;
export const START_GOLD = 70;
export const SUMMON_BASE = 30;
export const SUMMON_STEP = 5;
/** A recycled hero pays back this share of the gold paid into it (rounded, at least 1, and always less than it cost). */
export const RECYCLE_SHARE = 0.4;
/** Hp and attack grow by this for each grade above the first. */
export const GRADE_MULT = 1.6;
/** Foes' hp and attack at stage 1, as a share of their stats in `foes.ts`. */
export const FOE_START = 0.55;
/** Foes' hp and attack grow by this share for each stage after the first. */
export const STAGE_GROWTH = 0.2;
export const BOSS_EVERY = 5;
/** Gear drops rise a tier every 8 stages; each army further on drops as if this many stages further. */
const GEAR_STAGES = 6;
/** A boss is drawn half as big again; its kind (`foes.ts`) carries its own stats and skill. */
export const BOSS: Boost = { size: 1.5 };

export interface Owned {
  /** Never reused, so a placed hero stays itself when others merge away. */
  id: number;
  kind: string;
  grade: number;
  /** The gold paid into this hero: the price of the summon that brought it out, plus what the heroes merged into it paid (`paidOf`). */
  paid?: number;
  /** The gear worn, one piece a slot; it stays for the run (a merge or a recycle hands it back to the pack). */
  gear?: Partial<Record<Slot, Gear>>;
  /** Lasting bumps from a training ground, added to the hero's multipliers. */
  bump?: { hp: number; atk: number };
  /** Skill charge (and a Mythic's ultimate charge) kept from the last wave, so a skill half-filled is not lost between waves. */
  charge?: number;
  charge2?: number;
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
  /** The hero kinds summons draw from (the party); the starting five when unset. */
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
  /** Which mode the run is (`modes.ts`); an ordinary run has none. */
  mode?: RunMode;
  /** The land every stage is fought in (a daily challenge keeps one); by stage when unset. */
  area?: Area;
  /** Stars won across the run (the daily challenge's score counts them). */
  stars?: number;
  /** An army run's last boss has fallen (the run is over, and won). */
  cleared?: boolean;
  /** An army run's tally for its stars (`armyStars.ts`): the battle time so far, heroes lost over the run, heroes lost in the fight with the last boss, and heroes lost in all the boss fights (the mid-bosses too). */
  tally?: { ms: number; lost: number; bossLost: number; bossFell?: number };
}

/** A run that is not an ordinary one: an army's campaign (its stages are the army's waves), today's daily challenge (`practice` for a replay that does not count), or the endless tower. */
export type RunMode = { kind: 'army'; army: string; tier?: number } | { kind: 'daily'; date: number; practice: boolean } | { kind: 'tower' };

/** A new run drawing from `party` (the hero kinds its summons and starting heroes come from). */
export function newRun(seed: number, party: readonly string[] = HEROES, castle: Castle = newCastle()): Run {
  const run: Run = { seed, gold: START_GOLD + bonusGold(castle), stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...party], castle: { ...castle } };
  // two grade-1 heroes, drawn from the same stream as every summon but free
  for (let i = 0; i < 2; i++) run.squad.push(add(run, draw(run), SUMMON_BASE).id);
  return run;
}

/** A run that fights an army: from wave 1, with the party and castle as they stand. */
export function armyRun(seed: number, army: string, party: readonly string[] = HEROES, castle: Castle = newCastle(), tier = 0): Run {
  const run = newRun(seed, party, castle);
  run.mode = tier > 0 ? { kind: 'army', army, tier } : { kind: 'army', army };
  return run;
}
/** The difficulty tier an army run is fought on (0 Normal, for any other run too). */
export const tierOfRun = (run: Run): number => (run.mode?.kind === 'army' ? run.mode.tier ?? 0 : 0);

/** Keep each hero's skill charge for the next wave of the run: a hero still standing keeps what it had built up; one that fell, or that sat
 *  out the fight, starts the next one empty. */
export function keepCharges(run: Run, b: Battle): void {
  for (const h of run.roster) {
    const u = b.units.find((x) => x.side === 'hero' && x.tag === h.id);
    const alive = !!u && u.alive;
    h.charge = alive && u.charge > 0 ? u.charge : undefined;
    h.charge2 = alive && (u.charge2 ?? 0) > 0 ? u.charge2 : undefined;
  }
}

/** Add a finished fight to an army run's tally: its time, the heroes that fell (summoned helpers do not count), and whether this was the last boss. */
export function noteFight(run: Run, b: Battle): void {
  const army = armyOfRun(run);
  if (!army) return;
  const fell = b.units.filter((u) => u.side === 'hero' && !u.alive && !UNITS[u.def].summon).length;
  const t = (run.tally ??= { ms: 0, lost: 0, bossLost: 0 });
  t.ms += b.t;
  t.lost += fell;
  if (run.stage >= army.waves.length) t.bossLost = fell;
  if (army.waves[run.stage - 1]?.boss) t.bossFell = (t.bossFell ?? 0) + fell;
}
/** The army a run is fighting, if it is an army run. */
export const armyOfRun = (run: Run): Army | undefined => (run.mode?.kind === 'army' ? armyById(run.mode.army) : undefined);
/** Whether stage n of the run (its current one by default) has a boss. */
export const isBossRun = (run: Run, stage = run.stage): boolean => {
  const a = armyOfRun(run);
  return a ? !!a.waves[stage - 1]?.boss : isBossStage(stage);
};
/** How many waves the run's army has (0 for any other run). */
export const wavesOf = (run: Run): number => armyOfRun(run)?.waves.length ?? 0;

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
  return add(run, draw(run), cost);
}

/** Add a grade-1 hero (bought at `paid` gold), then merge threes of a kind and grade, upward. Returns the hero that ends up holding the new one's place. */
function add(run: Run, kind: string, paid: number): Owned {
  let made: Owned = { id: run.nextId++, kind, grade: 1, paid };
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
    made = { id: run.nextId++, kind: made.kind, grade: made.grade + 1, paid: same.slice(0, 3).reduce((n, h) => n + paidOf(h), 0) };
    run.roster.push(made);
    if (slot >= 0 && run.squad.length < SQUAD) run.squad.splice(Math.min(slot, run.squad.length), 0, made.id);
  }
}

/** The gold paid into a hero. A hero from an older save has no record: it is taken to have cost the base price of a summon for each grade-1 hero in it. */
export const paidOf = (h: Owned): number => h.paid ?? SUMMON_BASE * 3 ** (h.grade - 1);
/** The gold recycling a hero pays back: a share of what it cost, at least 1 and never as much as it cost. */
export const recycleValue = (h: Owned): number => Math.max(1, Math.min(paidOf(h) - 1, Math.round(paidOf(h) * RECYCLE_SHARE)));

/** Recycle a hero for gold: it leaves the roster and the squad, its gear goes back to the pack, and `recycleValue` is paid. The price of the next summon does not
 *  change, so this is no way to reroll for free. Returns the gold paid, or null when the hero is unknown, the run is over, or it is the last hero. */
export function recycle(run: Run, heroId: number): number | null {
  const h = heroOf(run, heroId);
  if (!h || run.over || run.roster.length <= 1) return null;
  const gold = recycleValue(h);
  for (const g of Object.values(h.gear ?? {})) (run.items ??= []).push(g);
  run.roster = run.roster.filter((x) => x.id !== heroId);
  run.squad = run.squad.filter((id) => id !== heroId);
  run.gold += gold;
  return gold;
}

export const heroOf = (run: Run, id: number) => run.roster.find((h) => h.id === id);
export const benched = (run: Run) => run.roster.filter((h) => !run.squad.includes(h.id));

/** Hp and attack multipliers of a grade, times the hero kind's rank (from its shards), its level (from its XP) and its tier (`kind`; Common when unset); a Mythic is also drawn bigger. */
export const gradeBoost = (grade: number, rank = 0, level = 1, kind?: string): Boost => {
  const k = GRADE_MULT ** (grade - 1) * rankMult(rank) * (kind ? tierMult(kind) : 1);
  const lv = levelBoost(level);
  return { hp: k * lv.hp, atk: k * lv.atk, grade, ...(kind && rarityOf(kind) === 5 ? { size: MYTHIC_SIZE } : {}) };
};
/** A roster hero's whole boost: grade and rank, its gear, its training bumps, and the kind's permanent equipment (`equip`, from `equipStats(meta, kind)`; none when it wears nothing). */
export function boostOf(h: Owned, rank = 0, level = 1, equip?: EquipStats): Boost {
  const base = gradeBoost(h.grade, rank, level, h.kind);
  const g = gearBoost(h.gear);
  return { ...base, hp: base.hp! * g.hp! + (h.bump?.hp ?? 0), atk: base.atk! * g.atk! + (h.bump?.atk ?? 0), ...(equip ? { equip } : {}), ...(h.charge ? { charge: h.charge } : {}), ...(h.charge2 ? { charge2: h.charge2 } : {}) };
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
  const k = FOE_START * (1 + STAGE_GROWTH * (stage - 1));
  return { foes: { hp: k, atk: k }, boss: isBossStage(stage) ? BOSS : undefined };
}
/** Gold a win on stage n pays. */
export const reward = (stage: number) => 20 + 6 * stage + (isBossStage(stage) ? 30 : 0);

/** A fresh fight for the run's current stage (a different board each stage). */
export function startStage(run: Run): Battle {
  const rl = relicEffects(run.relics);
  const army = armyOfRun(run);
  const base = army ? waveBoost(army, run.stage, tierOfRun(run)) : stageBoost(run.stage);
  const castle = heroBoost(run.castle);
  const foes = run.buff?.foes ?? 1;
  const { atk, hp, mana, first, revive, gold: _gold, ...team } = rl;
  return startBattle(mixSeed(run.seed, 0x57a6e, run.stage), army ? army.waves[run.stage - 1].foes : bandFor(run.stage), {
    ...base,
    area: run.area ?? base.area ?? areaFor(run.stage),
    foes: { hp: base.foes!.hp! * foes, atk: base.foes!.atk! * foes, speed: base.foes!.speed },
    heroes: { hp: castle.hp! * (hp ?? 1) * (run.buff?.hp ?? 1), atk: castle.atk! * (atk ?? 1) * (run.buff?.atk ?? 1) },
    mana: manaRate(run.castle) * (mana ?? 1),
    move: moveRate(run.castle),
    relics: Object.keys(team).length || first || revive ? { team, first, revive } : undefined,
  });
}

/** Settle a finished fight: a win pays (and its stars pay gold) and moves on to the next stage; a loss ends the run. */
export function finish(run: Run, won: boolean, stars = 0): void {
  run.best = Math.max(run.best, run.stage);
  run.found = [];
  run.stars = (run.stars ?? 0) + stars;
  if (won) {
    const boss = isBossRun(run);
    const army = armyOfRun(run);
    const bonus = (relicEffects(run.relics).gold ?? 0) + (run.buff?.gold ?? 0);
    run.gold += reward(run.stage) + starGold(stars) + bonus;
    // a prize for a cursed path, and a sure piece of gear from a boss (one tier up, from its own stream)
    const prizes: Gear[] = run.buff?.gear ? [run.buff.gear] : [];
    if (boss) prizes.push(dropGear(new Rng(mixSeed(run.seed, 0x6ea2, run.stage)), (run.nextGear = (run.nextGear ?? 1) + 1) - 1, run.stage + (army ? GEAR_STAGES * armyIndex(army.id) : 0), 1));
    for (const g of prizes) {
      (run.items ??= []).push(g);
      run.found.push(`${g.name} (${g.slot}, ${gearText(g)})`);
    }
    if (run.buff?.gold) run.found.push(`${run.buff.gold} gold from the cursed path`);
    if (army && run.stage >= army.waves.length) {
      // (the army's last boss has fallen: the run is won and over)
      run.cleared = true;
      run.over = true;
      run.event = undefined;
    } else {
      run.stage++;
      // (the endless tower has no events)
      run.event = run.mode?.kind !== 'tower' && eventAfter(run.stage - 1, boss) ? drawEvent(run, run.stage - 1) : undefined;
    }
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
