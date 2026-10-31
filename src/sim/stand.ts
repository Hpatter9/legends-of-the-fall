// The Last Stand: an endless battle on a big square field (`standField.ts`). The king stands on his keep in the middle, the
// heroes guard posts round him (`standAi.ts`), and wave after wave of foes comes in from the edges, bigger each time. Every
// fifth wave is a boss. A hero who falls stays down for the rest of the run (`StandHero.fallen`); when a wave is down to its last
// `HUNT_AT` foes the heroes leave their posts to hunt them down (`StandMode.hunt`), and walk back after; before that, once every foe of a
// wave is in, heroes with nothing near their posts go to help where the fighting is (`standHelp.ts`). Between waves there is a short break (`BREAK_MS`) to spend gold: level a hero up, buy a
// relic, heal the king (at any time, the break is a breather). The heroes also level up by themselves, in the fight, from kills and wave clears. The run ends when
// the king falls; its score is the best wave reached (`Meta.stand`).
//
// One `Battle` lasts the whole run (with `Battle.stand` set): the foes are added to it a few at a time, the dead are dropped
// a moment after they fall. The saved run (`StandRun`) is a small record kept at the start of each break; the battle is built
// again from it. Pure rules: no Pixi, no DOM; every draw is a side stream of the run's seed.

import { ULT_FILL } from './heroKits';
import { grantOres, standOres, type OreDrop } from './awakenMats';
import { startBattle, addUnit, stepBattle, TICK_MS, creditOf, FOG_RANGE, type Battle, type BattleEvent, type Boost, type Unit } from './battle';
import { weatherOf } from './weather';
import { actOfHall, CHOICE_MS, caveInOf, exitOf, FLEE_MS, hallOfWave, HOLD_HARDER, holdGold, isHall, RETREAT_MS, retreatAfter, ROOM_BREAK_MS, ROOM_NAMES, type Exit } from './standActs';
import { tileAt, standable, type Area, type At } from './board';
import { canPost, edgeTiles, KING_AT, ringPlan, standArea, standBoard, type Edge, type Role } from './standField';
import { hallOf, hallPlan, type HallKind } from './standHalls';
import { isTank, KING_DEF, leashOf } from './standAi';
import { newHelpBook, planHelp, type HelpBook } from './standHelp';
import { CLASS_OF } from './starter';
import { BOSS_BANDS, FIELD_BANDS, FOE_BANDS, isBoss } from './foes';
import { armyById, ARMIES, armyIndex, armyUnlocked } from './armies';
import { mixSeed, Rng } from './rng';
import { ALL_RELIC_IDS, convertRelics, fightRelics, mergeEffects, pickRelic, pricedFor, RELIC_BOOK, RELIC_NOTE, relicEffects, relicPriceOf, RELICS, type RelicMarks } from './relics';
import { relicFoe, relicStart } from './relicFight';
import { addRelicMarks, relicCtx } from './run';
import { fxStart } from './equipFx';
import { kindsOf, traitEffects } from './traits';
import { killXp, levelOfKind } from './levels';
import { boostOf, FOE_START } from './run';
import { heroBoost, manaRate, moveRate, type Castle } from './castle';
import { heroRank, type Meta, type StashChest } from './meta';
import { heroStats } from './talents';
import { awakenedOf } from './awaken';
import { chestsFor, gearChance, settleTower } from './tower';
import type { Run } from './run';
import { grantEquipment, rollEquipment, itemName } from './equipment';
import { UNITS } from './units';
import { ailmentsOf } from './ailments';

/* ------------------------------------------------------------------ the numbers */

/** The break between waves (ms): the shop's time. */
export const BREAK_MS = 5000;
/** The most foes on the field at once; what a wave would add past it is paid in strength instead. */
export const FIELD_CAP = 48;
/** Heroes in the party: eight, all on the field from the start (no hiring, no bench). */
export const FIELD_HEROES = 8;
/** The king's health. */
export const KING_HP = 1000;
/** The share of the king's health a heal gives back. */
export const KING_HEAL = 0.4;
/** Foes' hp and attack at wave 1 (a share of their stats in `foes.ts`), and the share they gain each wave after. */
export const WAVE_START = FOE_START;
export const WAVE_GROWTH = 0.4;
/** From wave `WAVE_KNEE` on the climb eases to `WAVE_GROWTH_LATE` a wave: steep at first, so the early waves bite at once; gentler later, so a stronger party still goes further. */
export const WAVE_KNEE = 10;
export const WAVE_GROWTH_LATE = 0.26;
/** The castle's rooms (STAND-003) bring the foes in by two or three breaches, onto the posts: their strength is eased by this to keep the agreed pace
 *  (0.85 until the idle heroes went to help, STAND-004, which made the waves easier: 0.88, with a steeper late and deep climb; SPELLS-RETUNE 1.2, so a
 *  stand whose Auto casts the king's spells holds the waves it did for a bot that never cast, `docs/notes/spells-retune.md`). */
export const HALL_EASE = 1.2;
/** From wave `WAVE_DEEP` the climb steepens again by `WAVE_GROWTH_DEEP` a wave (STAND-003: the strongest parties kept near the agreed pace, about wave 25 at level 100;
 *  STAND-004 moved it from wave 22 at 0.6 to wave 18 at 0.35, and the late climb from 0.1 to 0.14, for the heroes who go to help; ULT-CHARGE, for the
 *  ultimates that now come round about once a wave, the late climb to 0.2 and the deep one to 0.29, so the climb past wave 18 is as steep as it was;
 *  STATUS-FX, for the heroes' ailments, which carried a level-30 party three waves further, the late climb to 0.26 and the deep one to 0.24). */
export const WAVE_DEEP = 18;
export const WAVE_GROWTH_DEEP = 0.24;
/** A wave's size: foes at wave 1 and the foes each wave adds. */
export const WAVE_BASE = 4;
export const WAVE_STEP = 2;
/** Every `BOSS_EVERY`th wave is a boss wave; the band changes every `BAND_WAVES` waves. */
export const BOSS_EVERY = 5;
export const BAND_WAVES = 3;
/** A boss's hp and attack against the same wave's foes (its own stats in `foes.ts` are already big): a share that starts low and grows to `BOSS_TOP` by the ninth boss. */
export const BOSS_START = 0.45;
export const BOSS_TOP = 1.0;
export const bossShare = (n: number): number => Math.min(BOSS_TOP, BOSS_START + ((BOSS_TOP - BOSS_START) * (n / BOSS_EVERY - 1)) / 8);
/** The foes of a wave come in over this long at most (ms), a gap between each. */
export const SPAWN_SPAN = 7000;
/** A wave that has gone on this long (ms) enrages its foes: their attack rises `ENRAGE_STEP` each `ENRAGE_EVERY` ms, so no wave lasts for ever. */
export const ENRAGE_AFTER = 75_000;
export const ENRAGE_EVERY = 5000;
export const ENRAGE_STEP = 1.1;
/** A cleared wave heals the heroes standing by this share of their health. The fallen stay down (the owner's ask: a hero who dies does not come back). */
export const CLEAR_HEAL = 0.35;
/** A wave with no foes still to come and this many or fewer on the field is hunted down: the heroes' leashes are lifted until it clears. */
export const HUNT_AT = 2;
/** Dead foes are dropped from the battle's list this long (ms) after they fall (the page has shown them by then). */
export const CORPSE_MS = 2600;

/** Gold for a kill, and for clearing wave `n`. */
export const killGold = (n: number): number => Math.max(1, Math.round((2 + Math.floor(n / 3)) / 2));
export const clearGold = (n: number): number => 12 + 4 * n;
export const BOSS_GOLD = 10;
export const START_GOLD = 60;
/** What the buys cost. */
export const levelCost = (lv: number): number => 25 + 11 * lv;
export const relicCost = (owned: number, wave: number): number => 60 + 12 * owned + 3 * wave;
export const healCost = (wave: number): number => 25 + 3 * wave;
/** The crowns a cleared wave pays: climbs to wave 8 and stays, so a run that gets less far (the waves are harder) is paid about what the same party was paid before. */
export const waveCrowns = (n: number): number => 8 + 16 * Math.min(n, 8);
/** How many relics a break offers. */
export const OFFER = 3;

/** XP: a kill is worth a tenth of the foe kind's own hp (a boss three times that); the killer takes it all, every other hero a share; a wave clear gives each hero `waveXp`. */
export const XP_ALL_SHARE = 0.25;
export const waveXp = (n: number): number => 20 + 4 * n;
export const xpNeed = (lv: number): number => 90 + 45 * lv;
/** What a level adds, as shares of the hero's base hp and attack. */
export const LV_HP = 0.07;
export const LV_ATK = 0.06;
export const lvMult = (lv: number): { hp: number; atk: number } => ({ hp: 1 + LV_HP * lv, atk: 1 + LV_ATK * lv });

/* ------------------------------------------------------------------ the state */

/** A hero of the run: its kind, run level and XP, and the tile it guards (null while it waits on the bench). */
export interface StandHero {
  id: number;
  kind: string;
  lv: number;
  xp: number;
  post: [number, number] | null;
  /** Fallen in this run: stays down to its end (absent in older saves, where everyone saved was standing). */
  fallen?: boolean;
  /** The foes it has felled this run (its summons' kills count for it); absent is none. */
  kills?: number;
}

/** What is saved of a run: enough to build it again at the start of a break. */
export interface StandRun {
  v: 1;
  seed: number;
  area: Area;
  /** The room of the castle the run is fought in (`standHalls.ts`); absent in a run saved before the rooms, which takes the seed's. */
  hall?: HallKind;
  /** The act of the retreat the room is (0, the courtyard, to 3, the throne room: `standActs.ts`); absent in a run saved before the retreat
   *  (its room was drawn from the seed) until its first fall back. */
  act?: number;
  /** An act is over and the guard is to fall back to `to`: the choice to hold one more wave is open (`hold` unset), or the bonus wave is being
   *  fought (`hold` set). Absent the rest of the time. */
  retreat?: { to: HallKind; hold?: boolean };
  /** The armies open when it began, whose foes join the waves later on. */
  armies: string[];
  /** The wave about to come (or being fought). */
  wave: number;
  gold: number;
  heroes: StandHero[];
  nextId: number;
  relics: string[];
  /** RELICS-2: the run's tally the growing relics read (waves won, elites felled, heroes fallen, the Phoenix's rises); absent until a wave is cleared. */
  relicMarks?: RelicMarks;
  /** The relics' catalogue the run was saved with (`RELIC_BOOK`); absent in a save from before RELICS-2, converted as it loads. */
  relicBook?: number;
  /** A line for the next break, once (the relics converted). */
  relicNote?: string;
  /** The relics holding the line has paid this run (STAND-HOLD-RELIC; already in `relics` too). Absent until one is won. */
  heldRelics?: string[];
  /** How many times the line has been held (the bonus wave won) this run (QUESTS-1b); none in a run from before. */
  holds?: number;
  offer: string[];
  /** The king's health as a share of the whole. */
  king: number;
  kills: number;
  earned: number;
  /** The best wave reached before this run (for the "new best" line). */
  prevBest: number;
  over: boolean;
  best: number;
  summary?: StandSummary;
}

/** What a finished run pays (kept on the run, shown on the end screen). */
export interface StandSummary {
  best: number;
  cleared: number;
  crowns: number;
  bronze: number;
  silver: number;
  gold: number;
  gear: string[];
  kills: number;
  heroes: number;
  relics: number;
  /** How many of them holding the line paid (absent when none). */
  heldRelics?: number;
  /** How many times the line was held (absent when none). */
  holds?: number;
  newBest: boolean;
  /** Rift ores a new record paid (`awakenMats.ts`: a couple for each tenth wave passed for the first time); missing when none. */
  ores?: OreDrop[];
  /** The room the king fell in, and its act under the retreat (absent for a run from before the retreat that never fell back); and whether he
   *  fell holding the line (the bonus wave). */
  room?: HallKind;
  act?: number;
  held?: boolean;
}

/** A foe still to come: when (ms into the wave), what, where. */
interface Spawn {
  at: number;
  def: string;
  edge: Edge;
  boost: Boost;
}

/** Things that happened that the page shows (the battle's own events are returned by `stepStand`). */
export type StandNote =
  | { kind: 'wave'; n: number; boss: boolean }
  | { kind: 'clear'; n: number; gold: number }
  | { kind: 'levelup'; unit: number; level: number }
  | { kind: 'kingHit'; dmg: number }
  /** A hero fell, for good. */
  | { kind: 'fallen'; unit: number; hero: number }
  /** The last foes of the wave are being hunted down (the heroes have left their posts). */
  | { kind: 'hunt' }
  /** An act's last wave: its last foes break off and run for the breaches (STAND-RETREAT). */
  | { kind: 'breakOff' }
  /** An act's last wave is cleared: hold one more, harder wave for `gold`, or fall back to `to`. */
  | { kind: 'choice'; n: number; to: HallKind; gold: number; relic: boolean }
  /** The bonus wave begins. */
  | { kind: 'hold'; n: number; boss: boolean }
  /** The bonus wave is cleared: its purse, and the relic it pays (absent when every relic was owned: the gold is doubled instead). */
  | { kind: 'held'; gold: number; relic?: string }
  /** The room is given up: a breach (`cave`) caves in, and the king and the heroes walk out by the door. */
  | { kind: 'retreat'; from: HallKind; to: HallKind; exit: Exit; cave: Edge | null }
  /** The next room is laid out, the heroes at their posts. */
  | { kind: 'room'; hall: HallKind; act: number }
  | { kind: 'over'; best: number };

/** `choice`: an act is over, waiting for hold-or-fall-back; `retreat`: the walk to the door (STAND-RETREAT). */
export type StandPhase = 'deploy' | 'wave' | 'break' | 'choice' | 'retreat' | 'over';

/** What a run needs to know about the player's save: each kind's boost, the castle, the heroes it may hire. */
export interface StandSetup {
  /** A hero kind's hp and attack and the rest of its boost (its lasting level, rank, equipment). */
  boost(kind: string): Boost;
  castle: Castle;
}

export interface Stand {
  run: StandRun;
  setup: StandSetup;
  b: Battle;
  phase: StandPhase;
  king: Unit;
  queue: Spawn[];
  /** When (battle time) the wave began; the break's time left (ms). */
  waveAt: number;
  breakLeft: number;
  /** The next enrage step is due at this battle time. */
  rageAt: number;
  notes: StandNote[];
  /** The trait bonus the heroes have now (so a change in who is on the field is rescaled by the difference). */
  traitHp: number;
  traitAtk: number;
  /** The relics' hp and attack multipliers the heroes have now. */
  relicHp: number;
  relicAtk: number;
  baseMana: number;
  kingGrace: number;
  /** The idle heroes' helping (`standHelp.ts`): who has had nothing to do since when; not saved. Absent on a stand made by hand is a fresh one. */
  help?: HelpBook;
  /** The retreat (STAND-RETREAT): the choice's time left, the walk's time left, the bonus wave under way, when the last foes' running is over. */
  choiceLeft?: number;
  retreatLeft?: number;
  holding?: boolean;
  fleeUntil?: number;
}

/* ------------------------------------------------------------------ waves */

export interface WaveSpec {
  n: number;
  boss: boolean;
  /** The foes in the order they come (a boss first). */
  foes: string[];
  edges: Edge[];
  /** The foes' hp and attack multipliers (a boss gets `BOSS_HP`, `BOSS_ATK` of them on top). */
  hp: number;
  atk: number;
  /** How many foes the wave would have with no cap; past `FIELD_CAP` the strength carries it. */
  raw: number;
}

export const isBossWave = (n: number): boolean => n % BOSS_EVERY === 0;
/** The foes' strength at wave `n`, as a share of their stats in `foes.ts`. */
export const strength = (n: number): number => HALL_EASE * WAVE_START * (1 + WAVE_GROWTH * (Math.min(n, WAVE_KNEE) - 1) + WAVE_GROWTH_LATE * Math.max(0, n - WAVE_KNEE) + WAVE_GROWTH_DEEP * Math.max(0, n - WAVE_DEEP));
/** How many foes wave `n` would have with no cap. */
export const rawCount = (n: number): number => Math.round(WAVE_BASE + WAVE_STEP * n);

/** The ids of the foes a wave draws on at wave `n`: the field band of its block of waves, then (later) the next band and an army's. */
function pools(armies: readonly string[], n: number): { main: string[]; second: string[]; army: string[] } {
  const block = Math.floor((n - 1) / BAND_WAVES);
  const band = (i: number) => FOE_BANDS[FIELD_BANDS[i % FIELD_BANDS.length]];
  const open = armies.map((id) => armyById(id)).filter((a) => !!a);
  const army = open.length ? open[Math.floor(n / 4) % open.length]!.waves.filter((w) => !w.boss).flatMap((w) => [...w.foes]) : [];
  return { main: band(block), second: band(block + 1), army: n >= 10 ? army : [] };
}

/** Which breaches wave `n` comes in by (the edges of the room's breaches): one at first, two from wave 6, three from 11 (a boss wave by one more), as many as the room has. */
export function waveEdges(seed: number, n: number, hall: HallKind = hallOf(seed)): Edge[] {
  const rng = new Rng(mixSeed(seed, 0x57e0, n));
  const pool: Edge[] = hallPlan(seed, hall).breaches.map((b) => b.edge);
  const want = Math.min(pool.length, 1 + Math.floor((n - 1) / 5) + (isBossWave(n) ? 1 : 0));
  const out: Edge[] = [];
  while (out.length < want) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

/** Wave `n` of a run: deterministic from the seed. */
export function waveSpec(seed: number, armies: readonly string[], n: number, hall?: HallKind): WaveSpec {
  const rng = new Rng(mixSeed(seed, 0x57e1, n));
  const raw = rawCount(n);
  const count = Math.min(FIELD_CAP, raw);
  // (what the cap would have cut is paid in strength: half in hp and half in attack, so the wave's threat is what it was)
  const over = Math.sqrt(raw / count);
  const k = strength(n) * over;
  const boss = isBossWave(n);
  const foes = pickFoes(rng, armies, n, count, boss);
  return { n, boss, foes, edges: waveEdges(seed, n, hall), hp: k, atk: k, raw };
}

/** The foes of wave `n` (`count` of them; a boss band first on a boss wave), drawn from `rng`. */
function pickFoes(rng: Rng, armies: readonly string[], n: number, count: number, boss: boolean): string[] {
  const p = pools(armies, n);
  const foes: string[] = [];
  if (boss) foes.push(...FOE_BANDS[BOSS_BANDS[(n / BOSS_EVERY - 1) % BOSS_BANDS.length]]);
  let i = 0;
  while (foes.length < count) {
    // (the band in turn; from wave 13 about a third come from the next band, and from wave 10 a fifth from an army's waves)
    const roll = rng.next();
    const from = n >= 10 && p.army.length && roll < 0.2 ? p.army : n >= 13 && roll < 0.5 ? p.second : p.main;
    foes.push(from === p.main ? from[i++ % from.length] : from[rng.int(0, from.length - 1)]);
  }
  return foes.slice(0, Math.max(count, boss ? 5 : 0));
}

/**
 * The bonus wave of holding the line after wave `n` (STAND-RETREAT): the next wave's foes and size, `HOLD_HARDER` stronger, coming in by every
 * breach of the room at once; no boss. Its own side stream of the seed, so the waves after it are drawn as they would have been.
 */
export function holdSpec(seed: number, armies: readonly string[], n: number, hall: HallKind): WaveSpec {
  const rng = new Rng(mixSeed(seed, 0x401d, n));
  const raw = rawCount(n + 1);
  const count = Math.min(FIELD_CAP, raw);
  const k = strength(n + 1) * Math.sqrt(raw / count) * HOLD_HARDER;
  const foes = pickFoes(rng, armies, n + 1, count, false);
  return { n, boss: false, foes, edges: hallPlan(seed, hall).breaches.map((b) => b.edge), hp: k, atk: k, raw };
}

/** The room a run is in now (an old save's is the seed's). */
export const hallNow = (run: StandRun): HallKind => run.hall ?? hallOf(run.seed);
/** The camp's line for a saved run, its wave and the room it is in: "Wave 7 · Library", "Wave 18 · Throne Room" (STAND-HOLD-RELIC). */
export const standContinueLine = (run: StandRun): string => `Wave ${run.wave} · ${ROOM_NAMES[hallNow(run)].short}`;

/* ------------------------------------------------------------------ building a run */

/** The setup of a save: the kinds' boosts as the armies would give them. */
export function setupFromMeta(m: Meta): StandSetup {
  return {
    boost: (kind) => ({
      ...boostOf({ id: 0, kind, grade: 1 }, heroRank(m, kind), levelOfKind(m, kind), heroStats(m, kind)),
      ...(awakenedOf(m, kind) ? { awaken: awakenedOf(m, kind) } : {}),
    }),
    castle: m.castle,
  };
}

/** A new run for a party (the hero kinds of a save's party). */
export function newStandRun(seed: number, party: readonly string[], armies: readonly string[] = [], prevBest = 0, prevHall?: string | null): StandRun {
  // (STAND-RETREAT: every run begins in the courtyard and falls back room by room; `prevHall`, the room of the run before, no longer matters)
  void prevHall;
  const hall = hallOfWave(1);
  const run: StandRun = { v: 1, seed, area: standArea(seed, hall), hall, act: 0, armies: [...armies], wave: 1, gold: START_GOLD, heroes: [], nextId: 1, relics: [], offer: [], king: 1, kills: 0, earned: 0, prevBest, over: false, best: 1 };
  for (const kind of party) run.heroes.push({ id: run.nextId++, kind, lv: 0, xp: 0, post: null });
  return run;
}

/** A hero's whole boost: the save's, then the run's levels. */
function boostFor(s: Stand, h: StandHero): Boost {
  const base = s.setup.boost(h.kind);
  const lv = lvMult(h.lv);
  return { ...base, hp: (base.hp ?? 1) * lv.hp * backOf(s.b, h.kind), atk: (base.atk ?? 1) * lv.atk };
}

/** RELICS-2: the Sentry's Cloak's back row in the Last Stand is its inner ring (the shooters and healers by the king, farthest from the
 *  foes; `roleOfKind`): their health is this much more. */
const backOf = (b: Battle, kind: string): number => (b.relics?.hooks?.backHp && roleOfKind(kind) === 'inner' ? 1 + b.relics.hooks.backHp : 1);

/** Whether a hero of the run is on the field: posted, and not fallen. */
export const standing = (h: StandHero): boolean => !!h.post && !h.fallen;

const heroUnits = (s: Stand): Unit[] => s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined && u.alive);
const unitOfHero = (s: Stand, id: number): Unit | undefined => s.b.units.find((u) => u.side === 'hero' && u.tag === id);

/** Where a kind stands in the ring: tanks out front, shooters and healers near the king, the rest between. */
export const roleOfKind = (kind: string): Role => (UNITS[kind] && isTank(UNITS[kind]) ? 'tank' : UNITS[kind]?.shot || (UNITS[kind]?.range ?? 1) >= 3 || CLASS_OF[kind] === 'support' || CLASS_OF[kind] === 'caster' ? 'inner' : 'mid');

/** The battle, the king and the run's heroes: a run from a save (the heroes whole; those with a post on it, the rest to be placed). */
export function startStand(run: StandRun, setup: StandSetup): Stand {
  const rl = relicEffects(run.relics, relicCtx(run));
  const castle = heroBoost(setup.castle);
  const mana = manaRate(setup.castle) * (rl.mana ?? 1);
  const { atk, hp, relics } = fightRelics(rl);
  const b = startBattle(run.seed, [], {
    board: standBoard(run.seed, undefined, run.hall ?? hallOf(run.seed)),
    heroes: { hp: castle.hp! * (hp ?? 1), atk: castle.atk! * (atk ?? 1) },
    mana,
    move: moveRate(setup.castle),
    relics: relics ?? { team: {} },
  });
  b.phase = 'fight';
  const king = addUnit(b, KING_DEF, KING_AT.u, KING_AT.v, { size: 1.25 });
  king.facing = 1;
  king.hp = Math.max(1, Math.round(king.maxHp * run.king));
  b.stand = { king: king.id, at: { ...KING_AT }, fields: {} };
  const s: Stand = { run, setup, b, phase: 'deploy', king, queue: [], waveAt: 0, breakLeft: 0, rageAt: 0, notes: [], traitHp: 1, traitAtk: 1, relicHp: hp ?? 1, relicAtk: atk ?? 1, baseMana: mana, kingGrace: 0 };
  // (the heroes with a post stand on it; a new run's eight are set out in a ring round the dais: `ringPlan`. A post saved before the rooms that
  // is no post in this room (a pillar, cover, the throne) is planned again)
  for (const h of run.heroes) if (h.post && !canPost(b.board, h.post[0], h.post[1])) h.post = null;
  const fresh = run.heroes.filter((h) => !h.post && !h.fallen);
  if (fresh.length) {
    const plan = ringPlan(b.board, fresh.map((h) => h.kind), roleOfKind, run.heroes.filter((h) => h.post).map((h) => ({ u: h.post![0], v: h.post![1] })));
    fresh.forEach((h, i) => (h.post = plan[i] ? [plan[i].u, plan[i].v] : null));
  }
  // (the fallen stay down: a run built again from its save leaves them off the field)
  for (const h of run.heroes) if (standing(h)) addHeroUnit(s, h);
  syncTraits(s);
  syncMana(s);
  if (!run.offer.length) run.offer = drawOffer(run, run.wave);
  // (a run saved with an act's choice still open asks it again; one left in the bonus wave is back at the choice, as it was saved)
  if (run.retreat) {
    run.retreat.hold = undefined;
    s.phase = 'choice';
    s.choiceLeft = CHOICE_MS;
  }
  return s;
}


function addHeroUnit(s: Stand, h: StandHero): Unit {
  const [u, v] = h.post!;
  const unit = addUnit(s.b, h.kind, u, v, boostFor(s, h), h.id);
  unit.post = { u, v, leash: leashOf(UNITS[h.kind]), tank: isTank(UNITS[h.kind]) };
  fxStart(s.b, unit);
  // (the ultimate's meter fills a little slower in the Stand's one long battle: ULT-CHARGE)
  unit.ultPace = ULT_FILL.STAND;
  return unit;
}

/** The team bonus of the heroes on the field (their traits and the relics'), with the difference from what the heroes had before put on them. */
function syncTraits(s: Stand): void {
  const b = s.b;
  const fx = mergeEffects(traitEffects(kindsOf(b.units)), b.relics?.team ?? {});
  b.traits = fx;
  const hp = fx.hp ?? 1;
  const atk = fx.atk ?? 1;
  if (hp !== s.traitHp || atk !== s.traitAtk) {
    for (const u of heroUnits(s)) {
      const rh = hp / s.traitHp;
      const ra = atk / s.traitAtk;
      const was = u.maxHp;
      u.maxHp = Math.round(u.maxHp * rh);
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
      u.power = (u.power ?? 1) * ra;
    }
    s.traitHp = hp;
    s.traitAtk = atk;
  }
}

function syncMana(s: Stand): void {
  s.b.spells.rate = s.baseMana * (s.b.traits?.mana ?? 1);
}

/* ------------------------------------------------------------------ the post of a hero */

/** Put a hero on a tile (a bench hero comes onto the field; one on the field has its post moved, and walks there). False when the tile is not a place to post, is taken, or the field is full. */
export function postHero(s: Stand, id: number, u: number, v: number): boolean {
  const h = s.run.heroes.find((x) => x.id === id);
  if (!h || h.fallen || s.phase === 'over' || !canPost(s.b.board, u, v)) return false;
  if (s.b.units.some((x) => x.alive && x.u === u && x.v === v && x.tag !== id)) return false;
  const was = h.post;
  h.post = [u, v];
  const unit = unitOfHero(s, id);
  if (unit) {
    unit.post = { ...(unit.post ?? { leash: 0, tank: false }), u, v } as NonNullable<Unit['post']>;
    // (before the fight a hero simply stands on its new tile)
    if (s.phase === 'deploy') {
      unit.u = u;
      unit.v = v;
    }
  } else {
    addHeroUnit(s, h);
    syncTraits(s);
    syncMana(s);
  }
  return !was || was[0] !== u || was[1] !== v || true;
}

/** Trade two heroes' posts (the deploy tray's swap; in a fight they walk to their new posts). False when either is fallen, missing, or the run is over. */
export function swapPosts(s: Stand, a: number, b: number): boolean {
  const ha = s.run.heroes.find((x) => x.id === a);
  const hb = s.run.heroes.find((x) => x.id === b);
  if (!ha || !hb || a === b || !standing(ha) || !standing(hb) || s.phase === 'over') return false;
  const [pa, pb] = [ha.post!, hb.post!];
  ha.post = [...pb] as [number, number];
  hb.post = [...pa] as [number, number];
  for (const h of [ha, hb]) {
    const unit = unitOfHero(s, h.id);
    if (!unit?.post) continue;
    unit.post = { ...unit.post, u: h.post![0], v: h.post![1] };
    if (s.phase === 'deploy') {
      unit.u = h.post![0];
      unit.v = h.post![1];
    }
  }
  return true;
}

/** Set every standing hero out again by the ring plan (the deploy tray's Auto-place). Only before the first wave. */
export function autoPlace(s: Stand): boolean {
  if (s.phase !== 'deploy') return false;
  const heroes = s.run.heroes.filter(standing);
  const plan = ringPlan(s.b.board, heroes.map((h) => h.kind), roleOfKind);
  heroes.forEach((h, i) => {
    if (!plan[i]) return;
    h.post = [plan[i].u, plan[i].v];
    const unit = unitOfHero(s, h.id);
    if (unit?.post) {
      unit.post = { ...unit.post, u: plan[i].u, v: plan[i].v };
      unit.u = plan[i].u;
      unit.v = plan[i].v;
    }
  });
  return true;
}

/* ------------------------------------------------------------------ levels and XP */

/** Give a hero a level now: its hp and attack rise, it is healed by what it gained. Returns the new level. */
function levelUp(s: Stand, h: StandHero, out?: StandNote[]): number {
  const before = lvMult(h.lv);
  h.lv++;
  const after = lvMult(h.lv);
  const u = unitOfHero(s, h.id);
  if (u?.alive) {
    const was = u.maxHp;
    u.maxHp = Math.round((u.maxHp * after.hp) / before.hp);
    u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
    u.power = ((u.power ?? 1) * after.atk) / before.atk;
    out?.push({ kind: 'levelup', unit: u.id, level: h.lv });
  }
  return h.lv;
}

/** Add XP to a hero; each level it reaches is taken at once. */
function giveXp(s: Stand, h: StandHero, xp: number): void {
  h.xp += xp;
  while (h.xp >= xpNeed(h.lv + 1)) {
    h.xp -= xpNeed(h.lv + 1);
    levelUp(s, h, s.notes);
  }
}

/* ------------------------------------------------------------------ the waves */

const killXpOf = (foe: Unit): number => killXp({ def: foe.def, maxHp: UNITS[foe.def].hp });

/** Begin the next wave: its foes are queued, to come in by its edges over the first seconds. */
function beginWave(s: Stand, hold?: WaveSpec): void {
  const run = s.run;
  const spec = hold ?? waveSpec(run.seed, run.armies, run.wave, run.hall);
  const b = s.b;
  if (!hold) run.best = Math.max(run.best, run.wave);
  s.phase = 'wave';
  s.holding = !!hold;
  if (b.stand) {
    b.stand.hunt = false;
    b.stand.flee = false;
    // (a new wave: the helpers go home and the helping starts afresh)
    b.stand.help = {};
  }
  s.help = newHelpBook();
  s.waveAt = b.t;
  s.rageAt = b.t + ENRAGE_AFTER;
  b.revived = false;
  // (RELICS-2: a wave is the Last Stand's fight for the relics' start-of-fight rules: the king's first mana, the Ember's and the Ring's prices)
  relicStart(b, true);
  b.foeBoost = { hp: spec.hp, atk: spec.atk };
  const gap = Math.max(100, Math.min(600, SPAWN_SPAN / spec.foes.length));
  s.queue = spec.foes.map((def, i) => ({
    at: i * gap,
    def,
    edge: spec.edges[i % spec.edges.length],
    boost: isBoss(def) ? { hp: spec.hp * bossShare(run.wave), atk: spec.atk * bossShare(run.wave), size: 1.5 } : { hp: spec.hp, atk: spec.atk },
  }));
  s.notes.push(hold ? { kind: 'hold', n: spec.n, boss: spec.boss } : { kind: 'wave', n: run.wave, boss: spec.boss });
}

/** The tile a foe comes in on: a free one on its edge (by a side stream of the run), or one row in. */
function spawnTile(s: Stand, edge: Edge, rng: Rng): At | null {
  const tiles = edgeTiles(s.b.board, edge);
  for (let tries = 0; tries < 10 && tiles.length; tries++) {
    const at = tiles[rng.int(0, tiles.length - 1)];
    // (a free tile, or one or two steps in from the edge: a breach is narrow)
    const [du, dv] = edge === 'north' ? [0, 1] : edge === 'south' ? [0, -1] : edge === 'west' ? [1, 0] : [-1, 0];
    const steps = [at, { u: at.u + du, v: at.v + dv }, { u: at.u + 2 * du, v: at.v + 2 * dv }];
    for (const p of tries < 4 ? steps.slice(0, 1) : tries < 7 ? steps.slice(0, 2) : steps) if (standable(tileAt(s.b.board, p.u, p.v)) && !s.b.units.some((x) => x.alive && x.u === p.u && x.v === p.v)) return p;
  }
  return null;
}

/** The foes still to come, and alive on the field. */
export const foesLeft = (s: Stand): number => s.queue.length + s.b.units.filter((u) => u.alive && u.side === 'foe').length;
export const foesAlive = (s: Stand): number => s.b.units.filter((u) => u.alive && u.side === 'foe').length;

/** Start the run's first wave (from the deploy phase). */
export function startFirstWave(s: Stand): boolean {
  if (s.phase !== 'deploy' || !s.run.heroes.some(standing)) return false;
  syncTraits(s);
  beginWave(s);
  return true;
}

/** End the break at once (the Go button). */
export function goNow(s: Stand): boolean {
  if (s.phase !== 'break') return false;
  s.breakLeft = 0;
  return true;
}

/** A relic offer for the break before wave `n`: up to `OFFER` unowned ones, drawn from a side stream of the run. */
export function drawOffer(run: StandRun, n: number): string[] {
  const rest = ALL_RELIC_IDS.filter((id) => !run.relics.includes(id));
  const rng = new Rng(mixSeed(run.seed, 0x57a7, n));
  const out: string[] = [];
  while (out.length < OFFER && rest.length) {
    const id = pickRelic(() => rng.next(), rest);
    out.push(rest.splice(rest.indexOf(id), 1)[0]);
  }
  return out;
}

/** The wave is cleared: the pay, the XP, the break. */
function clearWave(s: Stand): void {
  const run = s.run;
  const n = run.wave;
  const gold = Math.max(0, clearGold(n) + (relicEffects(run.relics, relicCtx(run)).gold ?? 0));
  run.gold += gold;
  run.earned += gold;
  // (RELICS-2: the wave's tally for the growing relics, and their new size)
  standMarks(s);
  for (const h of run.heroes) if (standing(h)) giveXp(s, h, waveXp(n));
  // (the heroes standing get their breath back: the hurt mend a little; the fallen stay down)
  for (const u of s.b.units) {
    if (u.side !== 'hero' || u.tag === undefined || !u.alive) continue;
    u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * CLEAR_HEAL * (u.healMult ?? 1)));
  }
  // (the hunt and the helping are over: the heroes walk back to their posts in the break)
  if (s.b.stand) {
    s.b.stand.hunt = false;
    s.b.stand.help = {};
  }
  run.wave++;
  run.offer = drawOffer(run, run.wave);
  s.phase = 'break';
  s.breakLeft = BREAK_MS;
  s.notes.push({ kind: 'clear', n, gold });
  // (an act's last wave: the guard is to fall back to the next room; first, the choice to hold this one a wave more: STAND-RETREAT)
  if (retreatAfter(n, hallNow(run))) {
    run.retreat = { to: hallOfWave(n + 1) };
    s.phase = 'choice';
    s.choiceLeft = CHOICE_MS;
    const purse = holdPurse(run, n);
    s.notes.push({ kind: 'choice', n, to: run.retreat.to, gold: purse.gold, relic: purse.relic });
  }
}

/* ------------------------------------------------------------------ the retreat (STAND-RETREAT, `standActs.ts`) */

/** Hold the line: one more, harder wave in this room for a purse (`holdSpec`, `holdGold`), then the guard falls back. Only at an act's choice. */
export function holdTheLine(s: Stand): boolean {
  const run = s.run;
  if (s.phase !== 'choice' || !run.retreat) return false;
  run.retreat.hold = true;
  beginWave(s, holdSpec(run.seed, run.armies, run.wave - 1, hallNow(run)));
  return true;
}

/** Fall back now: the room is given up, the walk to the door begins. Only at an act's choice. */
export function fallBack(s: Stand): boolean {
  if (s.phase !== 'choice' || !s.run.retreat) return false;
  startRetreat(s);
  return true;
}

/**
 * The relic holding the line after wave `n` pays (STAND-HOLD-RELIC): one the run does not own, drawn from its own side stream (so the offers and
 * every other draw are as they were). Null when every relic is owned.
 */
export function holdRelic(run: Pick<StandRun, 'seed' | 'relics'>, n: number): string | null {
  const rest = ALL_RELIC_IDS.filter((id) => !run.relics.includes(id));
  if (!rest.length) return null;
  const rng = new Rng(mixSeed(run.seed, 0x401e, n));
  return pickRelic(() => rng.next(), rest);
}

/** What holding the line after wave `n` pays: `holdGold(n)` and a relic, or, when every relic is owned, twice the gold and no relic. */
export function holdPurse(run: Pick<StandRun, 'seed' | 'relics'>, n: number): { gold: number; relic: boolean } {
  const relic = holdRelic(run, n) !== null;
  return { gold: relic ? holdGold(n) : 2 * holdGold(n), relic };
}

/** What holding pays, as the choice card says it: "+64 gold and a relic" (or "+128 gold" when every relic is owned). */
export const purseLine = (p: { gold: number; relic: boolean }): string => `+${p.gold} gold${p.relic ? ' and a relic' : ''}`;

/** The bonus wave is cleared: its purse and relic, the wave's XP and breath, and the guard falls back. */
function clearHold(s: Stand): void {
  const run = s.run;
  const n = run.wave - 1;
  const relic = holdRelic(run, n);
  const gold = holdPurse(run, n).gold;
  // (QUESTS-1b: every hold of the line won is counted, relic or none, for the quests that ask for one)
  run.holds = (run.holds ?? 0) + 1;
  run.gold += gold;
  run.earned += gold;
  standMarks(s);
  if (relic) {
    takeRelic(s, relic);
    run.heldRelics = [...(run.heldRelics ?? []), relic];
    // (the break's offer drawn at the wave's clear may hold it: it is owned now, so it is no longer for sale)
    run.offer = run.offer.filter((id) => id !== relic);
  }
  for (const h of run.heroes) if (standing(h)) giveXp(s, h, waveXp(n));
  for (const u of s.b.units) {
    if (u.side !== 'hero' || u.tag === undefined || !u.alive) continue;
    u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * CLEAR_HEAL * (u.healMult ?? 1)));
  }
  s.holding = false;
  s.notes.push({ kind: 'held', gold, ...(relic ? { relic } : {}) });
  startRetreat(s);
}

/** The nearest free floor tiles to `at`, one for each of `count` (for the heroes gathering at the door). */
function tilesNear(s: Stand, at: At, count: number): At[] {
  const out: At[] = [];
  for (let r = 0; r <= 8 && out.length < count; r++)
    for (let dv = -r; dv <= r && out.length < count; dv++)
      for (let du = -r; du <= r && out.length < count; du++) {
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r) continue;
        const p = { u: at.u + du, v: at.v + dv };
        if (standable(tileAt(s.b.board, p.u, p.v))) out.push(p);
      }
  return out;
}

/** The room is given up: the heroes still standing are sent to the door (their posts there for the walk), a breach caves in on the page. */
function startRetreat(s: Stand): void {
  const run = s.run;
  const b = s.b;
  const from = hallNow(run);
  const to = run.retreat?.to ?? hallOfWave(run.wave);
  run.retreat = { to };
  s.phase = 'retreat';
  s.retreatLeft = RETREAT_MS;
  s.holding = false;
  if (b.stand) {
    b.stand.hunt = false;
    b.stand.flee = false;
    b.stand.help = {};
  }
  const exit = exitOf(run.seed, from);
  const walkers = heroUnits(s).filter((u) => u.post).sort((x, y) => x.id - y.id);
  const spots = tilesNear(s, exit.front, walkers.length);
  walkers.forEach((u, i) => {
    if (spots[i]) u.post = { ...u.post!, u: spots[i].u, v: spots[i].v };
  });
  s.notes.push({ kind: 'retreat', from, to, exit, cave: caveInOf(run.seed, from) });
}

/** The walk is over (or skipped with a tap): the next room is laid out, the heroes still standing at the ring plan's posts in it (the owner's
 *  call: they are set out for the player, who may still move them in the break before the next wave). The fallen stay in the room they fell in. */
export function finishRetreat(s: Stand): boolean {
  if (s.phase !== 'retreat') return false;
  const run = s.run;
  const b = s.b;
  const to = run.retreat?.to ?? hallOfWave(run.wave);
  const board = standBoard(run.seed, undefined, to);
  b.board = board;
  b.fog = weatherOf(board) === 'fog' ? FOG_RANGE : undefined;
  if (b.stand) {
    b.stand.fields = {};
    b.stand.hunt = false;
    b.stand.flee = false;
    b.stand.help = {};
  }
  // (only the king and the heroes standing go on: the foes' dead, the fallen and anything called up stay behind; what they left about goes too)
  b.units = b.units.filter((u) => u.id === s.king.id || (u.side === 'hero' && u.alive && u.tag !== undefined && u.owner === undefined));
  const kept = new Set(b.units.map((u) => u.id));
  b.pending = [];
  b.zones = [];
  if (b.traps) b.traps = [];
  if (b.cabbages) b.cabbages = [];
  if (b.terrain) b.terrain = [];
  if (b.walls) b.walls = [];
  if (b.auras) b.auras = [];
  if (b.kits?.raise) b.kits.raise = [];
  for (const u of b.units) {
    u.step = undefined;
    u.cast = undefined;
    u.swing = undefined;
    u.taunt = undefined;
    if (u.ail) u.ail = u.ail.filter((a) => kept.has(a.by));
    if (u.hot && !kept.has(u.hot.by)) u.hot = undefined;
    u.busyUntil = b.t;
  }
  run.hall = to;
  run.area = board.area;
  run.act = actOfHall(to);
  run.retreat = undefined;
  const heroes = run.heroes.filter(standing);
  const plan = ringPlan(board, heroes.map((h) => h.kind), roleOfKind);
  heroes.forEach((h, i) => {
    const unit = unitOfHero(s, h.id);
    const at = plan[i];
    if (!at || !unit) return;
    h.post = [at.u, at.v];
    unit.u = at.u;
    unit.v = at.v;
    unit.post = { ...(unit.post ?? { leash: leashOf(UNITS[h.kind]), tank: isTank(UNITS[h.kind]) }), u: at.u, v: at.v };
  });
  syncTraits(s);
  syncMana(s);
  s.phase = 'break';
  s.breakLeft = ROOM_BREAK_MS;
  s.retreatLeft = 0;
  s.notes.push({ kind: 'room', hall: to, act: run.act });
  return true;
}

/** The last foes of an act's wave have broken off: one that reaches the edge of the field is gone (or any still in the room when its time is up). */
function fleeOut(s: Stand): void {
  const b = s.b;
  const late = b.t >= (s.fleeUntil ?? 0);
  for (const u of b.units) {
    if (!u.alive || u.side !== 'foe') continue;
    if (!late && u.u !== 0 && u.v !== 0 && u.u !== FIELD_LAST && u.v !== FIELD_LAST) continue;
    // (gone, not felled: no gold, no XP; dropped with the dead, long faded)
    u.alive = false;
    u.hp = 0;
    u.diedAt = b.t - CORPSE_MS;
  }
}

/** The events of a tick that matter to the run: gold and XP for kills, the king's wounds. */
function settleEvents(s: Stand, events: BattleEvent[]): void {
  for (const e of events) {
    if (e.kind !== 'hit') continue;
    const to = s.b.units.find((u) => u.id === e.to);
    if (!to) continue;
    if (to.id === s.king.id) {
      s.notes.push({ kind: 'kingHit', dmg: e.dmg });
      continue;
    }
    if (!e.killed || to.side !== 'foe') continue;
    const by = s.b.units.find((u) => u.id === e.by);
    const who = by ? creditOf(s.b, by) : undefined;
    const gold = killGold(s.run.wave) + (isBoss(to.def) ? BOSS_GOLD : 0);
    s.run.gold += gold;
    s.run.earned += gold;
    s.run.kills++;
    const killer = who?.side === 'hero' && who.tag !== undefined ? s.run.heroes.find((h) => h.id === who.tag) : undefined;
    if (killer) killer.kills = (killer.kills ?? 0) + 1;
    const xp = killXpOf(to);
    for (const h of s.run.heroes) {
      if (!standing(h)) continue;
      const mine = who?.tag === h.id;
      giveXp(s, h, Math.round(xp * (mine ? 1 : XP_ALL_SHARE)));
    }
  }
}

/** One tick of the run (`TICK_MS`): the foes due come in, the battle steps, the kills are paid, a wave clears or the break runs down. Returns the battle's events for the page. */
export function stepStand(s: Stand): BattleEvent[] {
  if (s.phase === 'deploy' || s.phase === 'over') return [];
  // (an act's choice waits for an answer; left to itself, the guard falls back)
  if (s.phase === 'choice') {
    s.choiceLeft = (s.choiceLeft ?? CHOICE_MS) - TICK_MS;
    if (s.choiceLeft <= 0) fallBack(s);
    return [];
  }
  const b = s.b;
  const run = s.run;
  if (s.phase === 'wave') {
    const into = b.t - s.waveAt;
    const rng = new Rng(mixSeed(run.seed, 0x57e2, run.wave, b.t));
    while (s.queue.length && s.queue[0].at <= into) {
      const sp = s.queue.shift()!;
      const at = spawnTile(s, sp.edge, rng);
      if (!at) {
        // (no room at that edge now: it comes a moment later)
        s.queue.push({ ...sp, at: into + 400 });
        s.queue.sort((x, y) => x.at - y.at);
        break;
      }
      const foe = addUnit(b, sp.def, at.u, at.v, sp.boost);
      foe.facing = at.v === 0 ? 1 : at.v === FIELD_LAST ? 3 : at.u === 0 ? 0 : 2;
      if (b.relics?.first) foe.busyUntil = b.t + b.relics.first;
      relicFoe(b, foe);
    }
    // (a wave that drags on is enraged)
    if (b.t >= s.rageAt) {
      s.rageAt += ENRAGE_EVERY;
      for (const u of b.units) if (u.alive && u.side === 'foe') u.power = (u.power ?? 1) * ENRAGE_STEP;
    }
  }
  const events = stepBattle(b);
  settleEvents(s, events);
  markFallen(s);
  // (the last foes of a wave are hunted down; the heroes go back when it clears)
  if (s.phase === 'wave' && b.stand) {
    const left = s.queue.length ? Infinity : foesAlive(s);
    // (an act's last wave, or the bonus wave: its last foes break off and run instead of being hunted, unless a boss is among them: STAND-RETREAT)
    const lastOfAct = s.holding || retreatAfter(run.wave, hallNow(run));
    if (lastOfAct && !b.stand.flee && left > 0 && left <= HUNT_AT && !b.units.some((u) => u.alive && u.side === 'foe' && isBoss(u.def))) {
      b.stand.flee = true;
      s.fleeUntil = b.t + FLEE_MS;
      s.notes.push({ kind: 'breakOff' });
    }
    if (b.stand.flee) {
      b.stand.hunt = false;
      b.stand.help = {};
      fleeOut(s);
    } else {
      const hunt = left > 0 && left <= HUNT_AT;
      if (hunt && !b.stand.hunt) s.notes.push({ kind: 'hunt' });
      b.stand.hunt = hunt;
      // (with every foe of the wave in, the heroes with nothing near their posts go to help where the fighting is: `standHelp.ts`)
      planHelp(b, (s.help ??= newHelpBook()), !s.queue.length);
    }
  }
  // (the fallen are dropped from the list a moment after they fall)
  if (b.t % 1000 === 0) dropCorpses(s);
  if (b.phase === 'lost' || !s.king.alive) return endRun(s, events);
  if (s.phase === 'wave' && !s.queue.length && !b.units.some((u) => u.alive && u.side === 'foe')) {
    if (s.holding) clearHold(s);
    else clearWave(s);
  } else if (s.phase === 'retreat') {
    s.retreatLeft = (s.retreatLeft ?? RETREAT_MS) - TICK_MS;
    if (s.retreatLeft <= 0) finishRetreat(s);
  } else if (s.phase === 'break') {
    s.breakLeft -= TICK_MS;
    if (s.breakLeft <= 0) beginWave(s);
  }
  return events;
}

const FIELD_LAST = 23;

/** A hero whose unit has fallen is marked so, for good: no rising at the clear, no XP, no levels, and it is left off the field when the run is built again. */
function markFallen(s: Stand): void {
  for (const h of s.run.heroes) {
    if (h.fallen || !h.post) continue;
    const u = unitOfHero(s, h.id);
    if (u && !u.alive) {
      h.fallen = true;
      s.notes.push({ kind: 'fallen', unit: u.id, hero: h.id });
    }
  }
}

/** Drop the foes that fell a while ago, unless something in the battle still points at one (a burn or a bleed it laid, a shot in the air, one it called up). */
function dropCorpses(s: Stand): void {
  const b = s.b;
  if (!b.units.some((u) => !u.alive && u.side === 'foe' && b.t - (u.diedAt ?? b.t) >= CORPSE_MS)) return;
  const held = new Set<number>();
  for (const p of b.pending) (held.add(p.by), held.add(p.to));
  for (const z of b.zones) held.add(z.by);
  for (const t of b.traps ?? []) held.add(t.by);
  for (const u of b.units) {
    for (const a of ailmentsOf(u)) if (a.dmg) held.add(a.by);
    if (u.hot?.by !== undefined) held.add(u.hot.by);
    if (u.owner !== undefined) held.add(u.owner);
    if (u.taunt) held.add(u.taunt.to);
  }
  for (const id of b.combo?.ids ?? []) held.add(id);
  b.units = b.units.filter((u) => u.alive || u.side === 'hero' || held.has(u.id) || b.t - (u.diedAt ?? b.t) < CORPSE_MS);
}

function endRun(s: Stand, events: BattleEvent[]): BattleEvent[] {
  s.phase = 'over';
  s.run.over = true;
  s.run.king = 0;
  s.notes.push({ kind: 'over', best: s.run.best });
  return events;
}

/* ------------------------------------------------------------------ buying */

/** Why a buy is refused now, if it is. */
export type Refusal = 'over' | 'gold' | 'full' | 'none';

/** The hero a level-up goes to when none is named: the lowest level on the field (the lowest id of equals). */
export const weakestHero = (s: Stand): StandHero | undefined => [...s.run.heroes].filter(standing).sort((x, y) => x.lv - y.lv || x.id - y.id)[0];

export function levelBlock(s: Stand, id?: number): Refusal | null {
  const h = id === undefined ? weakestHero(s) : s.run.heroes.find((x) => x.id === id);
  if (!h || h.fallen) return 'none';
  if (s.phase === 'over') return 'over';
  return s.run.gold < levelCost(h.lv) ? 'gold' : null;
}

/** Pay for a level for a hero (the lowest-level one on the field unless one is named). Returns the new level, or null. */
export function buyLevel(s: Stand, id?: number): number | null {
  if (levelBlock(s, id)) return null;
  const h = id === undefined ? weakestHero(s)! : s.run.heroes.find((x) => x.id === id)!;
  s.run.gold -= levelCost(h.lv);
  return levelUp(s, h, s.notes);
}

/** The price of the relic at `i` of the offer. */
export const offerCost = (s: Stand, i = 0): number => {
  const base = relicCost(s.run.relics.length, s.run.wave);
  // (RELICS-2: a Rare costs half as much again, and the Tax Ingot makes every price dearer)
  return pricedFor(s.run.relics, s.run.offer[i] ? relicPriceOf(s.run.offer[i], base) : base);
};

/** Buy the relic at `i` of the break's offer: it works at once for the whole team. */
export function buyRelic(s: Stand, i: number): string | null {
  const id = s.run.offer[i];
  if (!id || s.phase === 'over' || s.run.gold < offerCost(s, i)) return null;
  s.run.gold -= offerCost(s, i);
  s.run.offer.splice(i, 1);
  takeRelic(s, id);
  return id;
}

/** A relic joins the run (bought, or paid for holding the line): it works at once for the whole team. */
function takeRelic(s: Stand, id: string): void {
  s.run.relics.push(id);
  refreshRelics(s);
}

/** A wave won (cleared, or the line held): the battle's tally added to the run's, and the growing relics given their new size. */
function standMarks(s: Stand): void {
  addRelicMarks(s.run, { phase: 'won', relicTally: s.b.relicTally } as Battle);
  s.b.relicTally = undefined;
  refreshRelics(s);
}

/** The relics as the run holds them now, put on the battle: hp and attack rise at once by the difference from what they gave before. */
function refreshRelics(s: Stand): void {
  const rl = relicEffects(s.run.relics, relicCtx(s.run));
  const b = s.b;
  const { atk, hp, relics } = fightRelics(rl);
  const mana = rl.mana;
  // (the Sentry's Cloak taken now: the inner ring's health rises by it at once, as `boostFor` gives it to heroes placed later)
  const back = new Map(heroUnits(s).map((u) => [u.id, backOf(b, u.def)]));
  b.relics = relics ?? { team: {} };
  for (const u of heroUnits(s)) {
    const r = backOf(b, u.def) / back.get(u.id)!;
    if (r === 1) continue;
    const was = u.maxHp;
    u.maxHp = Math.round(u.maxHp * r);
    u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
  }
  // (hp and attack rise at once, by the difference from what the relics gave before)
  const rh = (hp ?? 1) / s.relicHp;
  const ra = (atk ?? 1) / s.relicAtk;
  for (const u of heroUnits(s)) {
    const was = u.maxHp;
    u.maxHp = Math.round(u.maxHp * rh);
    u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
    u.power = (u.power ?? 1) * ra;
  }
  s.relicHp = hp ?? 1;
  s.relicAtk = atk ?? 1;
  s.baseMana = manaRate(s.setup.castle) * (mana ?? 1);
  syncTraits(s);
  syncMana(s);
}

export const relicLine = (id: string): string => `${RELICS[id].name}: ${RELICS[id].text}`;

/** Heal the king by `KING_HEAL` of his health. Returns the hp given, or null (over, gold short, or he is whole). */
export function healKing(s: Stand): number | null {
  const k = s.king;
  if (s.phase === 'over' || !k.alive || k.hp >= k.maxHp || s.run.gold < healCost(s.run.wave)) return null;
  s.run.gold -= healCost(s.run.wave);
  const give = Math.min(k.maxHp - k.hp, Math.round(k.maxHp * KING_HEAL));
  k.hp += give;
  return give;
}

/* ------------------------------------------------------------------ the end, the save, the old climb */

/** The run as it stands for saving at a break: the king's health, and the heroes' posts, are already in it. */
export function snapshot(s: Stand): StandRun {
  s.run.king = s.king.alive ? s.king.hp / s.king.maxHp : 0;
  return s.run;
}

/** What the run has cleared: the waves before the one it is in (a wave in progress does not count). */
export const clearedOf = (run: StandRun): number => Math.max(0, run.wave - 1);

/**
 * Pay a finished run, once: crowns for each wave cleared (`waveCrowns`), chests into the
 * stash (a bronze every 8 waves, a silver every 13, a gold every 39) and a chance of equipment, from the run's seed. The
 * best wave is kept in the meta.
 */
export function settleStand(m: Meta, run: StandRun, armies: readonly string[] = run.armies): StandSummary | null {
  if (!run.over) return null;
  if (run.summary) return run.summary;
  const cleared = clearedOf(run);
  let crowns = 0;
  for (let w = 1; w <= cleared; w++) crowns += waveCrowns(w);
  m.crowns += crowns;
  const bosses = Math.floor(cleared / 13);
  const c = chestsFor(cleared, bosses);
  const open = armies.filter((id) => armyById(id) && armyUnlocked(m, id));
  const army = armyById(open[Math.min(open.length - 1, Math.floor(cleared / 13))] ?? ARMIES[0].id)!;
  let n = 0;
  const give = (at: number, count: number) => {
    for (let i = 0; i < count; i++) m.stash.push({ army: army.id, at, tier: 0, seed: mixSeed(run.seed, 0x70e7, ++n), tower: true } satisfies StashChest);
  };
  give(3, c.bronze);
  give(5, c.silver);
  give(10, c.gold);
  const gear: string[] = [];
  const rng = new Rng(mixSeed(run.seed, 0xe9a1));
  const quality = cleared >= 39 ? 'gold' : cleared >= 13 ? 'silver' : 'bronze';
  for (let i = 0; i < 1 + Math.floor(bosses / 2); i++) {
    if (!rng.chance(gearChance(cleared))) continue;
    gear.push(itemName(grantEquipment(m, rollEquipment(rng, { quality, armyIndex: armyIndex(army.id), milestone: cleared >= 39 }))));
  }
  const newBest = run.best > (m.stand ?? 0);
  // (a record past a tenth wave the save had not reached pays a couple of rift ores, from a side stream)
  const ores = standOres(run.seed, m.stand ?? 0, run.best);
  grantOres(m, ores);
  m.stand = Math.max(m.stand ?? 0, run.best);
  // (the room the king fell in, and the furthest act of the retreat a run has reached: STAND-RETREAT)
  const room = hallNow(run);
  if (run.act !== undefined) m.standAct = Math.max(m.standAct ?? 0, run.act);
  run.summary = { best: run.best, cleared, crowns, ...c, gear, kills: run.kills, heroes: run.heroes.length, relics: run.relics.length, ...(run.heldRelics?.length ? { heldRelics: run.heldRelics.length } : {}), ...(run.holds ? { holds: run.holds } : {}), newBest, ...(ores.length ? { ores } : {}), room, ...(run.act !== undefined ? { act: run.act } : {}), ...(run.retreat?.hold ? { held: true } : {}) };
  return run.summary;
}

export const STAND_KEY = 'legends.stand';

export const saveStand = (run: StandRun, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(STAND_KEY, JSON.stringify(((run.relicBook = RELIC_BOOK), run)));
export const dropStand = (store: Pick<Storage, 'removeItem'> = localStorage) => store.removeItem(STAND_KEY);
/** The run saved in the Last Stand's slot, if it is a run still going. */
export function loadStand(store: Pick<Storage, 'getItem'> = localStorage): StandRun | null {
  try {
    const r = JSON.parse(store.getItem(STAND_KEY) ?? 'null') as StandRun | null;
    const ok = r && r.v === 1 && !r.over && Number.isFinite(r.seed) && r.wave >= 1 && Array.isArray(r.heroes) && r.heroes.length > 0 && Array.isArray(r.relics);
    if (!ok) return null;
    const act = Number.isInteger(r.act) && r.act! >= 0 && r.act! <= 3 ? r.act : undefined;
    const retreat = r.retreat && isHall(r.retreat.to) ? { to: r.retreat.to } : undefined;
    const heldRelics = Array.isArray(r.heldRelics) ? r.heldRelics.filter((id) => typeof id === 'string') : undefined;
    const out: StandRun = { ...r, offer: Array.isArray(r.offer) ? r.offer : [], armies: Array.isArray(r.armies) ? r.armies : [], hall: isHall(r.hall) ? r.hall : undefined, act, retreat, heldRelics };
    // (RELICS-2: a run saved before the relics were catalogued anew: the merged ones renamed, a pair now one paid back in gold, one line for the break)
    if (out.relicBook !== RELIC_BOOK) {
      const had = out.relics.length > 0;
      const { ids, refund } = convertRelics(out.relics);
      out.relics = ids;
      out.gold += refund;
      out.offer = convertRelics(out.offer).ids.filter((id) => !ids.includes(id));
      if (out.heldRelics) out.heldRelics = convertRelics(out.heldRelics).ids;
      out.relicBook = RELIC_BOOK;
      if (had) out.relicNote = RELIC_NOTE;
    }
    return out;
  } catch {
    return null;
  }
}

/** The start of a break is the place a run is saved: its battle is built again from the record, the wave still to come. */
export const canSave = (s: Stand): boolean => s.phase === 'break' || s.phase === 'deploy' || s.phase === 'choice';

/**
 * The old spire climb is gone. A climb still saved (in the Tower's slot, or in the ordinary one by a very old save) is dropped, and what it had
 * earned is paid once as the old end of a run was (`settleTower`: its chests and equipment; its crowns were paid fight by fight). Returns a line
 * for the page to show, or null when there was none. Anything unreadable is dropped with a plain note.
 */
export function migrateOldClimb(m: Meta, store: Pick<Storage, 'getItem' | 'removeItem'>): string | null {
  let note: string | null = null;
  for (const key of ['legends.tower', 'legends.run']) {
    let run: Run | null = null;
    try {
      run = JSON.parse(store.getItem(key) ?? 'null') as Run | null;
    } catch {
      run = null;
    }
    if (!run || run.mode?.kind !== 'tower') continue;
    store.removeItem(key);
    const floors = Math.max(0, (run.stage ?? 1) - 1);
    try {
      run.over = true;
      if (run.tower) {
        const sum = settleTower(m, run);
        note = `The old tower climb has been closed: its ${floors} floors paid ${sum ? `${sum.bronze + sum.silver + sum.gold} chests and ${sum.gear.length} pieces of equipment` : 'nothing more'}. The Tower is now the Last Stand.`;
      }
    } catch {
      /* (a record that cannot be settled pays nothing) */
    }
    note ??= 'The old tower climb has been closed. The Tower is now the Last Stand.';
  }
  return note;
}

/** The eight heroes of a run from a save: the ones chosen (kept, in order), then the strongest owned (by level) that are left. Fewer if fewer are owned. */
export function pickEight(m: Meta, chosen: readonly string[] = m.party): string[] {
  const out = [...new Set(chosen)].filter((k) => m.unlocked.includes(k)).slice(0, FIELD_HEROES);
  const rest = m.unlocked.filter((k) => !out.includes(k) && !UNITS[k]?.summon).sort((x, y) => levelOfKind(m, y) - levelOfKind(m, x));
  while (out.length < FIELD_HEROES && rest.length) out.push(rest.shift()!);
  return out;
}
