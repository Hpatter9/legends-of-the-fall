// A run, King God Castle style: gold, a stage number and a roster of owned heroes. Gold buys a random hero (grade 1, now and then grade 2)
// (`summon`); two of a kind and grade merge into one of the next grade when the player merges them (`merge.ts`: by hand, or the Auto
// merge button), never on their own; grade 4 is the top. At most five fight, the rest wait on the bench. Stage n meets a band of foes made tougher by n, and every fifth stage a boss (its own band, led by the boss). A win pays gold; a lost
// fight ends the run. Pure rules: no Pixi, no DOM; the summon draws from a side stream of the run's seed.

import { keepSummons, keptBoost, type KeptForm, type KeptSummon } from './carry';
import { duchessModeOk, type DuchessWish } from './duchessFight';
import { startBattle, type Battle, type Boost, type Stage } from './battle';
import { CLASSIC_AREAS, type Area } from './board';
import type { Rift } from './rift';
import { CAL_CASTLE_EXTRA } from './calamity';
import { buildChain, type Section } from './chain';
import { isScenario, planScenario, scenarioForArmy, type ScenarioId } from './scenario';
import { BOSS_BANDS, FIELD_BANDS } from './foes';
import { armyById, armyIndex, landOf, waveBoost, waveFoes, type Army } from './armies';
import { dailyArmy } from './daily';
import { questArmy, questBattleById } from './questBattles';
import { SWARM_HP, themeById, themeFx, themeGoalMet, type DailyTheme } from './dailyThemes';
import { kindsOf } from './traits';
import { bonusGold, foeAnswer, heroBoost, manaRate, moveRate, newCastle, type Castle } from './castle';
import { rankMult } from './meta';
import { lastingBoost } from './levels';
import { starGold } from './stars';
import { mixSeed, Rng } from './rng';
import { drawEvent, eventAfter, type EventCard } from './events';
import { dropGear, gearBoost, gearText, type Gear, type Slot } from './gear';
import type { EquipStats } from './equipment';
import { relicEffects } from './relics';
import { noteGold, type RunRecap } from './runRecap';
import type { TowerState } from './tower';
import type { RoadState } from './midEvents';
import { TWISTS } from './twists';
import { HEROES, UNITS } from './units';

/** The top grade (rank): 1+1 make 2, 2+2 make 3, 3+3 make 4 (MERGE-TWO; it was three of a kind up to 3). */
export const MAX_GRADE = 4;
export const SQUAD = 5;
/** A calamity run fields up to this many heroes (and owns no more). */
export const CALAMITY_SQUAD = 10;
export const START_GOLD = 70;
export const SUMMON_BASE = 30;
export const SUMMON_STEP = 5;
/** A recycled hero pays back this share of the current Hire price (rounded, at least 1). */
export const RECYCLE_SHARE = 0.5;
/** At most this many heroes wait on the bench (the heroes not chosen for the squad); a Hire that would add an eleventh is refused. */
export const BENCH_MAX = 10;
/** A run may retry a wave it lost this many times. */
export const MAX_RETRIES = 2;
/** Hp and attack of a hero at each grade (1 to 4), as a multiple of grade 1 (MERGE-TWO, `docs/notes/merge-two.md`). Two of a kind make the
 *  next grade, so grade g holds 2^(g-1) hires (it was three of a kind and 3^(g-1)): the steps are smaller than the old x1.6 a grade so a run
 *  reaches the strength it did at the same gold, and the last step is the biggest, so rank 4 is a prize. Since the skills overhaul's batch 3 a grade
 *  gives health and attack only (the tier skills and the tier 3 discount went, the owner's rule): the steps were [1, 1.3, 1.6, 2.4] while they
 *  came with a better skill, and were raised so a merged party wins about what it won with them (`npm run balance -- --heroes-only
 *  --hero-grade G ...`, docs/notes/skills-1.md). */
export const GRADE_BOOST: readonly number[] = [1, 1.38, 1.85, 3.0];
/** The first grade step (grade 2 over grade 1); a merge's step is at least this. */
export const GRADE_MULT = GRADE_BOOST[1];
/** Hp and attack multiplier of a grade from merging (`GRADE_BOOST`; past the top it keeps the top's). */
export const gradeMult = (grade: number): number => GRADE_BOOST[Math.max(0, Math.min(GRADE_BOOST.length, Math.round(grade)) - 1)];
/** Foes' hp and attack at stage 1, as a share of their stats in `foes.ts`. */
export const FOE_START = 0.55;
/** Foes' hp and attack grow by this share for each stage after the first. */
export const STAGE_GROWTH = 0.2;
export const BOSS_EVERY = 5;
/** Gear drops rise a tier every 8 stages; each army further on drops as if this many stages further. */
const GEAR_STAGES = 6;
/** The stage a run's gear is drawn for at stage n: an army further on drops as if further on (`GEAR_STAGES`), so its shops and finds keep pace. */
export const gearStage = (run: Run, n: number): number => {
  const army = waveArmyOf(run);
  return n + (army ? GEAR_STAGES * Math.max(0, armyIndex(army.id)) : 0);
};
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
  /** A Calamity hero whose grade came from its level (`promoteByLevel`): it multiplies by `CAL_TIER.mult` a tier, not a merge's `GRADE_MULT`. */
  tiered?: boolean;
  /** Run-level XP of a hero in a run that levels its own heroes (`Run.local`; `climb.ts`). */
  xp?: number;
  /** Lasting bumps from a training ground, added to the hero's multipliers. */
  bump?: { hp: number; atk: number };
  /** Skill charge (and an ultimate's charge) kept from the last wave, so a skill half-filled is not lost between waves. */
  charge?: number;
  charge2?: number;
  /** If this hero is a temporary mirror clone, how many floors it remains for. */
  cloneFloors?: number;
  /** Whether this hero is an inverted mirror clone (with snarky quips). */
  inverted?: boolean;
  /** A mirror's clone that stands in for its original on the field (ONE-OF-EACH, the owner's call): the original's roster id. The original
   *  sits out on the bench for the clone's floors and takes its place again when the clone goes (`sitsOut`). Absent in an older save. */
  standsFor?: number;
  /** A guest hero (GUEST-HERO, `guest.ts`): hired at the passing cart for this run only, it fights as a sixth beside the five, never
   *  merges or is recycled, earns no lasting XP and leaves when the run ends. Absent in an older save. */
  guest?: boolean;
  /** SUMMON-TIMERS (`carry.ts`): the summons this hero kept standing at the end of the last wave won (each with its share of health and the
   *  ms of its timer left), and the shapes it wore. Put back as the next wave's fight begins if it is fielded; absent in an older save. */
  summons?: KeptSummon[];
  form?: KeptForm[];
}

/** What the next fight carries over from an event: heroes' multipliers, foes' multiplier, a prize for a win. */
export interface Buff {
  hp?: number;
  atk?: number;
  foes?: number;
  gold?: number;
  gear?: Gear;
  /** Move speed multiplier for heroes (e.g. 1.25 for +25% move speed from Wandering Bard). */
  speed?: number;
  /** How many stages/floors this buff lasts (default 1). */
  duration?: number;
  /** A twist (`twists.ts`, by id) the next fight is fought under: a storm, an ambush, a blessing from the road's events (`midEvents.ts`). One fight only. */
  twist?: string;
}

export interface Run {
  /** New Calamity runs only; old saves keep their original rules. */
  rift?: Rift;
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
  /** An army run's last boss has fallen, or a daily's boss of the day (the run is over, and won). */
  cleared?: boolean;
  /** The heroes level, and wear only what they find, within this run (a tower climb or a calamity): the meta's levels, gear and talents do not count (`climb.ts`). */
  local?: boolean;
  /** The tower's own state (its map, position, wounds and shop); set on a tower or calamity run (`tower.ts`). */
  tower?: TowerState;
  /** An army run's tally for its stars (`armyStars.ts`): the battle time so far, heroes lost over the run, heroes lost in the fight with the last boss, and heroes lost in all the boss fights (the mid-bosses too). */
  tally?: { ms: number; lost: number; bossLost: number; bossFell?: number };
  /** Retries used so far (`MAX_RETRIES` in all). */
  retries?: number;
  /** The whole run's figures for the recap shown when it ends (`runRecap.ts`). */
  recap?: RunRecap;
  /** A themed daily's goal was met when the boss of the day fell (`dailyThemes.ts`). */
  themeMet?: boolean;
  /** The road's memory for the events between waves (MID-EVENTS, `midEvents.ts`): the kinds seen this run, and debts and favours that come back later. Absent in an older save. */
  road?: RoadState;
}

/** A run that is not an ordinary one: an army's campaign (its stages are the army's waves), today's daily challenge (`practice` for a replay that does not count), or the endless tower. */
export type RunMode = { kind: 'army'; army: string; tier?: number; scenario?: ScenarioId | 'classic' } | { kind: 'daily'; date: number; practice: boolean; scale?: number; theme?: string } | { kind: 'tower' } | { kind: 'calamity'; ascension?: number } | QuestMode;
/** A quest battle (`questBattles.ts`): the battle, the heroes of its required cast who came (slot by slot), and `practice` for a
 *  replay of one already won (it pays nothing). */
export type QuestMode = { kind: 'quest'; quest: string; cast: string[]; practice?: boolean };

/** A new run drawing from `party` (the hero kinds its summons and starting heroes come from). */
export function newRun(seed: number, party: readonly string[] = HEROES, castle: Castle = newCastle(), free = 2, gold = START_GOLD): Run {
  const run: Run = { seed, gold: gold + bonusGold(castle), stage: 1, summons: 0, roster: [], nextId: 1, squad: [], over: false, best: 1, pool: [...party], castle: { ...castle } };
  // (an ordinary run gets) two grade-1 heroes, drawn from the same stream as every summon but free
  // (a second of a kind waits on the bench: one of each hero on the field, ONE-OF-EACH)
  for (let i = 0; i < free; i++) {
    const h = add(run, draw(run), SUMMON_BASE);
    if (canJoin(run, h.id)) run.squad.push(h.id);
  }
  return run;
}

/** An army run's starting gold: exactly the first two hires (`summonCost` at 0 and 1 summons), and no hero to start with (`docs/notes/menus-unlocks.md`). */
export const ARMY_START_GOLD = SUMMON_BASE + (SUMMON_BASE + SUMMON_STEP);

/** A run that fights an army: from wave 1, with the party and castle as they stand, no hero on the bench and the gold for two hires. */
export function armyRun(seed: number, army: string, party: readonly string[] = HEROES, castle: Castle = newCastle(), tier = 0): Run {
  const run = newRun(seed, party, castle, 0, ARMY_START_GOLD);
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
  // (and its summons and shapes, with what is left of their timers: SUMMON-TIMERS)
  keepSummons(run, b);
}

/** Add a finished fight to an army run's tally: its time, the heroes that fell (summoned helpers do not count), and whether this was the last boss. */
export function noteFight(run: Run, b: Battle): void {
  const army = waveArmyOf(run);
  if (!army) return;
  const fell = b.units.filter((u) => u.side === 'hero' && !u.alive && !UNITS[u.def].summon).length;
  const t = (run.tally ??= { ms: 0, lost: 0, bossLost: 0 });
  t.ms += b.t;
  t.lost += fell;
  if (run.stage >= army.waves.length) t.bossLost = fell;
  if (army.waves[run.stage - 1]?.boss) t.bossFell = (t.bossFell ?? 0) + fell;
  // (a themed daily: the heroes fielded against the boss of the day, for its goal)
  const theme = runTheme(run);
  if (theme && run.stage >= army.waves.length && b.phase === 'won') run.themeMet = themeGoalMet(theme, kindsOf(b.units));
}
/** The army a run is fighting, if it is an army run. */
export const armyOfRun = (run: Run): Army | undefined => (run.mode?.kind === 'army' ? armyById(run.mode.army) : undefined);
/** The fixed run of waves a run is fighting: an army's, or a date's daily (`daily.ts`, an army in shape that is in no list and keeps no army record). */
export const waveArmyOf = (run: Run): Army | undefined =>
  run.mode?.kind === 'daily' ? dailyArmy(run.mode.date, runTheme(run)) : run.mode?.kind === 'quest' ? questArmy(run.mode.quest) : armyOfRun(run);
/** A themed daily run's theme (DAILY-BUILDS: named in its mode when it began), or null for any other run, a daily before the themes among them. */
export const runTheme = (run: Run): DailyTheme | null => (run.mode?.kind === 'daily' ? themeById(run.mode.theme) : null);
/** Whether stage n of the run (its current one by default) has a boss. */
export const isBossRun = (run: Run, stage = run.stage): boolean => {
  if (run.tower) return run.tower.cur?.kind === 'boss';
  const a = waveArmyOf(run);
  return a ? !!a.waves[stage - 1]?.boss : isBossStage(stage);
};
/** How many waves the run's army has (0 for any other run). */
export const wavesOf = (run: Run): number => waveArmyOf(run)?.waves.length ?? 0;

/** How many heroes the run fields: five, or ten in a calamity. */
export const squadLimit = (run: Run): number => (run.mode?.kind === 'calamity' ? CALAMITY_SQUAD : SQUAD);

/** Hire a particular grade-1 hero for `paid` gold (the tower's shop sells them); it waits to be merged like any hire. */
export const recruit = (run: Run, kind: string, paid = SUMMON_BASE): Owned => add(run, kind, paid);

const draw = (run: Run): string => {
  const pool = run.pool?.length ? run.pool : HEROES;
  return pool[new Rng(mixSeed(run.seed, 0x5033, run.nextId)).int(0, pool.length - 1)];
};
export const summonCost = (run: Run) => SUMMON_BASE + SUMMON_STEP * run.summons;

/** The hero the next Hire would bring: its kind, and its grade (now and then a summon arrives a grade up, from its own side stream so the draws stay as they were). */
const nextHire = (run: Run): { kind: string; grade: number } => ({
  kind: draw(run),
  grade: new Rng(mixSeed(run.seed, 0x1c4b, run.nextId)).chance(luckyChance(run)) ? 2 : 1,
});

/** Whether the bench is at its limit (`BENCH_MAX`). */
export const benchFull = (run: Run): boolean => benched(run).length >= BENCH_MAX;

/** Why a Hire is refused now, if it is: the run is over, gold is short, or the bench is full (nothing merges on its own any more, so the
 *  player merges a pair, recycles a hero or fields one to make room). */
export function hireBlock(run: Run): 'over' | 'gold' | 'bench' | null {
  if (run.over) return 'over';
  if (run.gold < summonCost(run)) return 'gold';
  return benchFull(run) ? 'bench' : null;
}

/** Buy a random hero: grade 1, or now and then grade 2 (`luckyChance`). Returns it, or null when too poor, the bench is full or the run is over. */
export function summon(run: Run): Owned | null {
  if (hireBlock(run)) return null;
  const cost = summonCost(run);
  run.gold -= cost;
  noteGold(run, 'spent', cost);
  run.summons++;
  const { kind, grade } = nextHire(run);
  return add(run, kind, cost, grade);
}

/** The chance a bought summon arrives already at grade 2 (two stars). */
export const LUCKY_SUMMON = 0.05;
/** A run's chance of a grade-2 summon: the base for now; castle buildings or items can add to it later. */
export const luckyChance = (_run: Run): number => LUCKY_SUMMON;

/** Add a hero bought at `paid` gold (grade 1 unless told otherwise). It does not merge: the player merges pairs (`merge.ts`). */
function add(run: Run, kind: string, paid: number, grade = 1): Owned {
  const made: Owned = { id: run.nextId++, kind, grade, paid };
  run.roster.push(made);
  return made;
}

/** The gold paid into a hero. A hero from an older save has no record: it is taken to have cost the base price of a summon for each grade-1 hero in it (two a grade). */
export const paidOf = (h: Owned): number => h.paid ?? SUMMON_BASE * 2 ** (h.grade - 1);
/** The gold recycling a hero pays back: half the Hire price as it stands now, rounded, at least 1 (whatever the hero's grade or cost). */
export const recycleValue = (run: Run): number => Math.max(1, Math.round(summonCost(run) * RECYCLE_SHARE));

/** Recycle a hero for gold: it leaves the roster and the squad, its gear goes back to the pack, and `recycleValue` is paid. The price of the next summon does not
 *  change, so this is no way to reroll for free. Returns the gold paid, or null when the hero is unknown, the run is over, or it is the last hero. */
export function recycle(run: Run, heroId: number): number | null {
  const h = heroOf(run, heroId);
  // (a guest is not the party's to sell: GUEST-HERO)
  if (!h || h.guest || run.over || run.roster.length <= 1 || run.rift?.starter === heroId) return null;
  // (a quest battle's required hero is not recycled while it is the last of its kind: it must fight)
  if (isCastHero(run, h)) return null;
  const gold = recycleValue(run);
  for (const g of Object.values(h.gear ?? {})) (run.items ??= []).push(g);
  run.roster = run.roster.filter((x) => x.id !== heroId);
  run.squad = run.squad.filter((id) => id !== heroId);
  run.gold += gold;
  noteGold(run, 'earned', gold);
  return gold;
}

/** Whether a hero is the last of its kind among a quest battle's required cast (it cannot be recycled). */
export const isCastHero = (run: Run, h: Owned): boolean => run.mode?.kind === 'quest' && run.mode.cast.includes(h.kind) && run.roster.filter((x) => x.kind === h.kind).length <= 1;

/** Retries left in the run. */
export const retriesLeft = (run: Run): number => Math.max(0, MAX_RETRIES - (run.retries ?? 0));
/** The gold a retry pays to help the second go: one Hire at the price it stands at. */
export const retryGold = (run: Run): number => summonCost(run);
/** Whether a wave just lost may be tried again: the run is still going, has hearts (retries) left, and is not the tower or the calamity (which have their own way of failing). Armies and the daily lose hearts; with none left the loss is settled by `finish` and the run ends. */
export const canRetry = (run: Run): boolean => !run.over && !run.tower && retriesLeft(run) > 0;
/** What a fall brings: a heart burns and the same wave starts again on its own (`retryWave`), or the run ends (no heart left, or a mode with none). */
export const fallOutcome = (run: Run): 'heart' | 'end' => (canRetry(run) ? 'heart' : 'end');
/** Retry the wave: the same stage with the same buff, a `retryGold` boost to spend, one retry used. Returns the gold paid, or null when no retry may be had. */
export function retryWave(run: Run): number | null {
  if (!canRetry(run)) return null;
  const gold = retryGold(run);
  run.retries = (run.retries ?? 0) + 1;
  run.gold += gold;
  noteGold(run, 'earned', gold);
  return gold;
}

export const heroOf = (run: Run, id: number) => run.roster.find((h) => h.id === id);
/** Whether a roster hero is a cursed mirror's clone: a guest for a few floors, never counted as one of the party's own (room, hires' catch-up XP). */
export const isClone = (h: Owned): boolean => h.cloneFloors !== undefined;
/** The party's own heroes: the roster without a mirror's clone or a guest (GUEST-HERO). */
export const ownHeroes = (run: Run): Owned[] => run.roster.filter((h) => !isClone(h) && !h.guest);
export const benched = (run: Run) => run.roster.filter((h) => !run.squad.includes(h.id));

/** Hp and attack multipliers of a grade, times the hero kind's rank (from its shards) and its level (from its XP). Every hero kind is alike here: what sets one apart is its own stats and skill. */
export const gradeBoost = (grade: number, rank = 0, level = 1): Boost => {
  const k = gradeMult(grade) * rankMult(rank);
  const lv = lastingBoost(level);
  return { hp: k * lv.hp, atk: k * lv.atk, grade, level };
};
/** A roster hero's whole boost: grade and rank, its gear, its training bumps, and the kind's permanent equipment (`equip`, from `equipStats(meta, kind)`; none when it wears nothing). */
export function boostOf(h: Owned, rank = 0, level = 1, equip?: EquipStats): Boost {
  const base = gradeBoost(h.grade, rank, level);
  const g = gearBoost(h.gear);
  return { ...base, hp: base.hp! * g.hp! + (h.bump?.hp ?? 0), atk: base.atk! * g.atk! + (h.bump?.atk ?? 0), ...(equip ? { equip } : {}), ...(h.charge ? { charge: h.charge } : {}), ...(h.charge2 ? { charge2: h.charge2 } : {}), ...keptBoost(h) };
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
export const areaFor = (stage: number): Area => CLASSIC_AREAS[Math.floor((stage - 1) / AREA_STAGES) % CLASSIC_AREAS.length];
/** How the foes of stage n are boosted. */
export function stageBoost(stage: number): Stage {
  const k = FOE_START * (1 + STAGE_GROWTH * (stage - 1));
  return { foes: { hp: k, atk: k }, boss: isBossStage(stage) ? BOSS : undefined };
}
/** Gold a win on stage n pays. */
export const reward = (stage: number) => 20 + 6 * stage + (isBossStage(stage) ? 30 : 0);

/** The fight board a wave is fought on: the seed of its own, as it has always been. */
export const boardSeedOf = (run: Run, stage: number): number => mixSeed(run.seed, 0x57a6e, stage);

const chains = new Map<string, Section[]>();
/** An army run's long map: one section for each wave, joined edge to edge (`chain.ts`). Worked out from the run's seed alone, so a saved run rebuilds it; null for any other run. */
export function chainOf(run: Run): Section[] | null {
  const army = waveArmyOf(run);
  if (!army) return null;
  // (a run with no land of its own fights every wave on the one land its seed picks from its army's: `landOf`)
  const area = run.area ?? landOf(army, run.seed);
  const scenario = run.mode?.kind === 'army' ? (run.mode.scenario === 'classic' ? undefined : (run.mode.scenario ?? scenarioForArmy(army.id))) : undefined;
  const key = `${run.seed}:${army.id}:${area}:${scenario ?? 'standard'}`;
  let c = chains.get(key);
  if (!c) {
    c = scenario
      ? planScenario(run.seed, scenario, army.waves.length, (n) => !!army.waves[n - 1].boss, area).sections
      : buildChain(run.seed, army.waves.length, area, (n) => boardSeedOf(run, n), (n) => !!army.waves[n - 1].boss);
    if (chains.size > 32) chains.clear();
    chains.set(key, c);
  }
  return c;
}

/** A fresh fight for the run's current stage (a different board each stage; an army's is its section of the long map). */
/** Make the fight for the run's stage. `duchess`: whether Duchess the goat may join (`duchessFight.ts`); the page passes 'roll', and every headless
 *  caller (the tests, the balance tools) leaves it 'never', so their fights are as they were. A mode she stays out of never has her. */
export function startStage(run: Run, duchess: DuchessWish = 'never'): Battle {
  const rl = relicEffects(run.relics);
  const army = waveArmyOf(run);
  // (a floor of the tower brings its own band and strength, fixed when the node was entered)
  const node = run.tower?.cur?.fight;
  const base = node ? node.stage : army ? waveBoost(army, run.stage, tierOfRun(run)) : stageBoost(run.stage);
  const castle = heroBoost(run.castle);
  const foes = run.buff?.foes ?? 1;
  // (the spire and the Calamity: the foes answer the castle's hp and attack, the one lasting power that reaches those runs; the daily's answer the squad's lasting power, `dailyScale`)
  const calAns = run.mode?.kind === 'calamity' ? heroBoost(run.castle) : undefined;
  const ans = run.local ? (calAns ? { hp: foeAnswer(run.castle).hp! * calAns.hp! ** CAL_CASTLE_EXTRA, atk: foeAnswer(run.castle).atk! * calAns.atk! ** CAL_CASTLE_EXTRA } : foeAnswer(run.castle)) : run.mode?.kind === 'daily' && run.mode.scale ? { hp: run.mode.scale, atk: run.mode.scale } : undefined;
  const { atk, hp, mana, first, revive, gold: _gold, set, ...team } = rl;
  const section = chainOf(run)?.[run.stage - 1];
  // (a themed daily: its twist on every wave, its featured trait, and a swarm's thin foes)
  const theme = runTheme(run);
  const thin = theme?.swarm && army && !army.waves[run.stage - 1]?.boss ? SWARM_HP : 1;
  return startBattle(boardSeedOf(run, run.stage), node ? node.band : army ? waveFoes(army, run.stage, tierOfRun(run)) : bandFor(run.stage), {
    ...base,
    ...(run.rift ? { rift: { ...run.rift }, riftBoss: run.tower?.cur?.kind === 'boss' } : {}),
    area: run.area ?? base.area ?? areaFor(run.stage),
    board: section?.board ?? base.board,
    foes: { hp: base.foes!.hp! * foes * (ans?.hp ?? 1) * thin, atk: base.foes!.atk! * foes * (ans?.atk ?? 1), speed: base.foes!.speed },
    heroes: { hp: castle.hp! * (hp ?? 1) * (run.buff?.hp ?? 1), atk: castle.atk! * (atk ?? 1) * (run.buff?.atk ?? 1) },
    mana: manaRate(run.castle) * (mana ?? 1),
    move: moveRate(run.castle) * (run.buff?.speed ?? 1),
    relics: Object.keys(team).length || first || revive || set ? { team, first, revive, set } : undefined,
    ...(theme ? { twist: themeFx(theme), featured: theme.trait } : {}),
    // (a road event's twist for this fight, laid over a themed daily's own: MID-EVENTS)
    ...(run.buff?.twist && TWISTS[run.buff.twist] ? { twist: { ...(theme ? themeFx(theme) : {}), ...TWISTS[run.buff.twist].fx } } : {}),
    // (a quest battle has Duchess every time its story has her, and never otherwise: no roll)
    duchess: run.mode?.kind === 'quest' ? (questBattleById(run.mode.quest)?.duchess ? 'always' : 'never') : duchessModeOk(run.mode) ? duchess : 'never',
  });
}

/** Settle a finished fight: a win pays (and its stars pay gold) and moves on to the next stage; a loss ends the run. */
export function finish(run: Run, won: boolean, stars = 0): void {
  run.best = Math.max(run.best, run.stage);
  run.found = [];
  run.stars = (run.stars ?? 0) + stars;
  if (won) {
    const boss = isBossRun(run);
    const army = waveArmyOf(run);
    const bonus = (relicEffects(run.relics).gold ?? 0) + (run.buff?.gold ?? 0);
    const pay = reward(run.stage) + starGold(stars) + bonus;
    run.gold += pay;
    noteGold(run, 'earned', pay);
    // a prize for a cursed path, and a sure piece of gear from a boss (one tier up, from its own stream)
    const prizes: Gear[] = run.buff?.gear ? [run.buff.gear] : [];
    if (boss) prizes.push(dropGear(new Rng(mixSeed(run.seed, 0x6ea2, run.stage)), (run.nextGear = (run.nextGear ?? 1) + 1) - 1, run.stage + (army ? GEAR_STAGES * Math.max(0, armyIndex(army.id)) : 0), 1));
    for (const g of prizes) {
      (run.items ??= []).push(g);
      run.found.push(`${g.name} (${g.slot}, ${gearText(g)})`);
    }
    if (run.buff?.gold) run.found.push(`${run.buff.gold} gold from the cursed path`);
    if (army && run.stage >= army.waves.length) {
      // (the army's last boss has fallen, or the day's: the run is won and over)
      run.cleared = true;
      run.over = true;
      run.event = undefined;
    } else {
      run.stage++;
      // (the endless tower has no events, nor a quest battle: its story is its own)
      run.event = run.mode?.kind !== 'tower' && run.mode?.kind !== 'quest' && eventAfter(run.stage - 1, boss) ? drawEvent(run, run.stage - 1) : undefined;
    }
  } else run.over = true;
  spendBuff(run);
}

/** A fight has used the buff: one that lasts more fights (`duration`, the bard's or the void well's) keeps its hp, attack and speed for the next, and
 *  loses its one-fight prizes (gold, gear, a foes' multiplier); any other is gone. Counted by fights, not by the quiet floors between them. */
export function spendBuff(run: Run): void {
  const b = run.buff;
  const left = (b?.duration ?? 1) - 1;
  if (!b || left <= 0) {
    run.buff = undefined;
    return;
  }
  run.buff = { ...(b.hp ? { hp: b.hp } : {}), ...(b.atk ? { atk: b.atk } : {}), ...(b.speed ? { speed: b.speed } : {}), duration: left };
}

/** ONE-OF-EACH (`docs/notes/one-of-each.md`): the hero of kind `kind` in the squad, other than hero `except`, if there is one. The squad is
 *  the heroes on the field, so it holds one hero of each kind at most; copies wait on the bench to be merged. */
export const squadTwin = (run: Run, kind: string, except?: number): Owned | undefined =>
  run.squad.map((id) => heroOf(run, id)).find((h): h is Owned => !!h && h.kind === kind && h.id !== except);

/** Whether hero `id` sits out: a mirror's clone stands in for it on the field for the clone's floors (ONE-OF-EACH). */
export const sitsOut = (run: Run, id: number): boolean => run.roster.some((x) => x.standsFor === id && x.cloneFloors !== undefined);

/** How many of the squad's places are taken: the guest has a sixth place of its own and is not counted (GUEST-HERO). */
export const squadUsed = (run: Run): number => run.squad.filter((id) => !heroOf(run, id)?.guest).length;

/** Whether hero `id` may join the squad now: there is room, no other hero of its kind is in it, and no mirror's clone stands in for it
 *  (ONE-OF-EACH). A guest always has room: its place is an extra one beyond the five (GUEST-HERO). */
export function canJoin(run: Run, id: number): boolean {
  const h = heroOf(run, id);
  return !!h && !run.squad.includes(id) && (h.guest || squadUsed(run) < squadLimit(run)) && !squadTwin(run, h.kind, id) && !sitsOut(run, id);
}

/** Choose or release a hero for the fight. Returns whether the squad changed. A second hero of a kind already chosen is refused (ONE-OF-EACH). */
export function setSquad(run: Run, id: number, on: boolean): boolean {
  const has = run.squad.includes(id);
  if (on === has || !heroOf(run, id)) return false;
  if (on) {
    if (!canJoin(run, id)) return false;
    run.squad.push(id);
  } else run.squad = run.squad.filter((x) => x !== id);
  return true;
}

const KEY = 'legends.run';
/** The tower, the calamity and a quest battle each keep their own save, so a climb (or a quest battle) survives the armies' runs and a reload (`saveSlot`). */
export const SLOT_KEYS = { tower: 'legends.tower', calamity: 'legends.calamity', quest: 'legends.questRun' } as const;
export type SlotKind = keyof typeof SLOT_KEYS;
/** Save a run where it belongs: a tower or calamity run in its own slot, any other in the ordinary one. */
export const saveSlot = (run: Run, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(run.mode?.kind === 'tower' || run.mode?.kind === 'calamity' || run.mode?.kind === 'quest' ? SLOT_KEYS[run.mode.kind] : KEY, JSON.stringify(run));
/** The run saved in a mode's slot, if it is still going (a lost or cleared one is no run to carry on). */
export function loadSlot(kind: SlotKind, store: Pick<Storage, 'getItem'> = localStorage): Run | null {
  try {
    const r = JSON.parse(store.getItem(SLOT_KEYS[kind]) ?? 'null') as Run | null;
    return r && Array.isArray(r.roster) && typeof r.gold === 'number' && r.mode?.kind === kind && !r.over && runFits(r) ? r : null;
  } catch {
    return null;
  }
}
/** Empty a mode's slot (the run was abandoned or ended). */
export const dropSlot = (kind: SlotKind, store: Pick<Storage, 'removeItem'> = localStorage) => store.removeItem(SLOT_KEYS[kind]);
/** An older save kept the tower in the ordinary slot: move it to the tower's own. Returns whether it moved. */
export function adoptOldTower(store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): boolean {
  const old = loadRun(store);
  if (!old || old.over || old.mode?.kind !== 'tower' || store.getItem(SLOT_KEYS.tower)) return false;
  saveSlot(old, store);
  store.removeItem(KEY);
  return true;
}
/** Whether a saved run can still be played: a run of fixed waves (an army's, or the daily's ten) must not stand past its last
 *  wave. An endless daily saved by an older version could be on stage 14 of what is now ten waves, and starting it broke. */
export const runFits = (r: Run): boolean => {
  if (r.mode?.kind === 'army' && r.mode.scenario !== undefined && r.mode.scenario !== 'classic' && !isScenario(r.mode.scenario)) return false;
  // (a quest battle no longer in the game, or with no cast, is no run to carry on)
  if (r.mode?.kind === 'quest' && (!questBattleById(r.mode.quest) || !Array.isArray(r.mode.cast))) return false;
  const army = waveArmyOf(r);
  return !army || (r.stage >= 1 && r.stage <= army.waves.length);
};
export const saveRun = (run: Run, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(KEY, JSON.stringify(run));
export function loadRun(store: Pick<Storage, 'getItem'> = localStorage): Run | null {
  try {
    const r = JSON.parse(store.getItem(KEY) ?? 'null') as Run | null;
    return r && Array.isArray(r.roster) && typeof r.gold === 'number' && runFits(r) ? r : null;
  } catch {
    return null;
  }
}
